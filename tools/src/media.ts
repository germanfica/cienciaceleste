import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

export type MediaItem = { path: string; name: string; bytes: number; type: string };
const MAX_BYTES = 20 * 1024 * 1024;
const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
function imageType(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return "jpg";
  if (b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "png";
  if (/^GIF8[79]a$/.test(b.subarray(0, 6).toString("ascii"))) return "gif";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}
async function readImage(file: string): Promise<Buffer> {
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_BYTES || !stat.size) throw new Error(`Archivo inválido o mayor de 20 MiB: ${file}`);
    const b = Buffer.alloc(stat.size + 1);
    let size = 0;
    while (size < b.length) {
      const read = await handle.read(b, size, b.length - size, null);
      if (!read.bytesRead) break;
      size += read.bytesRead;
    }
    if (size !== stat.size) throw new Error(`El archivo cambió durante la lectura: ${file}`);
    return b.subarray(0, size);
  } finally { await handle.close(); }
}
async function mediaDirectory(publicDir: string): Promise<string> {
  const root = await fs.realpath(publicDir);
  const directory = path.join(root, "media");
  await fs.mkdir(directory, { recursive: true });
  if ((await fs.lstat(directory)).isSymbolicLink() || await fs.realpath(directory) !== directory) {
    throw new Error("public/media no puede ser un enlace simbólico.");
  }
  return directory;
}
async function locked<T>(publicDir: string, action: (root: string, directory: string) => Promise<T>): Promise<T> {
  const root = await fs.realpath(publicDir);
  const directory = await mediaDirectory(root);
  const lock = path.join(directory, ".media.lock");
  const handle = await fs.open(lock, "wx");
  try { return await action(root, directory); }
  finally { await handle.close(); await fs.unlink(lock); }
}
async function buildIndex(root: string, directory: string): Promise<MediaItem[]> {
  const items: MediaItem[] = [];
  // Legacy images in public root; imported images in media, including subfolders.
  async function scan(folder: string): Promise<void> {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        if (folder !== root || entry.name === "media") await scan(file);
        continue;
      }
      if (!entry.isFile() || !/\.(jpe?g|png|gif|webp)$/i.test(entry.name)) continue;
      try {
        const bytes = await readImage(file);
        const ext = imageType(bytes);
        if (!ext) throw new Error("Firma de imagen no admitida");
        items.push({ path: path.relative(root, file).split(path.sep).map(s => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)).join("/"), name: entry.name, bytes: bytes.length, type: TYPES[ext]! });
      } catch (error) { console.warn(`Omitida ${file}: ${String(error)}`); }
    }
  }
  await scan(root);
  items.sort((a, b) => a.path.localeCompare(b.path));
  const temp = path.join(directory, `.index-${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temp, JSON.stringify({ version: 1, items }, null, 2) + "\n", { flag: "wx" });
    await fs.rename(temp, path.join(directory, "index.json"));
  } finally { await fs.rm(temp, { force: true }); }
  return items;
}
/** Trusted local paths only. A future API must accept uploaded bytes, not client filesystem paths. */
export async function importMedia(sourcePath: string, publicDir: string): Promise<MediaItem[]> {
  const bytes = await readImage(sourcePath);
  const ext = imageType(bytes);
  if (!ext) throw new Error("Solo se admiten JPEG, PNG, GIF y WebP. SVG no está habilitado.");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const stem = path.basename(sourcePath, path.extname(sourcePath)).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "imagen";
  return locked(publicDir, async (root, directory) => {
    const target = path.join(directory, `${stem}-${hash}.${ext}`);
    try { await fs.writeFile(target, bytes, { flag: "wx" }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (!(await readImage(target)).equals(bytes)) throw new Error("El destino existe con contenido diferente.");
    }
    return buildIndex(root, directory);
  });
}
export async function indexMedia(publicDir: string): Promise<MediaItem[]> {
  return locked(publicDir, buildIndex);
}
async function main(): Promise<void> {
  const [operation, ...args] = process.argv.slice(2);
  function option(key: string): string | undefined {
    const i = args.indexOf(key);
    return i < 0 ? undefined : args[i + 1];
  }
  const publicDir = option("--public");
  if (!publicDir) throw new Error("Falta --public <frontend/public>");
  let items: MediaItem[];
  if (operation === "index") items = await indexMedia(publicDir);
  else if (operation === "import") {
    const source = option("--source") ?? process.env["MEDIA_SOURCE"];
    if (!source) throw new Error("Falta --source o MEDIA_SOURCE");
    items = await importMedia(source, publicDir);
  } else throw new Error("Uso: media.js index|import --public <directorio> [--source <archivo>]");
  console.log(`Índice actualizado: ${items.length} imágenes.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
