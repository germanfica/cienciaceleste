// build/npm/divinas-leyes.js
// Gulp 5 (CommonJS) pipeline para "divinas-leyes".

const { series } = require("gulp");
const { npmRun, nodeOut } = require("./helpers");
const { cleanInit, cleanPost } = require("./clean");

// Usamos el mismo esquema que en rollos/minirollos
const clean = cleanInit;
const buildTS = npmRun("build");

// Namespace y patrón específicos de "divinas-leyes"
const NS = "divinas-leyes";
// Ejemplos: .../divinasleyes.php-pagina=12.htm
const PATTERN = "divinasleyes.php-pagina=*.htm";

// 1) Convert: HTML -> Markdown
const convert = series(
  buildTS,
  nodeOut("extract-leyes.js", [
    "--in ../docs/",
    `--out ./markdown/${NS}`,
    `--pattern "${PATTERN}"`,
    "--images true",
    "--concurrency 8",
  ])
);

// 2) Dedup: mueve buenos a complete/ y dupes a duplicates/
const dedup = series(
  buildTS,
  nodeOut("clean-dedup.js", [
    `--src ./markdown/${NS}`,
    `--dest ./complete/${NS}`,
    `--duplicates ./duplicates/${NS}`,
    "--commit",
  ])
);

// 3) Check sequence: valida páginas (empiezan en 1)
const checkSequence = series(
  buildTS,
  nodeOut("check-sequence.js", [
    `--dir ./complete/${NS}`,
    "--checkPages true",
    "--pageStartAt 1",
  ])
);

// 4) Rename a ID (opcional según tu flujo, mantenemos paridad)
const renameId = series(
  buildTS,
  nodeOut("rename-to-id.js", [
    `--dir ./complete/${NS}`,
    "--commit",
  ])
);

// 5) README índice
const indexReadme = series(
  buildTS,
  nodeOut("build-index.js", [
    `--dir ./complete/${NS}`,
    `--out ./complete/${NS}/README.md`,
  ])
);

// 6) md-to-json: JSON por doc + índice global
const mdJson = series(
  buildTS,
  nodeOut("md-to-json.js", [
    `--src complete/${NS}`,
    `--out public/docs/${NS}`,
    `--index public/docs/${NS}/docs-index.json`,
  ])
);

// 7) generate-index-pages: paginado (100 por página)
const indexPages = series(
  buildTS,
  nodeOut("generate-index-pages.js", [
    `--index ./public/docs/${NS}/docs-index.json`,
    `--out ./public/docs/${NS}/index/pages`,
    "--pageSize 100",
  ])
);

// Pipeline completo
const buildAll = series(
  convert,
  dedup,
  checkSequence,
  renameId,
  indexReadme,
  mdJson,
  indexPages,
);

module.exports = {
  // etapas sueltas
  clean,
  cleanPost,
  buildTS,
  convert,
  dedup,
  checkSequence,
  renameId,
  indexReadme,
  mdJson,
  indexPages,
  // combo
  buildAll,
  // metadata
  NS,
  PATTERN,
};
