// build/npm/strip-angular-scripts.js
const fs = require("node:fs/promises");
const path = require("node:path");

async function walk(dir, out = []) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) await walk(p, out);
    else if (it.isFile() && it.name.endsWith(".html")) out.push(p);
  }
  return out;
}

/**
 * Borra <script> típicos del build de Angular dentro del dist.
 * Ojo: si los borrás, la app Angular no va a bootear (queda "estática").
 */
async function stripAngularScripts(distDir) {
  const dist = distDir ? path.resolve(distDir) : path.resolve(__dirname, "../../frontend/dist/cienciaceleste/browser");
  const files = await walk(dist);

  for (const file of files) {
    let html = await fs.readFile(file, "utf8");
    // runtime/polyfills/main/styles/scripts con hash, con "-" o ".", con o sin path previo
    html = html.replace(/<script\b(?=[^>]*\bsrc="[^"]*(?:\/)?(?:polyfills|main|runtime|styles|scripts)(?:[-.][^"]*)?\.js")[^>]*>\s*<\/script>\s*/g, "");
    // cualquier script module con src .js (orden libre)
    html = html.replace(/<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="[^"]*\.js")[^>]*>\s*<\/script>\s*/g, "");
    // cualquier nomodule con src .js (orden libre)
    html = html.replace(/<script\b(?=[^>]*\bnomodule\b)(?=[^>]*\bsrc="[^"]*\.js")[^>]*>\s*<\/script>\s*/g, "");
    // inline contract de eventos
    html = html.replace(/<script\b(?=[^>]*\bid="ng-event-dispatch-contract")[^>]*>[\s\S]*?<\/script>\s*/g, "");
    // estado de Angular (no hace falta si querés puro estático)
    html = html.replace(/<script\b(?=[^>]*\bid="ng-state")[^>]*>[\s\S]*?<\/script>\s*/g, "");
    // llamada a __jsaction_bootstrap (queda colgada si borraste el contract)
    html = html.replace(/<script\b[^>]*>\s*window\.__jsaction_bootstrap\([^<]*\);\s*<\/script>\s*/g, "");
    // borrar <noscript>...</noscript> (ya no aporta si no hay JS)
    html = html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>\s*/g, "");
    await fs.writeFile(file, html, "utf8");
  }
}

module.exports = { stripAngularScripts };
