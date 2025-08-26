// build/gulpfile.js (Gulp 5, CommonJS)
const { task } = require("gulp");
const { clean } = require("./npm/rollos");
const { cleanInit, cleanPost } = require("./npm/clean");
const {
    buildMdRollos,
    buildAllRollos,
    buildMdMiniRollos,
    buildAllMini,
    buildMdLeyes,
    buildAllLeyes,
    buildAllDocs,
} = require("./npm/pipelines");
const { frontendStart, frontendBuild, frontendWatch, frontendTest, frontendBuildProd } = require("./npm/frontend");

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

// Divinas Leyes
task("build:md:leyes", buildMdLeyes);
task("build:all:leyes", buildAllLeyes);

// Rollos + Mini + Divinas Leyes
task("build:all:docs", buildAllDocs);

// Frontend
task("frontend:start", frontendStart);
task("frontend:build", frontendBuild);
task("frontend:build:prod", frontendBuildProd);
task("frontend:watch", frontendWatch);
task("frontend:test", frontendTest);

// Default: full rollos
task("default", buildAllRollos);
