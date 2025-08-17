// src/index.ts
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { load, type CheerioAPI } from "cheerio";
import iconv from "iconv-lite";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type Nullable<T> = T | null;

interface CliArgs {
    in: string;
    out: string;
    images: boolean;
    pattern: string;
    concurrency: number;
}

interface ParsedDoc {
    title: Nullable<string>;
    bodyParas: string[];
    signature: Nullable<string>;
    imageUrl: Nullable<string>;
    id: Nullable<string>;
    pagina: Nullable<string>;
}

const parseCli = (): CliArgs =>
    yargs(hideBin(process.argv))
        .option("in", { alias: "i", type: "string", demandOption: true, describe: "Carpeta de entrada con .htm" })
        .option("out", { alias: "o", type: "string", demandOption: true, describe: "Carpeta de salida para .md" })
        .option("images", { type: "boolean", default: true, describe: "Insertar imagen principal si existe" })
        .option("pattern", {
            type: "string",
            default: "detallerollo.php-id=*\\&pagina=*.htm",
            describe: "Patrón fast-glob para encontrar los .htm"
        })
        .option("concurrency", { type: "number", default: 8, describe: "Paralelismo al convertir" })
        .strict()
        .help()
        .parseSync() as CliArgs;

const ensureDir = async (dir: string): Promise<void> => {
    await fs.mkdir(dir, { recursive: true });
};

const readHtmlAsLatin1 = async (filePath: string): Promise<string> => {
    const raw = await fs.readFile(filePath);
    //return iconv.decode(raw, "latin1");
    //return iconv.decode(raw, "win1252");
    //return iconv.decode(raw, "iso-8859-1");
    return iconv.decode(raw, "utf8");
};

const extractIdPagina = (fileName: string): { id: Nullable<string>; pagina: Nullable<string> } => {
    const idMatch = fileName.match(/id=(\d+)/);
    const pagMatch = fileName.match(/pagina=(\d+)/);
    return {
        id: idMatch?.[1] ?? null,
        pagina: pagMatch?.[1] ?? null
    };
};

const pickMainImageUrl = ($: CheerioAPI): Nullable<string> => {
    const img = $('img[tppabs*="/images/rollos/"]').first();
    if (img.length) return img.attr("tppabs") ?? null;

    const alt = $('img[src$=".jpg"], img[src$=".jpeg"]').first();
    const url = alt.attr("tppabs") || alt.attr("src");
    return url ?? null;
};

const normalizeWhitespace = (s: string): string => s.replace(/\s+/g, " ").trim();

const toMarkdown = (
    data: Pick<ParsedDoc, "title" | "bodyParas" | "signature" | "imageUrl">,
    includeImages: boolean
): string => {
    const parts: string[] = [];
    if (data.title) parts.push(`# ${data.title}`);
    if (includeImages && data.imageUrl) parts.push(`![${data.title ?? "imagen"}](${data.imageUrl})`);
    if (data.bodyParas.length) parts.push(data.bodyParas.join("\n\n"));
    if (data.signature) parts.push(`*${data.signature}*`);
    return parts.join("\n\n") + "\n";
};

const sanitizeFileName = (input: string): string =>
    input.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, " ").trim();

const outNameFor = (
    _filePath: string,
    title: Nullable<string>,
    id: Nullable<string>,
    pagina: Nullable<string>
): string => {
    const base = [`id-${id ?? "x"}`, `pagina-${pagina ?? "x"}`].join("_");
    const titleSlug = title ? sanitizeFileName(title).slice(0, 80).replace(/\s+/g, "-") : "rollo";
    return `${base}__${titleSlug}.md`;
};

// Limitador de concurrencia minimalista y tipado
const pLimit = (n: number) => {
    let active = 0;
    const queue: Array<{
        job: () => Promise<unknown>;
        resolve: (v: any) => void; // usar any evita el error de covarianza en T
        reject: (e: any) => void;
    }> = [];

    const next = (): void => {
        if (active >= n || queue.length === 0) return;
        active++;
        const { job, resolve, reject } = queue.shift()!;
        job()
            .then((res) => {
                active--;
                resolve(res);
                next();
            })
            .catch((err) => {
                active--;
                reject(err);
                next();
            });
    };

    return <T>(job: () => Promise<T>): Promise<T> =>
        new Promise<T>((resolve, reject) => {
            queue.push({ job, resolve: resolve as (v: any) => void, reject: reject as (e: any) => void });
            next();
        });
};

const parseHtml = (html: string, fileName: string): ParsedDoc => {
    // Quitar decodeEntities: ya no es una opción válida en los tipos de Cheerio v1
    const $ = load(html);

    const rawTitle = normalizeWhitespace($(".titulorollo").text());
    const bodyParas = $("td.textorollo")
        .map((_, el) => normalizeWhitespace($(el).text()))
        .get()
        .filter((t: string) => t.length > 0);

    const signatureText = normalizeWhitespace($("td.textoderecha").first().text());
    const imageUrl = pickMainImageUrl($);

    const { id, pagina } = extractIdPagina(fileName);
    const safeId: Nullable<string> = id ?? null;
    const safePagina: Nullable<string> = pagina ?? null;
    const safeSignature: Nullable<string> = signatureText || null;

    return {
        title: rawTitle || null,
        bodyParas,
        signature: safeSignature,
        imageUrl,
        id: safeId,
        pagina: safePagina
    };
};

const writeMarkdown = async (outDir: string, name: string, content: string): Promise<void> => {
    const outFile = path.join(outDir, name);
    await fs.writeFile(outFile, content, "utf8");
};

const run = async (): Promise<void> => {
    const args = parseCli();
    const { in: inDir, out: outDir, pattern, images, concurrency } = args;

    await ensureDir(outDir);
    const files = await fg(pattern, { cwd: inDir, absolute: true, onlyFiles: true, caseSensitiveMatch: false });

    if (files.length === 0) {
        console.warn("No se encontraron archivos con el patrón proporcionado.");
        return;
    }

    const limit = pLimit(Math.max(1, concurrency));
    let ok = 0;
    let fail = 0;

    await Promise.all(
        files.map((absPath) =>
            limit(async () => {
                const fileName = path.basename(absPath);
                try {
                    const html = await readHtmlAsLatin1(absPath);
                    const parsed = parseHtml(html, fileName);
                    const md = toMarkdown(parsed, images);
                    const outName = outNameFor(absPath, parsed.title, parsed.id, parsed.pagina);
                    await writeMarkdown(outDir, outName, md);
                    ok++;
                } catch (err) {
                    fail++;
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error(`Error en ${fileName}: ${msg}`);
                }
            })
        )
    );

    console.log(`Listo. Convertidos: ${ok}. Errores: ${fail}. Salida: ${path.resolve(outDir)}`);
};

run().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Fallo inesperado: ${msg}`);
    process.exit(1);
});
