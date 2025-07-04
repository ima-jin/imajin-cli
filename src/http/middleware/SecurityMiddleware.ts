/**
 * SecurityMiddleware - Security utilities for HTTP requests and webhooks
 * 
 * @package     @imajin/cli
 * @subpackage  http/middleware
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-06-25
 *
 * Integration Points:
 * - Webhook signature validation
 * - IP whitelist/blacklist management
 * - Request size limits
 * - CORS configuration
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { Logger } from '../../logging/Logger.js';

export interface SignatureValidationConfig {
    algorithm: 'sha1' | 'sha256' | 'sha512';
    headerName: string;
    prefix?: string;
    secret: string;
}

export interface IPFilterConfig {
    whitelist?: string[];
    blacklist?: string[];
    enabled: boolean;
}

export interface CorsConfig {
    origins: string[];
    methods: string[];
    headers: string[];
    credentials: boolean;
    maxAge?: number;
}

export interface SecurityConfig {
    maxPayloadSize: number;
    rateLimitWindow: number;
    rateLimitMax: number;
    ipFilter?: IPFilterConfig;
    cors?: CorsConfig;
}

export class SecurityMiddleware {
    private logger: Logger | null;

    constructor(logger?: Logger) {
        this.logger = logger || null;
    }

    /**
     * Validate webhook signature
     */
    public validateSignature(
        payload: string | Buffer,
        signature: string,
        config: SignatureValidationConfig
    ): boolean {
        try {
            const payloadString = typeof payload === 'string' ? payload : payload.toString();
            const expectedSignature = this.generateSignature(payloadString, config);

            // Remove prefix if present
            const cleanSignature = config.prefix
                ? signature.replace(config.prefix, '')
                : signature;

            const cleanExpected = config.prefix
                ? expectedSignature.replace(config.prefix, '')
                : expectedSignature;

            // Use timing-safe comparison
            return this.safeCompare(cleanSignature, cleanExpected);

        } catch (error) {
            if (this.logger) {
                this.logger.error('Signature validation failed', error as Error);
            }
            return false;
        }
    }

    /**
     * Generate signature for payload
     */
    public generateSignature(payload: string, config: SignatureValidationConfig): string {
        const hmac = createHmac(config.algorithm, config.secret);
        hmac.update(payload);
        const signature = hmac.digest('hex');

        return config.prefix ? `${config.prefix}${signature}` : signature;
    }

    /**
     * Validate IP address against whitelist/blacklist
     */
    public validateIP(ip: string, config: IPFilterConfig): boolean {
        if (!config.enabled) {
            return true;
        }

        // Check blacklist first
        if (config.blacklist && config.blacklist.includes(ip)) {
            if (this.logger) {
                this.logger.warn('IP address blocked by blacklist', { ip });
            }
            return false;
        }

        // Check whitelist if configured
        if (config.whitelist && config.whitelist.length > 0) {
            const allowed = config.whitelist.includes(ip);
            if (!allowed && this.logger) {
                this.logger.warn('IP address not in whitelist', { ip });
            }
            return allowed;
        }

        return true;
    }

    /**
     * Generate CORS headers
     */
    public generateCorsHeaders(origin: string | undefined, config: CorsConfig): Record<string, string> {
        const headers: Record<string, string> = {};

        // Handle origin
        if (config.origins.includes('*')) {
            headers['Access-Control-Allow-Origin'] = '*';
        } else if (origin && config.origins.includes(origin)) {
            headers['Access-Control-Allow-Origin'] = origin;
        }

        // Add other CORS headers
        headers['Access-Control-Allow-Methods'] = config.methods.join(', ');
        headers['Access-Control-Allow-Headers'] = config.headers.join(', ');

        if (config.credentials) {
            headers['Access-Control-Allow-Credentials'] = 'true';
        }

        if (config.maxAge) {
            headers['Access-Control-Max-Age'] = config.maxAge.toString();
        }

        return headers;
    }

    /**
     * Validate request size
     */
    public validateRequestSize(contentLength: number, maxSize: number): boolean {
        if (contentLength > maxSize) {
            if (this.logger) {
                this.logger.warn('Request size exceeds limit', {
                    contentLength,
                    maxSize
                });
            }
            return false;
        }
        return true;
    }

    /**
     * Parse webhook signature from various formats
     */
    public parseSignature(signatureHeader: string, format: 'github' | 'stripe' | 'generic' = 'generic'): string {
        switch (format) {
            case 'github':
                // GitHub format: sha1=<signature>
                return signatureHeader.replace(/^sha1=/, '');

            case 'stripe': {
                // Stripe format: t=timestamp,v1=signature
                const parts = signatureHeader.split(',');
                const signaturePart = parts.find(part => part.startsWith('v1='));
                return signaturePart ? signaturePart.replace('v1=', '') : '';
            }

            case 'generic':
            default:
                return signatureHeader;
        }
    }

    /**
     * Validate timestamp to prevent replay attacks
     */
    public validateTimestamp(timestamp: number, maxAge: number = 300): boolean {
        const now = Math.floor(Date.now() / 1000);
        const age = now - timestamp;

        if (age > maxAge) {
            if (this.logger) {
                this.logger.warn('Request timestamp too old', {
                    timestamp,
                    age,
                    maxAge
                });
            }
            return false;
        }

        return true;
    }

    /**
     * Extract timestamp from Stripe-style signature
     */
    public extractTimestamp(signatureHeader: string): number | null {
        const parts = signatureHeader.split(',');
        const timestampPart = parts.find(part => part.startsWith('t='));

        if (timestampPart) {
            const timestamp = parseInt(timestampPart.replace('t=', ''), 10);
            return isNaN(timestamp) ? null : timestamp;
        }

        return null;
    }

    /**
     * Safe string comparison to prevent timing attacks
     */
    private safeCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        const bufferA = Buffer.from(a);
        const bufferB = Buffer.from(b);

        return timingSafeEqual(bufferA, bufferB);
    }

    /**
     * Create security configuration for common services
     */
    public static createServiceConfig(service: 'github' | 'stripe' | 'shopify'): Partial<SignatureValidationConfig> {
        switch (service) {
            case 'github': {
                return {
                    algorithm: 'sha1',
                    headerName: 'x-hub-signature',
                    prefix: 'sha1='
                };
            }

            case 'stripe': {
                return {
                    algorithm: 'sha256',
                    headerName: 'stripe-signature',
                    prefix: 'v1='
                };
            }

            case 'shopify': {
                return {
                    algorithm: 'sha256',
                    headerName: 'x-shopify-hmac-sha256'
                };
            }

            default: {
                return {
                    algorithm: 'sha256',
                    headerName: 'x-signature'
                };
            }
        }
    }
} 