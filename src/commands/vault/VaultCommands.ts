/**
 * VaultCommands - CLI commands for the Imajin encrypted vault
 *
 * @package     @imajin/cli
 * @subpackage  commands/vault
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 *
 * Commands:
 *   imajin vault set <KEY>            Encrypt and store a secret
 *   imajin vault get <KEY>           Retrieve and decrypt a secret
 *   imajin vault list                List all stored secrets
 *   imajin vault pubkey               Print owner vault public keys for Tier 1 setup
 *   imajin vault serve                Run the Tier 1 owner agent grant-issuance daemon
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import { VaultStore } from '../../services/vault/VaultStore.js';
import { VaultKeyStore } from '../../services/vault/VaultKeyStore.js';
import { VaultShareStore } from '../../services/vault/VaultShareStore.js';
import type { OwnerKeypair } from '../../services/vault/VaultKeyStore.js';
import { VaultGrantService } from '../../services/vault/VaultGrantService.js';
import type { PendingGrantRequest } from '../../services/vault/VaultGrantService.js';
import {
    wrapFieldKey,
    unwrapFieldKey,
    canonicalizeGrantPayload,
    signCanonical,
    deriveDid,
} from '../../crypto/vault-delegation.js';
import {
    encrypt,
    decrypt,
    deserializeBlob,
    serializeBlob,
    computeCid,
    deriveKeyId,
    deriveDidKeyFromPublicKey,
    verifyDidKeyBinding,
    signVaultPayload,
    hexToBytes,
    bytesToHex,
} from '../../crypto/vault-crypto.js';
import { ed25519 } from '@noble/curves/ed25519.js';

interface NodeConfig {
    publicKey?: string;
}

interface IdentityConfig {
    privateKey?: string;
    did?: string;
}

export class VaultCommands {
    private static readonly STDIN_TIMEOUT_MS = 30000;
    private readonly vaultStore: VaultStore;
    private readonly vaultKeyStore: VaultKeyStore;
    private readonly vaultShareStore: VaultShareStore;

    constructor(
        private readonly logger: Logger,
        vaultStore?: VaultStore,
        vaultKeyStore?: VaultKeyStore,
        vaultShareStore?: VaultShareStore
    ) {
        this.vaultStore = vaultStore ?? new VaultStore();
        this.vaultKeyStore = vaultKeyStore ?? new VaultKeyStore();
        this.vaultShareStore = vaultShareStore ?? new VaultShareStore();
    }

    public registerCommands(program: Command): void {
        const vaultCommand = program
            .command('vault')
            .description('Encrypted config/secrets store for Imajin nodes');

        vaultCommand
            .command('set <key>')
            .description('Encrypt a value and store it in the vault')
            .option('--value <text>', 'Secret value (warning: may leak via shell history)')
            .option('--value-file <path>', 'Read secret value from file path')
            .option('--stdin', 'Read secret value from stdin (times out after 30 seconds)')
            .option('--node-pubkey <hex>', 'Ed25519 public key of the target node (hex)')
            .option('--sender-did <did>', 'Sender DID (defaults to identity.json did)')
            .option('--sender-privkey <hex>', 'Sender Ed25519 private key for encryption (defaults to identity.json)')
            .option('--json', 'Output as JSON')
            .action((key: string, options: any, command: Command) => {
                const opts = this.getCommandOptions(options, command);
                void this.handleSet(key, opts);
            });

        vaultCommand
            .command('get <key>')
            .description('Retrieve and decrypt a value from the vault')
            .option('--private-key <hex>', 'Recipient Ed25519 private key for decryption (defaults to identity.json)')
            .option('--json', 'Output as JSON')
            .action((key: string, options: any, command: Command) => {
                const opts = this.getCommandOptions(options, command);
                void this.handleGet(key, opts);
            });

        vaultCommand
            .command('list')
            .description('List all stored vault entries')
            .option('--private-key <hex>', 'Private key to show decrypted hints')
            .option('--json', 'Output as JSON')
            .action((options: any, command: Command) => {
                const opts = this.getCommandOptions(options, command);
                void this.handleList(opts);
            });

        vaultCommand
            .command('pubkey')
            .description(
                'Print the owner vault public keys for Tier 1 custody setup.\n' +
                'Run once, then set on the kernel:\n' +
                '  VAULT_OWNER_X_PUB=<ownerXPub>  VAULT_OWNER_ED_PUB=<ownerEdPub>'
            )
            .option('--json', 'Output as JSON')
            .action((options: any, command: Command) => {
                const opts = this.getCommandOptions(options, command);
                void this.handlePubkey(opts);
            });

        vaultCommand
            .command('serve')
            .description(
                'Run the Tier 1 owner agent daemon.\n' +
                'Polls the kernel for pending vault grant requests, issues signed\n' +
                'delegation grants, and writes them back to the kernel.'
            )
            .option('--url <url>', 'Kernel base URL (env: IMAJIN_NODE_URL)', process.env.IMAJIN_NODE_URL)
            .option('--token <token>', 'Admin Bearer token (env: IMAJIN_ADMIN_TOKEN)', process.env.IMAJIN_ADMIN_TOKEN)
            .option('--node-did <did>', 'Node DID (derived from publicKey in ~/.imajin/node.json if omitted)')
            .option('--interval <seconds>', 'Poll interval in seconds', '5')
            .option('--auto-approve', 'Approve all grant requests without prompting')
            .action((options: any, command: Command) => {
                const opts = this.getCommandOptions(options, command);
                void this.handleServe(opts);
            });

        vaultCommand
            .command('backup')
            .description('Create a Shamir secret-sharing backup of the owner vault key')
            .option('--shares <n>', 'Number of shares to produce (default: 3)', '3')
            .option('--threshold <m>', 'Minimum shares to recover the key (default: 2)', '2')
            .option('--out <dir>', 'Output directory for share files (default: ./vault-recovery)', './vault-recovery')
            .action((options: any, command: Command) => {
                const opts = this.getCommandOptions(options, command);
                void this.handleBackup(opts);
            });

        vaultCommand
            .command('restore <shares...>')
            .description('Recover the owner vault key from Shamir share files')
            .action((shares: string[], options: any, command: Command) => {
                const opts = this.getCommandOptions(options, command);
                void this.handleRestore(shares, opts);
            });
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

    private loadNodeConfig(): NodeConfig {
        const configPath = path.join(os.homedir(), '.imajin', 'node.json');
        if (fs.existsSync(configPath)) {
            try {
                return JSON.parse(fs.readFileSync(configPath, 'utf8')) as NodeConfig;
            } catch {
                return {};
            }
        }
        return {};
    }

    private loadIdentityConfig(): IdentityConfig {
        const configPath = path.join(os.homedir(), '.imajin', 'identity.json');
        if (fs.existsSync(configPath)) {
            try {
                return JSON.parse(fs.readFileSync(configPath, 'utf8')) as IdentityConfig;
            } catch {
                return {};
            }
        }
        return {};
    }

    private deriveSenderPubkey(senderPrivkey: string): string {
        const secret = hexToBytes(senderPrivkey);
        const pubkey = ed25519.getPublicKey(secret);
        return bytesToHex(pubkey);
    }
    private async readValueFromStdin(): Promise<string> {
        if (process.stdin.isTTY) {
            throw new Error('No stdin input detected. Pipe a value into --stdin or use --value-file.');
        }
        return new Promise((resolve, reject) => {
            let data = '';
            const onData = (chunk: string): void => {
                data += chunk;
            };
            const onEnd = (): void => {
                cleanup();
                resolve(data.replace(/\r?\n$/, ''));
            };
            const onError = (error: Error): void => {
                cleanup();
                reject(error);
            };
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`Timed out waiting for stdin input after ${VaultCommands.STDIN_TIMEOUT_MS / 1000} seconds`));
            }, VaultCommands.STDIN_TIMEOUT_MS);
            const cleanup = (): void => {
                clearTimeout(timer);
                process.stdin.off('data', onData);
                process.stdin.off('end', onEnd);
                process.stdin.off('error', onError);
            };
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', onData);
            process.stdin.on('end', onEnd);
            process.stdin.on('error', onError);
            process.stdin.resume();
        });
    }

    private async resolveSecretValue(options: any): Promise<string> {
        const hasValue = typeof options.value === 'string';
        const hasValueFile = typeof options.valueFile === 'string';
        const hasStdin = options.stdin === true;
        const sourceCount = [hasValue, hasValueFile, hasStdin].filter(Boolean).length;

        if (sourceCount === 0) {
            throw new Error('Secret value required. Provide one of --value, --value-file, or --stdin');
        }
        if (sourceCount > 1) {
            throw new Error('Specify only one value source: --value, --value-file, or --stdin');
        }

        if (hasValue) {
            return String(options.value);
        }
        if (hasValueFile) {
            const valuePath = String(options.valueFile);
            return fs.readFileSync(valuePath, 'utf8').replace(/\r?\n$/, '');
        }
        return this.readValueFromStdin();
    }

    private async handleSet(key: string, options: any): Promise<void> {
        try {
            const nodeConfig = this.loadNodeConfig();
            const identityConfig = this.loadIdentityConfig();
            const value = await this.resolveSecretValue(options);

            const nodePubkey = (options.nodePubkey as string | undefined)
                ?? nodeConfig.publicKey;

            if (!nodePubkey) {
                throw new Error(
                    'Node public key required. Pass --node-pubkey or set it in ~/.imajin/node.json'
                );
            }

            const senderPrivkey = (options.senderPrivkey as string | undefined)
                ?? identityConfig.privateKey;

            if (!senderPrivkey) {
                throw new Error(
                    'Sender private key required. Pass --sender-privkey or set it in ~/.imajin/identity.json'
                );
            }


            // Validate keys are valid hex
            hexToBytes(nodePubkey);
            hexToBytes(senderPrivkey);

            const senderPubkey = this.deriveSenderPubkey(senderPrivkey);
            const senderDid = (options.senderDid as string | undefined)
                ?? identityConfig.did
                ?? deriveDidKeyFromPublicKey(senderPubkey);
            if (!verifyDidKeyBinding(senderDid, senderPubkey)) {
                throw new Error('Sender DID must be a did:key matching the sender keypair');
            }
            const encryptedBlob = encrypt(value, nodePubkey, senderPrivkey);
            const serialized = serializeBlob(encryptedBlob);
            const cid = await computeCid(serialized);
            const keyId = deriveKeyId(senderPubkey);

            const entry = await this.vaultStore.setSigned({
                field: key,
                cid,
                encrypted: serialized.encrypted,
                nonce: serialized.nonce,
                sender: senderDid,
                senderPubkey,
                keyId,
                timestamp: new Date().toISOString(),
            }, payload => signVaultPayload(payload, senderPrivkey));

            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    data: {
                        field: entry.field,
                        cid: entry.cid,
                        sender: entry.sender,
                        senderPubkey: entry.senderPubkey,
                        keyId: entry.keyId,
                        timestamp: entry.timestamp,
                        previousCid: entry.previousCid ?? null,
                    },
                }, null, 2));
                return;
            }

            if (typeof options.value === 'string') {
                console.log(chalk.yellow('⚠️  Passing secrets via --value may expose them in shell history; prefer --stdin or --value-file.'));
            }

            console.log(chalk.green('✅ Secret stored'));
            console.log(chalk.gray(`  Field: ${entry.field}`));
            console.log(chalk.gray(`  CID:   ${entry.cid}`));
            console.log(chalk.gray(`  Sender: ${entry.sender}`));
            console.log(chalk.gray(`  Time:  ${entry.timestamp}`));
            if (entry.previousCid) {
                console.log(chalk.gray(`  Previous CID: ${entry.previousCid}`));
            }
            console.log(chalk.gray(`  Key ID: ${entry.keyId}`));
        } catch (error) {
            this.logger.error('vault set failed', error as Error, { key });
            if (options.json) {
                console.log(JSON.stringify({ success: false, error: String(error) }, null, 2));
                process.exit(1);
            }
            console.error(chalk.red(`❌ vault set failed: ${error}`));
            process.exit(1);
        }
    }

    private async handleGet(key: string, options: any): Promise<void> {
        try {
            const entry = await this.vaultStore.get(key);
            if (!entry) {
                if (options.json) {
                    console.log(JSON.stringify({ success: false, error: `Key '${key}' not found in vault` }, null, 2));
                    process.exit(1);
                }
                console.error(chalk.red(`❌ Key '${key}' not found in vault`));
                process.exit(1);
            }

            const identityConfig = this.loadIdentityConfig();
            const privateKey = (options.privateKey as string | undefined)
                ?? identityConfig.privateKey;

            if (!privateKey) {
                if (options.json) {
                    console.log(JSON.stringify({
                        success: false,
                        error: 'Private key required for decryption. Pass --private-key or set it in ~/.imajin/identity.json',
                    }, null, 2));
                    process.exit(1);
                }
                console.error(
                    chalk.red('❌ Private key required for decryption. Pass --private-key or set it in ~/.imajin/identity.json')
                );
                process.exit(1);
            }

            if (!entry.senderPubkey) {
                throw new Error('Vault entry missing sender public key — cannot decrypt');
            }

            // Validate key
            hexToBytes(privateKey);

            const blob = deserializeBlob({ encrypted: entry.encrypted, nonce: entry.nonce });
            const plaintext = decrypt(blob, entry.senderPubkey, privateKey);

            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    data: {
                        field: entry.field,
                        value: plaintext,
                        cid: entry.cid,
                        sender: entry.sender,
                        timestamp: entry.timestamp,
                    },
                }, null, 2));
                return;
            }

            console.log(chalk.green('✅ Secret retrieved'));
            console.log(chalk.gray(`  Field: ${entry.field}`));
            console.log(chalk.gray(`  Value: ${plaintext}`));
            console.log(chalk.gray(`  CID:   ${entry.cid}`));
            console.log(chalk.gray(`  Sender: ${entry.sender}`));
            console.log(chalk.gray(`  Time:  ${entry.timestamp}`));
        } catch (error) {
            this.logger.error('vault get failed', error as Error, { key });
            if (options.json) {
                console.log(JSON.stringify({ success: false, error: String(error) }, null, 2));
                process.exit(1);
            }
            console.error(chalk.red(`❌ vault get failed: ${error}`));
            process.exit(1);
        }
    }

    private async handleList(options: any): Promise<void> {
        try {
            const entries = await this.vaultStore.list();
            const identityConfig = this.loadIdentityConfig();
            const privateKey = (options.privateKey as string | undefined)
                ?? identityConfig.privateKey;

            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    data: entries.map((e) => ({
                        field: e.field,
                        cid: e.cid,
                        sender: e.sender,
                        keyId: e.keyId ?? null,
                        timestamp: e.timestamp,
                        hint: privateKey && e.senderPubkey
                            ? this.tryGetHint(e, privateKey)
                            : null,
                    })),
                }, null, 2));
                return;
            }

            if (entries.length === 0) {
                console.log(chalk.yellow('No entries in vault'));
                return;
            }

            console.log(chalk.blue(`🔐 Vault Entries (${entries.length})`));
            console.log();

            for (const entry of entries) {
                const hint = privateKey && entry.senderPubkey
                    ? this.tryGetHint(entry, privateKey)
                    : undefined;

                console.log(`  ${chalk.cyan(entry.field)}`);
                console.log(chalk.gray(`    CID:   ${entry.cid}`));
                console.log(chalk.gray(`    Sender: ${entry.sender}`));
                console.log(chalk.gray(`    Key ID: ${entry.keyId}`));
                console.log(chalk.gray(`    Time:  ${entry.timestamp}`));
                if (hint !== undefined) {
                    console.log(chalk.gray(`    Hint:  ${hint}`));
                }
                console.log();
            }
        } catch (error) {
            this.logger.error('vault list failed', error as Error);
            if (options.json) {
                console.log(JSON.stringify({ success: false, error: String(error) }, null, 2));
                process.exit(1);
            }
            console.error(chalk.red(`❌ vault list failed: ${error}`));
            process.exit(1);
        }
    }

    private async handleServe(options: any): Promise<void> {
        const nodeUrl = String(options.url ?? '');
        const adminToken = String(options.token ?? '');
        const pollInterval = Math.max(1, Number.parseInt(String(options.interval ?? '5'), 10));
        const autoApprove = options.autoApprove === true;

        if (!nodeUrl) {
            console.error(chalk.red('\u274c Kernel URL required. Pass --url or set IMAJIN_NODE_URL.'));
            process.exit(1);
        }
        if (!adminToken) {
            console.error(chalk.red('\u274c Admin token required. Pass --token or set IMAJIN_ADMIN_TOKEN.'));
        }
    }
  
    private async handleBackup(options: any): Promise<void> {
        const shares = Number.parseInt(String(options.shares ?? '3'), 10);
        const threshold = Number.parseInt(String(options.threshold ?? '2'), 10);
        const outDir = String(options.out ?? './vault-recovery');

        if (Number.isNaN(shares) || shares < 2) {
            console.error(chalk.red('\u274c --shares must be an integer ≥ 2'));
            process.exit(1);
        }
        if (Number.isNaN(threshold) || threshold < 2 || threshold > shares) {
            console.error(chalk.red(`\u274c --threshold must be an integer 2 \u2264 threshold \u2264 shares (${shares})`));
            process.exit(1);
        }

        const keypair = await this.vaultKeyStore.load();
        if (!keypair) {
            console.error(chalk.red('\u274c No vault owner key found. Run `imajin vault pubkey` first.'));
            process.exit(1);
        }

        // Resolve nodeDid: prefer --node-did, then node.json publicKey, then fail.
        let nodeDid: string;
        if (options.nodeDid && typeof options.nodeDid === 'string') {
            nodeDid = options.nodeDid;
        } else {
            const nodeConfig = this.loadNodeConfig();
            if (!nodeConfig.publicKey) {
                console.error(
                    chalk.red('\u274c Cannot determine node DID.') + '\n' +
                    chalk.gray('  Pass --node-did, or set publicKey in ~/.imajin/node.json.')
                );
                process.exit(1);
            }
            nodeDid = `did:imajin:${nodeConfig.publicKey.slice(0, 16)}`;
        }

        const ownerDid = deriveDid(keypair.edPub);
        const grantService = new VaultGrantService(nodeUrl, adminToken);

        console.log(chalk.blue('\ud83d\udd10 Vault owner agent started (Tier 1)'));
        console.log(chalk.gray(`   ownerDid   : ${ownerDid}`));
        console.log(chalk.gray(`   fingerprint: ${keypair.xPub.slice(0, 8)}...`));
        console.log(chalk.gray(`   nodeDid    : ${nodeDid}`));
        console.log(chalk.gray(`   kernel     : ${nodeUrl}`));
        console.log(chalk.gray(`   poll       : ${pollInterval}s  |  auto-approve: ${autoApprove}`));
        console.log();
        console.log(chalk.yellow('Waiting for grant requests... (Ctrl+C to stop)'));
        console.log();

        const poll = async (): Promise<void> => {
            let requests: PendingGrantRequest[];
            try {
                requests = await grantService.fetchPendingGrants();
            } catch (err) {
                console.error(chalk.yellow(`\u26a0\ufe0f  Poll error: ${err}`));
                return;
            }

            for (const req of requests) {
                await this.processGrantRequest(req, keypair, nodeDid, ownerDid, grantService, autoApprove);
            }
        };

        await poll();
        const intervalId = setInterval(() => { void poll(); }, pollInterval * 1_000);

        const shutdown = (): void => {
            clearInterval(intervalId);
            console.log();
            console.log(chalk.yellow('Vault owner agent stopped.'));
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }

    private async processGrantRequest(
        req: PendingGrantRequest,
        keypair: OwnerKeypair,
        nodeDid: string,
        ownerDid: string,
        grantService: VaultGrantService,
        autoApprove: boolean,
    ): Promise<void> {
        // Guard: request must be addressed to our key.
        if (req.ownerXPub !== keypair.xPub) {
            console.warn(chalk.yellow(
                `\u26a0\ufe0f  Skipping ${req.field} (requestId: ${req.requestId.slice(0, 8)}...): ` +
                `ownerXPub mismatch (expected ${keypair.xPub.slice(0, 8)}, got ${req.ownerXPub.slice(0, 8)})`
            ));
            return;
        }

        console.log(chalk.gray(`\n   Grant request: field='${req.field}' requestId=${req.requestId.slice(0, 8)}...`));

        if (!autoApprove) {
            const { default: inquirer } = await import('inquirer');
            const { approve } = await inquirer.prompt([{
                type: 'confirm',
                name: 'approve',
                message: `Issue delegation grant for field '${chalk.cyan(req.field)}'?`,
                default: true,
            }]) as { approve: boolean };

            if (!approve) {
                console.log(chalk.yellow('  Skipped.'));
                return;
            }
        }

        try {
            // Step 1: Recover the field key.
            // The kernel wrapped it nodeXPriv → ownerXPub for secure delivery.
            // We unwrap using ownerXPriv + nodeXPub.
            const fieldKey = unwrapFieldKey(
                { encryptedKey: req.wrappedFieldKey, nonce: req.wrappedFieldKeyNonce },
                req.nodeXPub,
                keypair.xPriv,
            );

            // Step 2: Wrap the field key as the canonical delegation grant.
            // Owner signs and wraps ownerXPriv → nodeXPub.
            const wrapped = wrapFieldKey(fieldKey, req.nodeXPub, keypair.xPriv);

            const expiresAt = req.expiresAt ? new Date(req.expiresAt) : null;

            // Step 3: Sign the canonical grant payload.
            const canonical = canonicalizeGrantPayload({
                subject: ownerDid,
                grantedTo: nodeDid,
                field: req.field,
                ownerXPub: keypair.xPub,
                wrappedKey: wrapped.encryptedKey,
                wrappedNonce: wrapped.nonce,
                keyId: req.keyId,
                expiresAt,
            });
            const ownerSignature = signCanonical(canonical, keypair.edPriv);

            // Step 4: Submit to kernel.
            const result = await grantService.submitGrant({
                requestId: req.requestId,
                subject: ownerDid,
                grantedTo: nodeDid,
                field: req.field,
                ownerXPub: keypair.xPub,
                wrappedKey: wrapped.encryptedKey,
                wrappedNonce: wrapped.nonce,
                keyId: req.keyId,
                ownerSignature,
                expiresAt: expiresAt?.toISOString() ?? null,
            });

            console.log(chalk.green(`\u2705 Grant issued: field='${result.field}' grantId=${result.grantId.slice(0, 16)}...`));
        } catch (err) {
            console.error(chalk.red(`\u274c Failed to process grant for '${req.field}': ${err}`));
        }
        console.log(chalk.blue('\ud83d\udd10 Creating Shamir vault backup...'));
        console.log(chalk.gray(`   Key fingerprint : ${keypair.xPub.slice(0, 8)}`));
        console.log(chalk.gray(`   Shares          : ${shares}  |  Threshold: ${threshold}`));
        console.log(chalk.yellow(`   You will be prompted for ${shares} separate passphrases (one per share).`));
        console.log();

        const seed = Buffer.from(keypair.edPriv, 'hex');

        // Use dynamic import to avoid CJS/ESM issues with inquirer in tests.
        const { default: inquirer } = await import('inquirer');

        let filePaths: string[];
        try {
            filePaths = await this.vaultShareStore.createShares({
                seed,
                ownerXPub: keypair.xPub,
                shares,
                threshold,
                outDir,
                getPassphrase: async (shareIndex, total) => {
                    const { passphrase } = await inquirer.prompt([{
                        type: 'password',
                        name: 'passphrase',
                        message: `Passphrase for share ${shareIndex}/${total}:`,
                        validate: (v: string) =>
                            v.length >= 8 ? true : 'Passphrase must be at least 8 characters',
                    }]);
                    const { confirm } = await inquirer.prompt([{
                        type: 'password',
                        name: 'confirm',
                        message: `Confirm passphrase for share ${shareIndex}/${total}:`,
                    }]);
                    if (passphrase !== confirm) {
                        throw new Error(`Passphrases for share ${shareIndex} do not match`);
                    }
                    return passphrase as string;
                },
            });
        } catch (error) {
            this.logger.error('vault backup failed', error as Error);
            console.error(chalk.red(`\u274c vault backup failed: ${error}`));
            process.exit(1);
        }

        console.log(chalk.green('\u2705 Backup complete.'));
        for (const p of filePaths) {
            console.log(chalk.gray(`   ${p}`));
        }
        console.log();
        console.log(chalk.yellow(`\u26a0\ufe0f  Store share files in separate secure locations (different devices / trusted custodians).`));
        console.log(chalk.yellow(`   Any ${threshold} of ${shares} shares are sufficient to recover your key.`));
        console.log(chalk.yellow('   Fewer than that cannot recover the key — there is no fallback.'));
    }

    private async handleRestore(sharePaths: string[], _options: any): Promise<void> {
        if (sharePaths.length === 0) {
            console.error(chalk.red('\u274c Provide at least one share file path'));
            process.exit(1);
        }

        // Validate all share files exist before prompting for passphrases.
        for (const p of sharePaths) {
            if (!fs.existsSync(p)) {
                console.error(chalk.red(`\u274c Share file not found: ${p}`));
                process.exit(1);
            }
        }

        const firstMeta = this.vaultShareStore.readShareFile(sharePaths[0]!);

        console.log(chalk.blue('\ud83d\udd11 Restoring owner vault key from Shamir shares...'));
        console.log(chalk.gray(`   Key fingerprint : ${firstMeta.fingerprint}`));
        console.log(chalk.gray(`   Threshold       : ${firstMeta.threshold}  |  Total: ${firstMeta.total}`));
        console.log();

        if (sharePaths.length < firstMeta.threshold) {
            console.error(
                chalk.red(`\u274c Need at least ${firstMeta.threshold} shares, provided ${sharePaths.length}.`)
            );
            process.exit(1);
        }

        const { default: inquirer } = await import('inquirer');

        let seed: Buffer;
        try {
            seed = await this.vaultShareStore.reconstructSeed({
                sharePaths,
                getPassphrase: async (shareIndex, fingerprint) => {
                    const { passphrase } = await inquirer.prompt([{
                        type: 'password',
                        name: 'passphrase',
                        message: `Passphrase for share ${shareIndex} (fingerprint: ${fingerprint}):`,
                    }]);
                    return passphrase as string;
                },
            });
        } catch (error) {
            this.logger.error('vault restore failed', error as Error);
            console.error(chalk.red(`\u274c vault restore failed: ${error}`));
            process.exit(1);
        }

        const kp = await this.vaultKeyStore.restoreFromSeed(seed.toString('hex'));

        console.log(chalk.green('\u2705 Key restored successfully.'));
        console.log(chalk.gray(`   ownerXPub:  ${kp.xPub}`));
        console.log(chalk.gray(`   ownerEdPub: ${kp.edPub}`));
        console.log();
        console.log(chalk.yellow('\u26a0\ufe0f  Run `imajin vault pubkey` to verify the restored key matches your kernel configuration.'));
    }

    private async handlePubkey(options: any): Promise<void> {
        try {
            const kp = await this.vaultKeyStore.getOrCreate();

            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    data: {
                        ownerXPub: kp.xPub,
                        ownerEdPub: kp.edPub,
                    },
                }, null, 2));
                return;
            }

            console.log(chalk.blue('🔑 Owner vault public keys (Tier 1 custody setup)'));
            console.log();
            console.log(chalk.gray('  Set these environment variables on the kernel to activate Tier 1:'));
            console.log();
            console.log(`  ${chalk.cyan('VAULT_OWNER_X_PUB')}=${chalk.white(kp.xPub)}`);
            console.log(`  ${chalk.cyan('VAULT_OWNER_ED_PUB')}=${chalk.white(kp.edPub)}`);
            console.log();
            console.log(chalk.gray('  Once set, run `imajin vault serve` to process grant requests.'));
            console.log(chalk.yellow('  ⚠️  Back up your key before storing production secrets: imajin vault backup'));
        } catch (error) {
            this.logger.error('vault pubkey failed', error as Error);
            if (options.json) {
                console.log(JSON.stringify({ success: false, error: String(error) }, null, 2));
                process.exit(1);
            }
            console.error(chalk.red(`❌ vault pubkey failed: ${error}`));
            process.exit(1);
        }
    }

    private tryGetHint(entry: { encrypted: string; nonce: string; senderPubkey?: string }, privateKey: string): string | null {
        try {
            if (!entry.senderPubkey) {
                return null;
            }
            const blob = deserializeBlob({ encrypted: entry.encrypted, nonce: entry.nonce });
            const plaintext = decrypt(blob, entry.senderPubkey, privateKey);
            if (plaintext.length <= 4) {
                return plaintext + '...';
            }
            return plaintext.slice(0, 4) + '...';
        } catch {
            return null;
        }
    }
}
