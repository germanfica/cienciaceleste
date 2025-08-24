const { series } = require("gulp");
const { npmRun, nodeOut } = require("./helpers");

const clean = npmRun("clean");
const buildTS = npmRun("build");

const convert = series(
  clean,
  buildTS,
  nodeOut("index.js", [
    "--in ../docs/",
    "--out ./markdown",
    `--pattern "detallerollo.php-id=*\\&pagina=*.htm"`,
    "--images true",
    "--concurrency 8",
  ])
);

const dedup = series(buildTS,
  nodeOut("clean-dedup.js", [
    "--src ./markdown",
    "--dest ./complete",
    "--duplicates ./duplicates",
    "--commit",
  ])
);

const checkSequence = series(buildTS,
  nodeOut("check-sequence.js", [
    "--dir ./complete",
    "--checkPages true",
    "--pageStartAt 1",
  ])
);

const renameId = series(buildTS,
  nodeOut("rename-to-id.js", ["--dir ./complete", "--commit"])
);

const indexReadme = series(buildTS,
  nodeOut("build-index.js", ["--dir ./complete", "--out ./complete/README.md"])
);

const mdJson = series(buildTS,
  nodeOut("md-to-json.js", [
    "--src complete",
    "--out public/docs/rollo",
    "--index public/docs/rollo/docs-index.json",
  ])
);

const indexPages = series(buildTS,
  nodeOut("generate-index-pages.js", [
    "--index ./public/docs/rollo/docs-index.json",
    "--out ./public/docs/rollo/index/pages",
    "--pageSize 10",
  ])
);

module.exports = {
  clean,
  buildTS,
  convert,
  dedup,
  checkSequence,
  renameId,
  indexReadme,
  mdJson,
  indexPages,
};
