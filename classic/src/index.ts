// classic/src/index.ts
//
// - Skips pages that contain "Error al Conectar al Servidor".
// - Avoids writing trivially empty Markdown files.
// - First H1 becomes the title. Falls back to <title> or filename.
// - Optionally includes the first non-decorative content image.
// - Outputs filenames like: id-<ID>_pagina-<N>__<TITLE-UPPER>.md
//
// Usage:
//   ts-node src/index.ts --in "../docs/" --out "./markdown" \
//     --pattern "detallerollo.php-id=*\\&pagina=*.htm" --images true --concurrency 8 --verbose
//
// After tsc:
//   node ./dist/index.js --in "../docs/" --out "./markdown" --pattern "detallerollo.php-id=*\\&pagina=*.htm"

import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { load, type Cheerio, type CheerioAPI } from "cheerio";
import iconv from "iconv-lite";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/**
 * Collection title used across the project.
 */
const COLLECTION_TITLE = "DIVINA REVELACION ALFA Y OMEGA" as const;

type Nullable<T> = T | null;

// ---------------------------------------------------------------------------
// Small utils
// ---------------------------------------------------------------------------

function normalizeSpaces(s: string): string {
    return s.replace(/\s+/g, " ").trim();
}

function looksLikeServerError(html: string): boolean {
    const txt = normalizeSpaces(html).toLowerCase();
    return txt.includes("error al conectar al servidor");
}

