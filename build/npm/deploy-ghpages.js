// build/npm/deploy-ghpages.js
const { series } = require("gulp");
const { execSync } = require("node:child_process");
const path = require("node:path");
const fs = require("fs");
const ghpages = require("gh-pages");

const FRONTEND_DIR = path.resolve(__dirname, "../../frontend");
const DIST_DIR = path.join(FRONTEND_DIR, "dist/cienciaceleste/browser");

// 1) Build Angular con baseHref para gh-pages
function buildProdGhpages(cb) {
  try {
    execSync("npm run build:production:ghpages", { cwd: FRONTEND_DIR, stdio: "inherit" });
    cb();
  } catch (err) {
    cb(err);
  }
}

// 2) Copiar index.html -> 404.html
function copy404(cb) {
  try {
    const indexFile = path.join(DIST_DIR, "index.html");
    const notFoundFile = path.join(DIST_DIR, "404.html");
    fs.copyFileSync(indexFile, notFoundFile);
    console.log("✔ Copied index.html to 404.html");
    cb();
  } catch (err) {
    cb(err);
  }
}

// 3) Publicar a rama gh-pages
function publishGhpages(cb) {
  ghpages.publish(
    DIST_DIR,
    {
      branch: "gh-pages",
      repo: "https://github.com/germanfica/cienciaceleste.git",
      message: "Deploy Angular app to gh-pages [skip ci]",
    },
    (err) => {
      if (err) {
        console.error("❌ Error deploying:", err);
        cb(err);
      } else {
        console.log("🎉 Deployed successfully to GitHub Pages!");
        cb();
      }
    }
  );
}

const pkg = require("../../frontend/package.json");

function getBaseHref() {
  const buildScript = pkg.scripts["build:production:ghpages"];
  const match = buildScript.match(/--base-href\s+"([^"]+)"/);
  return match ? match[1] : "/";
}

function fixManifestPath(cb) {
  const baseHref = getBaseHref(); // o process.env.BASE_HREF
  const indexFile = path.join(DIST_DIR, "index.html");
  let html = fs.readFileSync(indexFile, "utf8");
  html = html.replace(
    /href="manifest.webmanifest"/,
    `href="${baseHref}manifest.webmanifest"`
  );
  fs.writeFileSync(indexFile, html);
  console.log(`✔ Fixed manifest.webmanifest path to ${baseHref}manifest.webmanifest`);
  cb();
}

// Pipeline para Gulp
const deployGhpages = series(buildProdGhpages, fixManifestPath, copy404, publishGhpages);

module.exports = { deployGhpages };
