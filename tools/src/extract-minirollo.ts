import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { load, type CheerioAPI } from "cheerio";
import iconv from "iconv-lite";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type Nullable<T> = T | null;
const COLLECTION_TITLE = "DIVINA REVELACION ALFA Y OMEGA";

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
const ensureDir = (p: string) => fs.mkdir(p, { recursive: true }).then(() => { });
const decodeUtf8 = (raw: Buffer) => iconv.decode(raw, "utf8");

function extractIdPagina(fileName: string): { id: Nullable<string>; pagina: Nullable<string> } {
	const base = path.basename(fileName);
	return {
		id: base.match(/id=(\d+)/i)?.[1] ?? null,
		pagina: base.match(/pagina=(\d+)/i)?.[1] ?? null,
	};
}

function toUpperKebabKeepAccents(s: string): string {
	return normalize(s).replace(/\s+/g, "-").toUpperCase();
}

function buildOutName(srcFile: string, title: string): string {
	const { id, pagina } = extractIdPagina(srcFile);
	const t = title ? toUpperKebabKeepAccents(title) : "SIN-TITULO";
	if (id && pagina) return `id-${id}_pagina-${pagina}__${t}.md`;
	if (id) return `id-${id}__${t}.md`;
	return `${t}.md`;
}

function looksLikeServerError(html: string): boolean {
	return normalize(html).toLowerCase().includes("error al conectar al servidor");
}

function isTriviallyEmptyMarkdown(md: string): boolean {
	const cleaned = md
		.replace(/!\[[^\]]*]\([^)]*\)/g, " ")
		.replace(/^#{1,6}\s+.*$/gm, " ")
		.replace(/[*_`>#\[\]()]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return cleaned.length < 10;
}

function extractTitle($: CheerioAPI, fallback: string): string {
	const t1 = normalize($(".titulorollo").first().text()); // en minirollos también está
	if (t1) return t1;
	const t2 = normalize($("title").first().text());
	if (t2) return t2;
	return fallback;
}

function extractParagraphsMini($: CheerioAPI): string[] {
	const res: string[] = [];

	const candidates = [
		"td.catalogo",       // caso real de minirollo
		".catalogo",
		".contenido",
		"div#contenido",
		"div.content",
	];

	let found = false;
	for (const sel of candidates) {
		if ($(sel).length) {
			found = true;
			$(sel).each((_, el) => {
				const html = (($(el).html() as string) || "").replace(/<\s*br\s*\/?>/gi, "\n");
				const text = normalize(load(html)("<div>").html(html).text()).replace(/\n+/g, "\n");
				for (const ln of text.split("\n")) {
					const t = ln.trim();
					if (t) res.push(t);
				}
			});
			break;
		}
	}

	if (!found) {
		// fallback muy conservador
		$("p").each((_, p) => {
			const t = normalize($(p).text());
			if (t) res.push(t);
		});
	}

	// Merge líneas cortas
	const merged: string[] = [];
	let buf: string[] = [];
	const flush = () => { if (buf.length) { merged.push(buf.join(" ")); buf = []; } };
	for (const line of res) { buf.push(line); if (line.length >= 80) flush(); }
	flush();
	return merged;
}

async function main() {
	const argv = await yargs(hideBin(process.argv))
		.option("in", { type: "string", demandOption: true })
		.option("out", { type: "string", demandOption: true })
		.option("pattern", { type: "string", demandOption: true })
		.option("concurrency", { type: "number", default: 8 })
		.option("verbose", { type: "boolean", default: false })
		.parse();

	const IN = path.resolve(String(argv.in));
	const OUT = path.resolve(String(argv.out));
	const pattern = String(argv.pattern);
	const verbose = Boolean(argv.verbose);

	await ensureDir(OUT);

	const files = await fg(pattern, { cwd: IN, absolute: true, dot: false });
	let ok = 0, err = 0, skErr = 0, skEmpty = 0;

	const worker = async (src: string) => {
		try {
			const raw = await fs.readFile(src);
			const html = decodeUtf8(raw);

			if (looksLikeServerError(html)) { skErr++; if (verbose) console.log("[skip] server error:", src); return; }

			const $ = load(html);
			const title = extractTitle($, path.basename(src, path.extname(src)));
			const paras = extractParagraphsMini($);

			const parts = [`# ${title}`, ""];
			for (const p of paras) { parts.push(p, ""); }
			while (parts.length && parts.at(-1) === "") parts.pop();

			const md = parts.join("\n");
			if (isTriviallyEmptyMarkdown(md)) { skEmpty++; if (verbose) console.log("[skip] empty:", src); return; }

			const outName = buildOutName(src, COLLECTION_TITLE);
			await fs.writeFile(path.join(OUT, outName), md, "utf8");
			ok++;
		} catch (e) {
			err++; console.error("[error]", src, "\n ", e instanceof Error ? e.message : String(e));
		}
	};

	const limit = Math.max(1, Number(argv.concurrency) || 1);
	const queue = [...files];
	const runners = Array.from({ length: Math.min(limit, queue.length) }, async function run() {
		while (queue.length) {
			const f = queue.shift();
			if (!f) break;
			await worker(f);
		}
	});
	await Promise.all(runners);

	console.log(`Listo. Convertidos: ${ok}. Errores: ${err}. Omitidos(error_pages): ${skErr}. Omitidos(vacío): ${skEmpty}. Salida: ${OUT}`);
}

main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
