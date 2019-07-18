const ipaddr = require('ipaddr.js');
/**
 * 将IPv6 地址转换为 IPv4 地址
 * @param ip
 */
module.exports = ip => {
  if (ipaddr.IPv6.isValid(ip)) {
    const addr = ipaddr.parse(ip);
    if (addr.isIPv4MappedAddress()) {
      return addr.toIPv4Address().octets.join('.');
    }
  }
  return ip;
};