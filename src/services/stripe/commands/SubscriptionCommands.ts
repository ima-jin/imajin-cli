/**
 * SubscriptionCommands - Stripe subscription management CLI commands
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
 * - StripeService subscription operations
 * - JSON output for LLM consumption
 * - Progress tracking for real-time coordination
 * - Professional error handling with business context
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { StripeService } from '../StripeService.js';
import type { Logger } from '../../../logging/Logger.js';

export class SubscriptionCommands {
    constructor(
        private readonly stripeService: StripeService,
        private readonly logger: Logger
    ) {}

    /**
     * Register all subscription-related commands
     */
    register(program: Command): void {
        const subscriptionCmd = program
            .command('subscription')
            .description('Stripe subscription management operations');

        // Create subscription command
        subscriptionCmd
            .command('create')
            .description('Create a new subscription')
            .requiredOption('--customer <customerId>', 'Customer ID')
            .requiredOption('--price <priceId>', 'Price ID')
            .option('--payment-behavior <behavior>', 'Payment behavior: default_incomplete, error_if_incomplete, allow_incomplete', 'default_incomplete')
            .option('--metadata <metadata>', 'JSON metadata object')
            .option('--json', 'Output in JSON format')
            .option('--watch', 'Enable real-time progress updates')
            .action(async (options) => {
                try {
                    this.logger.debug('Creating subscription', {
                        customerId: options.customer,
                        priceId: options.price,
                        paymentBehavior: options.paymentBehavior
                    });

                    const metadata = options.metadata ? JSON.parse(options.metadata) : undefined;
                    
                    const progressCallback = options.watch ? (event: any) => {
                        if (!options.json) {
                            console.log(chalk.blue(`[${event.type}] ${event.message}`));
                        }
                    } : undefined;

                    const result = await this.stripeService.createSubscription({
                        customerId: options.customer,
                        priceId: options.price,
                        paymentBehavior: options.paymentBehavior as 'default_incomplete' | 'error_if_incomplete' | 'allow_incomplete',
                        trialPeriodDays: options.trialDays,
                    }, progressCallback);

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(chalk.green('✅ Subscription created successfully!'));
                        console.log(chalk.cyan(`Subscription ID: ${result.subscription.id}`));
                        console.log(chalk.cyan(`Customer ID: ${result.subscription.customerId}`));
                        console.log(chalk.cyan(`Status: ${result.subscription.status}`));
                        console.log(chalk.cyan(`Current Period: ${result.subscription.currentPeriodStart.toISOString()} - ${result.subscription.currentPeriodEnd.toISOString()}`));
                    }

                    this.logger.info('Subscription created via CLI', { 
                        subscriptionId: result.subscription.id,
                        customerId: result.subscription.customerId,
                        status: result.subscription.status 
                    });

                } catch (error) {
                    this.handleError(error, options.json);
                }
            });

        // Cancel subscription command
        subscriptionCmd
            .command('cancel <subscriptionId>')
            .description('Cancel a subscription')
            .option('--immediately', 'Cancel immediately instead of at period end')
            .option('--reason <reason>', 'Cancellation reason')
            .option('--json', 'Output in JSON format')
            .option('--watch', 'Enable real-time progress updates')
            .action(async (subscriptionId, options) => {
                try {
                    this.logger.debug('Canceling subscription', {
                        subscriptionId,
                        immediately: options.immediately,
                        reason: options.reason
                    });

                    const progressCallback = options.watch ? (event: any) => {
                        if (!options.json) {
                            console.log(chalk.blue(`[${event.type}] ${event.message}`));
                        }
                    } : undefined;

                    const result = await this.stripeService.cancelSubscription(
                        subscriptionId,
                        {
                            immediately: options.immediately,
                            reason: options.reason,
                        },
                        progressCallback
                    );

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        const action = options.immediately ? 'canceled' : 'scheduled for cancellation';
                        console.log(chalk.green(`✅ Subscription ${action} successfully!`));
                        console.log(chalk.cyan(`Subscription ID: ${result.subscription.id}`));
                        console.log(chalk.cyan(`Status: ${result.subscription.status}`));
                        
                        if (!options.immediately) {
                            console.log(chalk.yellow(`Will cancel at period end: ${result.subscription.currentPeriodEnd.toISOString()}`));
                        }
                    }

                    this.logger.info('Subscription canceled via CLI', { 
                        subscriptionId: result.subscription.id,
                        immediately: options.immediately,
                        status: result.subscription.status 
                    });

                } catch (error) {
                    this.handleError(error, options.json);
                }
            });

        // List subscriptions command
        subscriptionCmd
            .command('list')
            .description('List subscriptions with optional filtering')
            .option('--limit <limit>', 'Number of subscriptions to retrieve', '10')
            .option('--customer <customerId>', 'Filter by customer ID')
            .option('--status <status>', 'Filter by status: active, canceled, incomplete, past_due, trialing, unpaid')
            .option('--json', 'Output in JSON format')
            .option('--watch', 'Enable real-time progress updates')
            .action(async (options) => {
                try {
                    this.logger.debug('Listing subscriptions', {
                        limit: options.limit,
                        customerId: options.customer,
                        status: options.status
                    });

                    const progressCallback = options.watch ? (event: any) => {
                        if (!options.json) {
                            console.log(chalk.blue(`[${event.type}] ${event.message}`));
                        }
                    } : undefined;

                    const result = await this.stripeService.listSubscriptions({
                        limit: parseInt(options.limit),
                        customer: options.customer,
                        status: options.status as 'active' | 'canceled' | 'incomplete' | 'past_due' | 'trialing' | 'unpaid',
                    }, progressCallback);

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(chalk.green(`📱 Retrieved ${result.subscriptions.length} subscriptions`));
                        
                        result.subscriptions.forEach((subscriptionResponse: any, index: number) => {
                            const subscription = subscriptionResponse.subscription;
                            console.log(chalk.cyan(`\n${index + 1}. ${subscription.id}`));
                            console.log(`   Customer: ${subscription.customerId}`);
                            console.log(`   Status: ${subscription.status}`);
                            console.log(`   Period: ${subscription.currentPeriodStart.toISOString()} - ${subscription.currentPeriodEnd.toISOString()}`);
                        });

                        if (result.hasMore) {
                            console.log(chalk.yellow('\n📄 More subscriptions available. Use --limit to retrieve more.'));
                        }
                    }

                    this.logger.info('Subscriptions listed via CLI', { 
                        count: result.subscriptions.length,
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

        this.logger.error('Subscription command error', error);
        process.exit(1);
    }
} 