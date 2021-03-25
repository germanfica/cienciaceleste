#!/bin/bash
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
	echo $file
	echo $file | rev | cut -c16- | rev
	mv "$file" "${file%.htm}.htm"
done
#message 2
echo $msg2
#exit program
exit 0
