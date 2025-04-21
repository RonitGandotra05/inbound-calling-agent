/**
 * Simple logger utility for the application
 * In a production environment, this would be replaced with a more robust logging solution
 * like Winston or Pino
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Set the current log level based on environment variable or default to INFO
const currentLogLevel = process.env.LOG_LEVEL ? 
  (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO) : 
  LOG_LEVELS.INFO;

/**
 * Format the log message with timestamp and metadata
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [metadata] - Additional data to log
 * @returns {string} Formatted log message
 */
function formatLog(level, message, metadata) {
  const timestamp = new Date().toISOString();
  let logMessage = `${timestamp} [${level}] ${message}`;
  
  if (metadata) {
    try {
      // Format metadata as JSON or simple string based on complexity
      const metadataStr = typeof metadata === 'object' 
        ? JSON.stringify(metadata)
        : String(metadata);
      logMessage += ` | ${metadataStr}`;
    } catch (err) {
      logMessage += ` | [Error formatting metadata: ${err.message}]`;
    }
  }
  
  return logMessage;
}

/**
 * Log an error message
 * @param {string} message - Log message
 * @param {Object} [metadata] - Additional data to log
 */
function error(message, metadata) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    console.error(formatLog('ERROR', message, metadata));
  }
}

/**
 * Log a warning message
 * @param {string} message - Log message
 * @param {Object} [metadata] - Additional data to log
 */
function warn(message, metadata) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(formatLog('WARN', message, metadata));
  }
}

/**
 * Log an info message
 * @param {string} message - Log message
 * @param {Object} [metadata] - Additional data to log
 */
function info(message, metadata) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.info(formatLog('INFO', message, metadata));
  }
}

/**
 * Log a debug message
 * @param {string} message - Log message
 * @param {Object} [metadata] - Additional data to log
 */
function debug(message, metadata) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.debug(formatLog('DEBUG', message, metadata));
  }
}

module.exports = {
  error,
  warn,
  info,
  debug
}; 