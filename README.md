# Ciencia Celeste
Hice este repositorio con el objetivo de mejorar la interfaz para la lectura de los rollos. El sitio oficial es http://www.alfayomega.pe/.

## Bugs
Todos los archivos deben estar codificados en UTF-8 para que funcione con github pages. Toca ir uno por uno para corregir. Con Notepad++ se puede convertir a UTF-8. El proceso es el siguiente:
- Abrir el archivo con Notepad++.
- Seleccionar todo el contenido a convertir.
- Ir a Encoding > Convert to UTF-8.
- Guardar el archivo y listo.

## Convert Multiple Files to UTF-8 Encoding

Source: https://www.tecmint.com/convert-files-to-utf-8-encoding-in-linux/amp/

**encoding.sh:**
```bash
#!/bin/bash
#enter input encoding here
FROM_ENCODING="value_here"
#output encoding(UTF-8)
TO_ENCODING="UTF-8"
#convert
CONVERT=" iconv  -f   $FROM_ENCODING  -t   $TO_ENCODING"
#loop to convert multiple files 
for  file  in  *.txt; do
     $CONVERT   "$file"   -o  "${file%.txt}.utf8.converted"
done
exit 0
```

## Get encoding of a file

This will give you the encoding details of all the files in the current folder.

```bash
file *
```

## Useful links

- [ISO/IEC 8859-1](https://en.wikipedia.org/wiki/ISO/IEC_8859-1)
- 
