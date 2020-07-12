const rp = require('request-promise');
async function test() {
  const body4project = {
    serverIp: '1.1.1.1',
    data: {
      items: [
        { err: 'ETIMEOUT', host: '10.10.10.10', pathname: 'tgv2/getlist2', project: 'duoyi.project.2' },

      ]
    },
    serverName: 'tasktool',
    funcName: 'count_http_error'
  };
  const body4pathname = {
    serverIp: '2.2.2.2',
    data: {
      items: [
        { err: 'ETIMEOUT', host: '10.10.10.10', pathname: 'tgv2/getlist', project: 'duoyi.project.1' },
      ]
    },
    serverName: 'tasktool',
    funcName: 'count_http_error'
  };
  const body4host = {
    serverIp: '3.3.3.3',
    data: {
      items: [
        { err: 'ETIMEOUT', host: '10.10.10.10', pathname: 'tgv2/getlist', project: 'duoyi.project.1' },
      ]
    },
    serverName: 'tasktool',
    funcName: 'count_http_error'
  };
  const body4 = {
    serverIp: '4.4.4.4',
    data: {
      items: [
        { err: 'ETIMEOUT', host: '10.10.10.10', pathname: 'tgv2/getlist', project: 'duoyi.project.1' },
      ]
    },
    serverName: 'tasktool',
    funcName: 'count_http_error'
  };
  for (let i = 0; i < 2; i++) {
    rp('http://127.0.0.1:8888/log/add', { method: 'POST', json: true, body: body4project }).catch(e => console.log(e));
  }
  for (let i = 0; i < 6; i++) {
    rp('http://127.0.0.1:8888/log/add', { method: 'POST', json: true, body: body4pathname }).catch(e => console.log(e));
  }
  for (let i = 0; i < 6; i++) {
    rp('http://127.0.0.1:8888/log/add', { method: 'POST', json: true, body: body4host }).catch(e => console.log(e));
  }
  for (let i = 0; i < 6; i++) {
    rp('http://127.0.0.1:8888/log/add', { method: 'POST', json: true, body: body4 }).catch(e => console.log(e));
  }
}
test();