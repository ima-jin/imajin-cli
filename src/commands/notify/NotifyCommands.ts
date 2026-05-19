import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiNotifyService } from '../../services/imajin-ai/ImajinAiNotifyService.js';

export class NotifyCommands {
    constructor(
        private readonly notifyService: ImajinAiNotifyService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const notifyCommand = program
            .command('notify')
            .description('Notification operations backed by imajin-ai');

        notifyCommand
            .command('send')
            .requiredOption('--to <did|email>', 'Recipient DID or email')
            .requiredOption('--scope <scope>', 'Notification scope')
            .requiredOption('--title <title>', 'Notification title')
            .requiredOption('--body <text>', 'Notification body')
            .option('--data-json <json>', 'Optional data payload JSON object')
            .option('--json', 'Output as JSON')
            .description('Send a notification')
            .action((options, command) => this.handleSend(this.getCommandOptions(options, command)));

        const inboxCommand = notifyCommand
            .command('inbox')
            .description('Inbox operations');

        inboxCommand
            .command('list')
            .option('--unread-only', 'Only return unread notifications')
            .option('--scope <scope>', 'Optional scope filter')
            .option('--limit <n>', 'Optional result limit')
            .option('--cursor <token>', 'Optional cursor token')
            .option('--json', 'Output as JSON')
            .description('List inbox notifications')
            .action((options, command) => this.handleInboxList(this.getCommandOptions(options, command)));
    }

    private async handleSend(options: any): Promise<void> {
        await this.execute(
            'send',
            options,
            async () => this.notifyService.send({
                to: this.requiredString(options.to, '--to'),
                scope: this.requiredString(options.scope, '--scope'),
                title: this.requiredString(options.title, '--title'),
                body: this.requiredString(options.body, '--body'),
                ...(options.dataJson ? { data: this.parseJsonObject(options.dataJson, '--data-json') } : {})
            })
        );
    }

    private async handleInboxList(options: any): Promise<void> {
        await this.execute(
            'inbox.list',
            options,
            async () => this.notifyService.listInbox({
                ...(options.unreadOnly !== undefined ? { unreadOnly: !!options.unreadOnly } : {}),
                ...(options.scope ? { scope: String(options.scope).trim() } : {}),
                ...(options.limit ? { limit: this.parsePositiveInt(options.limit, '--limit') } : {}),
                ...(options.cursor ? { cursor: String(options.cursor).trim() } : {})
            })
        );
    }

    private parseJsonObject(value: unknown, optionName: string): Record<string, unknown> {
        try {
            const parsed = JSON.parse(String(value));
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error(`${optionName} must be a JSON object`);
            }
            return parsed as Record<string, unknown>;
        } catch (error) {
            throw new Error(`Invalid ${optionName} value: ${error}`);
        }
    }

    private requiredString(value: unknown, optionName: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`${optionName} is required`);
        }
        return value.trim();
    }

    private parsePositiveInt(value: unknown, optionName: string): number {
        const parsed = Number.parseInt(this.requiredString(value, optionName), 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new Error(`${optionName} must be a positive integer`);
        }
        return parsed;
    }

    private getCommandOptions(optionsOrCommand: any, possibleCommand?: any): any {
        if (possibleCommand && typeof possibleCommand.optsWithGlobals === 'function') {
            return possibleCommand.optsWithGlobals();
        }
        if (possibleCommand && typeof possibleCommand.opts === 'function') {
            return possibleCommand.opts();
        }
        if (optionsOrCommand && typeof optionsOrCommand.optsWithGlobals === 'function') {
            return optionsOrCommand.optsWithGlobals();
        }
        if (optionsOrCommand && typeof optionsOrCommand.opts === 'function') {
            return optionsOrCommand.opts();
        }
        if (optionsOrCommand && typeof optionsOrCommand === 'object' && !Array.isArray(optionsOrCommand)) {
            return optionsOrCommand;
        }
        return {};
    }

    private async execute(command: string, options: any, operation: () => Promise<any>): Promise<void> {
        try {
            const data = await operation();
            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    service: 'notify',
                    command,
                    data
                }, null, 2));
                return;
            }

            console.log(chalk.green(`✅ notify.${command} succeeded`));
            console.log(JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Notify command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'notify',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ notify.${command} failed: ${error}`));
            process.exit(1);
        }
    }
}
