/**
 * StripeServiceProvider - Service provider for Stripe integration
 * 
 * @package     @imajin/cli
 * @subpackage  providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see        docs/services/stripe.md
 * 
 * Integration Points:
 * - StripeService registration with Container
 * - Command handler registration
 * - Webhook event subscription
 * - LLM introspection interfaces
 */

import { CreatePaymentCommand } from '../commands/stripe/CreatePaymentCommand.js';
import { Container } from '../container/Container.js';
import type { Logger } from '../logging/Logger.js';
import { StripeService } from '../services/StripeService.js';
import type { ImajinConfig } from '../types/Config.js';
import type { CommandIntrospection, ServiceIntrospection } from '../types/LLM.js';
import { StripeCapabilities, StripeConfigSchema } from '../types/Stripe.js';
import { ServiceProvider } from './ServiceProvider.js';

export class StripeServiceProvider extends ServiceProvider {
    private stripeService?: StripeService;
    private createPaymentCommand?: CreatePaymentCommand;

    constructor(container: Container, program: any) {
        super(container, program);
    }

    /**
     * Get provider name
     */
    getName(): string {
        return 'stripe';
    }

    /**
     * Get provider version
     */
    getVersion(): string {
        return '0.1.0';
    }

    /**
     * Get services provided by this provider
     */
    getServices(): string[] {
        return ['payment-processing', 'subscription-management', 'customer-management'];
    }

    /**
     * Check if provider provides a specific service
     */
    provides(service: string): boolean {
        return this.getServices().includes(service) || service === 'stripe';
    }

    /**
     * Register services with the container
     */
    async register(): Promise<void> {
        const config = this.container.resolve<ImajinConfig>('config');
        const logger = this.container.resolve<Logger>('logger');

        // Check if we have Stripe configuration - only validate if available
        const hasStripeConfig = !!(process.env.STRIPE_API_KEY || config.services?.stripe?.apiKey);

        if (hasStripeConfig) {
            // Validate Stripe configuration
            const stripeConfig = this.validateStripeConfig(config);

            // Register StripeService
            this.stripeService = new StripeService(stripeConfig, logger);
            this.container.singleton('stripeService', () => this.stripeService!);

            // Register commands
            this.createPaymentCommand = new CreatePaymentCommand(this.stripeService);

            logger.info('StripeServiceProvider registered with API key');
        } else {
            logger.info('StripeServiceProvider registered without API key (introspection only)');
        }
    }

    /**
     * Boot the service provider
     */
    async boot(): Promise<void> {
        const logger = this.container.resolve<Logger>('logger');

        // Set up event listeners for real-time coordination
        if (this.stripeService) {
            this.stripeService.on('payment-intent-created', (event) => {
                logger.info('Payment intent created', { eventId: event.id });
            });

            this.stripeService.on('customer-created', (event) => {
                logger.info('Customer created', { eventId: event.id });
            });

            this.stripeService.on('subscription-created', (event) => {
                logger.info('Subscription created', { eventId: event.id });
            });

            this.stripeService.on('webhook-event', (event) => {
                logger.info('Webhook event received', {
                    eventType: event.type,
                    eventId: event.id
                });
            });
        }

        logger.info('StripeServiceProvider booted successfully');
    }

    /**
     * Register commands with CLI program
     */
    registerCommands(program: any): void {
        if (this.createPaymentCommand) {
            this.createPaymentCommand.register(program);
        } else {
            // Register a placeholder command that shows configuration needed
            program
                .command('stripe:create-payment')
                .description('Create a new Stripe payment intent')
                .action(() => {
                    console.error('❌ Stripe API key not configured');
                    console.error('💡 Set STRIPE_API_KEY environment variable or configure in config file');
                    process.exit(1);
                });
        }
    }

    /**
     * Get service introspection for LLM discovery
     */
    getIntrospection(): ServiceIntrospection {
        const commands: CommandIntrospection[] = [
            {
                name: 'stripe:create-payment',
                description: 'Create a new Stripe payment intent',
                usage: 'imajin stripe:create-payment --amount <amount> --currency <currency> [options]',
                service: 'stripe',
                arguments: [],
                options: [
                    {
                        name: '--amount',
                        description: 'Payment amount in cents',
                        type: 'number',
                    },
                    {
                        name: '--currency',
                        description: 'Currency code (e.g., usd, eur)',
                        type: 'string',
                        default: 'usd',
                    },
                    {
                        name: '--customer',
                        description: 'Customer ID',
                        type: 'string',
                    },
                    {
                        name: '--payment-method',
                        description: 'Payment method ID',
                        type: 'string',
                    },
                    {
                        name: '--description',
                        description: 'Payment description',
                        type: 'string',
                    },
                    {
                        name: '--metadata',
                        description: 'JSON metadata',
                        type: 'string',
                    },
                    {
                        name: '--capture-method',
                        description: 'Capture method: automatic or manual',
                        type: 'string',
                        default: 'automatic',
                        choices: ['automatic', 'manual'],
                    },
                    {
                        name: '--json',
                        description: 'Output in JSON format',
                        type: 'boolean',
                    },
                    {
                        name: '--watch',
                        description: 'Enable real-time progress updates',
                        type: 'boolean',
                    },
                ],
                examples: [
                    'imajin stripe:create-payment --amount 2000 --currency usd --description "Test payment"',
                    'imajin stripe:create-payment --amount 5000 --currency eur --customer cus_123 --json',
                    'imajin stripe:create-payment --amount 1000 --currency usd --watch --description "Live payment"',
                ],
            },
        ];

        return {
            name: this.getName(),
            description: 'Stripe payment processing service',
            version: this.getVersion(),
            commands,
            capabilities: [...StripeCapabilities],
            realTimeSupported: true,
            authentication: {
                required: true,
                type: 'api-key',
                instructions: 'Set STRIPE_API_KEY environment variable or configure in services.stripe.apiKey',
            },
        };
    }

    /**
     * Validate Stripe configuration
     */
    private validateStripeConfig(config: ImajinConfig): any {
        const stripeConfig = {
            apiKey: process.env.STRIPE_API_KEY || config.services?.stripe?.apiKey,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || config.services?.stripe?.webhookSecret,
            ...config.services?.stripe,
        };

        return StripeConfigSchema.parse(stripeConfig);
    }
} 