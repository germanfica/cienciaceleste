// build/gulpfile.js (Gulp 5, CommonJS)
const { task } = require("gulp");
const { clean } = require("./npm/rollos");
const { buildMdRollos, buildAllRollos } = require("./npm/pipelines"); // buildAllMini, buildAllLeyes

task("clean", clean);

// Rollos
task("build:md:rollos", buildMdRollos);
task("build:all:rollos", buildAllRollos);

// Mini rollos
// task("build:all:mini", buildAllMini);

// Leyes
// task("build:all:leyes", buildAllLeyes);

// Default: full rollos
task("default", buildAllRollos);
