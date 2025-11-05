/**
 * PaymentCommands - Stripe payment processing CLI commands
 * 
 * @package     @imajin/cli
 * @subpackage  services/stripe/commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Commander.js command registration
 * - StripeService payment operations
 * - JSON output for LLM consumption
 * - Progress tracking for real-time coordination
 * - Professional error handling with business context
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { StripeService } from '../StripeService.js';
import type { Logger } from '../../../logging/Logger.js';

export class PaymentCommands {
    constructor(
        private readonly stripeService: StripeService,
        private readonly logger: Logger
    ) {}

    /**
     * Register all payment-related commands
     */
    register(program: Command): void {
        const paymentCmd = program
            .command('payment')
            .description('Stripe payment processing operations');

        // Create payment intent command
        paymentCmd
            .command('create')
            .description('Create a new payment intent')
            .requiredOption('--amount <amount>', 'Payment amount in cents')
            .option('--currency <currency>', 'Currency code (e.g., usd, eur)', 'usd')
            .option('--customer <customerId>', 'Customer ID')
            .option('--payment-method <paymentMethodId>', 'Payment method ID')
            .option('--description <description>', 'Payment description')
            .option('--metadata <metadata>', 'JSON metadata object')
            .option('--capture-method <method>', 'Capture method: automatic or manual', 'automatic')
            .option('--automatic-payment-methods', 'Enable automatic payment methods')
            .option('--json', 'Output in JSON format')
            .option('--watch', 'Enable real-time progress updates')
            .action(async (options) => {
                try {
                    this.logger.debug('Creating payment intent', {
                        amount: options.amount,
                        currency: options.currency,
                        customerId: options.customer,
                        captureMethod: options.captureMethod
                    });

                    const amount = parseInt(options.amount);
                    if (isNaN(amount) || amount <= 0) {
                        throw new Error('Amount must be a positive number');
                    }

                    const metadata = options.metadata ? JSON.parse(options.metadata) : undefined;
                    
                    const progressCallback = options.watch ? (event: any) => {
                        if (!options.json) {
                            console.log(chalk.blue(`[${event.type}] ${event.message}`));
                        }
                    } : undefined;

                    const result = await this.stripeService.createPaymentIntent({
                        amount,
                        currency: options.currency,
                        customerId: options.customer,
                        paymentMethodId: options.paymentMethod,
                        description: options.description,
                        metadata,
                        captureMethod: options.captureMethod as 'automatic' | 'manual',
                        automaticPaymentMethods: options.automaticPaymentMethods,
                    }, progressCallback);

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(chalk.green('✅ Payment intent created successfully!'));
                        console.log(chalk.cyan(`Payment Intent ID: ${result.paymentIntent.id}`));
                        console.log(chalk.cyan(`Amount: ${result.paymentIntent.amount} ${result.paymentIntent.currency.toUpperCase()}`));
                        console.log(chalk.cyan(`Status: ${result.paymentIntent.status}`));
                        if (result.paymentIntent.clientSecret) {
                            console.log(chalk.yellow(`Client Secret: ${result.paymentIntent.clientSecret}`));
                        }
                    }

                    this.logger.info('Payment intent created via CLI', { 
                        paymentIntentId: result.paymentIntent.id,
                        amount: result.paymentIntent.amount,
                        currency: result.paymentIntent.currency 
                    });

                } catch (error) {
                    this.handleError(error, options.json);
                }
            });

        // Confirm payment intent command
        paymentCmd
            .command('confirm <paymentIntentId>')
            .description('Confirm a payment intent')
            .option('--payment-method <paymentMethodId>', 'Payment method ID to confirm with')
            .option('--json', 'Output in JSON format')
            .option('--watch', 'Enable real-time progress updates')
            .action(async (paymentIntentId, options) => {
                try {
                    this.logger.debug('Confirming payment intent', {
                        paymentIntentId,
                        paymentMethodId: options.paymentMethod
                    });

                    const progressCallback = options.watch ? (event: any) => {
                        if (!options.json) {
                            console.log(chalk.blue(`[${event.type}] ${event.message}`));
                        }
                    } : undefined;

                    const result = await this.stripeService.confirmPaymentIntent(
                        paymentIntentId,
                        options.paymentMethod,
                        progressCallback
                    );

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(chalk.green('✅ Payment confirmed successfully!'));
                        console.log(chalk.cyan(`Payment Intent ID: ${result.paymentIntent.id}`));
                        console.log(chalk.cyan(`Status: ${result.paymentIntent.status}`));
                        console.log(chalk.cyan(`Amount: ${result.paymentIntent.amount} ${result.paymentIntent.currency.toUpperCase()}`));
                        
                        if (result.paymentIntent.status === 'succeeded') {
                            console.log(chalk.green('💰 Payment completed successfully!'));
                        } else if (result.paymentIntent.status === 'requires_action') {
                            console.log(chalk.yellow('⚠️  Payment requires additional action'));
                        }
                    }

                    this.logger.info('Payment confirmed via CLI', { 
                        paymentIntentId: result.paymentIntent.id,
                        status: result.paymentIntent.status 
                    });

                } catch (error) {
                    this.handleError(error, options.json);
                }
            });

        // List payment intents command
        paymentCmd
            .command('list')
            .description('List payment intents with optional filtering')
            .option('--limit <limit>', 'Number of payment intents to retrieve', '10')
            .option('--customer <customerId>', 'Filter by customer ID')
            .option('--created-after <date>', 'Filter payments created after date (ISO 8601)')
            .option('--created-before <date>', 'Filter payments created before date (ISO 8601)')
            .option('--json', 'Output in JSON format')
            .option('--watch', 'Enable real-time progress updates')
            .action(async (options) => {
                try {
                    this.logger.debug('Listing payment intents', {
                        limit: options.limit,
                        customerId: options.customer
                    });

                    const createdFilter: any = {};
                    if (options.createdAfter) {
                        createdFilter.gte = Math.floor(new Date(options.createdAfter).getTime() / 1000);
                    }
                    if (options.createdBefore) {
                        createdFilter.lte = Math.floor(new Date(options.createdBefore).getTime() / 1000);
                    }

                    const progressCallback = options.watch ? (event: any) => {
                        if (!options.json) {
                            console.log(chalk.blue(`[${event.type}] ${event.message}`));
                        }
                    } : undefined;

                    const result = await this.stripeService.listPaymentIntents({
                        limit: parseInt(options.limit),
                        customer: options.customer,
                        created: Object.keys(createdFilter).length > 0 ? createdFilter : undefined,
                    }, progressCallback);

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(chalk.green(`💳 Retrieved ${result.payments.length} payment intents`));
                        
                        result.payments.forEach((paymentResponse: any, index: number) => {
                            const payment = paymentResponse.paymentIntent;
                            console.log(chalk.cyan(`\n${index + 1}. ${payment.id}`));
                            console.log(`   Amount: ${payment.amount} ${payment.currency.toUpperCase()}`);
                            console.log(`   Status: ${payment.status}`);
                            if (payment.customerId) {
                                console.log(`   Customer: ${payment.customerId}`);
                            }
                        });

                        if (result.hasMore) {
                            console.log(chalk.yellow('\n📄 More payment intents available. Use --limit to retrieve more.'));
                        }
                    }

                    this.logger.info('Payment intents listed via CLI', { 
                        count: result.payments.length,
                        hasMore: result.hasMore 
                    });

                } catch (error) {
                    this.handleError(error, options.json);
                }
            });
    }

    private handleError(error: any, jsonOutput: boolean): void {
        const errorMessage = error.message || 'Unknown error occurred';
        const errorCode = error.code || 'unknown_error';

        if (jsonOutput) {
            console.log(JSON.stringify({
                success: false,
                error: {
                    message: errorMessage,
                    code: errorCode,
                    type: error.type || 'error',
                },
            }, null, 2));
        } else {
            console.error(chalk.red(`❌ Error: ${errorMessage}`));
            if (errorCode !== 'unknown_error') {
                console.error(chalk.red(`Code: ${errorCode}`));
            }
        }

        this.logger.error('Payment command error', error);
        process.exit(1);
    }
} 