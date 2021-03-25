#!/bin/bash
#enter input encoding here
FROM_ENCODING="value_here"
#output encoding(UTF-8)
TO_ENCODING="UTF-8"
#loop to remove multiples old files
for  file  in  *.htm; do
	     rm "$file"
     done
     exit 0
#loop to change name of multiple new files
for  file  in  *.utf8.converted; do
	     rm "$file"
     done
     exit 0
