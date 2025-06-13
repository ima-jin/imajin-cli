/**
 * LoggerConfig - Configuration management for the logging system
 * 
 * @package     @imajin/cli
 * @subpackage  logging
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 *
 * Integration Points:
 * - Environment-based configuration
 * - Transport configuration
 * - Format configuration
 * - Monitoring integration
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface TransportConfig {
    type: 'console' | 'file' | 'http' | 'stream';
    level?: LogLevel;
    options?: {
        filename?: string;
        url?: string;
        stream?: NodeJS.WritableStream;
        [key: string]: any;
    };
}

export interface LoggerConfig {
    level: LogLevel;
    enableColors: boolean;
    correlationIdHeader?: string;
    defaultContext?: Record<string, any>;
    transports: TransportConfig[];
    monitoring?: {
        enabled: boolean;
        serviceName: string;
        metrics?: {
            logCount: boolean;
            errorRate: boolean;
            latency: boolean;
        };
    };
}

export const defaultConfig: LoggerConfig = {
    level: 'info',
    enableColors: true,
    correlationIdHeader: 'x-correlation-id',
    defaultContext: {},
    transports: [
        {
            type: 'console',
            level: 'info',
        },
        {
            type: 'file',
            level: 'error',
            options: {
                filename: 'logs/error.log',
            },
        },
        {
            type: 'file',
            level: 'info',
            options: {
                filename: 'logs/combined.log',
            },
        },
    ],
    monitoring: {
        enabled: false,
        serviceName: 'imajin-cli',
        metrics: {
            logCount: true,
            errorRate: true,
            latency: true,
        },
    },
}; 