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
 * @updated      2025-06-25
 *
 * Integration Points:
 * - All logging components
 * - Configuration management
 * - Formatters and transports
 * - API-specific logging
 */

// Core logging
export { Logger, LogContext } from './Logger';
export { LoggerConfig, LogLevel, TransportConfig, defaultConfig } from './LoggerConfig';

// API-specific logging
export { ApiLogger, ApiMetrics } from './ApiLogger';

// Formatters
export { JsonFormatter } from './formatters/JsonFormatter';
export { ApiFormatter, ApiLogContext } from './formatters/ApiFormatter';

// Transports
export { MonitoringTransport } from './transports/MonitoringTransport';

// Factory function for easy setup
import { Logger } from './Logger';
import { ApiLogger } from './ApiLogger';
import { LoggerConfig } from './LoggerConfig';

export function createLogger(config?: Partial<LoggerConfig>): Logger {
    return new Logger(config);
}

export function createApiLogger(config?: Partial<LoggerConfig>): ApiLogger {
    return new ApiLogger(config);
} 