// src/md-to-json.ts
// Markdown → JSON (TypeScript 5, strict=true, zero deps, ESM)
//
// Assumptions:
//  - First non-empty H1 line is the title: "# Title".
//  - Optionally one image line: "![alt](url)".
//  - Body paragraphs separated by blank lines.
//  - Final italic line is the author, e.g. "*Escribe: El Alfa y la Omega*".
//
// Output:
//  { id, titulo, autor, bloques: [ {t:"h1" ...}, {t:"img"...}, {t:"p"...}, ... ] }
//
// Usage (after building with tsc):
//   node ./dist/md-to-json.js --src assets/docs-src --out assets/docs --index assets/docs-index.json

import fs from "node:fs/promises";
import path from "node:path";

type Inline = { t: "text"; text: string };
type Block =
    | { t: "h1"; text: string; id: string }
    | { t: "img"; src: string; alt: string }
    | { t: "p"; inlines: Inline[] }
    | { t: "author"; text: string }
    | { t: "articleNo"; value: number; };

interface DocJson {
    id: string;
    titulo: string;
    autor: string | null;
    bloques: Block[];
}

interface CliArgs {
    src: string;
    out: string;
    index: string;
}

function toSlug(input: string): string {
    const s = input
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "");
    return s || "section";
}

function getArg(argv: readonly string[], i: number): string | undefined {
    return i >= 0 && i < argv.length ? argv[i] : undefined;
}

function parseCli(argv: readonly string[]): CliArgs {
    // Initialize with defaults so the variables are always string (no undefined).
    let src: string = "assets/docs-src";
    let out: string = "assets/docs";
    let index: string = "assets/docs-index.json";

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--src") {
            const v = getArg(argv, i + 1);
            if (typeof v === "string") {
                src = v;
                i++;
            }
        } else if (a === "--out") {
            const v = getArg(argv, i + 1);
            if (typeof v === "string") {
                out = v;
                i++;
            }
        } else if (a === "--index") {
            const v = getArg(argv, i + 1);
            if (typeof v === "string") {
                index = v;
                i++;
            }
        }
    }
    return { src, out, index };
}

function extractAuthor(line: string): string | null {
    const re = /^\*(?<inner>.*?)\*$/;
    const m = re.exec(line.trim());
    if (!m) return null;

    const inner = (m.groups?.inner ?? "").trim();
    if (!inner) return null;

    const cleaned = inner.replace(/^Escribe:\s*/i, "").trim();
    return cleaned || null;
}

function extractArticleNo(line: string): number | null {
    // Caso 1: línea entera "Artículo Nº X"
    const re = /^\*{0,2}\s*Art[ií]culo\s*N[ºo]\s*(\d+)\s*\*{0,2}$/i;
    let m = re.exec(line.trim());
    if (m) return Number(m[1]);

    // Caso 2: título con "#"
    const re2 = /^#\s+.*Art[ií]culo\s*N[ºo]\s*(\d+)/i;
    m = re2.exec(line);
    if (m) return Number(m[1]);

    // Caso 3: cualquier parte de la línea (links, listas, etc.)
    const re3 = /Art[ií]culo\s*N[ºo]\s*(\d+)/i;
    m = re3.exec(line);
    if (m) return Number(m[1]);

    return null;
}

