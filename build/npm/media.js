const { spawn } = require("node:child_process");
const path = require("node:path");
const { series } = require("gulp");
const root = path.resolve(__dirname, "../..");
function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`Proceso terminado: ${code}`)));
  });
}
function compileMedia() { return run("npm", ["run", "build", "--silent"], path.join(root, "tools")); }
function execute(operation) {
  return run(process.execPath, [path.join(root, "tools/out/media.js"), operation, "--public", path.join(root, "frontend/public")], root);
}
exports.mediaIndex = series(compileMedia, function mediaIndex() { return execute("index"); });
exports.mediaImport = series(compileMedia, function mediaImport() {
  if (!process.env.MEDIA_SOURCE) throw new Error("Falta MEDIA_SOURCE=/ruta/imagen.jpg");
  return execute("import");
});
