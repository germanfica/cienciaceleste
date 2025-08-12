import fs from "node:fs/promises";
import chardet from "chardet";

const buffer = await fs.readFile("mis_htm/detallerollo.php-id=26&pagina=20.htm");
console.log(chardet.detect(buffer)); // Ej: 'UTF-8', 'windows-1252', 'ISO-8859-1'
