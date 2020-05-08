#!/bin/sh

sMongoCmd="mongo -port 2001"
echo "show dbs;" | ${sMongoCmd}
[ $? -ne 0 ] && echo "执行失败"
