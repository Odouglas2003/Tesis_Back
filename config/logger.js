// config/logger.js
const winston = require('winston');
const path = require('path');
require('dotenv').config();

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};
winston.addColors(colors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: logFormat,
  }),
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    level: 'info',
    format: fileLogFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: fileLogFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/http.log'),
    level: 'http',
    format: fileLogFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  transports,
  exitOnError: false,
});

module.exports = logger;