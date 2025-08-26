/**
 * Convenciones de naming:
 * - *Core: pipeline base sin cleanInit / cleanPost.
 * - buildMd*: incluye cleanInit + Core + cleanPost.
 * - buildAll*: buildMd + pasos de rename / index / json / pages.
 * - buildAllDocs: orquestador global que usa los *Core* para evitar cleans intermedios.
 */

const { series } = require("gulp");
const rollos = require("./rollos");
const { cleanInit, cleanPost } = require("./clean");
const mini = require("./divinos-minirollos");
const leyes = require("./divinas-leyes");

// Pipelines para rollos
const buildMdRollosCore = series(rollos.convert, rollos.dedup, rollos.checkSequence);
const buildMdRollos = series(cleanInit, buildMdRollosCore, cleanPost);
const buildAllRollos = series(cleanInit, buildMdRollos, rollos.renameId, rollos.indexReadme, rollos.mdJson, rollos.indexPages, cleanPost);

// Pipelines para divinos mini rollos
const buildMdMiniRollosCore = series(mini.convert, mini.dedup, mini.checkSequence);
const buildMdMiniRollos = series(
  cleanInit,
  buildMdMiniRollosCore,
  cleanPost
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
const buildMdLeyesCore = series(leyes.convert, leyes.dedup, leyes.checkSequence);
const buildMdLeyes = series(
  cleanInit,
  buildMdLeyesCore,
  cleanPost
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

// corre Rollos + Mini + Divinas Leyes
const buildAllDocs = series(
  cleanInit,
  // Rollos
  buildMdRollosCore,
  rollos.renameId,
  rollos.indexReadme,
  rollos.mdJson,
  rollos.indexPages,
  // Mini-rollos
  buildMdMiniRollosCore,
  mini.renameId,
  mini.indexReadme,
  mini.mdJson,
  mini.indexPages,
  // Divinas Leyes
  buildMdLeyesCore,
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
  buildAllDocs
};
