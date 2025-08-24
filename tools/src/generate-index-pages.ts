// tools/generate-index-pages.ts
// Genera JSON paginados a partir de un docs-index.json.
// - Respeta rangos de 10 en 10 (o --pageSize), aunque falten IDs.
// - ESM, TypeScript estricto, CLI con yargs.
//
// Uso:
//   ts-node tools/generate-index-pages.ts --index ./public/docs/rollo/docs-index.json \
//     --out ./public/docs/rollo/index/pages --pageSize 10
//
// Salidas:
//   ./public/docs/rollo/index/pages/meta.json
//   ./public/docs/rollo/index/pages/1.json
//   ./public/docs/rollo/index/pages/2.json
//   ...

import fs from "node:fs/promises";
import path from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Tipos en línea con tu front
export interface RolloIndexRow {
    id: number;
    titulo: string;
    autor: string;
}

export interface RolloIndexPage {
    page: number;
    pageSize: number;
    range: { start: number; end: number };
    items: RolloIndexRow[];
    hasPrev: boolean;
    hasNext: boolean;
    totalIds: number;   // equivale a maxId detectado
    totalPages: number;
}

interface CliArgs {
    index: string;
    out: string;
    pageSize: number;
}

function parseCli(): CliArgs {
    const argv = yargs(hideBin(process.argv))
        .scriptName("generate-index-pages")
        .usage("Usage: $0 --index <docs-index.json> --out <dir> [--pageSize 10]")
        .options({
            index: { type: "string", demandOption: true, desc: "Ruta a docs-index.json" },
            out: { type: "string", demandOption: true, desc: "Directorio de salida para pages" },
            pageSize: { type: "number", default: 10, desc: "Tamaño de página" },
        })
        .strict()
        .help()
        .parseSync();

    // Normalización mínima
    const indexPath = path.resolve(argv.index);
    const outDir = path.resolve(argv.out);
    const pageSize = Number.isFinite(argv.pageSize) && argv.pageSize > 0 ? Math.floor(argv.pageSize) : 10;

    return { index: indexPath, out: outDir, pageSize };
}

async function readJsonFile(filePath: string): Promise<unknown> {
    const raw = await fs.readFile(filePath, { encoding: "utf8" });
    try {
        return JSON.parse(raw);
    } catch (e) {
        throw new Error(`No se pudo parsear JSON: ${filePath}`);
    }
}

function normalizeRows(value: unknown): RolloIndexRow[] {
    if (!Array.isArray(value)) {
        throw new Error("docs-index.json debe ser un array de filas");
    }
    const rows: RolloIndexRow[] = [];
    for (const r of value) {
        if (r && typeof r === "object") {
            // indexado dinámico
            const idRaw = (r["id"] as unknown);
            // indexado dinámico
            const tituloRaw = (r["titulo"] as unknown);
            // indexado dinámico
            const autorRaw = (r["autor"] as unknown);

            const idNum = typeof idRaw === "number" ? idRaw : Number(String(idRaw ?? "").trim());
            const titulo = String(tituloRaw ?? "").trim();
            const autor = String(autorRaw ?? "").trim();

            if (Number.isFinite(idNum) && idNum > 0 && titulo.length > 0) {
                rows.push({ id: Math.floor(idNum), titulo, autor });
            }
        }
    }
    // Orden estable por id asc
    rows.sort((a, b) => a.id - b.id);
    return rows;
}

function computeMaxId(rows: RolloIndexRow[]): number {
    let maxId = 0;
    for (const r of rows) {
        if (r.id > maxId) maxId = r.id;
    }
    return maxId;
}

function pageRange(page: number, pageSize: number): { start: number; end: number } {
    const start = (page - 1) * pageSize + 1;
    const end = page * pageSize;
    return { start, end };
}

function sliceItemsForRange(rows: RolloIndexRow[], start: number, end: number): RolloIndexRow[] {
    // Filtra solo las filas cuyo id esté dentro del rango; mantiene orden asc
    return rows.filter((r) => r.id >= start && r.id <= end);
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), { encoding: "utf8" });
}

async function generate(args: CliArgs): Promise<void> {
    const raw = await readJsonFile(args.index);
    const rows = normalizeRows(raw);
    const maxId = computeMaxId(rows);
    const totalPages = Math.max(1, Math.ceil(maxId / args.pageSize));

    // meta.json
    const meta = { totalPages, pageSize: args.pageSize, maxId };
    await writeJson(path.join(args.out, "meta.json"), meta);

    for (let page = 1; page <= totalPages; page++) {
        const range = pageRange(page, args.pageSize);
        const items = sliceItemsForRange(rows, range.start, range.end);

        const payload: RolloIndexPage = {
            page,
            pageSize: args.pageSize,
            range,
            items,
            hasPrev: page > 1,
            hasNext: page < totalPages,
            totalIds: maxId,
            totalPages,
        };

        // Archivo: <n>.json (simple y predecible)
        const file = path.join(args.out, `${page}.json`);
        await writeJson(file, payload);
    }

    console.log(`OK: ${totalPages} páginas generadas en ${args.out}`);
}

async function main(): Promise<void> {
    const args = parseCli();
    await generate(args);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
});
