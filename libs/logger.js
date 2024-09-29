const log4js = require('log4js');


const output = {
  'type': 'console',
  'layout': {
    'type': 'pattern',
    'pattern': '%[[ %-5.0p ] |%d{yyyy-MM-dd hh:mm:ss.SSS}| %f{1}:%l - %]%m'
  }
};

function getFileOutput(filePath) {
  return {
    'type': 'dateFile',
    'filename': filePath,
    'keepFileExt': true,
    'numBackups': 10,
    'alwaysIncludePattern': true,
    'layout': {
      'type': 'pattern',
      'pattern': '[ %-5.0p ] |%d{yyyy-MM-dd hh:mm:ss.SSS}| %c - %m'
    }
  };
}

function generateConfig(moduleConfig, defaultAppender, defaultLevel) {
  const appenders = {
    'defaultAppender': defaultAppender
  };
  const categories = {
    default: { appenders: ['defaultAppender'], level: defaultLevel, enableCallStack: true }
  };
  for (const level in moduleConfig) {
    const c = moduleConfig[level];
    for (const x of c) {
      categories[x] = { appenders: ['defaultAppender'], level, enableCallStack: true };
    }
  }

  return {
    appenders,
    categories
  };
}

const defaultModuleConfig = {
  'trace': [],
  'debug': [],
  'info': [],
  'warn': [],
  'error': [],
};

function loadConfigure(logLevel = 'info', logToFile = false, logFilePath = '', moduleConfig = defaultModuleConfig) {
  let config;

  let logOutput = output;
  if (logToFile) {
    logOutput = getFileOutput(logFilePath);
  }

  config = generateConfig(moduleConfig, logOutput, logLevel);

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
}

function toLog(jsonInput) {
  if (jsonInput === undefined) {
    return '';
  }
  if (typeof (jsonInput) !== 'object') {
    return jsonInput;
  } else if (jsonInput.constructor === Array) {
    return JSON.stringify(jsonInput);
  }

  var jsonString = JSON.stringify(jsonInput, logJsonReplacer);
  return jsonString.replace(/['"]+/g, '')
    .replace(/[:]+/g, ': ')
    .replace(/[,]+/g, ', ')
    .slice(1, -1);
}

loadConfigure();

const logger = log4js;
logger.loadConfigure = loadConfigure;
logger.toLog = toLog;

module.exports = { logger };

