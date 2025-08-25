// build/gulpfile.js (Gulp 5, CommonJS)
const { task } = require("gulp");
const { clean } = require("./npm/rollos");
const { cleanInit, cleanPost } = require("./npm/clean");
const { buildMdRollos, buildAllRollos, buildMdMiniRollos, buildAllMini} = require("./npm/pipelines"); // buildAllMini, buildAllLeyes

// Clean tasks
task("clean:init", cleanInit);
task("clean:post", cleanPost);
task("clean", clean);

// Rollos
task("build:md:rollos", buildMdRollos);
task("build:all:rollos", buildAllRollos);

// Mini rollos
task("build:md:mini", buildMdMiniRollos);
task("build:all:mini", buildAllMini);

// Leyes
// task("build:all:leyes", buildAllLeyes);

// Default: full rollos
task("default", buildAllRollos);
