import path from "path";
import fs from "fs-extra";
import fg from "fast-glob";
import { load } from "cheerio";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type Ley = {
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

async function extractFromFile(file: string): Promise<Ley[]> {
  const html = await fs.readFile(file, "utf8");
  const $ = load(html);

  const page = getPageNumberFromFilename(file);
  const leyes: Ley[] = [];

  let skippedIntro = false;

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

      // Aceptar sólo filas de ley: left debe ser número
      if (!/^\d+$/.test(left)) return;

      const shownNumber = parseInt(left, 10);

      if (right.length > 0) {
        leyes.push({
          page,
          indexInPage: leyes.length + 1,
          shownNumber: Number.isNaN(shownNumber) ? null : shownNumber,
          text: right,
          sourceFile: path.basename(file),
        });
      }
    }
  });

  return leyes;
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .option("in", { type: "string", default: "../docs", describe: "Directorio raíz donde están los HTML" })
    .option("out", { type: "string", default: "./markdown/divinas-leyes", describe: "Directorio de salida para los Markdown" })
    .option("pattern", { type: "string", default: "divinasleyes.php-pagina=*.htm", describe: "Patrón glob para localizar las páginas de leyes" })
    .option("concurrency", { type: "number", default: 8, describe: "Lecturas concurrentes de archivos" })
    .help()
    .parse();

  const inDir = path.resolve(String(argv.in ?? ""));
  const outDir = path.resolve(String(argv.out ?? ""));
  const pattern = String(argv.pattern ?? "");
  const concurrency = Math.max(1, Number(argv.concurrency ?? 1));

  const files: string[] = (await fg(pattern, {
    cwd: inDir,
    dot: false,
    onlyFiles: true,
    absolute: true,
  }))
    .sort((a, b) => getPageNumberFromFilename(a) - getPageNumberFromFilename(b));

  if (files.length === 0) {
    console.log(`⚠️  No se encontraron archivos con el patrón: ${pattern} en ${inDir}`);
    return;
  }

  await fs.ensureDir(outDir);

  const queue: Promise<void>[] = [];
  let active = 0;
  let i = 0;
  const results: Ley[][] = [];

  const launch = (file: string): Promise<void> =>
    extractFromFile(file)
      .then((leyes) => { results.push(leyes); })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error leyendo ${file}:`, msg);
        results.push([]);
      })
      .finally(() => { active--; });

  async function runNext(): Promise<void> {
    while (active < concurrency && i < files.length) {
      const file = files[i++];
      if (file === undefined) break;
      active++;
      const p = launch(file);
      queue.push(p);
    }
    if (active > 0) {
      await Promise.race(queue);
      await runNext();
    }
  }

  await runNext();
  await Promise.all(queue);

  const all: Ley[] = results
    .flat()
    .sort((a, b) => (a.page - b.page) || (a.indexInPage - b.indexInPage));

  let written = 0;
  let errors = 0;

  for (let idx = 0; idx < all.length; idx++) {
    const ley = all[idx];
    if (!ley) continue;

    const globalId = idx + 1;
    const idStr = leftPad(globalId);

    const frontMatter =
      `---
type: "divina-ley"
id: ${globalId}
id_str: "${idStr}"
page: ${ley.page}
index_in_page: ${ley.indexInPage}
shown_number_in_page: ${ley.shownNumber ?? "null"}
source_file: "${ley.sourceFile}"
---
`;

    const md = `${frontMatter}\n${ley.text}\n`;

    try {
      const filename = `ley-${idStr}.md`;
      await fs.writeFile(path.join(outDir, filename), md, "utf8");
      written++;
    } catch (e: unknown) {
      errors++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Error escribiendo ley ${globalId}:`, msg);
    }
  }

  console.log(
    `Listo. Convertidos: ${written}. Errores: ${errors}. Omitidos(error_pages): 0. Omitidos(vacío): ${all.length - written}. ` +
    `Salida: ${outDir}`
  );
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("💥 Error fatal:", msg);
  process.exit(1);
});
