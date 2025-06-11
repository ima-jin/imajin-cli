/**
 * WebhookTestCommand - Test webhook processing with sample data
 * 
 * @package     @imajin/cli
 * @subpackage  commands/webhook
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - WebhookManager for webhook testing
 * - Command pattern framework
 * - JSON output for LLM consumption
 * - Event system for test monitoring
 */

import { BaseCommand } from '../../core/commands/BaseCommand.js';
import type { Logger } from '../../logging/Logger.js';
import { WebhookManager } from '../../webhooks/WebhookManager.js';

export class WebhookTestCommand extends BaseCommand {
    public readonly name = 'webhook:test';
    public readonly description = 'Test webhook processing with sample data';

    // Constants for commonly used strings
    private static readonly TEST_EMAIL = 'test@example.com';

    constructor(
        private readonly webhookManager: WebhookManager,
        logger?: Logger
    ) {
        super(logger);
    }

    /**
     * Execute the command
     */
    public async execute(args: any[], options: any): Promise<any> {
        try {
            this.validate(args, options);

            const source = args[0];
            const eventType = args[1] ?? 'test';

            if (!source) {
                throw new Error('Source parameter is required. Usage: webhook:test <source> [eventType]');
            }

            // Check if source has handlers
            const handlers = this.webhookManager.getHandlers(source);
            if (handlers.length === 0) {
                throw new Error(`No webhook handlers found for source: ${source}`);
            }

            // Generate test payload
            const testPayload = this.generateTestPayload(source, eventType, options);
            const testHeaders = this.generateTestHeaders(source, options);

            this.info('Starting webhook test', {
                source,
                eventType,
                handlers: handlers.length
            });

            // Set up event listeners for test monitoring
            const testResults: any[] = [];

            const onHandled = (data: any) => {
                testResults.push({
                    status: 'success',
                    handler: data.handler,
                    timestamp: new Date().toISOString()
                });
            };

            const onError = (data: any) => {
                testResults.push({
                    status: 'error',
                    error: data.error.message,
                    timestamp: new Date().toISOString()
                });
            };

            this.webhookManager.on('webhook:handled', onHandled);
            this.webhookManager.on('webhook:handler_error', onError);

            try {
                // Execute webhook test
                await this.webhookManager.testWebhook(
                    source,
                    eventType,
                    testPayload,
                    testHeaders
                );

                // Wait a moment for async handlers to complete
                await this.sleep(100);

                const result = {
                    success: true,
                    source,
                    eventType,
                    handlersTriggered: handlers.length,
                    testResults,
                    payload: options.showPayload ? testPayload : undefined,
                    headers: options.showHeaders ? testHeaders : undefined,
                    timestamp: new Date().toISOString()
                };

                if (options.json) {
                    console.log(JSON.stringify(result, null, 2));
                } else {
                    this.displayTestResults(result);
                }

                this.info('Webhook test completed successfully', {
                    source,
                    eventType,
                    results: testResults.length
                });



                return result;

            } finally {
                // Clean up event listeners
                this.webhookManager.off('webhook:handled', onHandled);
                this.webhookManager.off('webhook:handler_error', onError);
            }

        } catch (error) {
            this.error('Webhook test failed', error as Error);
            throw error;
        }
    }

