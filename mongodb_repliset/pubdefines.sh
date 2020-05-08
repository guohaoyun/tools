#!/bin/sh
#mongodb公共定义

# . /etc/gs.conf

# SHELL_MONGO_DIR="/home/dy1/script/mongodb"

# #实际使用的配置文件(每次更新配置时生成)
RUNTIME_CONFIG="./mongodb.conf"

GetConfig(){
  local sVar="$1"

  grep "^${sVar}=" ${RUNTIME_CONFIG}|awk -F '=' '{print $2}'
}

# #实际使用的复制集key
# RUNTIME_KEY="/etc/mongodb/replication.key"

# #公共配置文件
# SHELLPUBLIC_CONFIG="/home/dy1/shellpublic/mongodb/mongodb.conf"

# #项目定制的配置文件(公共)
# CUSTOM_PUB_CONFIG="${SHELL_MONGO_DIR}/mongodb.conf"

# #项目定制的配置文件(单服)
# CUSTOM_PRIVY_CONFIG="${SHELL_MONGO_DIR}/mongodb_${SERVERNUM}.conf"

# #复制集IP配置
# REPLICATION_CONFIG="/home/dy1/script/mongodb/replication.ini"

# #service脚本
# SERVICE_SCRIPT="/home/dy1/shellpublic/mongodb/mongodb_service"

# #配置解析脚本
# CONFIG_PARSER="/home/dy1/shellpublic/mongodb/parsereplication.py"

# #日志存放目录
# LOGPATH="/raid/mongodb/log"

# #数据库存放目录
# DATAPATH="/raid/mongodb/data"

# #日志
# LOGFILE="${LOGPATH}/mongodb.log"

# #一些默认配置,缺省时使用
# DEFAULT_REPLNAME="rs1"
# DEFAULT_ROLE="master"
# DEFAULT_PORT="27017"
# DEFAULT_DBNAME="db_mongo"
# DEFAULT_PASSWD="mxworld2006999"
# DEFAULT_KEYFILE="/home/dy1/shellpublic/mongodb/replication.key"

# #下面是mongodb本身的一些配置,这些是固定的,不允许项目定制
# RESERVED_OPTION_LIST="dbpath logpath oplogSize logappend fork auth"

# dbpath="/raid/mongodb/data"
# logpath="${LOGFILE}"
# oplogSize="512"
# logappend="true"
# fork="true"
# auth="true"

# Yellow(){
#         echo "\33[33m$*\33[0m"
# }

# WikiTip(){
#         Yellow "请参考:xxxxx"
# }

# SetConfig(){
#         local sVar="$1"
#         local sValue="$2"

#         #先注释原有配置(如果有),然后写入给定的值
#         sed -i "/^${sVar}=/s/^/#/g" ${RUNTIME_CONFIG}
#         echo "${sVar}=${sValue}" >> ${RUNTIME_CONFIG}
# }

