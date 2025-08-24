const { exec: execCb } = require("child_process");
const { promisify } = require("util");
const path = require("node:path");

const exec = promisify(execCb);
const TOOLS_DIR = path.resolve(__dirname, "..", "..", "tools");

function run(cmd, cwd = TOOLS_DIR) {
  return async () => {
    console.log(`📦 Running: ${cmd}`);
    await exec(cmd, { cwd });
  };
}

function npmRun(script) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return run(`${npmCmd} run ${script} --silent`);
}

function nodeOut(file, extraArgs = []) {
  const args = extraArgs.join(" ");
  return run(`"${process.execPath}" out/${file} ${args}`);
}

module.exports = { run, npmRun, nodeOut };
