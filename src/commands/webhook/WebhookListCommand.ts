/**
 * WebhookListCommand - List configured webhooks and their status
 * 
 * @package     @imajin/cli
 * @subpackage  commands/webhook
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-07-03
 *
 * Integration Points:
 * - WebhookManager for webhook information
 * - Command pattern framework
 * - JSON output for LLM consumption
 * - Table formatting for human readability
 */

import { BaseCommand } from '../../core/commands/BaseCommand.js';
import type { Logger } from '../../logging/Logger.js';
import { WebhookManager } from '../../webhooks/WebhookManager.js';

export class WebhookListCommand extends BaseCommand {
    public readonly name = 'webhook:list';
    public readonly description = 'List all configured webhooks and their status';

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
            this.logger?.debug('Listing webhooks', { json: !!options.json });
            this.validate(args, options);

            const stats = this.webhookManager.getStats();
            const sources = this.webhookManager.listSources();

            const webhooks = sources.map(source => {
                const handlers = this.webhookManager.getHandlers(source);
                return {
                    source,
                    handlers: handlers.length,
                    eventTypes: handlers.flatMap(h => h.eventTypes),
                    hasValidator: handlers.some(h => !!h.validator)
                };
            });

            const result = {
                summary: {
                    totalSources: stats.handlersBySource ? Object.keys(stats.handlersBySource).length : 0,
                    totalHandlers: stats.handlers,
                    totalConfigs: stats.configs,
                    processedEvents: stats.processedEvents
                },
                webhooks,
                stats
            };

            if (options.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                this.displayTable(result);
            }

            this.logger?.info('Webhook list retrieved successfully', {
                sources: sources.length,
                handlers: stats.handlers,
                json: !!options.json
            });

            return result;

        } catch (error) {
            this.logger?.error('Failed to list webhooks', error as Error);
            throw error;
        }
    }

    /**
     * Display webhooks in table format
     */
    private displayTable(result: any): void {
        console.log('\n📡 Webhook Configuration Status\n');

        // Summary
        console.log('Summary:');
        console.log(`  Sources: ${result.summary.totalSources}`);
        console.log(`  Handlers: ${result.summary.totalHandlers}`);
        console.log(`  Configs: ${result.summary.totalConfigs}`);
        console.log(`  Processed Events: ${result.summary.processedEvents}`);
        console.log('');

        if (result.webhooks.length === 0) {
            console.log('No webhooks configured.');
            return;
        }

        // Webhooks table
        console.log('Configured Webhooks:');
        console.log('┌─────────────────┬──────────┬─────────────┬───────────────────────────────────┐');
        console.log('│ Source          │ Handlers │ Validator   │ Event Types                       │');
        console.log('├─────────────────┼──────────┼─────────────┼───────────────────────────────────┤');

        result.webhooks.forEach((webhook: any) => {
            const source = webhook.source.padEnd(15).substring(0, 15);
            const handlers = webhook.handlers.toString().padEnd(8);
            const hasValidator = (webhook.hasValidator ? 'Yes' : 'No').padEnd(11);
            const eventTypes = webhook.eventTypes.join(', ').padEnd(35).substring(0, 35);

            console.log(`│ ${source} │ ${handlers} │ ${hasValidator} │ ${eventTypes} │`);
        });

        console.log('└─────────────────┴──────────┴─────────────┴───────────────────────────────────┘');
        console.log('');
    }
} 