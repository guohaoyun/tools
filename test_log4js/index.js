const log4js = require('log4js');
const lodash = require('lodash');

const defaultConfig = {
  appenders: {
    cons: {type: 'console'},
    debug: getAppenderConfig4File('debug'),
    warning: getAppenderConfig4File('warning'),
    error: getAppenderConfig4File('error'),
  },
  categories: {
    default: { appenders: ['cons'], level: 'all' },
    debug: { appenders: ['debug'], level: 'debug' },
    warning: { appenders: ['warning'], level: 'warn' },
    error: { appenders: ['error'], level: 'error' },
  }
}

function getAppenderConfig4File(filename) {
  return {
    type: 'file',
    filename: `./${filename}.txt`,
    maxLogSize: 1024,
    backups: 3,
    keepFileExt: true,
    layout: {
      type: 'pattern',
      pattern: '%d{yyyy-MM-dd hh:mm:ss} %m',
    }
  }
}

function getAppenderConfig4DateFile(filename) {
  return {
    type: 'file',
    filename: `./${filename}/20`,
    pattern: `yyMMdd.log`,
    alwaysIncludePattern: true,
    keepFileExt: true,
    layout: {
      type: 'pattern',
      pattern: '%d{yyyy-MM-dd hh:mm:ss} %m',
    }
  }
}
log4js.configure(defaultConfig);

const logger = log4js.getLogger();

logger[`logger4warn`] = log4js.getLogger('warn');
logger[`logger4error`] = log4js.getLogger('error');
logger.warn = (...log) => logger[`logger4warn`].warn(...log),
logger.error = (...log) => logger[`logger4error`].error(...log),
lodash.bindAll(logger, ['warn', 'error']);

// logger.warn(123);
// logger.warn(123);
// logger.warn(123);
// logger.warn(123);
// logger.warn(123);
// function init(items) {
//   const names = [];
//   for (const item of items) {
//     // 只传个名字，默认使用日期分割配置
//     if (lodash.isString(item)) {
//       defaultConfig.appenders[item] = getAppenderConfig4DateFile(item);
//       defaultConfig.categories[item] = { appenders: [item], level: 'info' };
//       names.push(item);
//     }
//     if (lodash.isObject(item)) {
//       const { name, config, } = item;
//       defaultConfig.appenders[name] = config;
//       defaultConfig.categories[name] = { appenders: [name], level: 'info' };
//       names.push(name);
//     }
//   }
//   log4js.configure(defaultConfig);
//   for (const name of names) {

//   }
// }



// logger.warn('test warn');
// logger.error('test error');
// logger.trace('Entering cheese testing');
// logger.debug('Got cheese.');
// logger.info('Cheese is Comté.');
// logger.warn('Cheese is quite smelly.');
// logger.error('Cheese is too ripe!');
// logger.fatal('Cheese was breeding ground for listeria.');