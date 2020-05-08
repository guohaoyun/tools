#!/bin/sh

Config="./config"

GetConfig(){
  local sVar="$1"
  grep "^${sVar}=" ${Config}|awk -F '=' '{print $2}'
}

GetConfig "repliset"