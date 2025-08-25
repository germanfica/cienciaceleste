const { series } = require("gulp");
const rollos = require("./rollos");
const { cleanInit, cleanPost } = require("./clean");
// const mini = require("./divinos-mini-royos");
// const leyes = require("./divinas-leyes");

// Pipelines para rollos
const buildMdRollos = series(rollos.convert, rollos.dedup, rollos.checkSequence);
const buildAllRollos = series(cleanInit, buildMdRollos, rollos.renameId, rollos.indexReadme, rollos.mdJson, rollos.indexPages, cleanPost);

// Pipelines para divinos mini rollos
// const buildAllMini = series(mini.convertMini /*, mini.dedupMini, …*/);

// Pipelines para divinas leyes
// const buildAllLeyes = series(/* leyes.convert, leyes.dedup, … */);

module.exports = {
  buildMdRollos,
  buildAllRollos,
  // buildAllMini,
  // buildAllLeyes,
};
