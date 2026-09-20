// build/npm/install.js
const { spawn } = require("node:child_process");
const path = require("node:path");

const TOOLS_DIR = path.resolve(__dirname, "../../tools");
const FRONTEND_DIR = path.resolve(__dirname, "../../frontend");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "cmd.exe" : "npm";

function npmInstall(cwd, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const args = isWin
      ? ["/c", "npm", "install", ...extraArgs]
      : ["install", ...extraArgs];

    const child = spawn(npmCmd, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install exited with code ${code} (cwd: ${cwd})`));
    });
  });
}

/**
 * Allows passing flags through environment variables:
 *
 * - INSTALL_ARGS="--no-fund --no-audit"
 * - TOOLS_INSTALL_ARGS="..."
 * - FRONTEND_INSTALL_ARGS="..."
 */
function parseExtraArgs(envKey) {
  const raw = process.env[envKey] || "";
  return raw.trim() ? raw.trim().split(/\s+/) : [];
}

function effectiveArgs(perProjectKey) {
  return [...parseExtraArgs("INSTALL_ARGS"), ...parseExtraArgs(perProjectKey)];
}

async function installTools() {
  return npmInstall(TOOLS_DIR, effectiveArgs("TOOLS_INSTALL_ARGS"));
}

async function installFrontend() {
  return npmInstall(FRONTEND_DIR, effectiveArgs("FRONTEND_INSTALL_ARGS"));
}

module.exports = {
  installTools,
  installFrontend,
};