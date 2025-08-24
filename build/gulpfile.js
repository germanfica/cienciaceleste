// build/gulpfile.js (Gulp 5, CommonJS)
const { series, task } = require("gulp");
const { exec: execCb } = require("child_process");
const { promisify } = require("util");
const path = require("node:path");

const exec = promisify(execCb);

/**
 * Absolute path to the "tools" package where build scripts live.
 * All commands below run from this directory unless stated otherwise.
 */
const TOOLS_DIR = path.resolve(__dirname, "..", "tools");

/**
 * Create a Gulp-compatible thunk that executes a shell command.
 * The command's stdout/stderr will be streamed to the console.
 *
 * @param {string} cmd - Command to execute.
 * @param {string} [cwd=TOOLS_DIR] - Working directory to execute the command in.
 * @returns {() => Promise<void>} A function for Gulp to await.
 */
function run(cmd, cwd = TOOLS_DIR) {
  return async () => {
    console.log(`📦 Running: ${cmd}`);
    await exec(cmd, { cwd });
  };
}

/**
 * Run an npm script from the "tools" package in a cross-platform way.
 * On Windows, uses "npm.cmd" to ensure the local npm is invoked.
 *
 * @param {string} script - The npm script name to run (e.g., "build").
 * @returns {() => Promise<void>}
 */
function npmRun(script) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return run(`${npmCmd} run ${script} --silent`);
}

/**
 * Run a compiled Node script from "tools/out" using the current Node binary.
 * Prefer process.execPath over "node" for reliability across environments.
 *
 * @param {string} file - File path under "out/" (e.g., "index.js").
 * @param {string[]} [extraArgs=[]] - Additional CLI args (joined with spaces).
 * @returns {() => Promise<void>}
 */
function nodeOut(file, extraArgs = []) {
  const args = extraArgs.join(" ");
  return run(`"${process.execPath}" out/${file} ${args}`);
}

/**
 * Base tasks (previously in tools/scripts) orchestrated here via Gulp.
 * Keep ordering deterministic with series(...) to avoid race conditions.
 */
const clean = npmRun("clean");
const buildTS = npmRun("build");

/** Extract raw content into Markdown (clean → build → scrape/convert). */
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

/** De-duplicate and normalize Markdown into "complete" and "duplicates". */
const dedup = series(
  buildTS,
  nodeOut("clean-dedup.js", [
    "--src ./markdown",
    "--dest ./complete",
    "--duplicates ./duplicates",
    "--commit",
  ])
);

/** Validate ID/page continuity and check for gaps. */
const checkSequence = series(
  buildTS,
  nodeOut("check-sequence.js", [
    "--dir ./complete",
    "--checkPages true",
    "--pageStartAt 1",
  ])
);

/** Rename files to a canonical "id" format. */
const renameId = series(
  buildTS,
  nodeOut("rename-to-id.js", ["--dir ./complete", "--commit"])
);

/** Generate an index/README for the normalized content. */
const indexReadme = series(
  buildTS,
  nodeOut("build-index.js", ["--dir ./complete", "--out ./complete/README.md"])
);

/** Convert Markdown to JSON artifacts and produce a docs index. */
const mdJson = series(
  buildTS,
  nodeOut("md-to-json.js", [
    "--src complete",
    "--out public/docs/rollo",
    "--index public/docs/rollo/docs-index.json",
  ])
);

/** Build paginated JSON index pages from the master docs index. */
const indexPages = series(
  buildTS,
  nodeOut("generate-index-pages.js", [
    "--index ./public/docs/rollo/docs-index.json",
    "--out ./public/docs/rollo/index/pages",
    "--pageSize 10",
  ])
);

/**
 * Composite pipelines
 * - buildMd: end-to-end Markdown production and validation.
 * - buildAll: full pipeline from extraction to paginated JSON indices.
 */
const buildMd = series(convert, dedup, checkSequence);
const buildAll = series(buildMd, renameId, indexReadme, mdJson, indexPages);

/**
 * Explicit task registration (Gulp 5 task API).
 * "default" runs the full build for convenience.
 */
task("clean", clean);
task("build:md", buildMd);
task("build:all", buildAll);
task("default", buildAll);