function parseMarkdown(md: string): { titulo: string; autor: string | null; bloques: Block[] } {
    const text = md.replace(/\r\n?/g, "\n");
    const lines = text.split("\n");

    // Title (first H1)
    let titulo = "Untitled";
    let tituloLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (raw === undefined) continue; // noUncheckedIndexedAccess guard
        const line = raw.trim();
        if (!line) continue;
        const h1 = line.match(/^#\s+(.*)$/);
        if (h1) {
            titulo = (h1[1] ?? "").trim() || "Untitled";
            tituloLineIndex = i;
            break;
        }
    }

    // Author (last non-empty italic line)
    let autor: string | null = null;
    let autorLineIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        const raw = lines[i];
        if (raw === undefined) continue;
        const line = raw.trim();
        if (!line) continue;
        const a = extractAuthor(line);
        if (a) {
            autor = a;
            autorLineIndex = i;
            break;
        }
    }

    // // Image (first Markdown image)
    // const imgRe = /!\[(.*?)]\((.*?)\)/;
    // let imageAlt = "";
    // let imageUrl = "";
    // let imageLineIndex = -1;
    // for (let i = 0; i < lines.length; i++) {
    //     const raw = lines[i];
    //     if (raw === undefined) continue;
    //     const m = raw.match(imgRe);
    //     if (m) {
    //         imageAlt = (m[1] ?? "").trim();
    //         imageUrl = (m[2] ?? "").trim();
    //         imageLineIndex = i;
    //         break;
    //     }
    // }

    const bloques: Block[] = [];
    bloques.push({ t: "h1", text: titulo, id: toSlug(titulo) });

    // NEW: intentar extraer Artículo Nº del título
    let articleNoSeen = false;
    const nFromTitle = extractArticleNo(titulo);
    if (nFromTitle !== null) {
        bloques.push({ t: "articleNo", value: nFromTitle });
        articleNoSeen = true;
    }

    // 3) Recorrido en orden preservando flujo p/img (ignorando titulo y autor)
    const imgOnlyRe = /^\s*!\[(.*?)\]\((.*?)\)\s*$/;
    let buffer: string[] = [];
    const flush = (): void => {
        if (buffer.length === 0) return;
        const paragraph = buffer.join(" ").trim();
        if (paragraph.length > 0) {
            bloques.push({ t: "p", inlines: [{ t: "text", text: paragraph }] });
        }
        buffer = [];
    };

    for (let i = 0; i < lines.length; i++) {
        if (i === tituloLineIndex || i === autorLineIndex) {
            flush();
            continue;
        }
        const raw = lines[i];
        if (raw === undefined) {
            flush();
            continue;
        }
        const line = raw.trim();
        if (line.length === 0) {
            flush();
            continue;
        }

        // Imagen en linea propia
        const m = imgOnlyRe.exec(line);
        if (m) {
            flush();
            const alt = (m[1] ?? "").trim();
            const src = (m[2] ?? "").trim();
            if (src) {
                bloques.push({ t: "img", src, alt });
            }
            continue;
        }

        // Evitar capturar "autor" intermedio
        if (extractAuthor(line) !== null) {
            flush();
            continue;
        }

        // Solo agregar si aún no se agregó desde el título
        if (!articleNoSeen) {
            // Capturar artículo Nº
            const articleNo = extractArticleNo(line);
            if (articleNo !== null) {
                //console.log("Artículo Nº found:", articleNo);
                flush();
                bloques.push({ t: "articleNo", value: articleNo });
                continue;
            }
        }

        buffer.push(line);
    }
    flush();

    if (autor) {
        bloques.push({ t: "author", text: autor });
    }

    return { titulo, autor, bloques };
}

async function run(): Promise<void> {
    const { src, out, index } = parseCli(process.argv.slice(2));
    const SRC = path.resolve(src);
    const OUT = path.resolve(out);
    const INDEX = path.resolve(index);

    await fs.mkdir(OUT, { recursive: true });

    const entries = await fs.readdir(SRC, { withFileTypes: true });
    const mdFiles = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"))
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b, "en"));

    const idx: Array<{ id: string; titulo: string; autor: string | null }> = [];

    for (const f of mdFiles) {
        const id = path.basename(f, ".md");
        const full = path.join(SRC, f);
        const md = await fs.readFile(full, "utf8");
        const { titulo, autor, bloques } = parseMarkdown(md);

        const payload: DocJson = { id, titulo, autor, bloques };
        await fs.writeFile(path.join(OUT, `${id}.json`), JSON.stringify(payload, null, 2), "utf8");

        idx.push({ id, titulo, autor });
    }

    // Numeric ordering by id if files are named like "113.md", etc.
    idx.sort((a, b) => Number(a.id) - Number(b.id));
    await fs.writeFile(INDEX, JSON.stringify(idx, null, 2), "utf8");

    console.log(`OK: ${mdFiles.length} JSON files generated.`);
}

run().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
});
