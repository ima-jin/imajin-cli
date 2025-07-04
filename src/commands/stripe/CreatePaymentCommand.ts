/**
 * CreatePaymentCommand - Command for creating Stripe payments
 * 
 * @package     @imajin/cli
 * @subpackage  commands/stripe
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 * @updated      2025-06-25
 *
 * @see        docs/commands/stripe.md
 * 
 * Integration Points:
 * - Real-time progress callbacks for LLM interaction
 * - JSON output for AI parsing
 * - Error handling with structured responses
 * - Validation and type safety
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { StripeService } from '../../services/stripe/StripeService.js';
import type { LLMProgressCallback, LLMResponse } from '../../types/LLM.js';
import { CreatePaymentIntentParams, CreatePaymentIntentSchema } from '../../types/Stripe.js';

export class CreatePaymentCommand {
    private stripeService: StripeService;

    constructor(stripeService: StripeService) {
        this.stripeService = stripeService;
    }

    /**
     * Register the command with Commander
     */
    register(program: Command): void {
        program
            .command('stripe:create-payment')
            .description('Create a new Stripe payment intent')
            .requiredOption('--amount <amount>', 'Payment amount in cents', parseInt)
            .requiredOption('--currency <currency>', 'Currency code (e.g., usd, eur)', 'usd')
            .option('--customer <customerId>', 'Customer ID')
            .option('--payment-method <methodId>', 'Payment method ID')
            .option('--description <description>', 'Payment description')
            .option('--metadata <metadata>', 'JSON metadata', this.parseMetadata)
            .option('--capture-method <method>', 'Capture method: automatic or manual', 'automatic')
            .option('--json', 'Output in JSON format')
            .option('--watch', 'Enable real-time progress updates')
            .action(async (options) => {
                await this.execute(options);
            });
    }

    /**
     * Execute the payment creation command
     */
    private async execute(options: any): Promise<void> {
        try {
            // Validate input parameters
            const validatedParams = CreatePaymentIntentSchema.parse({
                amount: options.amount,
                currency: options.currency,
                customerId: options.customer,
                paymentMethodId: options.paymentMethod,
                description: options.description,
                metadata: options.metadata || {},
                captureMethod: options.captureMethod,
                automaticPaymentMethods: true,
            });

            // Filter out undefined optional parameters to match interface
            const params: CreatePaymentIntentParams = {
                amount: validatedParams.amount,
                currency: validatedParams.currency,
                captureMethod: validatedParams.captureMethod,
                automaticPaymentMethods: validatedParams.automaticPaymentMethods,
                ...(validatedParams.customerId && { customerId: validatedParams.customerId }),
                ...(validatedParams.paymentMethodId && { paymentMethodId: validatedParams.paymentMethodId }),
                ...(validatedParams.description && { description: validatedParams.description }),
                ...(validatedParams.metadata && Object.keys(validatedParams.metadata).length > 0 && { metadata: validatedParams.metadata }),
            };

            const _startTime = Date.now();

            // Setup progress callback for real-time updates
            const progressCallback: LLMProgressCallback | undefined = options.watch
                ? (event) => {
                    if (!options.json) {
                        const icon = event.type === 'error' ? '❌' : event.type === 'complete' ? '✅' : '⏳';
                        console.log(chalk.blue(`${icon} ${event.message}`));
                        if (event.progress !== undefined) {
                            console.log(chalk.gray(`   Progress: ${event.progress}%`));
                        }
                    }
                }
                : undefined;

            // Create payment intent
            const result = await this.stripeService.createPaymentIntent(params, progressCallback);

            const executionTime = Date.now() - _startTime;

            if (options.json) {
                const response: LLMResponse = {
                    success: true,
                    data: result,
                    timestamp: new Date(),
                    service: 'stripe',
                    command: 'create-payment',
                    executionTime,
                };
                console.log(JSON.stringify(response, null, 2));
            } else {
                console.log(chalk.green('\n✅ Payment Intent Created Successfully\n'));
                console.log(chalk.blue('Payment Details:'));
                console.log(`  ID: ${chalk.white(result.paymentIntent.id)}`);
                console.log(`  Amount: ${chalk.white((result.paymentIntent.amount / 100).toFixed(2))} ${result.paymentIntent.currency.toUpperCase()}`);
                console.log(`  Status: ${chalk.yellow(result.paymentIntent.status)}`);

                if (result.paymentIntent.customerId) {
                    console.log(`  Customer: ${chalk.white(result.paymentIntent.customerId)}`);
                }

                if (result.paymentIntent.clientSecret) {
                    console.log(`\n${chalk.gray('Client Secret: ' + result.paymentIntent.clientSecret)}`);
                    console.log(chalk.gray('Use this client secret to complete the payment on the frontend.'));
                }

                console.log(chalk.gray(`\nExecution time: ${executionTime}ms`));
            }

        } catch (error) {
            const executionTime = Date.now() - Date.now();

            if (options.json) {
                const response: LLMResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date(),
                    service: 'stripe',
                    command: 'create-payment',
                    executionTime,
                };
                console.log(JSON.stringify(response, null, 2));
            } else {
                console.error(chalk.red('\n❌ Failed to create payment intent'));
                console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
            }

            process.exit(1);
        }
    }

    /**
     * Parse metadata JSON string
     */
    private parseMetadata(value: string): Record<string, string> {
        try {
            return JSON.parse(value);
        } catch {
            throw new Error('Invalid JSON metadata format');
        }
    }
} 