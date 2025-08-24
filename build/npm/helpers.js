/**
 * tools/npm/helpers.js
 *
 * Provides helper functions to create Gulp-compatible tasks for running shell commands.
 * These tasks use fancy-log for structured logging and child_process for execution.
 *
 * The design returns an async function (thunk) rather than executing immediately.
 * This ensures compatibility with Gulp 5's expectation of receiving task functions,
 * while still leveraging async/await for proper Promise handling.
 */

const { exec: execCb } = require("child_process");
const { promisify } = require("util");
const path = require("node:path");
const log = require("fancy-log");

const exec = promisify(execCb);

// Absolute path to the "tools" package directory where build scripts are located.
const TOOLS_DIR = path.resolve(__dirname, "..", "..", "tools");

/**
 * Creates a Gulp task function that runs a shell command asynchronously.
 *
 * - Uses fancy-log to report command start, success, and failure.
 * - Captures and logs stdout/stderr output when available.
 * - Throws errors to ensure Gulp stops execution if a command fails.
 *
 * @param {string} cmd - The shell command to execute.
 * @param {string} [cwd=TOOLS_DIR] - The working directory in which to run the command.
 * @returns {Function} A Gulp-compatible async task function.
 */
function run(cmd, cwd = TOOLS_DIR) {
  return async function task() {
    log.info(`📦 Running: ${cmd}`);
    try {
      const { stdout, stderr } = await exec(cmd, { cwd });
      if (stdout && stdout.trim()) log(stdout.trim());
      if (stderr && stderr.trim()) log.warn(stderr.trim());
      log.info(`✅ Done: ${cmd}`);
    } catch (err) {
      log.error(`❌ Failed: ${cmd}`);
      if (err.stdout && err.stdout.trim()) log.error(err.stdout.trim());
      if (err.stderr && err.stderr.trim()) log.error(err.stderr.trim());
      throw err;
    }
  };
}

/**
 * Creates a Gulp task function that runs an npm script.
 *
 * Automatically resolves to "npm.cmd" on Windows and "npm" on other platforms.
 *
 * @param {string} script - The npm script name to run.
 * @returns {Function} A Gulp-compatible async task function.
 */
function npmRun(script) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return run(`${npmCmd} run ${script} --silent`);
}

/**
 * Creates a Gulp task function that runs a compiled Node.js output file.
 *
 * Executes the file with the current Node.js process binary (`process.execPath`),
 * passing along optional extra arguments.
 *
 * @param {string} file - The relative file path inside the "out" directory.
 * @param {string[]} [extraArgs=[]] - Optional list of arguments to append.
 * @returns {Function} A Gulp-compatible async task function.
 */
function nodeOut(file, extraArgs = []) {
  const args = extraArgs.join(" ");
  return run(`"${process.execPath}" out/${file} ${args}`);
}

module.exports = { run, npmRun, nodeOut };
