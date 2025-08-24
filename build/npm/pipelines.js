const { series } = require("gulp");
const rollos = require("./rollos");
// const mini = require("./divinos-mini-royos");
// const leyes = require("./divinas-leyes");

// Pipelines para rollos
const buildMdRollos = series(rollos.convert, rollos.dedup, rollos.checkSequence);
const buildAllRollos = series(buildMdRollos, rollos.renameId, rollos.indexReadme, rollos.mdJson, rollos.indexPages);

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
