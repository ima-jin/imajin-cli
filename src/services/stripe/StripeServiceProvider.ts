/**
 * StripeServiceProvider - Modular Stripe service provider 
 * 
 * @package     @imajin/cli
 * @subpackage  services/stripe
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 *
 * Integration Points:
 * - Service provider pattern for modular architecture
 * - Command registration with CLI program
 * - Universal element mapping and ETL integration
 * - Real-time event coordination
 * - LLM introspection interfaces
 */

import type { Command } from 'commander';
import type { Container } from '../../container/Container.js';
import type { Logger } from '../../logging/Logger.js';
import { ServiceProvider } from '../../providers/ServiceProvider.js';
import type { StripeConfig } from '../../types/Stripe.js';
import { StripeService } from './StripeService';
import { CustomerCommands } from './commands/CustomerCommands';
import { PaymentCommands } from './commands/PaymentCommands';
import { SubscriptionCommands } from './commands/SubscriptionCommands';
import { CatalogCommands } from './commands/CatalogCommands';

export class StripeServiceProvider extends ServiceProvider {
    private stripeService?: StripeService;
    private customerCommands?: CustomerCommands;
    private paymentCommands?: PaymentCommands;
    private subscriptionCommands?: SubscriptionCommands;
    private catalogCommands?: CatalogCommands;
    private logger: Logger;

    constructor(container: Container, program: Command) {
        super(container, program);
        this.logger = this.container.resolve<Logger>('logger');
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
        return [
            'customer-management',
            'payment-processing', 
            'subscription-management',
            'catalog-browsing',
            'universal-element-mapping',
            'real-time-progress',
            'business-error-handling',
        ];
    }

    /**
     * Check if provider provides a specific service
     */
    provides(service: string): boolean {
        return this.getServices().includes(service) || service === 'stripe';
    }

    /**
     * Register services and initialize components
     */
    async register(config?: StripeConfig): Promise<void> {
        // Check if we have Stripe configuration
        const apiKey = config?.apiKey ?? process.env.STRIPE_API_KEY;
        const hasStripeConfig = !!(apiKey);

        if (hasStripeConfig) {
            // Validate Stripe configuration
            const stripeConfig: StripeConfig = {
                apiKey: apiKey!,
                apiVersion: config?.apiVersion ?? '2024-06-20',
                timeout: config?.timeout ?? 60000,
                maxNetworkRetries: config?.maxNetworkRetries ?? 3,
                enableTelemetry: config?.enableTelemetry ?? false,
            };

            // Initialize StripeService
            this.stripeService = new StripeService(stripeConfig, this.logger);

            // Initialize command classes
            this.customerCommands = new CustomerCommands(this.stripeService, this.logger);
            this.paymentCommands = new PaymentCommands(this.stripeService, this.logger);
            this.subscriptionCommands = new SubscriptionCommands(this.stripeService, this.logger);
            this.catalogCommands = new CatalogCommands(this.stripeService, this.logger);

            this.logger.info('StripeServiceProvider registered with API key', {
                mode: apiKey!.startsWith('sk_test_') ? 'test' : 'live'
            });
        } else {
            this.logger.info('StripeServiceProvider registered without API key (introspection only)');
        }
    }

    /**
     * Boot the service provider and set up event listeners
     */
    async boot(): Promise<void> {
        // Load existing business context if available
        if (this.stripeService) {
            await this.loadBusinessContext();
        }

        // Set up event listeners for real-time coordination
        if (this.stripeService) {
            this.stripeService.on('customer-created', (event) => {
                this.logger.info('Customer created', { 
                    customerId: event.customer.id,
                    universalContactId: event.universalContact.id 
                });
            });

            this.stripeService.on('payment-intent-created', (event) => {
                this.logger.info('Payment intent created', { 
                    paymentIntentId: event.paymentIntent.id,
                    universalPaymentId: event.universalPayment.id 
                });
            });

            this.stripeService.on('payment-confirmed', (event) => {
                this.logger.info('Payment confirmed', { 
                    paymentIntentId: event.paymentIntent.id,
                    status: event.paymentIntent.status 
                });
            });

            this.stripeService.on('subscription-created', (event) => {
                this.logger.info('Subscription created', { 
                    subscriptionId: event.subscription.id,
                    universalSubscriptionId: event.universalSubscription.id 
                });
            });

            this.stripeService.on('subscription-canceled', (event) => {
                this.logger.info('Subscription canceled', { 
                    subscriptionId: event.subscription.id,
                    status: event.subscription.status 
                });
            });

            this.stripeService.on('progress', (event) => {
                this.logger.debug('Stripe operation progress', { 
                    type: event.type,
                    message: event.message,
                    progress: event.progress 
                });
            });
        }

        this.logger.info('StripeServiceProvider booted successfully');
    }

