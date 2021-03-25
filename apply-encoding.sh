#!/bin/bash
#enter input encoding here
FROM_ENCODING="value_here"
#output encoding(UTF-8)
TO_ENCODING="UTF-8"
#message 1
msg1='Old files have been deleted successfully.'
#message 2
msg2='New files have been renamed successfully.'
#init message
echo Welcome,
#loop to remove multiples old files
for  file  in  *.htm; do
	rm "$file"
done
#message 1
echo $msg1
#loop to change name of multiple new files
for  file  in  *.utf8.converted; do
	rm "$file"
done
#message 2
echo $msg2
#exit program
exit 0
