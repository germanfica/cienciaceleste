// build/npm/divino-minirollos.js
// Gulp 5 (CommonJS) pipeline para "divino-minirollo".
// Mismo flujo que rollos.js pero con patrón y rutas adaptadas.

const { series } = require("gulp");
const { npmRun, nodeOut } = require("./helpers");
const { cleanInit, cleanPost } = require("./clean");

// Reutilizamos la misma convención que en rollos.js
const clean = cleanInit;
const buildTS = npmRun("build");

// Namespace y patrón específicos de "divino-minirollo"
const NS = "divino-minirollo";
// Importante: escapar el & como \& para que llegue bien al script
const PATTERN = "detalleminirollo.php-id=*&pagina=*.htm";
// const PATTERN = "detallerollo.php-id=*\\&pagina=*.htm"; // FUNCIONA
//const PATTERN = "detalleminirollo.php-id=*\\&pagina=*.htm";


// 1) Convert: descarga/convierte HTML a markdown
const convert = series(
	clean,
	buildTS,
	nodeOut("index.js", [
		"--in ../docs/",
		`--out ./markdown/${NS}`,
		`--pattern "${PATTERN}"`,
		"--images true",
		"--concurrency 8",
	])
);

// 2) Dedup: mueve buenos a complete/ y duplicados a duplicates/
const dedup = series(
	buildTS,
	nodeOut("clean-dedup.js", [
		`--src ./markdown/${NS}`,
		`--dest ./complete/${NS}`,
		`--duplicates ./duplicates/${NS}`,
		"--commit",
	])
);

// 3) Check sequence: valida IDs y páginas
const checkSequence = series(
	buildTS,
	nodeOut("check-sequence.js", [
		`--dir ./complete/${NS}`,
		"--checkPages true",
		"--pageStartAt 1",
	])
);

// 4) Rename a ID: normaliza nombres a {id}.md (si aplica a tu flujo)
const renameId = series(
	buildTS,
	nodeOut("rename-to-id.js", [
		`--dir ./complete/${NS}`,
		"--commit",
	])
);

// 5) README de índice en la carpeta final
const indexReadme = series(
	buildTS,
	nodeOut("build-index.js", [
		`--dir ./complete/${NS}`,
		`--out ./complete/${NS}/README.md`,
	])
);

// 6) md-to-json: genera JSON por documento + índice global
const mdJson = series(
	buildTS,
	nodeOut("md-to-json.js", [
		`--src complete/${NS}`,
		`--out public/docs/${NS}`,
		`--index public/docs/${NS}/docs-index.json`,
	])
);

// 7) generate-index-pages: pagina el índice en bloques de 10
const indexPages = series(
	buildTS,
	nodeOut("generate-index-pages.js", [
		`--index ./public/docs/${NS}/docs-index.json`,
		`--out ./public/docs/${NS}/index/pages`,
		"--pageSize 10",
	])
);

// Pipeline completo por conveniencia
const buildAll = series(
	convert,
	dedup,
	checkSequence,
	renameId,
	indexReadme,
	mdJson,
	indexPages,
	cleanPost
);

module.exports = {
	// Reexport para consistencia con tu otro pipeline
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
	buildAll,
	// Por si te sirve desde afuera
	NS,
	PATTERN,
};
