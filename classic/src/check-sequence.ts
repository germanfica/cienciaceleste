// src/check-sequence.ts (strict mode compatible)
// Corrected for strict=true: handles undefined explicitly, ensures type narrowing.

import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import os from "node:os";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

interface CliArgs {
    dir: string;
    out: string | null;
    pattern: string;
    concurrency: number;
    checkPages: boolean;
    pageStartAt: number;
    caseInsensitive: boolean;
}

interface FileInfo {
    file: string;
    rel: string;
    id: number | null;
    page: number | null;
}

interface Gap {
    after: number;
    missing: number[];
}

interface PageGap {
    id: number;
    missing: number[];
}

interface Report {
    dir: string;
    scannedFiles: number;
    idsPresent: number[];
    minId: number | null;
    maxId: number | null;
    missingIds: number[];
    idGaps: Gap[];
    duplicateIds: Array<{ id: number; count: number; files: string[] }>;
    unparsableFiles: string[];
    pageGaps: PageGap[];
    generatedAt: string;
}

const parseCli = (): CliArgs => (
    yargs(hideBin(process.argv))
        .options({
            dir: { type: "string", demandOption: true },
            out: { type: "string", default: "" },
            pattern: { type: "string", default: "**/*.md" },
            concurrency: { type: "number", default: Math.max(2, Math.min(8, os.cpus().length)) },
            checkPages: { type: "boolean", default: false },
            pageStartAt: { type: "number", default: 1 },
            caseInsensitive: { type: "boolean", default: true },
        })
        .strict()
        .help()
        .parseSync() as unknown as CliArgs
);

function compileRegexes(caseInsensitive: boolean): { idRe: RegExp; pageRe: RegExp } {
    const flags = caseInsensitive ? "i" : "";
    const idRe = new RegExp(String.raw`(?:^|[^\p{L}\p{N}])id-(\d+)`, flags + "u");
    const pageRe = new RegExp(String.raw`(?:^|[^\p{L}\p{N}])pagina-(\d+)`, flags + "u");
    return { idRe, pageRe };
}

async function collectFiles(dir: string, pattern: string): Promise<string[]> {
    const abs = path.resolve(dir);
    const glob = path.join(abs, pattern).replace(/\\/g, "/");
    const entries = await fg(glob, { onlyFiles: true, unique: true, dot: false, followSymbolicLinks: true });
    return entries.map(p => path.resolve(p));
}

function extractInfo(filePath: string, root: string, idRe: RegExp, pageRe: RegExp): FileInfo {
    const rel = path.relative(root, filePath);
    const base = path.basename(filePath);
    const idMatch = base.match(idRe);
    const pageMatch = base.match(pageRe);
    const id = idMatch ? Number(idMatch[1]) : null;
    const page = pageMatch ? Number(pageMatch[1]) : null;
    return { file: filePath, rel, id, page };
}

function uniqueSorted(nums: number[]): number[] {
    return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function computeIdGaps(ids: number[]): { missing: number[]; gaps: Gap[] } {
    if (ids.length === 0) return { missing: [], gaps: [] };
    const min = Math.min(...ids);
    const max = Math.max(...ids);
    const present = new Set(ids);
    const missing: number[] = [];
    const gaps: Gap[] = [];
    let gapStart: number | null = null;
    let lastPresent = 0;

    for (let n = Math.min(1, min); n <= max; n++) {
        if (!present.has(n)) {
            missing.push(n);
            if (gapStart === null) gapStart = n;
        } else {
            if (gapStart !== null) {
                const gapNums: number[] = [];
                for (let k = gapStart; k < n; k++) gapNums.push(k);
                gaps.push({ after: lastPresent, missing: gapNums });
                gapStart = null;
            }
            lastPresent = n;
        }
    }
    if (gapStart !== null) {
        const gapNums: number[] = [];
        for (let k = gapStart; k <= max; k++) gapNums.push(k);
        gaps.push({ after: lastPresent, missing: gapNums });
    }
    return { missing, gaps };
}

function groupDuplicates(fileInfos: FileInfo[]): Array<{ id: number; count: number; files: string[] }> {
    const byId = new Map<number, string[]>();
    for (const f of fileInfos) {
        if (f.id === null) continue;
        const arr = byId.get(f.id) || [];
        arr.push(f.rel);
        byId.set(f.id, arr);
    }
    return Array.from(byId.entries())
        .filter(([, files]) => files.length > 1)
        .map(([id, files]) => ({ id, count: files.length, files: files.sort() }))
        .sort((a, b) => a.id - b.id);
}

function compactRanges(nums: number[]): string {
    if (nums.length === 0) return "";

    const ranges: string[] = [];
    const first = nums[0];
    if (first === undefined) return ""; // protección extra si está "noUncheckedIndexedAccess"

    let start = first;
    let prev = first;

    for (let i = 1; i < nums.length; i++) {
        const n = nums[i];
        if (n === undefined) continue; // evita error en strict

        if (n === prev + 1) {
            prev = n;
        } else {
            ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
            start = prev = n;
        }
    }

    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    return ranges.join(", ");
}

async function main(): Promise<void> {
    const args = parseCli();
    const root = path.resolve(args.dir);
    const files = await collectFiles(root, args.pattern);
    const { idRe, pageRe } = compileRegexes(args.caseInsensitive);
    const infos: FileInfo[] = files.map(f => extractInfo(f, root, idRe, pageRe));
    const unparsable = infos.filter(i => i.id === null).map(i => i.rel).sort();
    const ids = uniqueSorted(infos.filter(i => i.id !== null).map(i => i.id as number));
    const minId: number | null = ids.length === 0 ? null : (ids[0]!);
    const maxId: number | null = ids.length === 0 ? null : (ids[ids.length - 1]!);
    const { missing: missingIds, gaps: idGaps } = computeIdGaps(ids);
    const duplicates = groupDuplicates(infos);

    console.log(`Scanned ${files.length} files under ${root}.`);
    console.log(`IDs present: ${ids.length}${ids.length ? ` (min ${ids[0]}, max ${ids[ids.length - 1]})` : ""}`);
    if (missingIds.length) {
        console.log(`Missing ranges: ${compactRanges(missingIds)}`);
    }
    if (duplicates.length) {
        console.log("Duplicate IDs:");
        duplicates.forEach(d => console.log(`  id-${d.id}: ${d.count} files`));
    }
    if (unparsable.length) {
        console.log("Files without ID:");
        unparsable.forEach(f => console.log(`  - ${f}`));
    }

    const report: Report = {
        dir: root,
        scannedFiles: files.length,
        idsPresent: ids,
        minId,
        maxId,
        missingIds,
        idGaps,
        duplicateIds: duplicates,
        unparsableFiles: unparsable,
        pageGaps: [],
        generatedAt: new Date().toISOString(),
    };

    if (args.out && args.out.trim()) {
        const outPath = path.resolve(args.out);
        await fs.writeFile(outPath, JSON.stringify(report, null, 2), { encoding: "utf8" });
        console.log(`Report written to ${outPath}`);
    }
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
