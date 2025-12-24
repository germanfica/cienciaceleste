// build/npm/gen-doc-ids.js
// Gulp 5 (CommonJS) script to generate a TypeScript file
// containing arrays of document IDs based on JSON files
// found in the public folder of the project.
const { readdir, writeFile, mkdir } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const path = require("node:path");
const log = require("fancy-log");

const ROOT = path.resolve(__dirname, "..", "..");

function findPublicForDocs() {
  const candidates = [
    path.join(ROOT, "frontend", "public"),
    path.join(ROOT, "tools", "public"),
    path.join(ROOT, "public"),
  ];

  for (const c of candidates) {
    if (existsSync(path.join(c, "docs"))) return c;
  }
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  throw new Error(
    `No encontre una carpeta public valida. Probe:\n` +
    candidates.map((c) => `- ${c}`).join("\n")
  );
}

async function idsFromJsonFiles(absDir) {
  if (!existsSync(absDir)) {
    throw new Error(`No existe la carpeta: ${absDir}`);
  }

  const entries = await readdir(absDir, { withFileTypes: true });
  const ids = entries
    .filter((e) => e.isFile() && /^\d+\.json$/.test(e.name))
    .map((e) => Number(e.name.replace(/\.json$/, "")))
    .sort((a, b) => a - b);

  if (ids.length === 0) {
    throw new Error(`No encontre "*.json" numericos en: ${absDir}`);
  }

  return ids;
}

async function genDocIds() {
  const publicDir = findPublicForDocs();

  const rolloDir = path.join(publicDir, "docs", "rollo");
  const miniDir = path.join(publicDir, "docs", "divino-minirollo");

  const [rollo, mini] = await Promise.all([
    idsFromJsonFiles(rolloDir),
    idsFromJsonFiles(miniDir),
  ]);

  const outFile = path.join(
    ROOT,
    "frontend",
    "src",
    "app",
    "doc-viewer",
    "generated-doc-ids.ts"
  );

  const out = `// AUTO-GENERATED. DO NOT EDIT.
// Source: ${path.relative(ROOT, publicDir)}

export const ROLLO_IDS = ${JSON.stringify(rollo)} as const;
export const MINIROLLO_IDS = ${JSON.stringify(mini)} as const;
`;

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, out, "utf8");

  log.info(`🧩 generated-doc-ids.ts -> ${path.relative(ROOT, outFile)}`);
  log.info(`   rollo: ${rollo.length} ids | mini: ${mini.length} ids`);
}

module.exports = { genDocIds };
