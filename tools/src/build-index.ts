// src/build-index.ts
// README index builder for files renamed as "<id>.md" inside a target folder.
// - TypeScript 5.x, strict-friendly (matches your tsconfig options).
// - Groups items by pages of 10 IDs: Page 1 (1–10), Page 2 (11–20), ...
// - Skips missing IDs inside each page (keeps page ranges intact).
// - Extracts the first "# " level-1 heading from each markdown file.
// - Safe defaults: writes README.md alongside the files unless --out indicates another path.

import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import os from "node:os";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type NonEmptyString = string & { __brand: "NonEmptyString" };

interface CliArgs {
    dir: string;               // Folder containing the "<id>.md" files (usually "./complete")
    out: string;               // README output path; default: "<dir>/README.md"
    perPage: number;           // IDs per page; default 10
    heading: string;           // Main heading text for README
    note: string;              // Optional note paragraph under the H1
    concurrency: number;       // File I/O concurrency
    includeEmptyPages: boolean;// If true, include page sections even when they have 0 items
}

interface Item {
    id: number;
    title: NonEmptyString;
    relLink: string; // "./<id>.md"
}

const parseCli = (): CliArgs =>
    yargs(hideBin(process.argv))
        .scriptName("build-index")
        .options({
            dir: { type: "string", default: "./complete", describe: "Directory with <id>.md files" },
            out: { type: "string", default: "", describe: "README output path (defaults to <dir>/README.md)" },
            perPage: { type: "number", default: 10, describe: "IDs per page section" },
            heading: { type: "string", default: "Índice General", describe: "Top-level README heading" },
            note: {
                type: "string",
                default:
                    "La numeración indicada no se corresponde en algunos casos con la numeración real de los rollos, solamente indican un número correlativo.",
                describe: "Optional note paragraph shown under the H1",
            },
            concurrency: {
                type: "number",
                default: Math.max(2, Math.min(8, os.cpus().length)),
                describe: "Max concurrent file reads",
            },
            includeEmptyPages: {
                type: "boolean",
                default: false,
                describe: "Include empty page sections (no items) in the README",
            },
        })
        .strict()
        .help()
        .parseSync() as unknown as CliArgs;

function isNumericIdMd(name: string): number | null {
    // Accepts "<digits>.md" only; ignores other files.
    const m = name.match(/^(\d+)\.md$/u);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function firstHeadingH1(markdown: string): NonEmptyString | null {
    const lines = markdown.split(/\r?\n/u);
    for (const raw of lines) {
        const line = raw.replace(/^\uFEFF/, "");
        const m = /^#\s+(?<title>.+?)\s*$/u.exec(line);
        const t = m?.groups?.title?.trim();
        if (t && t.length > 0) return t as NonEmptyString;
    }
    return null;
}

// Concurrency helper compatible with noUncheckedIndexedAccess
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length) as R[];
    let next = 0;
    const worker = async () => {
        while (true) {
            const i = next++;
            if (i >= items.length) break;
            const it = items[i];
            if (it === undefined) continue;
            out[i] = await fn(it, i);
        }
    };
    const workers: Promise<void>[] = [];
    const count = Math.min(Math.max(1, limit), items.length);
    for (let k = 0; k < count; k++) workers.push(worker());
    await Promise.all(workers);
    return out;
}

async function collectItems(dir: string, concurrency: number): Promise<Item[]> {
    const abs = path.resolve(dir);
    const pattern = path.join(abs, "**/*.md").replace(/\\/g, "/");
    const files = await fg(pattern, { onlyFiles: true, unique: true, dot: false, followSymbolicLinks: true });

    // Keep only "<id>.md"
    const candidates = files
        .map((f) => ({ abs: f, base: path.basename(f) }))
        .map((x) => ({ ...x, id: isNumericIdMd(x.base) }))
        .filter((x) => x.id !== null) as Array<{ abs: string; base: string; id: number }>;

    const items = await mapLimit(candidates, concurrency, async (c) => {
        const content = await fs.readFile(c.abs, { encoding: "utf8" });
        const title = firstHeadingH1(content) ?? (`Documento ${c.id}` as NonEmptyString);
        // Build a relative "./<id>.md" link targeting README location; README will be placed in dir by default.
        const rel = `./${c.id}.md`;
        const it: Item = { id: c.id, title, relLink: rel };
        return it;
    });

    // Sort by numeric id
    items.sort((a, b) => a.id - b.id);
    return items;
}

function buildReadme(items: Item[], perPage: number, heading: string, note: string, includeEmptyPages: boolean): string {
    if (items.length === 0) {
        return `# ${heading}\n\n*(No se encontraron archivos <id>.md para indexar).* \n`;
    }

    const minId = items[0]!.id;
    const maxId = items[items.length - 1]!.id;

    // Even if minId > 1, page numbering starts at 1–10, 11–20, ...
    const startId = 1;
    const pages: string[] = [];

    // Page header
    const parts: string[] = [`# ${heading}`, "", note, ""];

    for (let pageStart = startId; pageStart <= maxId; pageStart += perPage) {
        const pageEnd = Math.min(pageStart + perPage - 1, maxId);
        // Collect items in this [pageStart..pageEnd] range
        const chunk = items.filter((it) => it.id >= pageStart && it.id <= pageEnd);

        if (!includeEmptyPages && chunk.length === 0) {
            continue; // skip empty page sections
        }

        const pageIndex = Math.floor((pageStart - 1) / perPage) + 1;
        parts.push(`## Página ${pageIndex} (IDs ${pageStart}–${pageEnd})`);

        if (chunk.length === 0) {
            parts.push("_(Sin elementos en este rango)_", "");
            continue;
        }

        // Lines like: "1. [Título](./1.md)"
        for (const it of chunk) {
            parts.push(`${it.id}. [${it.title}](${it.relLink})`);
        }
        parts.push(""); // blank line after each page section
    }

    return parts.join("\n") + "\n";
}

async function main(): Promise<void> {
    const args = parseCli();
    const outTarget = args.out && args.out.trim().length > 0
        ? path.resolve(args.out)
        : path.resolve(args.dir, "README.md");

    const items = await collectItems(args.dir, args.concurrency);
    const md = buildReadme(items, args.perPage, args.heading, args.note, args.includeEmptyPages);

    await fs.writeFile(outTarget, md, { encoding: "utf8" });
    console.log(`README generated at: ${outTarget}`);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
});
