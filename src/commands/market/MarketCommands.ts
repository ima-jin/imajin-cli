import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiMarketService } from '../../services/imajin-ai/ImajinAiMarketService.js';

export class MarketCommands {
    constructor(
        private readonly marketService: ImajinAiMarketService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const marketCommand = program
            .command('market')
            .description('Market operations backed by imajin-ai');

        const listingsCommand = marketCommand
            .command('listings')
            .description('Listing operations');

        listingsCommand
            .command('list')
            .option('--seller-did <did>', 'Optional seller DID filter')
            .option('--status <active|sold|archived>', 'Optional listing status filter')
            .option('--limit <n>', 'Optional result limit')
            .option('--cursor <token>', 'Optional cursor token')
            .option('--json', 'Output as JSON')
            .description('List market listings')
            .action((options, command) => this.handleList(this.getCommandOptions(options, command)));
    }

    private async handleList(options: any): Promise<void> {
        await this.execute(
            'listings.list',
            options,
            async () => this.marketService.listListings({
                ...(options.sellerDid ? { sellerDid: String(options.sellerDid).trim() } : {}),
                ...(options.status ? { status: String(options.status).trim() as any } : {}),
                ...(options.limit ? { limit: this.parsePositiveInt(options.limit, '--limit') } : {}),
                ...(options.cursor ? { cursor: String(options.cursor).trim() } : {})
            })
        );
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
                    service: 'market',
                    command,
                    data
                }, null, 2));
                return;
            }

            console.log(chalk.green(`✅ market.${command} succeeded`));
            console.log(JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Market command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'market',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ market.${command} failed: ${error}`));
            process.exit(1);
        }
    }
}
