import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiTrustService } from '../../services/imajin-ai/ImajinAiTrustService.js';

export class TrustCommands {
    constructor(
        private readonly trustService: ImajinAiTrustService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const trustCommand = program
            .command('trust')
            .description('Trust and connections operations backed by imajin-ai');

        const inviteCommand = trustCommand
            .command('invite')
            .description('Trust invite operations');

        inviteCommand
            .command('create')
            .option('--delivery <link|email>', 'Invite delivery method')
            .option('--email <email>', 'Invite email when using email delivery')
            .option('--message <text>', 'Optional invite message')
            .option('--json', 'Output as JSON')
            .description('Create trust invite')
            .action((options, command) => this.handleInviteCreate(this.getCommandOptions(options, command)));

        inviteCommand
            .command('accept')
            .requiredOption('--code <invite-code>', 'Invite code')
            .option('--json', 'Output as JSON')
            .description('Accept trust invite')
            .action((options, command) => this.handleInviteAccept(this.getCommandOptions(options, command)));

        const connectionsCommand = trustCommand
            .command('connections')
            .description('Connections operations');

        connectionsCommand
            .command('list')
            .option('--did <did>', 'Optional DID filter')
            .option('--scope <actor|family|community|business>', 'Optional scope filter')
            .option('--limit <n>', 'Optional result limit')
            .option('--cursor <token>', 'Optional cursor token')
            .option('--json', 'Output as JSON')
            .description('List trust connections')
            .action((options, command) => this.handleConnectionsList(this.getCommandOptions(options, command)));

        const distanceCommand = trustCommand
            .command('distance')
            .description('Trust distance operations');

        distanceCommand
            .command('get')
            .requiredOption('--from-did <did>', 'Source DID')
            .requiredOption('--to-did <did>', 'Target DID')
            .option('--json', 'Output as JSON')
            .description('Get trust distance between DIDs')
            .action((options, command) => this.handleDistanceGet(this.getCommandOptions(options, command)));
    }

    private async handleInviteCreate(options: any): Promise<void> {
        await this.execute(
            'invite.create',
            options,
            async () => this.trustService.createInvite({
                ...(options.delivery ? { delivery: String(options.delivery).trim() } : {}),
                ...(options.email ? { email: String(options.email).trim() } : {}),
                ...(options.message ? { message: String(options.message).trim() } : {})
            })
        );
    }

    private async handleInviteAccept(options: any): Promise<void> {
        await this.execute(
            'invite.accept',
            options,
            async () => this.trustService.acceptInvite({
                code: this.requiredString(options.code, '--code')
            })
        );
    }

    private async handleConnectionsList(options: any): Promise<void> {
        await this.execute(
            'connections.list',
            options,
            async () => this.trustService.listConnections({
                ...(options.did ? { did: String(options.did).trim() } : {}),
                ...(options.scope ? { scope: String(options.scope).trim() } : {}),
                ...(options.limit ? { limit: this.parsePositiveInt(options.limit, '--limit') } : {}),
                ...(options.cursor ? { cursor: String(options.cursor).trim() } : {})
            })
        );
    }

    private async handleDistanceGet(options: any): Promise<void> {
        await this.execute(
            'distance.get',
            options,
            async () => this.trustService.getDistance({
                fromDid: this.requiredString(options.fromDid, '--from-did'),
                toDid: this.requiredString(options.toDid, '--to-did')
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
                    service: 'trust',
                    command,
                    data
                }, null, 2));
                return;
            }

            console.log(chalk.green(`✅ trust.${command} succeeded`));
            console.log(JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Trust command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'trust',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ trust.${command} failed: ${error}`));
            process.exit(1);
        }
    }
}
