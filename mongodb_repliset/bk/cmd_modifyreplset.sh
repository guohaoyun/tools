#!/bin/sh

. ./pubdefines.sh

#获取mongo口令
sReplName="$(GetConfig "replSet")"
echo "${sReplName}"
sPassFile="${SHELL_MONGO_DIR}/${sReplName}.pass"
sDBName="$(grep "^db=" ${sPassFile}|awk -F '=' '{print $2}')"
sDBUser="$(grep "^username=" ${sPassFile}|awk -F '=' '{print $2}')"
sDBPass="$(grep "^pass=" ${sPassFile}|awk -F '=' '{print $2}')"

sMongoCmd="mongo "${sDBName}" -u ${sDBUser} -p ${sDBPass}"

sAction="$1"
case ${sAction} in
addnode)
        sNewHost="$2"
        echo "向复制集${sReplName}添加${sNewHost}"
        ${sMongoCmd} --eval "rs.add('${sNewHost}')"
        [ $? -ne 0 ] && echo "执行失败"
        ;;
addarb)
        sArbNode="$2"
        echo "向复制集${sReplName}添加仲裁${sArbNode}"
        ${sMongoCmd} --eval "rs.addArb('${sArbNode}')"
        [ $? -ne 0 ] && echo "执行失败"
        ;;
delnode)
        sHost="$2"
        echo "从复制集${sReplName}中移除${sHost}"
        ${sMongoCmd} --eval "rs.remove('${sHost}')"
        [ $? -ne 0 ] && echo "执行失败"
        ;;
status)
        echo "========== db.stats() =========="
        ${sMongoCmd} --eval "db.stats()"

        echo "\n========== rs.status() =========="
        ${sMongoCmd} --eval "rs.status()"
        ;;
start)
        echo "启动本地mongodb"
        /etc/init.d/dy_mongodb start
        if [ $? -ne 0 ];then
                echo "mongodb启动失败,请检查日志确认原因"
        fi
        ;;
restart)
        echo "重启本地mongodb"
        /etc/init.d/dy_mongodb restart
        ;;
        stepDown)
${sMongoCmd} --eval "rs.stepDown()"
[ $? -ne 0 ] && echo "因为执行降级命令会强制断开所有客户端连接，所以出现error doing query: failed: network error while attempting to run command 'replSetStepDown' on host 'xxx' 是正常的"
;;
config)
${sMongoCmd} --eval "rs.conf()"
[ $? -ne 0 ] && echo "执行失败"
;;
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
[ $? -ne 0 ] && echo "执行失败"
;;
*)
        echo "Useage: sh modifymongodb.sh [addnode|addarb|delnode|status|start|restart]"
        exit
        ;;
esac

