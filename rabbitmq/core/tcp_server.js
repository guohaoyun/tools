/**
 * Created by xuezhongxiong on 2016/8/22.
 */
'use strict';
const net  = require('net');
const zlib = require('zlib');
const UUID   = require('uuid');

const lodash = require('lodash');
const iconv  = require('iconv-lite');
const zstd   = require('node-zstd');

const config = global.config;
const logger = global.logger;

const { ip624 } = require('../tools/common');
const { encrypt, decrypt } = require('../tools/crypt');
const uuidReg = /^(\w{32})($|\.\w+)/;

const AUTH_TIMEOUT = 30 * 1000;
const anqpServer = require('./amqp_server');
const Publish = require('../mongodb/publish');
const Msgtype = require('../mongodb/msgtype');
const Project = require('../mongodb/project');


/**
 * 已验证通过的服务器列表
 * @type {{Client}}
 */
const clientList = {};

/**
 * 收集所有连上的socket连接（无论是否验证通过）
 * @type {Set}
 */
const allConnections = new Set();

/**
 * 服务器类
 * @param socket 套接字对象
 * @returns {Client}
 * @constructor
 */
function Client(socket) {
  if (!(this instanceof Client)) return new Client(socket);
  allConnections.add(this);

  socket.setNoDelay(false);
  socket.setKeepAlive(true, 10 * 1000);

  this.time     = new Date();
  this.ip       = ip624(socket.remoteAddress);
  this.address  = `${this.ip}:${socket.remotePort}`;
  this.encoding = 'utf8';

  // socket和buffer不可见
  Object.defineProperty(this, 'socket', { configurable: true, writable: true, value: socket });
  Object.defineProperty(this, 'buffer', { configurable: true, writable: true, value: new Buffer(0) });
  Object.defineProperty(this, 'authChecker', { configurable: true, writable: true });

  socket.on('data', this.onData.bind(this));
  socket.on('end', this.onEnd.bind(this));
  socket.on('close', this.onClose.bind(this));
  socket.on('error', this.onError.bind(this));

  logger.trace(`[${this.address}] new socket connect`);

  this.sendMessage({ action: 'getauth' });

  this.authChecker = setTimeout(() => { // 超时未验证的服务器将被断开
    if (!this.alreadyAuth) {
      logger.warn(`[${this.address}] auth timeout`);
      this.destroy();
    }
  }, AUTH_TIMEOUT);
}

Client.prototype.onEnd = function () {
  logger.info(`${this.getLogInfo()} sokect is end.`);
  this.onData();
  this.destroy();
};

Client.prototype.onClose = function () {
  logger.warn(`${this.getLogInfo()} sokect is close.`);
  this.destroy();
};

Client.prototype.onError = function (err) {
  logger.warn(`${this.getLogInfo()} sokect has error : ${err.message}`);
  this.destroy();
};

/**
 * tcp消息块到达的处理函数
 * @param chunk
 */
Client.prototype.onData = function (chunk = new Buffer(0)) {
  let buffer = Buffer.concat([this.buffer, chunk]);

  if (buffer.length > 4) {
    let packLength = buffer.readUInt32LE(0);

    while (packLength <= buffer.length) {          //达到长度
      if (packLength > 16 * 1024 * 1024) {         //大小超限
        this.buffer = new Buffer(0);
        return;
      }

      const packBuff = buffer.slice(0, packLength);  //从缓冲区取出
      buffer         = buffer.slice(packLength);

      if (packBuff[packLength - 1] === 0) {        //尾标记正确
        const encryptMark = packBuff.readInt8(4);
        const msgBuff     = packBuff.slice(5, packLength - 1);

        this.onPackage(msgBuff, encryptMark);
      }

      packLength = buffer.length >= 4 ? buffer.readUInt32LE(0) : Infinity;//长度不足不再继续
    }
  }

  this.buffer = buffer;
};

/**
 * 消息包的解析函数
 * @param buffer        二进制数据
 * @param encryptMark   加密标记
 */