    /**
     * Generate test payload based on source
     */
    private generateTestPayload(source: string, eventType: string, options: any): any {
        if (options.payload) {
            try {
                return JSON.parse(options.payload);
            } catch (error) {
                throw new Error(`Invalid JSON payload provided: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Generate source-specific test payloads
        switch (source.toLowerCase()) {
            case 'github':
                return this.generateGitHubPayload(eventType);

            case 'stripe':
                return this.generateStripePayload(eventType);

            case 'shopify':
                return this.generateShopifyPayload(eventType);

            default:
                return {
                    id: `test_${Date.now()}`,
                    type: eventType,
                    source,
                    data: {
                        message: 'This is a test webhook event',
                        timestamp: new Date().toISOString()
                    },
                    test: true
                };
        }
    }

    /**
     * Generate test headers
     */
    private generateTestHeaders(source: string, options: any): Record<string, string> {
        const headers: Record<string, string> = {
            'content-type': 'application/json',
            'user-agent': 'imajin-cli-webhook-test/1.0',
            'x-test-webhook': 'true'
        };

        // Add source-specific headers
        switch (source.toLowerCase()) {
            case 'github':
                headers['x-github-event'] = 'push';
                headers['x-github-delivery'] = `test_${Date.now()}`;
                break;

            case 'stripe':
                headers['stripe-signature'] = 'test_signature';
                break;

            case 'shopify':
                headers['x-shopify-topic'] = 'orders/create';
                headers['x-shopify-shop-domain'] = 'test-shop.myshopify.com';
                break;
        }

        // Add custom headers from options
        if (options.headers) {
            try {
                const customHeaders = JSON.parse(options.headers);
                Object.assign(headers, customHeaders);
            } catch (error) {
                this.warn('Invalid JSON headers provided, using defaults');
            }
        }

        return headers;
    }

    /**
     * Generate GitHub test payload
     */
    private generateGitHubPayload(_eventType: string): any {
        return {
            ref: 'refs/heads/main',
            before: '0000000000000000000000000000000000000000',
            after: '1234567890abcdef1234567890abcdef12345678',
            repository: {
                id: 123456789,
                name: 'test-repo',
                full_name: 'test-user/test-repo',
                private: false
            },
            pusher: {
                name: 'test-user',
                email: WebhookTestCommand.TEST_EMAIL
            },
            commits: [
                {
                    id: '1234567890abcdef1234567890abcdef12345678',
                    message: 'Test commit for webhook',
                    author: {
                        name: 'Test User',
                        email: WebhookTestCommand.TEST_EMAIL
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        };
    }

    /**
     * Generate Stripe test payload
     */
    private generateStripePayload(_eventType: string): any {
        return {
            id: `evt_test_${Date.now()}`,
            object: 'event',
            api_version: '2020-08-27',
            created: Math.floor(Date.now() / 1000),
            data: {
                object: {
                    id: `cus_test_${Date.now()}`,
                    object: 'customer',
                    email: WebhookTestCommand.TEST_EMAIL,
                    created: Math.floor(Date.now() / 1000)
                }
            },
            livemode: false,
            pending_webhooks: 1,
            request: {
                id: `req_test_${Date.now()}`,
                idempotency_key: null
            },
            type: _eventType || 'customer.created'
        };
    }

    /**
     * Generate Shopify test payload
     */
    private generateShopifyPayload(_eventType: string): any {
        return {
            id: Date.now(),
            email: WebhookTestCommand.TEST_EMAIL,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            number: 1001,
            note: 'Test order for webhook',
            token: `test_token_${Date.now()}`,
            gateway: 'manual',
            test: true,
            total_price: '10.00',
            subtotal_price: '10.00',
            total_weight: 0,
            total_tax: '0.00',
            taxes_included: false,
            currency: 'USD',
            financial_status: 'paid',
            confirmed: true,
            line_items: [
                {
                    id: Date.now() + 1,
                    variant_id: Date.now() + 2,
                    title: 'Test Product',
                    quantity: 1,
                    price: '10.00'
                }
            ]
        };
    }

    /**
     * Display test results
     */
    private displayTestResults(result: any): void {
        console.log('\n🧪 Webhook Test Results\n');

        console.log(`Source: ${result.source}`);
        console.log(`Event Type: ${result.eventType}`);
        console.log(`Handlers Triggered: ${result.handlersTriggered}`);
        console.log(`Test Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Timestamp: ${result.timestamp}`);
        console.log('');

        if (result.testResults.length > 0) {
            console.log('Handler Results:');
            result.testResults.forEach((testResult: any, index: number) => {
                const status = testResult.status === 'success' ? '✅' : '❌';
                console.log(`  ${index + 1}. ${status} ${testResult.status.toUpperCase()}`);
                if (testResult.handler) {
                    console.log(`     Handler: ${testResult.handler}`);
                }
                if (testResult.error) {
                    console.log(`     Error: ${testResult.error}`);
                }
                console.log(`     Time: ${testResult.timestamp}`);
            });
        } else {
            console.log('No handler results recorded.');
        }

        console.log('');
    }

    /**
     * Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 