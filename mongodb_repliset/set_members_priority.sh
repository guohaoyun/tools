#!/bin/sh

sMongoCmd="mongo wntv3 -port 2005 "
sAction=$1
case ${sAction} in
reconfig)
  if ! echo "$2" | grep -Pq '^[1-9][0-9]*$|^0$'; then
    echo "member索引必须为数字"
    exit
  fi

  if ! echo "$3" | grep -Pq '^[1-9][0-9]*$|^0$'; then
    echo "权重必须为数字"
    exit
  fi
  ${sMongoCmd} --eval "cfg=rs.conf();cfg.members[$2].priority=$3;rs.reconfig(cfg, { force: true })"
  [ $? -ne 0 ] && echo "执行失败1"
  ;;
get_indexes)
  ${sMongoCmd} --eval "db.${2}.getIndexes()"
  ;;
*)
  echo "others"
  ;;
esac
[ $? -ne 0 ] && echo "执行失败2"

