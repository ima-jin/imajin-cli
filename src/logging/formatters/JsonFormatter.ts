/**
 * JsonFormatter - Structured JSON log formatting
 * 
 * @package     @imajin/cli
 * @subpackage  logging/formatters
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 *
 * Integration Points:
 * - Winston format integration
 * - JSON schema validation
 * - Correlation ID tracking
 */

import winston from 'winston';
import { LogContext } from '../Logger.js';

export class JsonFormatter {
    public static format(): winston.Logform.Format {
        return winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format((info) => {
                const { timestamp, level, message, ...meta } = info;
                
                // Ensure correlation ID is always present
                const correlationId = meta.correlationId || 'no-correlation-id';
                
                return {
                    timestamp,
                    level,
                    message,
                    correlationId,
                    ...meta,
                };
            })(),
            winston.format.json()
        );
    }
} 