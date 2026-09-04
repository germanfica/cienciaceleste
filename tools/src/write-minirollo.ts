import fs, { type FileHandle } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type WriteMinirolloRequest = {
  operation: "create" | "replace";
  id: number;
  pagina: number;
  titulo: string;
  contenido: string;
  autor?: string | null;
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
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

function optionalText(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requiredText(value, field);
}

function parseRequest(value: unknown): WriteMinirolloRequest {
  if (!isObject(value)) throw new Error("La solicitud debe ser un objeto JSON.");

  const operation = value["operation"];
  if (operation !== "create" && operation !== "replace") {
    throw new Error('operation debe ser "create" o "replace".');
  }

  const hasAutor = Object.prototype.hasOwnProperty.call(value, "autor");
  const autor = optionalText(value["autor"], "autor");
  return {
    operation,
    id: positiveInteger(value["id"], "id"),
    pagina: positiveInteger(value["pagina"], "pagina"),
    titulo: requiredText(value["titulo"], "titulo"),
    contenido: requiredText(value["contenido"], "contenido"),
    ...(hasAutor ? { autor } : {}),
  };
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

function paragraphs(value: string): string[] {
  return value
    .replace(/\r\n?/g, "\n")
    .split(/\n[\t ]*\n+/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function renderMinirolloHtml(request: WriteMinirolloRequest): string {
  const title = request.autor
    ? `ESCRIBE: ${renderText(request.autor)}<br>\n${renderText(request.titulo)}`
    : renderText(request.titulo);

  const contentRows = paragraphs(request.contenido)
    .map(paragraph => [
      "      <tr>",
      `        <td class="catalogo">${renderText(paragraph)}</td>`,
      "      </tr>",
    ].join("\n"))
    .join("\n");

  return [
    "<!doctype html>",
    '<html lang="es">',
    "  <head>",
    '    <meta charset="utf-8">',
    `    <title>${escapeHtml(request.titulo)}</title>`,
    "  </head>",
    "  <body>",
    "    <table>",
    "      <tr>",
    `        <td class="titulorollo">${title}</td>`,
    "      </tr>",
    contentRows,
    "    </table>",
    "  </body>",
    "</html>",
    "",
  ].join("\n");
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

function existingAuthor(html: string): string | null {
  const cells = /<td\b([^>]*)>([\s\S]*?)<\/td\s*>/gi;
  let match: RegExpExecArray | null;

  while ((match = cells.exec(html)) !== null) {
    const attributes = match[1] ?? "";
    const classMatch = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes);
    const classNames = classMatch?.[1] ?? classMatch?.[2] ?? classMatch?.[3] ?? "";
    if (!classNames.split(/\s+/).includes("titulorollo")) continue;

    const firstLine = (match[2] ?? "").split(/<br\s*\/?>/i)[0] ?? "";
    const text = decodeEntities(firstLine.replace(/<[^>]*>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    const author = /^ESCRIBE\s*[:.\-–—]?\s*(.+?)\s*$/i.exec(text)?.[1]
      ?.replace(/\s*[.\-–—]+$/, "")
      .trim();
    return author || null;
  }

  return null;
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
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

export async function writeMinirolloHtml(
  rawRequest: unknown,
  docsDir: string,
): Promise<string> {
  const request = parseRequest(rawRequest);
  const target = path.resolve(
    docsDir,
    `detalleminirollo.php-id=${request.id}&pagina=${request.pagina}.htm`,
  );

  await withFileLock(target, async () => {
    const targetExists = await exists(target);
    if (request.operation === "create" && targetExists) {
      throw new Error(`El divino minirollo ya existe: ${target}`);
    }
    if (request.operation === "replace" && !targetExists) {
      throw new Error(`No existe el divino minirollo que se quiere reemplazar: ${target}`);
    }

    let requestToRender = request;
    if (request.operation === "replace" && request.autor === undefined) {
      const current = await fs.readFile(target, "utf8");
      const autor = existingAuthor(current);
      if (autor) requestToRender = { ...request, autor };
    }

    await writeAtomic(target, renderMinirolloHtml(requestToRender));
  });

  return target;
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
  const target = await writeMinirolloHtml(JSON.parse(raw) as unknown, docsDir);
  console.log(`Divino minirollo guardado: ${target}`);
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(path.resolve(entryPoint)).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
