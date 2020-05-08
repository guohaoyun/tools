#!/bin/sh

sMongoCmd="mongo -port 2001"
echo -e 'use wntv3;\nshow tables;' | ${sMongoCmd}
[ $? -ne 0 ] && echo "执行失败"
