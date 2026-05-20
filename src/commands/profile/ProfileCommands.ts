import fs from 'node:fs';
import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import type {
    ProfileCreateInput,
    ProfileStreamInput,
    ProfileUpdateInput
} from '../../services/imajin-ai/ImajinAiProfileService.js';
import { ImajinAiProfileService } from '../../services/imajin-ai/ImajinAiProfileService.js';

export class ProfileCommands {
    constructor(
        private readonly profileService: ImajinAiProfileService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const profileCommand = program
            .command('profile')
            .description('Profile operations backed by imajin-ai');

        profileCommand
            .command('get')
            .requiredOption('--id <did|handle>', 'Profile id (did or handle)')
            .option('--json', 'Output as JSON')
            .description('Get profile by DID or handle')
            .action((options, command) => this.handleGet(this.getCommandOptions(options, command)));

        profileCommand
            .command('create')
            .requiredOption('--handle <handle>', 'Profile handle')
            .option('--display-name <name>', 'Display name (defaults to handle)')
            .option('--display-type <human|agent|presence>', 'Display type', 'human')
            .option('--bio <text>', 'Profile bio')
            .option('--avatar-url <url>', 'Avatar URL')
            .option('--avatar-asset-id <id>', 'Avatar asset id')
            .option('--email <email>', 'Email')
            .option('--phone <phone>', 'Phone')
            .option('--opt-in-updates <true|false>', 'Opt in to updates')
            .option('--metadata-json <json>', 'Metadata JSON object')
            .option('--metadata-file <path>', 'Metadata JSON file path')
            .option('--json', 'Output as JSON')
            .description('Create authenticated profile')
            .action((options, command) => this.handleCreate(this.getCommandOptions(options, command)));

        profileCommand
            .command('update')
            .requiredOption('--id <did|handle>', 'Profile id (did or handle)')
            .option('--handle <handle>', 'Handle')
            .option('--display-name <name>', 'Display name')
            .option('--display-type <human|agent|presence>', 'Display type')
            .option('--bio <text>', 'Profile bio')
            .option('--avatar-url <url>', 'Avatar URL')
            .option('--avatar-asset-id <id>', 'Avatar asset id')
            .option('--email <email>', 'Email')
            .option('--phone <phone>', 'Phone')
            .option('--opt-in-updates <true|false>', 'Opt in to updates')
            .option('--metadata-json <json>', 'Metadata JSON object')
            .option('--metadata-file <path>', 'Metadata JSON file path')
            .option('--json', 'Output as JSON')
            .description('Update profile by DID or handle')
            .action((options, command) => this.handleUpdate(this.getCommandOptions(options, command)));

        profileCommand
            .command('delete')
            .requiredOption('--id <did|handle>', 'Profile id (did or handle)')
            .option('--force', 'Skip confirmation safeguards')
            .option('--json', 'Output as JSON')
            .description('Delete profile by DID or handle')
            .action((options, command) => this.handleDelete(this.getCommandOptions(options, command)));

        profileCommand
            .command('search')
            .requiredOption('--query <text>', 'Search query')
            .option('--type <human|agent|presence>', 'Optional profile type filter')
            .option('--limit <n>', 'Result limit')
            .option('--cursor <token>', 'Offset cursor token')
            .option('--json', 'Output as JSON')
            .description('Search profiles')
            .action((options, command) => this.handleSearch(this.getCommandOptions(options, command)));

        const countsCommand = profileCommand
            .command('counts')
            .description('Profile counts operations');

        countsCommand
            .command('get')
            .requiredOption('--id <did|handle>', 'Profile id (did or handle)')
            .option('--json', 'Output as JSON')
            .description('Get profile counts')
            .action((options, command) => this.handleCountsGet(this.getCommandOptions(options, command)));

        const handleCommand = profileCommand
            .command('handle')
            .description('Profile handle operations');

        handleCommand
            .command('claim')
            .requiredOption('--handle <handle>', 'Handle to claim')
            .option('--json', 'Output as JSON')
            .description('Claim handle for authenticated profile')
            .action((options, command) => this.handleHandleClaim(this.getCommandOptions(options, command)));

        handleCommand
            .command('check')
            .requiredOption('--handle <handle>', 'Handle to check')
            .option('--json', 'Output as JSON')
            .description('Check handle availability')
            .action((options, command) => this.handleHandleCheck(this.getCommandOptions(options, command)));

        const inferenceCommand = profileCommand
            .command('inference')
            .description('Profile inference operations');

        inferenceCommand
            .command('toggle')
            .requiredOption('--enabled <true|false>', 'Enable or disable inference')
            .option('--json', 'Output as JSON')
            .description('Toggle profile inference availability')
            .action((options, command) => this.handleInferenceToggle(this.getCommandOptions(options, command)));

        profileCommand
            .command('query')
            .requiredOption('--id <did|handle>', 'Profile id (did or handle)')
            .requiredOption('--query <text>', 'Query text')
            .option('--context-json <json>', 'Context JSON object')
            .option('--context-file <path>', 'Context JSON file path')
            .option('--json', 'Output as JSON')
            .description('Run non-streaming profile query')
            .action((options, command) => this.handleQuery(this.getCommandOptions(options, command)));

        profileCommand
            .command('stream')
            .requiredOption('--id <did|handle>', 'Profile id (did or handle)')
            .requiredOption('--query <text>', 'Query text')
            .option('--context-json <json>', 'Context JSON object')
            .option('--context-file <path>', 'Context JSON file path')
            .option('--json', 'Output as JSON')
            .description('Run streaming profile query')
            .action((options, command) => this.handleStream(this.getCommandOptions(options, command)));
    }

