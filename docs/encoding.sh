#!/bin/bash
#enter input encoding here
FROM_ENCODING="iso-8859-1"
#output encoding(UTF-8)
TO_ENCODING="UTF-8"
#convert
CONVERT=" iconv  -f   $FROM_ENCODING  -t   $TO_ENCODING"
#loop to convert multiple files 
for  file  in  *.htm; do
	$CONVERT   "$file"   -o  "${file%.htm}.utf8.converted"
done
echo Applying encoding
#external script
sh ./apply-encoding.sh
#exit
exit 0