    /**
     * Register commands with CLI program
     */
    registerCommands(program: Command): void {
        if (this.stripeService && this.customerCommands && this.paymentCommands && 
            this.subscriptionCommands && this.catalogCommands) {
            
            // Create main stripe command group
            const stripeCmd = program
                .command('stripe')
                .description('Stripe service operations');

            // Register all command groups
            this.customerCommands.register(stripeCmd);
            this.paymentCommands.register(stripeCmd);
            this.subscriptionCommands.register(stripeCmd);
            this.catalogCommands.register(stripeCmd);

            this.logger.info('Stripe commands registered successfully');
        } else {
            // Register placeholder commands that show configuration needed
            const stripeCmd = program
                .command('stripe')
                .description('Stripe service operations (requires configuration)');

            stripeCmd
                .command('configure')
                .description('Show Stripe configuration instructions')
                .action(() => {
                    console.error('❌ Stripe API key not configured');
                    console.error('💡 Set STRIPE_API_KEY environment variable or provide config');
                    console.error('');
                    console.error('Examples:');
                    console.error('  export STRIPE_API_KEY=sk_test_...');
                    console.error('  # For test mode (recommended for development)');
                    console.error('');
                    console.error('  export STRIPE_API_KEY=sk_live_...');
                    console.error('  # For live mode (production only)');
                    process.exit(1);
                });

            this.logger.info('Stripe placeholder commands registered (configuration needed)');
        }
    }

    /**
     * Get service introspection for LLM discovery
     */
    getIntrospection(): any {
        const baseIntrospection = {
            service: 'stripe',
            version: this.getVersion(),
            capabilities: this.getServices(),
            configured: !!this.stripeService,
        };

        if (!this.stripeService) {
            return {
                ...baseIntrospection,
                status: 'configuration_required',
                message: 'Stripe API key required for operation',
                commands: [
                    {
                        name: 'stripe:configure',
                        description: 'Show Stripe configuration instructions',
                        usage: 'imajin stripe configure',
                    }
                ],
            };
        }

        return {
            ...baseIntrospection,
            status: 'ready',
            commands: [
                {
                    name: 'stripe:customer:create',
                    description: 'Create a new customer',
                    usage: 'imajin stripe customer create --email <email> [options]',
                    options: ['--name', '--phone', '--description', '--metadata', '--json', '--watch'],
                },
                {
                    name: 'stripe:customer:list',
                    description: 'List customers with filtering',
                    usage: 'imajin stripe customer list [options]',
                    options: ['--limit', '--email', '--created-after', '--created-before', '--json', '--watch'],
                },
                {
                    name: 'stripe:customer:show',
                    description: 'Show customer details',
                    usage: 'imajin stripe customer show <customerId> [options]',
                    options: ['--include-subscriptions', '--json', '--watch'],
                },
                {
                    name: 'stripe:payment:create',
                    description: 'Create a payment intent',
                    usage: 'imajin stripe payment create --amount <amount> [options]',
                    options: ['--currency', '--customer', '--payment-method', '--description', '--metadata', '--json', '--watch'],
                },
                {
                    name: 'stripe:payment:confirm',
                    description: 'Confirm a payment intent',
                    usage: 'imajin stripe payment confirm <paymentIntentId> [options]',
                    options: ['--payment-method', '--json', '--watch'],
                },
                {
                    name: 'stripe:payment:list',
                    description: 'List payment intents',
                    usage: 'imajin stripe payment list [options]',
                    options: ['--limit', '--customer', '--created-after', '--created-before', '--json', '--watch'],
                },
                {
                    name: 'stripe:subscription:create',
                    description: 'Create a subscription',
                    usage: 'imajin stripe subscription create --customer <customerId> --price <priceId> [options]',
                    options: ['--payment-behavior', '--metadata', '--json', '--watch'],
                },
                {
                    name: 'stripe:subscription:cancel',
                    description: 'Cancel a subscription',
                    usage: 'imajin stripe subscription cancel <subscriptionId> [options]',
                    options: ['--immediately', '--reason', '--json', '--watch'],
                },
                {
                    name: 'stripe:subscription:list',
                    description: 'List subscriptions',
                    usage: 'imajin stripe subscription list [options]',
                    options: ['--limit', '--customer', '--status', '--json', '--watch'],
                },
                {
                    name: 'stripe:catalog:products',
                    description: 'List products',
                    usage: 'imajin stripe catalog products [options]',
                    options: ['--limit', '--active', '--inactive', '--json', '--watch'],
                },
                {
                    name: 'stripe:catalog:prices',
                    description: 'List prices',
                    usage: 'imajin stripe catalog prices [options]',
                    options: ['--limit', '--product', '--active', '--inactive', '--json', '--watch'],
                },
            ],
        };
    }

    /**
     * Load existing business context for Stripe service
     */
    private async loadBusinessContext(): Promise<void> {
        if (!this.stripeService) {
            return;
        }

        try {
            // Try to load existing business context
            const { BusinessContextManager } = await import('../../context/BusinessContextManager.js');
            const manager = new BusinessContextManager();
            
            if (await manager.configurationExists()) {
                const domainModel = await manager.toDomainModel();
                await this.stripeService.initializeWithBusinessContext(domainModel);
                this.logger.info('Stripe service initialized with existing business context', {
                    businessType: domainModel.businessType,
                    entities: Object.keys(domainModel.entities)
                });
            } else {
                this.logger.warn('No business context found. Run "imajin init setup" to create one.');
            }
        } catch (error) {
            this.logger.warn('Failed to load business context, continuing without it', {
                error: String(error)
            });
        }
    }

    /**
     * Get the configured Stripe service instance
     */
    getStripeService(): StripeService | undefined {
        return this.stripeService;
    }

    /**
     * Shutdown the service provider
     */
    async shutdown(): Promise<void> {
        if (this.stripeService) {
            this.stripeService.removeAllListeners();
        }
        this.logger.info('StripeServiceProvider shutdown complete');
    }
} 