Client.prototype.onPackage = function (buffer, encryptMark) {
  let msg;

  try {
    switch (encryptMark) {
      case 2:       //仅压缩
        buffer = zlib.unzipSync(buffer);
        break;
      case 4:       //使用zstd算法解压
        buffer = zstd.decompressSync(buffer);
        break;
      case 5:
        buffer = decrypt(buffer);
        break;
    }
    let str = iconv.decode(buffer, this.encoding);
    str     = str.replace(/[\u0000-\u001F\u2028\u2029]/g, ''); //去除不合法的unicode字节（文本出现乱码的时候会有这种情况）
    msg     = JSON.parse(str);
  } catch (err) {
    return logger.error(`${this.getLogInfo()} message parse has error : ${err.message}, encryptMark: ${encryptMark}, msg(base64): ${buffer.toString('base64')}`);
  }

  logger.trace(`receive ${this.getLogInfo()} : ${JSON.stringify(msg)}, encryptMark: ${encryptMark}, encoding: ${this.encoding}`);
  //20190509添加：如果通信方使用了加密规则，那么返回消息时也使用该规则做加密
  if (encryptMark) this.encrypt = encryptMark;

  return this.onMessage(msg);
};


/**
 * 消息分发函数
 * @param msg
 */
Client.prototype.onMessage = function (msg) {

  if (`inner_${msg.action}` in this)    //本身有预置处理函数（基本验证协议）则自己处理
    return this[`inner_${msg.action}`](msg);

  //否则发消息
  if (!this.alreadyAuth) return logger.warn(`[${this.address}] no auth but got a message : ${JSON.stringify(msg)}`);
  if (!this.connectSucceed) return logger.warn(`[${this.address}] no connect succeed but got a message : ${JSON.stringify(msg)}`);

  if (!(msg && msg.action)) return logger.warn(`[${this.address}] get a message without action : ${JSON.stringify(msg)}`);

  return this.sendMessage({ action: msg.action, recode: 201, msg: `no such action` }).destroy();

};


/**
 * 消息发送函数
 * @param message {Object}
 * @param encrypt {Number}
 */
Client.prototype.sendMessage = function (message, encrypt = 0) {
  try {
    encrypt = encrypt || this.encrypt || 0;

    let msgBuff = iconv.encode(JSON.stringify(message), this.encoding);

    switch (encrypt) {
      case 2:
        msgBuff = zlib.gzipSync(msgBuff);                //压缩
        break;
      case 4:
        msgBuff = zstd.compressSync(msgBuff);         //zstd算法压缩
        break;
      case 5:
        msgBuff = encrypt(msgBuff);
        break;
    }

    const packLength = msgBuff.length + 6;
    const packBuff   = new Buffer(packLength);

    packBuff.writeInt32LE(packLength, 0);
    packBuff.writeInt8(encrypt, 4);
    msgBuff.copy(packBuff, 5, 0, msgBuff.length);
    packBuff.writeInt8(0, packLength - 1);

    this.socket.write(packBuff);

    logger.trace(`send to ${this.getLogInfo()} : ${JSON.stringify(message)}, encrypt: ${encrypt}, encoding: ${this.encoding}`);

  } catch (err) {
    logger.error(`send to ${this.getLogInfo()} has error : ${err}`);
  }

  return this;
};



/**
 * 销毁一个client实例
 * @return {Client}
 */
Client.prototype.destroy = function () {
  if (this.closed === true) return this;
  this.closed = true;//只运行一次

  logger.info(`destroy a server ${this.getLogInfo()}`);

  if (this.id && clientList[this.id] === this)
    delete clientList[this.id];

  allConnections.delete(this);

  try {
    this.socket.end();
  } catch (e) {
    //noop
  }

  clearTimeout(this.authChecker);

  return this;
};

/**
 * 握手协议
 * @param msg
 */
