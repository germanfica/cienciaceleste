const { series } = require("gulp");
const { npmRun, nodeOut } = require("./helpers");
const { cleanInit, cleanPost } = require("./clean");

//const clean = npmRun("clean");
const clean = cleanInit;
const buildTS = npmRun("build");

const convert = series(
  clean,
  buildTS,
  nodeOut("extract-rollo.js", [
    "--in ../docs/",
    "--out ./markdown/rollo",
    `--pattern "detallerollo.php-id=*\\&pagina=*.htm"`,
    "--images true",
    "--concurrency 8",
  ])
);

const dedup = series(buildTS,
  nodeOut("clean-dedup.js", [
    "--src ./markdown/rollo",
    "--dest ./complete/rollo",
    "--duplicates ./duplicates/rollo",
    "--commit",
  ])
);

const checkSequence = series(buildTS,
  nodeOut("check-sequence.js", [
    "--dir ./complete/rollo",
    "--checkPages true",
    "--pageStartAt 1",
  ])
);

const renameId = series(buildTS,
  nodeOut("rename-to-id.js", ["--dir ./complete/rollo", "--commit"])
);

const indexReadme = series(buildTS,
  nodeOut("build-index.js", ["--dir ./complete/rollo", "--out ./complete/rollo/README.md"])
);

const mdJson = series(buildTS,
  nodeOut("md-to-json.js", [
    "--src complete/rollo",
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
  cleanPost,
  buildTS,
  convert,
  dedup,
  checkSequence,
  renameId,
  indexReadme,
  mdJson,
  indexPages,
};
