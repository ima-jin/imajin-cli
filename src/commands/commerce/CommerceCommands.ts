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

        const chargeCommand = commerceCommand
            .command('charge')
            .description('Charge operations');

        chargeCommand
            .command('create')
            .requiredOption('--payment-method <id>', 'Payment method id')
            .requiredOption('--amount <decimal>', 'Charge amount')
            .requiredOption('--currency <code>', 'Currency code (e.g., USD)')
            .option('--customer-did <did>', 'Optional customer DID')
            .option('--json', 'Output as JSON')
            .description('Create charge')
            .action((options, command) => this.handleChargeCreate(this.getCommandOptions(options, command)));

        const refundCommand = commerceCommand
            .command('refund')
            .description('Refund operations');

        refundCommand
            .command('create')
            .requiredOption('--transaction-id <id>', 'Transaction id')
            .option('--amount <decimal>', 'Optional partial refund amount')
            .option('--reason <text>', 'Optional refund reason')
            .option('--json', 'Output as JSON')
            .description('Create refund')
            .action((options, command) => this.handleRefundCreate(this.getCommandOptions(options, command)));

        const transferCommand = commerceCommand
            .command('transfer')
            .description('Transfer operations');

        transferCommand
            .command('create')
            .requiredOption('--from-did <did>', 'Source DID')
            .requiredOption('--to-did <did>', 'Destination DID')
            .requiredOption('--amount <decimal>', 'Transfer amount')
            .requiredOption('--currency <code>', 'Currency code (e.g., USD)')
            .option('--memo <text>', 'Optional transfer memo')
            .option('--json', 'Output as JSON')
            .description('Create transfer')
            .action((options, command) => this.handleTransferCreate(this.getCommandOptions(options, command)));

        const transactionsCommand = commerceCommand
            .command('transactions')
            .description('Transaction history operations');

        transactionsCommand
            .command('list')
            .requiredOption('--did <did>', 'Identity DID')
            .option('--limit <n>', 'Optional result limit')
            .option('--cursor <token>', 'Optional cursor token')
            .option('--from <iso8601>', 'Optional start timestamp')
            .option('--to <iso8601>', 'Optional end timestamp')
            .option('--json', 'Output as JSON')
            .description('List transactions for DID')
            .action((options, command) => this.handleTransactionsList(this.getCommandOptions(options, command)));
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

    private async handleChargeCreate(options: any): Promise<void> {
        await this.execute(
            'charge.create',
            options,
            async () => this.commerceService.createCharge({
                paymentMethod: this.requiredString(options.paymentMethod, '--payment-method'),
                amount: this.requiredString(options.amount, '--amount'),
                currency: this.requiredString(options.currency, '--currency'),
                ...(options.customerDid ? { customerDid: String(options.customerDid).trim() } : {})
            })
        );
    }

    private async handleRefundCreate(options: any): Promise<void> {
        await this.execute(
            'refund.create',
            options,
            async () => this.commerceService.createRefund({
                transactionId: this.requiredString(options.transactionId, '--transaction-id'),
                ...(options.amount ? { amount: this.requiredString(options.amount, '--amount') } : {}),
                ...(options.reason ? { reason: String(options.reason).trim() } : {})
            })
        );
    }

    private async handleTransferCreate(options: any): Promise<void> {
        await this.execute(
            'transfer.create',
            options,
            async () => this.commerceService.createTransfer({
                fromDid: this.requiredString(options.fromDid, '--from-did'),
                toDid: this.requiredString(options.toDid, '--to-did'),
                amount: this.requiredString(options.amount, '--amount'),
                currency: this.requiredString(options.currency, '--currency'),
                ...(options.memo ? { memo: String(options.memo).trim() } : {})
            })
        );
    }

    private async handleTransactionsList(options: any): Promise<void> {
        await this.execute(
            'transactions.list',
            options,
            async () => this.commerceService.listTransactions({
                did: this.requiredString(options.did, '--did'),
                ...(options.limit ? { limit: this.parsePositiveInt(options.limit, '--limit') } : {}),
                ...(options.cursor ? { cursor: String(options.cursor).trim() } : {}),
                ...(options.from ? { from: String(options.from).trim() } : {}),
                ...(options.to ? { to: String(options.to).trim() } : {})
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
