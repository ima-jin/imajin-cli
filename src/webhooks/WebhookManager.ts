/**
 * WebhookManager - Real-time webhook event handling and processing
 * 
 * @package     @imajin/cli
 * @subpackage  webhooks
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * @see         docs/webhooks.md
 * 
 * Integration Points:
 * - Real-time webhook event processing
 * - Service-specific webhook handlers
 * - Event validation and security
 * - LLM-friendly webhook introspection
 */

import { createHash, createHmac } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Logger } from '../logging/Logger.js';

export interface WebhookEvent {
    id: string;
    source: string;
    type: string;
    data: any;
    headers: Record<string, string>;
    timestamp: Date;
    signature?: string;
    verified: boolean;
}

export interface WebhookHandler {
    source: string;
    eventTypes: string[];
    handler: (event: WebhookEvent) => Promise<void>;
    validator?: (event: WebhookEvent, secret?: string) => boolean;
}

export interface WebhookConfig {
    endpoint: string;
    secret?: string;
    signatureHeader?: string;
    timestampHeader?: string;
    maxAge?: number; // seconds
}

export class WebhookManager extends EventEmitter {
    private readonly handlers: Map<string, WebhookHandler[]> = new Map();
    private readonly configs: Map<string, WebhookConfig> = new Map();
    private readonly logger: Logger;
    private readonly processedEvents: Set<string> = new Set();

    constructor(logger: Logger) {
        super();
        this.logger = logger;
    }

    /**
     * Register a webhook handler for a specific source
     */
    public registerHandler(handler: WebhookHandler): void {
        const sourceHandlers = this.handlers.get(handler.source) || [];
        sourceHandlers.push(handler);
        this.handlers.set(handler.source, sourceHandlers);

        this.logger.info(`Registered webhook handler for ${handler.source}`, {
            eventTypes: handler.eventTypes,
        });
    }

    /**
     * Configure webhook settings for a source
     */
    public configureWebhook(source: string, config: WebhookConfig): void {
        this.configs.set(source, config);
        this.logger.info(`Configured webhook for ${source}`, {
            endpoint: config.endpoint,
            hasSecret: !!config.secret,
        });
    }

    /**
     * Process incoming webhook event
     */
    public async processWebhook(
        source: string,
        eventType: string,
        payload: any,
        headers: Record<string, string>
    ): Promise<void> {
        const eventId = this.generateEventId(source, eventType, payload);

        // Check for duplicate events
        if (this.processedEvents.has(eventId)) {
            this.logger.debug(`Duplicate webhook event ignored`, { eventId, source, eventType });
            return;
        }

        const event: WebhookEvent = {
            id: eventId,
            source,
            type: eventType,
            data: payload,
            headers,
            timestamp: new Date(),
            verified: false,
        };

        // Verify webhook signature if configured
        const config = this.configs.get(source);
        if (config?.secret) {
            event.verified = this.verifySignature(event, config);
            if (!event.verified) {
                this.logger.warn(`Webhook signature verification failed`, {
                    eventId,
                    source,
                    eventType,
                });
                this.emit('webhook:verification_failed', event);
                return;
            }
        } else {
            event.verified = true; // No signature verification required
        }

        // Check event age if timestamp validation is configured
        if (config?.timestampHeader && config.maxAge) {
            const timestamp = headers[config.timestampHeader];
            if (timestamp) {
                const eventTime = new Date(Number.parseInt(timestamp) * 1000);
                const age = (Date.now() - eventTime.getTime()) / 1000;

                if (age > config.maxAge) {
                    this.logger.warn(`Webhook event too old`, {
                        eventId,
                        source,
                        eventType,
                        age,
                        maxAge: config.maxAge,
                    });
                    this.emit('webhook:expired', event);
                    return;
                }
            }
        }

        // Mark event as processed
        this.processedEvents.add(eventId);

        this.logger.info(`Processing webhook event`, {
            eventId,
            source,
            eventType,
            verified: event.verified,
        });

        // Emit global webhook event
        this.emit('webhook:received', event);

        // Find and execute handlers
        const sourceHandlers = this.handlers.get(source) || [];
        const matchingHandlers = sourceHandlers.filter(handler =>
            handler.eventTypes.includes(eventType) || handler.eventTypes.includes('*')
        );

        if (matchingHandlers.length === 0) {
            this.logger.warn(`No handlers found for webhook event`, {
                eventId,
                source,
                eventType,
            });
            this.emit('webhook:unhandled', event);
            return;
        }

        // Execute handlers concurrently
        const handlerPromises = matchingHandlers.map(async (handler) => {
            try {
                await handler.handler(event);
                this.logger.debug(`Webhook handler completed`, {
                    eventId,
                    source,
                    eventType,
                });
                this.emit('webhook:handled', { event, handler: handler.source });
            } catch (error) {
                this.logger.error(`Webhook handler failed`, error instanceof Error ? error : new Error(String(error)), {
                    eventId,
                    source,
                    eventType,
                });
                this.emit('webhook:handler_error', { event, error });
            }
        });

        await Promise.allSettled(handlerPromises);

        // Clean up old processed events periodically
        if (this.processedEvents.size > 10000) {
            this.cleanupProcessedEvents();
        }
    }

