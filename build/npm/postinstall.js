// build/npm/postinstall.js
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const { installTools, installFrontend } = require("./install");

const TOOLS_DIR = path.resolve(__dirname, "../../tools");
const FRONTEND_DIR = path.resolve(__dirname, "../../frontend");

function truthyEnv(key) {
  const v = process.env[key];
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return !(s === "" || s === "0" || s === "false" || s === "no" || s === "off");
}

function hasPackageJson(dir) {
  try {
    return fs.existsSync(path.join(dir, "package.json"));
  } catch {
    return false;
  }
}

async function runStep(name, fn) {
  console.log(`[postinstall] ${name}: npm install`);
  await fn();
  console.log(`[postinstall] ${name}: ok`);
}

async function main() {
  // Switches para desactivar el postinstall (útil en CI o installs especiales)
  if (truthyEnv("SKIP_POSTINSTALL") || truthyEnv("SKIP_SUBPROJECT_INSTALL")) {
    console.log("[postinstall] skipped (SKIP_POSTINSTALL / SKIP_SUBPROJECT_INSTALL)");
    return;
  }

  const doTools = !truthyEnv("SKIP_TOOLS_INSTALL") && hasPackageJson(TOOLS_DIR);
  const doFrontend =
    !truthyEnv("SKIP_FRONTEND_INSTALL") && hasPackageJson(FRONTEND_DIR);

  if (!doTools && !doFrontend) {
    console.log("[postinstall] nothing to do (missing package.json or skipped)");
    return;
  }

  // Secuencial para logs más claros y evitar saturar la máquina en postinstall
  if (doTools) await runStep("tools", installTools);
  if (doFrontend) await runStep("frontend", installFrontend);

  console.log("[postinstall] done");
}

main().catch((err) => {
  console.error("[postinstall] failed");
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});