const log4js = require('log4js');

const output = {
  "type": "console",
  "layout": {
    "type": "pattern",
    "pattern": "%[ [ %-5.0p ] |%d{yyyy-MM-dd hh:mm:ss}| %c - %]%m"
  }
};

const fileoutput = {
  "type": "dateFile",
  "filename": "logs/media",
  "pattern": ".yyyy-MM-dd.log",
  "keepFileExt": true,
  "alwaysIncludePattern": true,
  "layout": {
    "type": "pattern",
    "pattern": " [ %-5.0p ] |%d{yyyy-MM-dd hh:mm:ss}| %c - %m"
  }
};

function generateConfig(moduleConfig = {}, defaultAppender, defaultLevel) {
  const appenders = {
    "defaultAppender": defaultAppender
  }
  const categories = {
    default: { appenders: ['defaultAppender'], level: defaultLevel }
  }
  for (const level in moduleConfig) {
    const c = moduleConfig[level];
    for (const x of c) {
      categories[x] = { appenders: ['defaultAppender'], level }
    }
  }

  return {
    appenders,
    categories
  }
}


function loadConfigure() {
  let config;
  if (global.debug === false) {
    config = generateConfig(global.moduleConfig, fileoutput, 'info');
  } else {
    config = generateConfig(global.moduleConfig, output, 'debug');
  }
  log4js.configure(config);
}

function logJsonReplacer(key, value) {
  if (key) {
    if (typeof (value) === 'object') {
      return '[Object]';
    }
    return value;
  } else {
    return value;
  }
};

function toLog(jsonInput) {
  if (jsonInput === undefined) {
    return '';
  }
  if (typeof (jsonInput) !== 'object') {
    return jsonInput;
  } else if (jsonInput.constructor === Array) {
    return '[Object]';
  }
  var jsonString = JSON.stringify(jsonInput, logJsonReplacer);
  return jsonString.replace(/['"]+/g, '')
    .replace(/[:]+/g, ': ')
    .replace(/[,]+/g, ', ')
    .slice(1, -1);
};

loadConfigure();

exports.logger = log4js;
exports.logger.loadConfigure = loadConfigure;
exports.logger.toLog = toLog;