    /**
     * Verify webhook signature
     */
    private verifySignature(event: WebhookEvent, config: WebhookConfig): boolean {
        if (!config.secret || !config.signatureHeader) {
            return true; // No verification configured
        }

        const signature = event.headers[config.signatureHeader];
        if (!signature) {
            return false;
        }

        // Support different signature formats
        if (signature.startsWith('sha256=')) {
            // GitHub/Stripe style
            const expectedSignature = 'sha256=' + createHmac('sha256', config.secret)
                .update(JSON.stringify(event.data))
                .digest('hex');
            return this.safeCompare(signature, expectedSignature);
        } else if (signature.startsWith('sha1=')) {
            // Legacy style
            const expectedSignature = 'sha1=' + createHmac('sha1', config.secret)
                .update(JSON.stringify(event.data))
                .digest('hex');
            return this.safeCompare(signature, expectedSignature);
        } else {
            // Raw signature
            const expectedSignature = createHmac('sha256', config.secret)
                .update(JSON.stringify(event.data))
                .digest('hex');
            return this.safeCompare(signature, expectedSignature);
        }
    }

    /**
     * Safe string comparison to prevent timing attacks
     */
    private safeCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(source: string, eventType: string, payload: any): string {
        const content = `${source}:${eventType}:${JSON.stringify(payload)}:${Date.now()}`;
        return createHash('sha256').update(content).digest('hex').substring(0, 16);
    }

    /**
     * Clean up old processed events to prevent memory leaks
     */
    private cleanupProcessedEvents(): void {
        // Keep only the most recent 5000 events
        const events = Array.from(this.processedEvents);
        const toKeep = events.slice(-5000);

        this.processedEvents.clear();
        toKeep.forEach(eventId => this.processedEvents.add(eventId));

        this.logger.debug(`Cleaned up processed events`, {
            removed: events.length - toKeep.length,
            remaining: toKeep.length,
        });
    }

    /**
     * Get webhook statistics
     */
    public getStats(): {
        handlers: number;
        configs: number;
        processedEvents: number;
        handlersBySource: Record<string, number>;
    } {
        const handlersBySource: Record<string, number> = {};

        for (const [source, handlers] of this.handlers) {
            handlersBySource[source] = handlers.length;
        }

        return {
            handlers: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
            configs: this.configs.size,
            processedEvents: this.processedEvents.size,
            handlersBySource,
        };
    }

    /**
     * List registered webhook sources
     */
    public listSources(): string[] {
        return Array.from(this.handlers.keys());
    }

    /**
     * Get handlers for a specific source
     */
    public getHandlers(source: string): WebhookHandler[] {
        return this.handlers.get(source) || [];
    }

    /**
     * Remove handlers for a source
     */
    public removeHandlers(source: string): boolean {
        const removed = this.handlers.delete(source);
        if (removed) {
            this.logger.info(`Removed webhook handlers for ${source}`);
        }
        return removed;
    }

    /**
     * Test webhook processing with mock data
     */
    public async testWebhook(
        source: string,
        eventType: string,
        payload: any,
        headers: Record<string, string> = {}
    ): Promise<void> {
        this.logger.info(`Testing webhook`, { source, eventType });

        await this.processWebhook(source, eventType, payload, {
            'content-type': 'application/json',
            'user-agent': 'imajin-cli-test',
            ...headers,
        });
    }
} 