Client.prototype.inner_r_getauth = async function (msg) {
  if (this.alreadyAuth || this.closed) return;

  if (!msg.server) {      //passPort不正确则断开连接
    this.sendMessage({ action: 'setstep', recode: 101, msg: `missing params` }).destroy();
    return;
  }

  if (msg.passport !== config.auth.passport) {      //passPort不正确则断开连接
    logger.warn(`[${this.address}] send a wrong passport : ${msg.passport}`);
    this.sendMessage({ action: 'setstep', recode: 102, msg: `wrong passport : ${msg.passport}` }).destroy();
    return;
  }

  if (clientList[msg.server] && clientList[msg.server] !== this) {   //已存在同id服务器
    if (matchIP(msg.server, this.socket.remoteAddress) ||              //处于允许互顶的条件（配置文件中存在且ip地址匹配）
      clientList[msg.server].socket.remoteAddress === this.socket.remoteAddress) {  //或者旧连接与新连接ip地址相同
      logger.info(`服务器[${msg.server}]新连接${this.address}替换旧连接${clientList[msg.server].address}`);
      clientList[msg.server].destroy();                               //断掉原服务器

    } else {                                                           //否则断开新服务器
      logger.warn(`服务器[${msg.server}]新连接${this.address}被拒绝，当前连接ip${clientList[msg.server].socket.remoteAddress}`);
      this.sendMessage({
        action: 'setstep',
        recode: 103,
        msg   : `server [${msg.server}] is already exist`
      }).destroy();
      return;
    }
  }
  this.alreadyAuth = true;
  this.id          = msg.server;
  this.info        = lodash.get(config, ['serverinfo', this.id], {});
  this.encoding = msg.encoding || lodash.get(this, 'info.encoding', 'utf8');
  this.gate     = msg.gate || lodash.get(this, 'info.gate');

  clientList[msg.server] = this; //不管最后有没有连成功，先占坑避免有2台同时连上
  clearTimeout(this.authChecker);

  this.publish = await getPublishItem(msg.publishId);
  console.log(this.publish);
  
  
  if (!this.publish) {
    logger.debug(`服务器[${msg.server}]新连接${this.address}被拒绝，无法创建publish对象`, msg);
    this.sendMessage({ action: 'setstep', recode: 301, msg: `server has an error` }).destroy();
    return;
  }

  this.sendMessage({ action: 'setstep', recode: 0, step: 'authsucceed', msg: 'connect succeed' });
  this.connectSucceed = true;

  logger.info(`${this.getLogInfo()} connect succeed`);

  // this.afterConnected();
};

/**
 * 握手确认协议
 * @param msg
 */
Client.prototype.inner_r_setstep = function (msg) {
  if (msg.recode !== 0) {
    logger.warn(`[${this.address}] server send a wrong code in action_r_setstep : ${msg.recode}`);
    this.destroy();
  }
};

Client.prototype.inner_publishData = function (msg) {
  logger.info(msg);
};

Client.prototype.getLogInfo = function () {
  return `gate[${this.gate}], server[${this.ip}], address[${this.address}]`;
};


/**
 * 验证ip是否匹配config
 * @param server
 * @param ip
 * @return {boolean}
 */
function matchIP(server, ip) {
  ip = ip624(ip);
  try {
    return config.serverinfo[server].localip === ip ||
      config.serverinfo[server].ip === ip ||
      config.serverinfo[server].netcomip === ip;
  } catch (err) {
    return false;
  }
}

async function getPublishItem(id) {
  const publish = await Publish.findOne({ id });
  const project = await Project.findOne({ id: publish.projectId });
  const msgtype = await Msgtype.find({ publishId: id, status: { '$ne': -1 } }).toArray();
  publish.msgtype = msgtype;
  publish.project = project;
  return publish;
}

/**
 * 暴露Promise
 */
const connectServer = module.exports = net.createServer({ allowHalfOpen: false }, Client);
connectServer.clientList     = clientList;
connectServer.Client         = Client;
connectServer.allConnections = allConnections;
connectServer.connectSucceed = new Promise((resolve, reject) => {
  connectServer
    .on('error', err => {
      logger.error(`create tcp server error : ${err.message}`);
      reject(err);
    })
    .on('listening', () => {
      logger.info(`tcp services running in ${config.tcpPort}`);
      resolve(connectServer);
    })
    .listen(config.tcpPort);
});