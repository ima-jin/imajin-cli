/**
 * Config - Configuration types and interfaces
 * 
 * @package     @imajin/cli
 * @subpackage  types
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see        docs/configuration.md
 * 
 * Integration Points:
 * - Environment variable configuration
 * - Service-specific configuration
 * - Runtime configuration management
 * - Type-safe configuration validation
 */

import { z } from 'zod';

// Base configuration schema
export const ImajiNConfigSchema = z.object({
    debug: z.boolean().default(false),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    outputFormat: z.enum(['json', 'text', 'table']).default('text'),
    colorOutput: z.boolean().default(true),

    // HTTP client configuration
    http: z.object({
        timeout: z.number().default(30000),
        retries: z.number().default(3),
        userAgent: z.string().default('@imajin/cli/0.1.0'),
    }).default({}),

    // WebSocket configuration for real-time features
    websocket: z.object({
        enabled: z.boolean().default(true),
        reconnectAttempts: z.number().default(5),
        reconnectInterval: z.number().default(1000),
    }).default({}),

    // Service configurations
    services: z.record(z.any()).default({}),
});

export type ImajiNConfig = z.infer<typeof ImajiNConfigSchema>;

// Environment configuration
export const EnvironmentConfigSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DEBUG: z.string().optional(),
    LOG_LEVEL: z.string().optional(),
    IMAJIN_CONFIG_PATH: z.string().optional(),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// Service configuration interface
export interface ServiceConfig {
    enabled: boolean;
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    [key: string]: any;
}

// Real-time configuration
export interface RealTimeConfig {
    enabled: boolean;
    endpoint?: string;
    events: string[];
    reconnect: boolean;
} 