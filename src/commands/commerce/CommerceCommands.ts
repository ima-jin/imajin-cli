import fs from 'node:fs';
import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiCommerceService } from '../../services/imajin-ai/ImajinAiCommerceService.js';

export class CommerceCommands {
    constructor(
        private readonly commerceService: ImajinAiCommerceService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const commerceCommand = program
            .command('commerce')
            .description('Commerce operations backed by imajin-ai');

        const balanceCommand = commerceCommand
            .command('balance')
            .description('Balance operations');

        balanceCommand
            .command('get')
            .requiredOption('--did <did>', 'Identity DID')
            .option('--json', 'Output as JSON')
            .description('Get balance for DID')
            .action((options, command) => this.handleBalanceGet(this.getCommandOptions(options, command)));

        const checkoutCommand = commerceCommand
            .command('checkout')
            .description('Checkout operations');

        checkoutCommand
            .command('create')
            .requiredOption('--amount <decimal>', 'Checkout amount')
            .requiredOption('--currency <code>', 'Currency code (e.g., USD)')
            .option('--recipient-did <did>', 'Optional recipient DID')
            .option('--fair-file <path>', 'Path to a .fair file payload')
            .option('--metadata-json <json>', 'Optional metadata JSON object')
            .option('--json', 'Output as JSON')
            .description('Create checkout')
            .action((options, command) => this.handleCheckoutCreate(this.getCommandOptions(options, command)));

        const settleCommand = commerceCommand
            .command('settle')
            .description('Settlement operations');

        settleCommand
            .command('create')
            .requiredOption('--amount <decimal>', 'Settlement amount')
            .requiredOption('--currency <code>', 'Currency code (e.g., USD)')
            .requiredOption('--from-did <did>', 'Payer DID')
            .option('--fair-file <path>', 'Path to a .fair file payload')
            .option('--reference <text>', 'Optional settlement reference')
            .option('--json', 'Output as JSON')
            .description('Create settlement')
            .action((options, command) => this.handleSettleCreate(this.getCommandOptions(options, command)));
    }

    private async handleBalanceGet(options: any): Promise<void> {
        await this.execute(
            'balance.get',
            options,
            () => this.commerceService.getBalance({
                did: this.requiredString(options.did, '--did')
            })
        );
    }

    private async handleCheckoutCreate(options: any): Promise<void> {
        await this.execute(
            'checkout.create',
            options,
            async () => this.commerceService.createCheckout({
                amount: this.requiredString(options.amount, '--amount'),
                currency: this.requiredString(options.currency, '--currency'),
                ...(options.recipientDid ? { recipientDid: String(options.recipientDid).trim() } : {}),
                ...(options.fairFile ? { fair: this.readFileContent(options.fairFile, '--fair-file') } : {}),
                ...(options.metadataJson ? { metadata: this.parseJsonObject(options.metadataJson, '--metadata-json') } : {})
            })
        );
    }

    private async handleSettleCreate(options: any): Promise<void> {
        await this.execute(
            'settle.create',
            options,
            async () => this.commerceService.createSettle({
                amount: this.requiredString(options.amount, '--amount'),
                currency: this.requiredString(options.currency, '--currency'),
                fromDid: this.requiredString(options.fromDid, '--from-did'),
                ...(options.fairFile ? { fair: this.readFileContent(options.fairFile, '--fair-file') } : {}),
                ...(options.reference ? { reference: String(options.reference).trim() } : {})
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

    private readFileContent(pathValue: unknown, optionName: string): string {
        const path = this.requiredString(pathValue, optionName);
        return fs.readFileSync(path, 'utf8');
    }

    private requiredString(value: unknown, optionName: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`${optionName} is required`);
        }
        return value.trim();
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
                    service: 'commerce',
                    command,
                    data
                }, null, 2));
                return;
            }

            console.log(chalk.green(`✅ commerce.${command} succeeded`));
            console.log(JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Commerce command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'commerce',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ commerce.${command} failed: ${error}`));
            process.exit(1);
        }
    }
}
