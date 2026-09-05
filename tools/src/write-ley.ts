import fs, { type FileHandle } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type WriteLeyRequest =
  | {
      operation: "create";
      pagina: number;
      shownNumber: number;
      contenido: string;
    }
  | {
      operation: "update";
      pagina: number;
      indexInPage: number;
      shownNumber?: number;
      contenido: string;
    };

const LEYES_PER_PAGE = 100;

type JsonObject = Record<string, unknown>;

type TableCell = {
  attributes: string;
  html: string;
};

type SourceRow = {
  start: number;
  end: number;
  html: string;
  cells: TableCell[];
};

type LeyRow = SourceRow & {
  shownNumber: number;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${field} debe ser un entero mayor que cero.`);
  }
  return Number(value);
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} debe ser texto.`);
  }

  const text = value.replace(/\r\n?/g, "\n").trim();
  if (!text) throw new Error(`${field} no puede estar vacío.`);
  if (text.includes("\0")) throw new Error(`${field} contiene un carácter nulo.`);
  return text;
}

function parseRequest(value: unknown): WriteLeyRequest {
  if (!isObject(value)) throw new Error("La solicitud debe ser un objeto JSON.");

  const pagina = positiveInteger(value["pagina"], "pagina");
  const contenido = requiredText(value["contenido"], "contenido");

  if (value["operation"] === "create") {
    return {
      operation: "create",
      pagina,
      shownNumber: positiveInteger(value["shownNumber"], "shownNumber"),
      contenido,
    };
  }

  if (value["operation"] === "update") {
    const rawShownNumber = value["shownNumber"];
    return {
      operation: "update",
      pagina,
      indexInPage: positiveInteger(value["indexInPage"], "indexInPage"),
      contenido,
      ...(rawShownNumber === undefined
        ? {}
        : { shownNumber: positiveInteger(rawShownNumber, "shownNumber") }),
    };
  }

  throw new Error('operation debe ser "create" o "update".');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderText(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>\n");
}

function renderLeyRow(shownNumber: number, contenido: string): string {
  return [
    '<tr class="texto">',
    `  <td valign="top">${shownNumber}</td>`,
    `  <td valign="top">${renderText(contenido)}</td>`,
    "</tr>",
  ].join("\n");
}

function renderLeyPage(pagina: number, shownNumber: number, contenido: string): string {
  const row = renderLeyRow(shownNumber, contenido)
    .split("\n")
    .map(line => `      ${line}`)
    .join("\n");

  return [
    "<!doctype html>",
    '<html lang="es">',
    "  <head>",
    '    <meta charset="utf-8">',
    `    <title>Divinas leyes - página ${pagina}</title>`,
    "  </head>",
    "  <body>",
    "    <table>",
    "      <tbody>",
    row,
    "      </tbody>",
    "    </table>",
    "  </body>",
    "</html>",
    "",
  ].join("\n");
}

function attributeValue(attributes: string, name: string): string | null {
  const expression = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = expression.exec(attributes);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function hasClass(attributes: string, className: string): boolean {
  const classes = attributeValue(attributes, "class");
  return classes?.split(/\s+/).includes(className) ?? false;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function plainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function cellsFromRow(rowHtml: string): TableCell[] {
  const cells: TableCell[] = [];
  const expression = /<td\b([^>]*)>([\s\S]*?)<\/td\s*>/gi;
  let match: RegExpExecArray | null;

  while ((match = expression.exec(rowHtml)) !== null) {
    cells.push({
      attributes: match[1] ?? "",
      html: match[2] ?? "",
    });
  }

  return cells;
}

function scanRows(html: string, pagina: number): {
  textRows: SourceRow[];
  leyes: LeyRow[];
} {
  const textRows: SourceRow[] = [];
  const leyes: LeyRow[] = [];
  const expression = /<tr\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  let skippedIntro = false;

  while ((match = expression.exec(html)) !== null) {
    const attributes = match[1] ?? "";
    if (!hasClass(attributes, "texto")) continue;

    // Scan opening tags separately so outer layout rows do not consume laws.
    const closing = /<\/tr\s*>/gi;
    closing.lastIndex = expression.lastIndex;
    const end = closing.exec(html);
    if (!end) throw new Error(`Fila sin cierre en la página ${pagina}.`);
    const rowEnd = closing.lastIndex;
    const rowHtml = html.slice(match.index, rowEnd);
    if (/<tr\b/i.test(html.slice(expression.lastIndex, end.index))) {
      throw new Error(`Fila de ley con filas anidadas en la página ${pagina}.`);
    }
    expression.lastIndex = rowEnd;
    const row: SourceRow = {
      start: match.index,
      end: expression.lastIndex,
      html: rowHtml,
      cells: cellsFromRow(rowHtml),
    };
    textRows.push(row);

    const isIntro =
      row.cells.length === 1 ||
      (row.cells.length === 2 && attributeValue(row.cells[0]?.attributes ?? "", "colspan") === "2");

    if (pagina === 1 && !skippedIntro && isIntro) {
      skippedIntro = true;
      continue;
    }

    if (row.cells.length !== 2) continue;
    const left = plainText(row.cells[0]?.html ?? "");
    const right = plainText(row.cells[1]?.html ?? "");
    if (!/^\d+$/.test(left) || !right) continue;

    leyes.push({
      ...row,
      shownNumber: Number.parseInt(left, 10),
    });
  }

  return { textRows, leyes };
}

function indentationAt(html: string, offset: number): string {
  const start = html.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const prefix = html.slice(start, offset);
  return /^[\t ]*$/.test(prefix) ? prefix : "      ";
}

function appendLeyRow(html: string, pagina: number, rowHtml: string): string {
  const { textRows, leyes } = scanRows(html, pagina);
  const anchor = leyes.at(-1) ?? textRows.at(-1);
  const newline = html.includes("\r\n") ? "\r\n" : "\n";

  if (anchor) {
    const indent = indentationAt(html, anchor.start);
    const rendered = rowHtml.replace(/\n/g, `${newline}${indent}`);
    return html.slice(0, anchor.end) + newline + indent + rendered + html.slice(anchor.end);
  }

  const closing = /<\/tbody\s*>/i.exec(html) ?? /<\/table\s*>/i.exec(html);
  if (!closing) {
    throw new Error("La página de leyes existente no contiene una tabla compatible.");
  }

  const lineStart = html.lastIndexOf("\n", Math.max(0, closing.index - 1)) + 1;
  const indent = indentationAt(html, closing.index);
  const rendered = rowHtml.replace(/\n/g, `${newline}${indent}`);
  return html.slice(0, lineStart) + indent + rendered + newline + html.slice(lineStart);
}

function updateLeyRow(
  html: string,
  pagina: number,
  indexInPage: number,
  contenido: string,
  shownNumber?: number,
): string {
  const { leyes } = scanRows(html, pagina);
  const row = leyes[indexInPage - 1];
  if (!row) {
    throw new Error(
      `No existe la ley ${indexInPage} dentro de la página ${pagina}. ` +
      `La página contiene ${leyes.length}.`,
    );
  }

  const replacement = renderLeyRow(shownNumber ?? row.shownNumber, contenido);
  const indent = indentationAt(html, row.start);
  const newline = html.includes("\r\n") ? "\r\n" : "\n";
  const rendered = replacement.replace(/\n/g, `${newline}${indent}`);
  return html.slice(0, row.start) + rendered + html.slice(row.end);
}

async function removeIfPresent(file: string): Promise<void> {
  try {
    await fs.unlink(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function withFileLock<T>(target: string, action: () => Promise<T>): Promise<T> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const lockPath = `${target}.lock`;
  let lock: FileHandle;

  try {
    lock = await fs.open(lockPath, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`El archivo está siendo modificado por otro proceso: ${target}`);
    }
    throw error;
  }

  try {
    await lock.writeFile(`${process.pid}\n`, "utf8");
    return await action();
  } finally {
    await lock.close();
    await removeIfPresent(lockPath);
  }
}

async function writeAtomic(target: string, html: string): Promise<void> {
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  try {
    await fs.writeFile(temporary, html, "utf8");
    await fs.rename(temporary, target);
  } finally {
    await removeIfPresent(temporary);
  }
}

type LeyPage = {
  pagina: number;
  target: string;
  html: string;
  leyes: LeyRow[];
};

async function readLeyPages(directory: string): Promise<Map<number, LeyPage>> {
  const pages = new Map<number, LeyPage>();
  for (const name of (await fs.readdir(directory)).sort()) {
    const match = /^divinasleyes\.php-pagina=(\d+)\.htm$/.exec(name);
    if (!match) continue;
    const pagina = positiveInteger(Number(match[1]), "pagina del archivo");
    if (pages.has(pagina)) {
      throw new Error(`Hay varios archivos para la página ${pagina}.`);
    }
    const target = path.join(directory, name);
    const html = await fs.readFile(target, "utf8");
    pages.set(pagina, { pagina, target, html, leyes: scanRows(html, pagina).leyes });
  }
  return pages;
}

function assertNumberAvailable(
  pages: Map<number, LeyPage>,
  shownNumber: number,
  excluded?: { pagina: number; indexInPage: number },
): void {
  for (const page of pages.values()) {
    for (const [index, ley] of page.leyes.entries()) {
      if (excluded?.pagina === page.pagina && excluded.indexInPage === index + 1) continue;
      if (ley.shownNumber === shownNumber) {
        throw new Error(
          `Ya existe una ley con shownNumber ${shownNumber} en la página ${page.pagina} ` +
          `(posición ${index + 1}). No se guardó ningún cambio.`,
        );
      }
    }
  }
}

export async function writeLeyHtml(rawRequest: unknown, docsDir: string): Promise<string> {
  const request = parseRequest(rawRequest);
  const directory = path.resolve(docsDir);

  // All pages share the same lock: validation and writes must be serialized.
  return withFileLock(path.join(directory, "divinasleyes"), async () => {
    const pages = await readLeyPages(directory);

    if (request.operation === "update") {
      const page = pages.get(request.pagina);
      if (!page) {
        throw new Error(`No existe la página de leyes que se quiere modificar: ${request.pagina}`);
      }
      if (request.shownNumber !== undefined) {
        assertNumberAvailable(pages, request.shownNumber, request);
      }
      const updated = updateLeyRow(
        page.html,
        request.pagina,
        request.indexInPage,
        request.contenido,
        request.shownNumber,
      );
      await writeAtomic(page.target, updated);
      return page.target;
    }

    assertNumberAvailable(pages, request.shownNumber);

    // pagina is the starting page; full pages are never appended to.
    let pagina = request.pagina;
    while ((pages.get(pagina)?.leyes.length ?? 0) >= LEYES_PER_PAGE) {
      pagina += 1;
      positiveInteger(pagina, "pagina de destino");
    }
    const page = pages.get(pagina);
    const target = page?.target ?? path.join(directory, `divinasleyes.php-pagina=${pagina}.htm`);
    const updated = page
      ? appendLeyRow(page.html, pagina, renderLeyRow(request.shownNumber, request.contenido))
      : renderLeyPage(pagina, request.shownNumber, request.contenido);
    await writeAtomic(target, updated);
    return target;
  });
}

function optionValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function readStdin(): Promise<string> {
  process.stdin.setEncoding("utf8");
  let input = "";
  for await (const chunk of process.stdin) input += String(chunk);
  return input;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const inputPath = optionValue(argv, "--input") ?? process.env["DOC_INPUT"];
  const docsDir = path.resolve(
    optionValue(argv, "--docs") ?? process.env["DOCS_DIR"] ?? "../docs",
  );

  if (!inputPath) {
    throw new Error("Falta --input <solicitud.json> o la variable DOC_INPUT.");
  }

  const raw = inputPath === "-"
    ? await readStdin()
    : await fs.readFile(path.resolve(inputPath), "utf8");
  const target = await writeLeyHtml(JSON.parse(raw) as unknown, docsDir);
  console.log(`Divina ley guardada: ${target}`);
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(path.resolve(entryPoint)).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