    private async handleGet(options: any): Promise<void> {
        await this.execute(
            'get',
            options,
            async () => this.profileService.getProfile({ id: this.requiredString(options.id, '--id') })
        );
    }

    private async handleCreate(options: any): Promise<void> {
        await this.execute(
            'create',
            options,
            async () => {
                const handle = this.requiredString(options.handle, '--handle');
                const displayName = options.displayName
                    ? this.requiredString(options.displayName, '--display-name')
                    : handle;

                const input: ProfileCreateInput = {
                    handle,
                    displayName,
                    displayType: this.parseDisplayType(options.displayType ?? 'human', '--display-type')
                };
                if (options.bio) {
                    input.bio = this.requiredString(options.bio, '--bio');
                }
                if (options.avatarUrl) {
                    input.avatar = this.requiredString(options.avatarUrl, '--avatar-url');
                }
                if (options.avatarAssetId) {
                    input.avatarAssetId = this.requiredString(options.avatarAssetId, '--avatar-asset-id');
                }
                if (options.email) {
                    input.email = this.requiredString(options.email, '--email');
                }
                if (options.phone) {
                    input.phone = this.requiredString(options.phone, '--phone');
                }
                if (options.optInUpdates !== undefined) {
                    input.optInUpdates = this.parseBooleanFlag(options.optInUpdates, '--opt-in-updates');
                }

                const metadata = this.parseJsonObjectInput(options.metadataJson, options.metadataFile, '--metadata-json', '--metadata-file');
                if (metadata) {
                    input.metadata = metadata;
                }

                return this.profileService.createProfile(input);
            }
        );
    }

    private async handleUpdate(options: any): Promise<void> {
        await this.execute(
            'update',
            options,
            async () => {
                const input: ProfileUpdateInput = {
                    id: this.requiredString(options.id, '--id')
                };

                if (options.handle !== undefined) {
                    input.handle = this.requiredString(options.handle, '--handle');
                }
                if (options.displayName !== undefined) {
                    input.displayName = this.requiredString(options.displayName, '--display-name');
                }
                if (options.displayType !== undefined) {
                    input.displayType = this.parseDisplayType(options.displayType, '--display-type');
                }
                if (options.bio !== undefined) {
                    input.bio = this.requiredString(options.bio, '--bio');
                }
                if (options.avatarUrl !== undefined) {
                    input.avatar = this.requiredString(options.avatarUrl, '--avatar-url');
                }
                if (options.avatarAssetId !== undefined) {
                    input.avatarAssetId = this.requiredString(options.avatarAssetId, '--avatar-asset-id');
                }
                if (options.email !== undefined) {
                    input.email = this.requiredString(options.email, '--email');
                }
                if (options.phone !== undefined) {
                    input.phone = this.requiredString(options.phone, '--phone');
                }
                if (options.optInUpdates !== undefined) {
                    input.optInUpdates = this.parseBooleanFlag(options.optInUpdates, '--opt-in-updates');
                }

                const metadata = this.parseJsonObjectInput(options.metadataJson, options.metadataFile, '--metadata-json', '--metadata-file');
                if (metadata !== undefined) {
                    input.metadata = metadata;
                }

                if (Object.keys(input).length === 1) {
                    throw new Error('At least one update option must be provided');
                }

                return this.profileService.updateProfile(input);
            }
        );
    }

    private async handleDelete(options: any): Promise<void> {
        await this.execute(
            'delete',
            options,
            async () => this.profileService.deleteProfile({ id: this.requiredString(options.id, '--id') })
        );
    }

