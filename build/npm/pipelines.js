const { series } = require("gulp");
const rollos = require("./rollos");
const { cleanInit, cleanPost } = require("./clean");
const mini = require("./divinos-minirollos");
const leyes = require("./divinas-leyes");

// Pipelines para rollos
const buildMdRollos = series(rollos.convert, rollos.dedup, rollos.checkSequence);
const buildAllRollos = series(cleanInit, buildMdRollos, rollos.renameId, rollos.indexReadme, rollos.mdJson, rollos.indexPages, cleanPost);

// Pipelines para divinos mini rollos
const buildMdMiniRollos = series(
  mini.convert,
  mini.dedup,
  mini.checkSequence
);

const buildAllMini = series(
  cleanInit,
  buildMdMiniRollos,
  mini.renameId,
  mini.indexReadme,
  mini.mdJson,
  mini.indexPages,
  cleanPost
);

// Pipelines para divinas leyes
const buildMdLeyes = series(
  leyes.convert,
  leyes.dedup,
  leyes.checkSequence
);

const buildAllLeyes = series(
  cleanInit,
  buildMdLeyes,
  leyes.renameId,
  leyes.indexReadme,
  leyes.mdJson,
  leyes.indexPages,
  cleanPost
);

module.exports = {
  buildMdRollos,
  buildAllRollos,
  buildMdMiniRollos,
  buildAllMini,
  buildMdLeyes,
  buildAllLeyes,
};
