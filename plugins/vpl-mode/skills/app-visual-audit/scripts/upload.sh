#!/bin/bash
# usage: AUDIT_DIR=<folder> upload.sh <capture-name> <submitUrl> [<capture-name> <submitUrl> ...]  -> POSTs captures in parallel, prints placedOnNodeId
A=${AUDIT_DIR:?set AUDIT_DIR to the capture folder}
while [ $# -gt 1 ]; do
  ( r=$(curl -s -F "file=@$A/$1.png;type=image/png" "$2"); echo "$1 -> $(echo "$r" | grep -o '"placedOnNodeId":"[^"]*"\|"error[^,]*' | head -1)" ) &
  shift 2
done
wait
