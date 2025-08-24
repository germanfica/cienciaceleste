const { task } = require("gulp");

function holaMundo(done) {
  console.log("👋 Hola Mundo desde Gulp!");
  done();
}

// registrar la tarea explícitamente
task("hola", holaMundo);
task("default", holaMundo);
