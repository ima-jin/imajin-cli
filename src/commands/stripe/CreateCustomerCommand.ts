/**
 * CreateCustomerCommand - Command for creating Stripe customers
 * 
 * @package     @imajin/cli
 * @subpackage  commands/stripe
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-25
 *
 * @see         docs/commands/stripe.md
 * 
 * Integration Points:
 * - Real-time progress callbacks for LLM interaction
 * - JSON output for AI parsing
 * - Error handling with structured responses
 * - Validation and type safety
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { Logger } from '../../logging/Logger.js';
import { StripeService } from '../../services/stripe/StripeService.js';
import { CLI_DESCRIPTIONS } from '../../constants/CommonStrings.js';
import type { LLMResponse } from '../../types/LLM.js';

export interface CreateCustomerOptions {
    name?: string;
    email?: string;
    phone?: string;
    description?: string;
    metadata?: string;
    json?: boolean;
    watch?: boolean;
}

export class CreateCustomerCommand {
    constructor(
        private stripeService: StripeService,
        private logger: Logger
    ) { }

    public register(program: Command): void {
        program
            .command('stripe:create-customer')
            .description('Create a new Stripe customer')
            .option('--name <name>', 'Customer name')
            .option('--email <email>', 'Customer email address')
            .option('--phone <phone>', 'Customer phone number')
            .option('--description <description>', 'Customer description')
            .option('--metadata <metadata>', 'Customer metadata as JSON string')
            .option('--json', CLI_DESCRIPTIONS.JSON_OUTPUT)
            .option('--watch', 'Watch for real-time updates')
            .action(async (options: CreateCustomerOptions) => {
                await this.execute(options);
            });
    }

    public async execute(options: CreateCustomerOptions): Promise<void> {
        const _startTime = Date.now();

        try {
            // Validate required fields
            if (!options.email && !options.name) {
                throw new Error('Either email or name is required');
            }

            // Parse metadata if provided
            let metadata: Record<string, string> = {};
            if (options.metadata) {
                try {
                    metadata = JSON.parse(options.metadata);
                } catch (error) {
                    throw new Error('Invalid metadata JSON format');
                }
            }

            // Prepare customer data
            const customerData: any = {
                name: options.name,
                email: options.email,
                phone: options.phone,
                description: options.description,
                metadata,
            };

            // Remove undefined fields
            Object.keys(customerData).forEach(key => {
                if (customerData[key] === undefined) {
                    delete customerData[key];
                }
            });

            this.logger.info('Creating Stripe customer', { customerData });

            // Create customer with progress tracking
            const response = await this.stripeService.createCustomer(customerData);

            const duration = Date.now() - _startTime;

            // Prepare response
            const apiResponse: LLMResponse = {
                success: true,
                data: {
                    customer: {
                        id: response.customer.id,
                        name: response.customer.name,
                        email: response.customer.email,
                        phone: response.customer.phone,
                        description: response.customer.metadata?.description,
                        created: response.customer.created,
                        metadata: response.customer.metadata,
                    },
                },
                timestamp: new Date(),
                service: 'stripe',
                command: 'stripe:create-customer',
                executionTime: duration,
            };

            // Output based on format preference
            if (options.json) {
                console.log(JSON.stringify(apiResponse, null, 2));
            } else {
                this.displayCustomerInfo(response.customer, duration);
            }

            this.logger.info('Customer created successfully', {
                customerId: response.customer.id,
                duration,
            });

        } catch (error) {
            const duration = Date.now() - _startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            this.logger.error('Failed to create customer', error instanceof Error ? error : new Error(errorMessage), { duration });

            const errorResponse: LLMResponse = {
                success: false,
                error: errorMessage,
                timestamp: new Date(),
                service: 'stripe',
                command: 'stripe:create-customer',
                executionTime: duration,
            };

            if (options.json) {
                console.log(JSON.stringify(errorResponse, null, 2));
            } else {
                console.error(chalk.red('❌ Failed to create customer:'), errorMessage);
            }

            process.exit(1);
        }
    }

    private displayCustomerInfo(customer: any, duration: number): void {
        console.log(chalk.green('✅ Customer created successfully!\n'));

        console.log(chalk.bold('Customer Details:'));
        console.log(`${chalk.cyan('ID:')} ${customer.id}`);

        if (customer.name) {
            console.log(`${chalk.cyan('Name:')} ${customer.name}`);
        }

        if (customer.email) {
            console.log(`${chalk.cyan('Email:')} ${customer.email}`);
        }

        if (customer.phone) {
            console.log(`${chalk.cyan('Phone:')} ${customer.phone}`);
        }

        if (customer.metadata?.description) {
            console.log(`${chalk.cyan('Description:')} ${customer.metadata.description}`);
        }

        console.log(`${chalk.cyan('Created:')} ${customer.created.toLocaleString()}`);

        if (customer.metadata && Object.keys(customer.metadata).length > 0) {
            console.log(`${chalk.cyan('Metadata:')} ${JSON.stringify(customer.metadata, null, 2)}`);
        }

        console.log(`\n${chalk.gray(`⏱️  Completed in ${duration}ms`)}`);
    }
} 