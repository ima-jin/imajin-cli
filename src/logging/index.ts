/**
 * Logging System - Comprehensive logging infrastructure
 * 
 * @package     @imajin/cli
 * @subpackage  logging
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-03
 *
 * Integration Points:
 * - All logging components
 * - Configuration management
 * - Formatters and transports
 * - API-specific logging
 */

// Core logging
export { Logger, LogContext } from './Logger.js';
export { LoggerConfig, LogLevel, TransportConfig, defaultConfig } from './LoggerConfig.js';

// API-specific logging
export { ApiLogger, ApiMetrics } from './ApiLogger.js';

// Formatters
export { JsonFormatter } from './formatters/JsonFormatter.js';
export { ApiFormatter, ApiLogContext } from './formatters/ApiFormatter.js';

// Transports
export { MonitoringTransport } from './transports/MonitoringTransport.js';

// Factory function for easy setup
import { Logger } from './Logger.js';
import { ApiLogger } from './ApiLogger.js';
import { LoggerConfig } from './LoggerConfig.js';

export function createLogger(config?: Partial<LoggerConfig>): Logger {
    return new Logger(config);
}

export function createApiLogger(config?: Partial<LoggerConfig>): ApiLogger {
    return new ApiLogger(config);
} 