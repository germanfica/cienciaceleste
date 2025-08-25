// build/npm/clean.js
const fs = require("node:fs/promises");
const path = require("node:path");
const log = require("fancy-log");

// Raíz del repo (donde vive tu package.json raíz)
const ROOT = path.resolve(__dirname, "..", "..");
const TOOLS = "tools";
//const TOOLS_DIR = path.resolve(ROOT, "tools");

// Listas de carpetas a limpiar
const TARGETS_INIT = ["public", "out", "markdown", "duplicates", "complete"].map((p) => path.join(TOOLS, p));;
const TARGETS_POST = ["duplicates", "markdown"].map((p) => path.join(TOOLS, p));;

// Seguridad mínima para evitar borrar algo indebido
function assertSafe(absPath) {
  if (absPath === ROOT) {
    throw new Error("Refusing to delete project root.");
  }
  const rel = path.relative(ROOT, absPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Refusing to delete outside repo root: ${absPath}`);
  }
}

async function rmDir(absPath) {
  assertSafe(absPath);
  await fs.rm(absPath, { recursive: true, force: true });
  //log.info(`🗑️  removed ${path.relative(ROOT, absPath)}`);
  log.info(`🗑️  removed ${path.relative(ROOT, absPath)} (${absPath})`);
}

function makeCleaner(targets) {
  return async function cleanTask() {
    for (const t of targets) {
      const abs = path.resolve(ROOT, t);
      await rmDir(abs);
    }
  };
}

// Tareas listas para Gulp
const cleanInit = makeCleaner(TARGETS_INIT);
const cleanPost = makeCleaner(TARGETS_POST);

module.exports = { cleanInit, cleanPost, makeCleaner };
