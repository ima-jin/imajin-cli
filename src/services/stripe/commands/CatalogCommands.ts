/**
 * CatalogCommands - Stripe catalog browsing CLI commands  
 * 
 * @package     @imajin/cli
 * @subpackage  services/stripe/commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-06-18
 *
 * Integration Points:
 * - Commander.js command registration
 * - StripeService catalog operations
 * - JSON output for LLM consumption
 * - Progress tracking for real-time coordination
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { StripeService } from '../StripeService';
import type { Logger } from '../../../logging/Logger';

export class CatalogCommands {
    constructor(
        private readonly stripeService: StripeService,
        private readonly logger: Logger
    ) {}

    /**
     * Register all catalog-related commands
     */
    register(program: Command): void {
        const catalogCmd = program
            .command('catalog')
            .description('Stripe catalog browsing operations');

        // List products command
        catalogCmd
            .command('products')
            .description('List products')
            .option('--limit <limit>', 'Number of products to retrieve', '10')
            .option('--active', 'Only show active products')
            .option('--inactive', 'Only show inactive products')
            .option('--json', 'Output in JSON format')
            .option('--watch', 'Enable real-time progress updates')
            .action(async (options) => {
                try {
                    const progressCallback = options.watch ? (event: any) => {
                        if (!options.json) {
                            console.log(chalk.blue(`[${event.type}] ${event.message}`));
                        }
                    } : undefined;

                    let active: boolean | undefined;
                    if (options.active) active = true;
                    if (options.inactive) active = false;

                    const listOptions: any = {
                        limit: parseInt(options.limit),
                    };
                    if (active !== undefined) {
                        listOptions.active = active;
                    }

                    const result = await this.stripeService.listProducts(listOptions, progressCallback);

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(chalk.green(`📦 Retrieved ${result.products.length} products`));
                        
                        result.products.forEach((product: any, index: number) => {
                            console.log(chalk.cyan(`\n${index + 1}. ${product.id}`));
                            console.log(`   Name: ${product.name}`);
                            console.log(`   Active: ${product.active ? '✅' : '❌'}`);
                            if (Object.keys(product.metadata).length > 0) {
                                console.log(`   Metadata: ${Object.keys(product.metadata).length} items`);
                            }
                        });

                        if (result.hasMore) {
                            console.log(chalk.yellow('\n📄 More products available. Use --limit to retrieve more.'));
                        }
                    }

                    this.logger.info('Products listed via CLI', { 
                        count: result.products.length,
                        hasMore: result.hasMore 
                    });

                } catch (error) {
                    this.handleError(error, options.json);
                }
            });

        // List prices command
        catalogCmd
            .command('prices')
            .description('List prices')
            .option('--limit <limit>', 'Number of prices to retrieve', '10')
            .option('--product <productId>', 'Filter by product ID')
            .option('--active', 'Only show active prices')
            .option('--inactive', 'Only show inactive prices')
            .option('--json', 'Output in JSON format')
            .option('--watch', 'Enable real-time progress updates')
            .action(async (options) => {
                try {
                    const progressCallback = options.watch ? (event: any) => {
                        if (!options.json) {
                            console.log(chalk.blue(`[${event.type}] ${event.message}`));
                        }
                    } : undefined;

                    let active: boolean | undefined;
                    if (options.active) active = true;
                    if (options.inactive) active = false;

                    const priceOptions: any = {
                        limit: parseInt(options.limit),
                    };
                    if (options.product) {
                        priceOptions.product = options.product;
                    }
                    if (active !== undefined) {
                        priceOptions.active = active;
                    }

                    const result = await this.stripeService.listPrices(priceOptions, progressCallback);

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(chalk.green(`💰 Retrieved ${result.prices.length} prices`));
                        
                        result.prices.forEach((price: any, index: number) => {
                            console.log(chalk.cyan(`\n${index + 1}. ${price.id}`));
                            console.log(`   Product: ${price.productId}`);
                            console.log(`   Amount: ${price.unitAmount} ${price.currency.toUpperCase()}`);
                            console.log(`   Type: ${price.type}`);
                        });

                        if (result.hasMore) {
                            console.log(chalk.yellow('\n📄 More prices available. Use --limit to retrieve more.'));
                        }
                    }

                    this.logger.info('Prices listed via CLI', { 
                        count: result.prices.length,
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

        this.logger.error('Catalog command error', error);
        process.exit(1);
    }
} 