/**
 * CustomerCommands - Stripe customer management CLI commands
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
 * - StripeService customer operations
 * - JSON output for LLM consumption
 * - Progress tracking for real-time coordination
 * - Professional error handling with business context
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { CommonOptions } from '../../../utils/commonOptions.js';
import type { StripeService } from '../StripeService.js';
import type { Logger } from '../../../logging/Logger.js';

export class CustomerCommands {
    constructor(
        private readonly stripeService: StripeService,
        private readonly logger: Logger
    ) {}

    /**
     * Register all customer-related commands
     */
    register(program: Command): void {
        const customerCmd = program
            .command('customer')
            .description('Stripe customer management operations');

        // Create customer command
        customerCmd
            .command('create')
            .description('Create a new customer')
            .requiredOption('--email <email>', 'Customer email address')
            .option('--name <name>', 'Customer full name')
            .option('--phone <phone>', 'Customer phone number')
            .option('--description <description>', 'Customer description')
            .option('--metadata <metadata>', 'JSON metadata object')
            .addOption(CommonOptions.json())
            .addOption(CommonOptions.watch())
            .action(async (options) => {
                try {
                    this.logger.debug('Creating Stripe customer', {
                        email: options.email,
                        name: options.name,
                        hasMetadata: !!options.metadata
                    });

                    const metadata = options.metadata ? JSON.parse(options.metadata) : undefined;

                    const progressCallback = options.watch ? (event: any) => {
                        if (!options.json) {
                            console.log(chalk.blue(`[${event.type}] ${event.message}`));
                        }
                    } : undefined;

                    const result = await this.stripeService.createCustomer({
                        email: options.email,
                        name: options.name,
                        phone: options.phone,
                        description: options.description,
                        metadata,
                    }, progressCallback);

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(chalk.green('✅ Customer created successfully!'));
                        console.log(chalk.cyan(`Customer ID: ${result.customer.id}`));
                        console.log(chalk.cyan(`Email: ${result.customer.email}`));
                        if (result.customer.name) {
                            console.log(chalk.cyan(`Name: ${result.customer.name}`));
                        }
                    }

                    this.logger.info('Customer created via CLI', { 
                        customerId: result.customer.id,
                        email: result.customer.email 
                    });

                } catch (error) {
                    this.handleError(error, options.json);
                }
            });

        // List customers command
        customerCmd
            .command('list')
            .description('List customers with optional filtering')
            .addOption(CommonOptions.limit(10))
            .option('--email <email>', 'Filter by email address')
            .option('--created-after <date>', 'Filter customers created after date (ISO 8601)')
            .option('--created-before <date>', 'Filter customers created before date (ISO 8601)')
            .addOption(CommonOptions.json())
            .addOption(CommonOptions.watch())
            .action(async (options) => {
                try {
                    this.logger.debug('Listing Stripe customers', {
                        limit: options.limit,
                        email: options.email,
                        createdAfter: options.createdAfter,
                        createdBefore: options.createdBefore
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

                    const result = await this.stripeService.listCustomers({
                        limit: Number.parseInt(options.limit),
                        email: options.email,
                        created: Object.keys(createdFilter).length > 0 ? createdFilter : undefined,
                    }, progressCallback);

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(chalk.green(`📋 Retrieved ${result.customers.length} customers`));

                        for (let index = 0; index < result.customers.length; index++) {
                            const customerResponse = result.customers[index];
                            const customer = customerResponse.customer;
                            console.log(chalk.cyan(`\n${index + 1}. ${customer.id}`));
                            console.log(`   Email: ${customer.email}`);
                            if (customer.name) {
console.log(`   Name: ${customer.name}`);
}
                            if (customer.phone) {
console.log(`   Phone: ${customer.phone}`);
}
                            console.log(`   Created: ${customer.created.toISOString()}`);
                        }

                        if (result.hasMore) {
                            console.log(chalk.yellow('\n📄 More customers available. Use --limit to retrieve more.'));
                        }
                    }

                    this.logger.info('Customers listed via CLI', { 
                        count: result.customers.length,
                        hasMore: result.hasMore 
                    });

                } catch (error) {
                    this.handleError(error, options.json);
                }
            });

        // Show customer command
        customerCmd
            .command('show <customerId>')
            .description('Show detailed information about a customer')
            .option('--include-subscriptions', 'Include customer subscriptions')
            .addOption(CommonOptions.json())
            .addOption(CommonOptions.watch())
            .action(async (customerId, options) => {
                try {
                    this.logger.debug('Getting Stripe customer', {
                        customerId,
                        includeSubscriptions: options.includeSubscriptions
                    });

                    const progressCallback = options.watch ? (event: any) => {
                        if (!options.json) {
                            console.log(chalk.blue(`[${event.type}] ${event.message}`));
                        }
                    } : undefined;

                    const result = await this.stripeService.getCustomer(
                        customerId,
                        progressCallback
                    );

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        const customer = result.customer;
                        console.log(chalk.green('👤 Customer Details'));
                        console.log(chalk.cyan(`ID: ${customer.id}`));
                        console.log(chalk.cyan(`Email: ${customer.email}`));
                        if (customer.name) {
console.log(chalk.cyan(`Name: ${customer.name}`));
}
                        if (customer.phone) {
console.log(chalk.cyan(`Phone: ${customer.phone}`));
}
                        console.log(chalk.cyan(`Created: ${customer.created.toISOString()}`));

                        if (customer.metadata && Object.keys(customer.metadata).length > 0) {
                            console.log(chalk.yellow('\n🏷️  Metadata:'));
                            for (const [key, value] of Object.entries(customer.metadata)) {
                                console.log(`   ${key}: ${value}`);
                            }
                        }
                    }

                    this.logger.info('Customer retrieved via CLI', { 
                        customerId: result.customer.id,
                        includeSubscriptions: options.includeSubscriptions 
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

        this.logger.error('Customer command error', error);
        process.exit(1);
    }
} 