function isTriviallyEmptyMarkdown(md: string): boolean {
    const cleaned = md
        .replace(/!\[[^\]]*]\([^)]*\)/g, " ")   // images
        .replace(/^#{1,6}\s+.*$/gm, " ")        // markdown headers
        .replace(/[*_`>#\[\]()]/g, " ")         // md markers
        .replace(/\s+/g, " ")
        .trim();
    return cleaned.length < 10;
}

function logSkip(reason: string, file: string, verbose?: boolean): void {
    if (verbose) console.log(`[skip] ${reason}: ${file}`);
}

async function ensureDir(p: string): Promise<void> {
    // fs.mkdir returns Promise<string | undefined>; swallow the value to keep Promise<void>
    await fs.mkdir(p, { recursive: true });
}

// async function readFileAsUtf8(filePath: string): Promise<string> {
//     const raw = await fs.readFile(filePath);
//     //return iconv.decode(raw, "latin1");
//     //return iconv.decode(raw, "win1252");
//     //return iconv.decode(raw, "iso-8859-1");
//     return iconv.decode(raw, "utf8");
// }

// async function readFileAsUtf8(raw: Buffer): Promise<string> {
//     //return iconv.decode(raw, "latin1");
//     //return iconv.decode(raw, "win1252");
//     //return iconv.decode(raw, "iso-8859-1");
//     return iconv.decode(raw, "utf8");
// }

/**
 * Decodes a raw HTML buffer as UTF-8.
 *
 * Background:
 * Legacy `.htm` files used in the conversion were all
 * batch-converted to UTF-8 in commit
 * `dc64e3748e912c836ededc7fc9184ff7a1ceee9b` (Mar 25, 2021).
 *
 * However, these files still contain legacy
 * `<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">`
 * tags from before the conversion.
 *
 * To avoid ambiguity and ensure consistent parsing,
 * we deliberately ignore the misleading ISO-8859-1 declaration
 * and always decode buffers as UTF-8.
 *
 * This prevents unnecessary confusion during conversion
 * and guarantees stable, uniform results across all documents.
 *
 * @param raw - The raw file buffer read from disk.
 * @returns The decoded string, interpreted as UTF-8 text.
 */
function decodeBufferUtf8(raw: Buffer): string {
    //return iconv.decode(raw, "latin1");
    //return iconv.decode(raw, "win1252");
    //return iconv.decode(raw, "iso-8859-1");
    return iconv.decode(raw, "utf8");
}

// ---------------------------------------------------------------------------
// Encoding detection (lightweight)
// ---------------------------------------------------------------------------

function sniffEncodingFromHead(raw: Buffer): string | null {
    const head = raw.slice(0, Math.min(raw.length, 4096)).toString("ascii").toLowerCase();
    const m1 = head.match(/<meta[^>]+charset=["']?([\w\-]+)/i);
    if (m1?.[1]) return m1[1];
    const m2 = head.match(/content=["'][^"']*charset=([\w\-]+)/i);
    if (m2?.[1]) return m2[1];
    return null;
}

function decodeBuffer(raw: Buffer): string {
    const enc = sniffEncodingFromHead(raw);
    if (!enc) {
        try {
            return iconv.decode(raw, "utf8");
        } catch {
            return iconv.decode(raw, "win1252");
        }
    }
    const normalized = enc.replace(/[^a-z0-9\-]/gi, "").toLowerCase();
    const map: Record<string, string> = {
        "utf8": "utf8",
        "utf-8": "utf8",
        "windows-1252": "win1252",
        "win-1252": "win1252",
        "cp1252": "win1252",
        "iso-8859-1": "latin1"
    };
    const use = map[normalized] ?? normalized;
    try {
        return iconv.decode(raw, use as any);
    } catch {
        return iconv.decode(raw, "utf8");
    }
}

// ---------------------------------------------------------------------------
// File name helpers
// ---------------------------------------------------------------------------

function extractIdPagina(fileName: string): { id: Nullable<string>; pagina: Nullable<string> } {
    const base = path.basename(fileName);
    const idMatch = base.match(/id=(\d+)/i);
    const pagMatch = base.match(/pagina=(\d+)/i);
    // ensure we never return undefined (only string|null)
    const id = idMatch?.[1] ?? null;
    const pagina = pagMatch?.[1] ?? null;
    return { id, pagina };
}

function toUpperKebabPreserveAccents(s: string): string {
    return normalizeSpaces(s).replace(/\s+/g, "-").toUpperCase();
}

function buildOutputName(srcFile: string, title: string): string {
    const { id, pagina } = extractIdPagina(srcFile);
    const titlePart = title ? toUpperKebabPreserveAccents(title) : "SIN-TITULO";
    if (id && pagina) return `id-${id}_pagina-${pagina}__${titlePart}.md`;
    if (id) return `id-${id}__${titlePart}.md`;
    return `${titlePart}.md`;
}

// ---------------------------------------------------------------------------
// Image filtering
// ---------------------------------------------------------------------------

function isDecorativeImage(url: string): boolean {
    const u = (url || "").toLowerCase();
    return (
        /fondolong\.jpg$/.test(u) ||
        /bottomlong\.jpg$/.test(u) ||
        /toplong\.jpg$/.test(u) ||
        /header/.test(u) ||
        /footer/.test(u) ||
        /background/.test(u)
    );
}

function resolveImgUrl(el: Cheerio<any>): string {
    const tppabs = el.attr("tppabs") || "";
    const src = el.attr("src") || "";
    const candidate = tppabs || src;
    return candidate.trim();
}

// ---------------------------------------------------------------------------
// HTML -> Markdown conversion
// ---------------------------------------------------------------------------

function firstNonEmptyText($: CheerioAPI, sel: string): string | null {
    const t = $(sel).first().text();
    const v = normalizeSpaces(t);
    return v || null;
}

function extractRolloTitle($: CheerioAPI, fallback: string): string {
    const rollo = firstNonEmptyText($, ".titulorollo"); // specific class for rollo titles
    if (rollo) return rollo;

    return fallback;
}

function extractTitle($: CheerioAPI, fallback: string): string {
    const docTitle = firstNonEmptyText($, "title");
    if (docTitle) return docTitle;

    const h1 = firstNonEmptyText($, "h1");
    if (h1) return h1;

    const boldLike = firstNonEmptyText($, "td b, td strong, .textorollo b, .textorollo strong");
    if (boldLike) return boldLike;

    return fallback;
}

function extractParas($: CheerioAPI): string[] {
    const rawLines: string[] = [];

    const containers = [
        "td.textorollo", ".textorollo", ".contenido", "div#contenido", "div.content"
    ];

    let containerFound = false;
    for (const c of containers) {
        if ($(c).length) {
            containerFound = true;
            $(c).each((_, el) => {
                const $el = $(el);
                const html = ($el.html() || "").replace(/<\s*br\s*\/?>/gi, "\n");
                const text = normalizeSpaces($("<div>").html(html).text().replace(/\n+/g, "\n"));
                for (const line of text.split("\n")) {
                    const v = line.trim();
                    if (v) rawLines.push(v);
                }
            });
            break;
        }
    }

    if (!containerFound) {
        $("p").each((_, p) => {
            const t = normalizeSpaces($(p).text());
            if (t) rawLines.push(t);
        });
    }

    const merged: string[] = [];
    let buf: string[] = [];
    const flush = () => {
        if (!buf.length) return;
        merged.push(buf.join(" "));
        buf = [];
    };
    for (const line of rawLines) {
        buf.push(line);
        if (line.length >= 80) flush();
    }
    flush();
    return merged;
}

function extractFirstContentImage($: CheerioAPI): { alt: string; url: string } | null {
    const candidates: Cheerio<any>[] = [];

    $('img[tppabs*="/images/rollos/"]').each((_, el) => {
        candidates.push($(el));
    });

    if (!candidates.length) {
        $('img[src*="/images/rollos/"]').each((_, el) => {
            candidates.push($(el));
        });
    }

    if (!candidates.length) {
        $("img").each((_, el) => {
            const $img = $(el);
            const url = resolveImgUrl($img);
            if (url && !isDecorativeImage(url)) {
                candidates.push($img);
            }
        });
    }

    for (const $img of candidates) {
        const url = resolveImgUrl($img);
        if (!url || isDecorativeImage(url)) continue;
        const alt = normalizeSpaces($img.attr("alt") || "");
        return { alt, url };
    }
    return null;
}

function convertHtmlToMarkdown($: CheerioAPI, srcNameForFallback: string, includeImages: boolean): string {
    const fallbackTitle = path.basename(srcNameForFallback, path.extname(srcNameForFallback));
    const title = extractRolloTitle($, fallbackTitle);
    const paras = extractParas($);

    const parts: string[] = [];
    parts.push(`# ${title}`);
    parts.push("");

    if (includeImages) {
        const img = extractFirstContentImage($);
        if (img) {
            const alt = img.alt || "image";
            parts.push(`![${alt}](${img.url})`);
            parts.push("");
        }
    }

    for (const p of paras) {
        parts.push(p);
        parts.push("");
    }

    while (parts.length && parts[parts.length - 1] === "") parts.pop();
    return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Concurrency helper
// ---------------------------------------------------------------------------

async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const running: Promise<void>[] = [];

    async function runOne(i: number): Promise<void> {
        // guard for noUncheckedIndexedAccess
        const item = items[i];
        if (item === undefined) return;
        const r = await worker(item, i);
        results[i] = r;
    }

    while (next < items.length || running.length) {
        while (next < items.length && running.length < limit) {
            const i = next++;
            const p = runOne(i).then(
                () => {
                    const idx = running.indexOf(p);
                    if (idx >= 0) running.splice(idx, 1);
                },
                () => {
                    const idx = running.indexOf(p);
                    if (idx >= 0) running.splice(idx, 1);
                }
            );
            running.push(p);
        }
        if (running.length) {
            await Promise.race(running);
        }
    }
    return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const argv = await yargs(hideBin(process.argv))
        .option("in", { type: "string", demandOption: true, desc: "Input dir (HTML root)" })
        .option("out", { type: "string", demandOption: true, desc: "Output dir (Markdown)" })
        .option("pattern", { type: "string", demandOption: true, desc: "fast-glob pattern under --in" })
        .option("images", { type: "boolean", default: true, desc: "Include first content image" })
        .option("concurrency", { type: "number", default: 8, desc: "Parallelism" })
        .option("verbose", { type: "boolean", default: false, desc: "Verbose logging for skips" })
        .parse();

    const IN = path.resolve(String(argv.in));
    const OUT = path.resolve(String(argv.out));
    const pattern = String(argv.pattern);
    const includeImages = Boolean(argv.images);
    const concurrency = Math.max(1, Number(argv.concurrency) || 1);
    const verbose = Boolean(argv.verbose);

    await ensureDir(OUT);

    let okCount = 0;
    let errCount = 0;
    let skippedErrorPages = 0;
    let skippedEmpty = 0;

    const htmlFiles = await fg(pattern, { cwd: IN, absolute: true, dot: false });

    await mapWithConcurrency(htmlFiles, concurrency, async (src, idx) => {
        try {
            const raw = await fs.readFile(src);
            const html = decodeBufferUtf8(raw); // decodeBuffer(raw);

            // 1) Skip server error pages
            if (looksLikeServerError(html)) {
                skippedErrorPages++;
                logSkip("server error page", src, verbose);
                return;
            }

            const $ = load(html);
            const markdown = convertHtmlToMarkdown($, src, includeImages);

            // 2) Skip trivially empty markdown
            if (isTriviallyEmptyMarkdown(markdown)) {
                skippedEmpty++;
                logSkip("empty markdown", src, verbose);
                return;
            }

            const outName = buildOutputName(src, COLLECTION_TITLE); // extractTitle($, path.basename(src))
            const destPath = path.join(OUT, outName);

            await fs.writeFile(destPath, markdown, "utf8");
            okCount++;
        } catch (e) {
            errCount++;
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[error] ${src}\n  ${msg}`);
        }
    });

    console.log(
        `Listo. Convertidos: ${okCount}. Errores: ${errCount}. ` +
        `Omitidos(error_pages): ${skippedErrorPages}. Omitidos(vacío): ${skippedEmpty}. ` +
        `Salida: ${OUT}`
    );
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
});
