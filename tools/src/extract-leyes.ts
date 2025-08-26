import path from "path";
import fs from "fs-extra";
import fg from "fast-glob";
import { load } from "cheerio";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type LeyLite = {
  page: number;
  indexInPage: number;
  shownNumber: number | null;
  text: string;
  sourceFile: string;
};

function normalizeWhitespace(s: string): string {
  return s.replace(/\r?\n|\t/g, " ").replace(/\s+/g, " ").trim();
}

function leftPad(n: number, width = 4): string {
  const s = String(n);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

function getPageNumberFromFilename(file: string): number {
  // .../divinasleyes.php-pagina=12.htm
  const norm = file.replace(/\\/g, "/");
  const m = norm.match(/divinasleyes\.php-pagina=(\d+)\.htm$/i);
  if (!m || m[1] === undefined) return Number.MAX_SAFE_INTEGER;
  const n = Number.parseInt(m[1], 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

async function writeLey(outDir: string, globalId: number, ley: LeyLite): Promise<void> {
  const idStr = leftPad(globalId);
//   const frontMatter =
//     `---
// type: "divina-ley"
// id: ${globalId}
// id_str: "${idStr}"
// page: ${ley.page}
// index_in_page: ${ley.indexInPage}
// shown_number_in_page: ${ley.shownNumber ?? "null"}
// source_file: "${ley.sourceFile}"
// ---
// `;

//   const md = `${frontMatter}\n${ley.text}\n`;
  const md = `# ${ley.text}`;
  const filename = `${idStr}.md`;
  await fs.writeFile(path.join(outDir, filename), md, "utf8");
}

async function extractFromFileAndWrite(
  file: string,
  outDir: string,
  onProgress?: (wroteOnThisPage: number) => void
): Promise<number> {
  const html = await fs.readFile(file, "utf8");
  const $ = load(html);

  const page = getPageNumberFromFilename(file);
  let skippedIntro = false;
  let indexInPage = 0;
  let wrote = 0;

  // Vamos a ir escribiendo al vuelo. Para mantener el ID global en orden,
  // dejaremos que main() asigne el ID y nos pase un writer.
  // En este diseño, devolvemos las leyes por "yield"... pero para evitar
  // generar arrays, ejecutaremos la escritura desde aquí mediante un callback
  // que nos inyectará main() a través de un closure.
  const writer = (globalThis as any).__LEY_WRITER__ as undefined | ((ley: LeyLite) => Promise<void>);
  if (!writer) {
    throw new Error("Internal: writer not set");
  }

  $("tr.texto").each((_, el) => {
    const $tds = $(el).find("td");

    // Saltar el prólogo SOLO en la página 1, una sola vez:
    if (
      page === 1 &&
      !skippedIntro &&
      ($tds.length === 1 || ($tds.length === 2 && $tds.eq(0).attr("colspan") === "2"))
    ) {
      skippedIntro = true;
      return;
    }

    if ($tds.length === 2) {
      const left = normalizeWhitespace($tds.eq(0).text());
      const right = normalizeWhitespace($tds.eq(1).text());

      if (!/^\d+$/.test(left)) return; // sólo filas con número a la izquierda

      const shownNumber = Number.parseInt(left, 10);
      if (right.length === 0) return;

      indexInPage += 1;
      const ley: LeyLite = {
        page,
        indexInPage,
        shownNumber: Number.isNaN(shownNumber) ? null : shownNumber,
        text: right,
        sourceFile: path.basename(file),
      };

      // Encolamos la escritura inmediata (sin array intermedio)
      // Ojo: no await dentro de .each de cheerio: guardamos promesa y esperamos luego.
      const pending: Promise<void>[] = ((globalThis as any).__PENDING_WRITES__ ||= []);
      pending.push(writer(ley).then(() => { wrote += 1; }));
    }
  });

  // Vaciamos el DOM y damos oportunidad al GC.
  $.root().empty();

  // Esperamos que terminen todas las escrituras de esta página
  const pending = ((globalThis as any).__PENDING_WRITES__ ||= []) as Promise<void>[];
  if (pending.length) {
    await Promise.all(pending.splice(0, pending.length));
  }

  // Ceder el event loop y permitir GC si está expuesto
  await new Promise<void>((r) => setImmediate(r));
  (global as any).gc?.();

  onProgress?.(wrote);
  return wrote;
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .option("in", { type: "string", default: "../docs", describe: "Directorio raíz donde están los HTML" })
    .option("out", { type: "string", default: "./markdown/divinas-leyes", describe: "Directorio de salida para los Markdown" })
    .option("pattern", { type: "string", default: "divinasleyes.php-pagina=*.htm", describe: "Patrón glob para localizar las páginas de leyes" })
    .option("from", { type: "number", describe: "Página inicial (inclusive) para procesar", default: undefined })
    .option("to", { type: "number", describe: "Página final (inclusive) para procesar", default: undefined })
    .option("concurrency", { type: "number", default: 1, describe: "Ignorado (forzado a 1 para mantener orden y memoria baja)" })
    .option("progress", { type: "boolean", default: true, describe: "Mostrar progreso cada 100 leyes" })
    .help()
    .parse();

  const inDir = path.resolve(String(argv.in ?? ""));
  const outDir = path.resolve(String(argv.out ?? ""));
  const pattern = String(argv.pattern ?? "");
  const from = (argv.from ?? undefined) as number | undefined;
  const to = (argv.to ?? undefined) as number | undefined;
  const showProgress = Boolean(argv.progress);

  const files: string[] = (await fg(pattern, {
    cwd: inDir,
    dot: false,
    onlyFiles: true,
    absolute: true,
  }))
    .filter(f => {
      const p = getPageNumberFromFilename(f);
      if (from !== undefined && p < from) return false;
      if (to !== undefined && p > to) return false;
      return true;
    })
    .sort((a, b) => getPageNumberFromFilename(a) - getPageNumberFromFilename(b));

  if (files.length === 0) {
    console.log(`⚠️  No se encontraron archivos con el patrón: ${pattern} en ${inDir}`);
    return;
  }

  await fs.ensureDir(outDir);

  let globalId = 0;
  let written = 0;
  let pagesOk = 0;

  // Writer CLARO y sin arrays: asigna ID global y escribe
  (globalThis as any).__LEY_WRITER__ = async (ley: LeyLite) => {
    globalId += 1;
    await writeLey(outDir, globalId, ley);
    if (showProgress && globalId % 100 === 0) {
      //console.log(`... ${globalId} leyes escritas`);
    }
  };

  for (const file of files) {
    const page = getPageNumberFromFilename(file);
    const wroteOnPage = await extractFromFileAndWrite(file, outDir, (count) => {
      // noop; queda para logging si querés por página
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Error leyendo ${path.basename(file)} (página ${page}):`, msg);
      return 0;
    });

    if (wroteOnPage > 0) {
      pagesOk += 1;
      written += wroteOnPage;
    }

    // Seguridad extra entre páginas (GC y ceder loop)
    await new Promise<void>((r) => setImmediate(r));
    (global as any).gc?.();
  }

  console.log(`Listo. Leyes escritas: ${written}. Páginas procesadas: ${pagesOk}/${files.length}. Salida: ${outDir}`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("💥 Error fatal:", msg);
  process.exit(1);
});
