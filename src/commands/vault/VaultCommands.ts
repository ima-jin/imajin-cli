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
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import { VaultStore } from '../../services/vault/VaultStore.js';
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

    constructor(
        private readonly logger: Logger,
        vaultStore?: VaultStore
    ) {
        this.vaultStore = vaultStore ?? new VaultStore();
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
