// build/npm/frontend.js
const { spawn } = require("node:child_process");
const path = require("node:path");

const FRONTEND_DIR = path.resolve(__dirname, "../../frontend");
const isWin = process.platform === "win32";
const npmCmd = isWin ? "cmd.exe" : "npm";

function runNpm(script, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const args = isWin
      ? ["/c", "npm", "run", script, "--", ...extraArgs]
      : ["run", script, "--", ...extraArgs];
    const child = spawn(npmCmd, args, {
      cwd: FRONTEND_DIR,
      stdio: "inherit",
      shell: false,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm run ${script} exited with code ${code}`));
    });
  });
}

// Permite pasar flags con FRONTEND_ARGS="--configuration production"
function parseExtraArgs() {
  const raw = process.env.FRONTEND_ARGS || "";
  return raw.trim() ? raw.split(" ") : [];
}

async function frontendStart() {
  return runNpm("start", parseExtraArgs());
}

async function frontendBuild() {
  return runNpm("build", parseExtraArgs());
}

async function frontendWatch() {
  // watcher queda en primer plano hasta Ctrl+C
  return runNpm("watch", parseExtraArgs());
}

async function frontendTest() {
  return runNpm("test", parseExtraArgs());
}

module.exports = {
  frontendStart,
  frontendBuild,
  frontendWatch,
  frontendTest,
};
