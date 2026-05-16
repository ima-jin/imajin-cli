import fs from 'node:fs';
import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import type { CreateAttestationInput, ListAttestationsInput } from '../../services/imajin-ai/ImajinAiIdentityService.js';
import { ImajinAiIdentityService } from '../../services/imajin-ai/ImajinAiIdentityService.js';

export class IdentityCommands {
    constructor(
        private readonly identityService: ImajinAiIdentityService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const identityCommand = program
            .command('identity')
            .description('Identity operations backed by imajin-ai');

        const sessionCommand = identityCommand
            .command('session')
            .description('Session operations');

        sessionCommand
            .command('get')
            .option('--include-grants', 'Include grants in session response')
            .option('--include-gas', 'Include gas details in session response')
            .option('--json', 'Output as JSON')
            .description('Get current authenticated session')
            .action((options, command) => this.handleSessionGet(this.getCommandOptions(options, command)));

        identityCommand
            .command('resolve')
            .requiredOption('--did <did>', 'DID to resolve')
            .option('--json', 'Output as JSON')
            .description('Resolve DID to identity details')
            .action((options, command) => this.handleResolve(this.getCommandOptions(options, command)));

        identityCommand
            .command('lookup')
            .requiredOption('--id <id>', 'Lookup id (did|handle|email)')
            .option('--json', 'Output as JSON')
            .description('Lookup identity by id')
            .action((options, command) => this.handleLookup(this.getCommandOptions(options, command)));

        const loginCommand = identityCommand
            .command('login')
            .description('Identity login-related commands');

        loginCommand
            .command('challenge')
            .requiredOption('--handle <handle>', 'Identity handle')
            .option('--json', 'Output as JSON')
            .description('Create login challenge')
            .action((options, command) => this.handleLoginChallenge(this.getCommandOptions(options, command)));

        const attestCommand = identityCommand
            .command('attest')
            .description('Attestation operations');

        attestCommand
            .command('create')
            .requiredOption('--issuer-did <did>', 'Issuer DID')
            .requiredOption('--subject-did <did>', 'Subject DID')
            .requiredOption('--type <type>', 'Attestation type')
            .requiredOption('--signature <hex>', 'Signature over canonical attestation payload')
            .option('--context-id <id>', 'Context ID')
            .option('--context-type <type>', 'Context type')
            .option('--payload-json <json>', 'Payload JSON object')
            .option('--payload-file <path>', 'Payload JSON file path')
            .option('--issued-at <unix-ms>', 'Issued at timestamp (unix ms)')
            .option('--author-jws <jws>', 'Optional author JWS')
            .option('--json', 'Output as JSON')
            .description('Create an attestation')
            .action((options, command) => this.handleAttestCreate(this.getCommandOptions(options, command)));

        attestCommand
            .command('list')
            .requiredOption('--did <did>', 'Subject DID')
            .option('--issuer-did <did>', 'Issuer DID filter')
            .option('--type <type>', 'Type filter')
            .option('--status <pending|bilateral|declined>', 'Status filter')
            .option('--limit <n>', 'Result limit')
            .option('--json', 'Output as JSON')
            .description('List attestations for subject DID')
            .action((options, command) => this.handleAttestList(this.getCommandOptions(options, command)));
    }

    private async handleSessionGet(options: any): Promise<void> {
        await this.execute(
            'session.get',
            options,
            () => this.identityService.getSession({
                includeGrants: !!options.includeGrants,
                includeGas: !!options.includeGas
            })
        );
    }

    private async handleResolve(options: any): Promise<void> {
        await this.execute(
            'resolve',
            options,
            () => this.identityService.resolveIdentity(options.did)
        );
    }
    
    private async handleLookup(options: any): Promise<void> {
        await this.execute(
            'lookup',
            options,
            () => this.identityService.lookupIdentity(options.id)
        );
    }
    
    private async handleLoginChallenge(options: any): Promise<void> {
        await this.execute(
            'login.challenge',
            options,
            () => this.identityService.createLoginChallenge(options.handle)
        );
    }
    
    private async handleAttestCreate(options: any): Promise<void> {
        await this.execute(
            'attest.create',
            options,
            async () => {
                const input: CreateAttestationInput = {
                    issuerDid: options.issuerDid,
                    subjectDid: options.subjectDid,
                    type: options.type,
                    signature: options.signature
                };

                if (options.contextId) {
                    input.contextId = options.contextId;
                }
                if (options.contextType) {
                    input.contextType = options.contextType;
                }
                if (options.authorJws) {
                    input.authorJws = options.authorJws;
                }
                if (options.issuedAt) {
                    input.issuedAt = Number.parseInt(String(options.issuedAt), 10);
                }

                const payload = this.parsePayload(options);
                if (payload) {
                    input.payload = payload;
                }

                return this.identityService.createAttestation(input);
            }
        );
    }

    private async handleAttestList(options: any): Promise<void> {
        await this.execute(
            'attest.list',
            options,
            async () => {
                const input: ListAttestationsInput = {
                    did: options.did
                };
                if (options.issuerDid) {
                    input.issuerDid = options.issuerDid;
                }
                if (options.type) {
                    input.type = options.type;
                }
                if (options.status) {
                    input.status = options.status;
                }
                if (options.limit) {
                    input.limit = Number.parseInt(String(options.limit), 10);
                }

                return this.identityService.listAttestations(input);
            }
        );
    }

    private parsePayload(options: any): Record<string, any> | undefined {
        if (options.payloadJson && options.payloadFile) {
            throw new Error('Use either --payload-json or --payload-file, not both.');
        }

        if (options.payloadJson) {
            const parsed = JSON.parse(String(options.payloadJson));
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('--payload-json must be a JSON object');
            }
            return parsed as Record<string, any>;
        }

        if (options.payloadFile) {
            const raw = fs.readFileSync(String(options.payloadFile), 'utf8');
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('--payload-file must contain a JSON object');
            }
            return parsed as Record<string, any>;
        }

        return undefined;
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

    private async execute(
        command: string,
        options: any,
        operation: () => Promise<any>
    ): Promise<void> {
        try {
            const data = await operation();
            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    service: 'identity',
                    command,
                    data
                }, null, 2));
                return;
            }

            console.log(chalk.green(`✅ identity.${command} succeeded`));
            if (data !== undefined && data !== null) {
                console.log(JSON.stringify(data, null, 2));
            }
        } catch (error) {
            this.logger.error('Identity command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'identity',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ identity.${command} failed: ${error}`));
            process.exit(1);
        }
    }
}
