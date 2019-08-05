'use strict';
const crypto = require('crypto');


module.exports = {

  /**
   * @name aes加密
   * @param {String} data
   * @param {String} key
   */
  aesEncrypt(data, key) {
    const clearEncoding = 'utf8';
    const cipherEncoding = 'base64';
    const cipherChunks = [];
    const cipher = crypto.createCipheriv('aes-256-ecb', key, '');
    cipher.setAutoPadding(true);

    cipherChunks.push(cipher.update(data, clearEncoding, cipherEncoding));
    cipherChunks.push(cipher.final(cipherEncoding));

    return cipherChunks.join('');
  },

  /**
   * @name aes解密
   * @param {String} data
   * @param {String} key
   */
  aesDecrypt(data, key) {
    const clearEncoding = 'utf8';
    const cipherEncoding = 'base64';
    const cipherChunks = [];
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, '');
    decipher.setAutoPadding(true);

    cipherChunks.push(decipher.update(data, cipherEncoding, clearEncoding));
    cipherChunks.push(decipher.final(clearEncoding));

    return cipherChunks.join('');
  },

  /**
   * @name des加密
   * @param {String} data
   * @param {String} key
   * @param {String} iv 初始向量
   * 
   */
  desEncrypt(input, key, iv) {
    const cipher = crypto.createCipheriv('des-cbc', new Buffer(key), new Buffer(iv ? iv : 0));
    cipher.setAutoPadding(true);  //default true
    let ciph = cipher.update(input, 'utf8', 'base64');
    ciph += cipher.final('base64');
    return ciph;
  },

  /**
   * @name des解密
   * @param input 解密内容
   * @param key 加密key
   * @param iv 初始向量
   */
  desDecrypt(input, key, iv) {
    const decipher = crypto.createDecipheriv('des-cbc', new Buffer(key), new Buffer(iv ? iv : 0));
    decipher.setAutoPadding(true);
    let txt = decipher.update(input, 'base64', 'utf8');
    txt += decipher.final('utf8');
    return txt;
  },

  encrypt(content, project) {
    let result = '';
    if (project.encryption === 'AES') {
      result = this.aesEncrypt(content, project.key);
    } else if (project.encryption === 'DES') {
      result = this.desEncrypt(content, project.key, project.IV);
    } else if (project.encryption === 'BASE64') {
      result = new Buffer(content).toString('base64');
    }
    return result;
  },

  decrypt(content, project) {
    if (project.encryption === 'AES') {
      return this.aesDecrypt(content, project.key);
    } else if (project.encryption === 'DES') {
      return this.desDecrypt(content, project.key, project.IV);
    } else if (project.encryption === 'BASE64') {
      return new Buffer(content, 'base64').toString();
    }
    return content;
  }

};