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

function extractAuthor($: CheerioAPI): string | undefined {
	const td = $("td.titulorollo").first();
	if (!td.length) return undefined;

	const html = td.html() ?? "";
	const [firstLineHtml = ""] = html.split(/<br\s*\/?>/i);
	const firstLineText = load(firstLineHtml).root().text().trim();

	const re = /^ESCRIBE\s*[:.\-–—]?\s*(.+?)\s*$/i;
	const m = re.exec(firstLineText);
	if (!m) return undefined;

	const rawAuthor = m[1];            // string | undefined
	if (!rawAuthor) return undefined;  // narrow a string

	const author = rawAuthor.replace(/\s*[.\-–—]+$/, "").trim();
	return author || undefined;
}

function stripArticleBoilerplate(s: string): string {
	// Caso completo: "ESCRITURA TELEPÁTICA DICTADA POR EL DIVINO PADRE JEHOVÁ.- ARTICULO Nº 1.- "
	const RE_PREFIX_FULL =
		/^\s*ESCRITURA\s+TELEP[ÁA]TICA\s+DICTADA\s+POR\s+EL\s+DIVINO\s+PADRE\s+JEHOV[ÁA]\s*[.\-–—]*\s*ART[ÍI]CULO\s*N[º°]?\s*\d+\s*[.\-–—]*\s*/i;

	// Por si viniera solo "ARTICULO Nº 1.- " sin la parte anterior:
	const RE_PREFIX_ART_ONLY =
		/^\s*ART[ÍI]CULO\s*N[º°]?\s*\d+\s*[.\-–—]*\s*/i;

	let t = s.replace(RE_PREFIX_FULL, "");
	t = t.replace(RE_PREFIX_ART_ONLY, "");
	return t;
}

function extractTitle($: CheerioAPI): string {
	const td = $("td.titulorollo").first(); // en minirollos también está
	if (!td.length) return "";

	const html = td.html() ?? "";
	const parts = html.split(/<br\s*\/?>/i);

	// Si hay varias líneas, descartamos la primera (posible "ESCRIBE: ...")
	if (parts.length > 1) {
		const restHtml = parts.slice(1).join("<br>");
		let restText = load(restHtml).root().text();
		restText = stripArticleBoilerplate(restText);
		return normalizeSpaces(restText);
	}

	// Sin <br>, devolvemos el texto completo
	return normalizeSpaces(td.text());
}

/** Agrega "*author*" al final de parts con un salto previo si hace falta. */
function applyAuthorSignature(parts: string[], author?: string): void {
	if (!author) return;
	if (parts.length && parts[parts.length - 1] !== "") parts.push("");
	parts.push(`*Escribe: ${author}*`);
}

function normalizeSpaces(s: string): string {
	return s.replace(/\s+/g, " ").trim();
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
			const title = extractTitle($);
			const author = extractAuthor($);
			const paras = extractParagraphsMini($);

			const parts = [`# ${title}`, ""];
			for (const p of paras) { parts.push(p, ""); }

			// Autor al final (firma)
			applyAuthorSignature(parts, author);

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
