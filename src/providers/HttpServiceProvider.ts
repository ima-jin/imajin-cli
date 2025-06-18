/**
 * HttpServiceProvider - HTTP infrastructure service provider
 * 
 * @package     @imajin/cli
 * @subpackage  providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 *
 * Integration Points:
 * - HTTP client registration
 * - Webhook server management
 * - Security middleware setup
 * - Webhook command registration
 */

import type { Command } from 'commander';
import { WebhookListCommand } from '../commands/webhook/WebhookListCommand.js';
import { WebhookTestCommand } from '../commands/webhook/WebhookTestCommand.js';
import { HttpClientSimple } from '../http/HttpClientSimple.js';
import { SecurityMiddleware } from '../http/middleware/SecurityMiddleware.js';
import type { Logger } from '../logging/Logger.js';
import type { WebhookManager } from '../webhooks/WebhookManager.js';
import { ServiceProvider } from './ServiceProvider.js';

export class HttpServiceProvider extends ServiceProvider {

    /**
     * Register HTTP services
     */
    public register(): void {
        // Register HTTP client
        this.container.singleton('HttpClient', () => {
            const logger = this.container.resolve<Logger>('Logger');
            return new HttpClientSimple({
                timeout: 30000,
                maxRetries: 3,
                retryDelay: 1000
            }, logger);
        });

        // Register security middleware
        this.container.singleton('SecurityMiddleware', () => {
            const logger = this.container.resolve<Logger>('Logger');
            return new SecurityMiddleware(logger);
        });

        // Register webhook commands
        this.container.singleton('WebhookListCommand', () => {
            const webhookManager = this.container.resolve<WebhookManager>('WebhookManager');
            const logger = this.container.resolve<Logger>('Logger');
            return new WebhookListCommand(webhookManager, logger);
        });

        this.container.singleton('WebhookTestCommand', () => {
            const webhookManager = this.container.resolve<WebhookManager>('WebhookManager');
            const logger = this.container.resolve<Logger>('Logger');
            return new WebhookTestCommand(webhookManager, logger);
        });
    }

    /**
     * Bootstrap HTTP services
     */
    public boot(): void {
        // HTTP services are ready to use after registration
        // No additional bootstrapping required
    }

    /**
     * Register CLI commands
     */
    public registerCommands(program: Command): void {
        const webhookListCommand = this.container.resolve<WebhookListCommand>('WebhookListCommand');
        const webhookTestCommand = this.container.resolve<WebhookTestCommand>('WebhookTestCommand');

        // Register webhook:list command
        program
            .command('webhook:list')
            .description('List all configured webhooks and their status')
            .option('--json', 'Output in JSON format')
            .action(async (options) => {
                await webhookListCommand.execute([], options);
            });

        // Register webhook:test command
        program
            .command('webhook:test <source> [eventType]')
            .description('Test webhook processing with sample data')
            .option('--json', 'Output in JSON format')
            .option('--payload <json>', 'Custom JSON payload for testing')
            .option('--headers <json>', 'Custom headers as JSON')
            .option('--show-payload', 'Include payload in output')
            .option('--show-headers', 'Include headers in output')
            .action(async (source, eventType, options) => {
                await webhookTestCommand.execute([source, eventType], options);
            });
    }

    /**
     * Get service provider name
     */
    public getName(): string {
        return 'HttpServiceProvider';
    }

    /**
     * Get list of services this provider offers
     */
    public getServices(): string[] {
        return [
            'HttpClient',
            'SecurityMiddleware',
            'WebhookListCommand',
            'WebhookTestCommand'
        ];
    }

    /**
     * Check if this provider provides a specific service
     */
    public provides(service: string): boolean {
        return this.getServices().includes(service);
    }
} 