    private async handleSearch(options: any): Promise<void> {
        await this.execute(
            'search',
            options,
            async () => this.profileService.searchProfiles({
                query: this.requiredString(options.query, '--query'),
                ...(options.type ? { type: this.parseDisplayType(options.type, '--type') } : {}),
                ...(options.limit ? { limit: this.parsePositiveInt(options.limit, '--limit') } : {}),
                ...(options.cursor ? { cursor: this.requiredString(options.cursor, '--cursor') } : {})
            })
        );
    }

    private async handleCountsGet(options: any): Promise<void> {
        await this.execute(
            'counts.get',
            options,
            async () => this.profileService.getProfileCounts({ id: this.requiredString(options.id, '--id') })
        );
    }

    private async handleHandleClaim(options: any): Promise<void> {
        await this.execute(
            'handle.claim',
            options,
            async () => this.profileService.claimHandle({ handle: this.requiredString(options.handle, '--handle') })
        );
    }

    private async handleHandleCheck(options: any): Promise<void> {
        await this.execute(
            'handle.check',
            options,
            async () => this.profileService.checkHandleAvailability({ handle: this.requiredString(options.handle, '--handle') })
        );
    }

    private async handleInferenceToggle(options: any): Promise<void> {
        await this.execute(
            'inference.toggle',
            options,
            async () => this.profileService.toggleInference({
                enabled: this.parseBooleanFlag(options.enabled, '--enabled')
            })
        );
    }

    private async handleQuery(options: any): Promise<void> {
        await this.execute(
            'query',
            options,
            async () => {
                const context = this.parseJsonObjectInput(options.contextJson, options.contextFile, '--context-json', '--context-file');
                return this.profileService.queryProfile({
                    id: this.requiredString(options.id, '--id'),
                    query: this.requiredString(options.query, '--query'),
                    ...(context ? { context } : {})
                });
            }
        );
    }

    private async handleStream(options: any): Promise<void> {
        await this.execute(
            'stream',
            options,
            async () => {
                const context = this.parseJsonObjectInput(options.contextJson, options.contextFile, '--context-json', '--context-file');
                const input: ProfileStreamInput = {
                    id: this.requiredString(options.id, '--id'),
                    query: this.requiredString(options.query, '--query')
                };
                if (context) {
                    input.context = context;
                }
                return this.profileService.streamProfile(input);
            }
        );
    }

    private parseJsonObjectInput(
        jsonValue: unknown,
        fileValue: unknown,
        jsonFlagName: string,
        fileFlagName: string
    ): Record<string, unknown> | undefined {
        const hasJson = jsonValue !== undefined && jsonValue !== null && String(jsonValue).trim() !== '';
        const hasFile = fileValue !== undefined && fileValue !== null && String(fileValue).trim() !== '';

        if (hasJson && hasFile) {
            throw new Error(`Use either ${jsonFlagName} or ${fileFlagName}, not both.`);
        }

        if (hasJson) {
            const parsed = JSON.parse(String(jsonValue));
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error(`${jsonFlagName} must be a JSON object`);
            }
            return parsed as Record<string, unknown>;
        }

        if (hasFile) {
            const filePath = this.requiredString(fileValue, fileFlagName);
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error(`${fileFlagName} must contain a JSON object`);
            }
            return parsed as Record<string, unknown>;
        }

        return undefined;
    }

    private parseDisplayType(value: unknown, flagName: string): 'human' | 'agent' | 'presence' {
        const parsed = this.requiredString(value, flagName) as 'human' | 'agent' | 'presence';
        if (!['human', 'agent', 'presence'].includes(parsed)) {
            throw new Error(`${flagName} must be one of: human, agent, presence`);
        }
        return parsed;
    }

    private parseBooleanFlag(value: unknown, flagName: string): boolean {
        if (typeof value === 'boolean') {
            return value;
        }

        const parsed = this.requiredString(value, flagName).toLowerCase();
        if (parsed === 'true') {
            return true;
        }
        if (parsed === 'false') {
            return false;
        }
        throw new Error(`${flagName} must be true or false`);
    }

    private parsePositiveInt(value: unknown, flagName: string): number {
        const parsed = Number.parseInt(this.requiredString(value, flagName), 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new Error(`${flagName} must be a positive integer`);
        }
        return parsed;
    }

    private requiredString(value: unknown, flagName: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`${flagName} is required`);
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
                    service: 'profile',
                    command,
                    data
                }, null, 2));
                return;
            }

            console.log(chalk.green(`✅ profile.${command} succeeded`));
            console.log(JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Profile command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'profile',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ profile.${command} failed: ${error}`));
            process.exit(1);
        }
    }
}
