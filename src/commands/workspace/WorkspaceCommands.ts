import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import type { JsonPatchOperation, WorkspaceSearchInput } from '../../services/imajin-ai/ImajinAiWorkspaceService.js';
import { ImajinAiWorkspaceService } from '../../services/imajin-ai/ImajinAiWorkspaceService.js';

export class WorkspaceCommands {
    constructor(
        private readonly workspaceService: ImajinAiWorkspaceService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const workspaceCommand = program
            .command('workspace')
            .description('Workspace operations backed by imajin-ai');

        workspaceCommand
            .command('get')
            .requiredOption('--path <path>', 'Workspace path to read')
            .option('--version <n>', 'Optional version to read')
            .option('--json', 'Output as JSON')
            .description('Read workspace content')
            .action((options, command) => this.handleGet(this.getCommandOptions(options, command)));

        workspaceCommand
            .command('put')
            .requiredOption('--path <path>', 'Workspace path to write')
            .option('--content <text>', 'Raw content text')
            .option('--content-file <path>', 'Path to a local content file')
            .option('--content-b64 <b64>', 'Base64-encoded content')
            .option('--content-type <mime>', 'Content type metadata')
            .option('--if-match <etag>', 'Optional etag precondition')
            .option('--json', 'Output as JSON')
            .description('Write content to workspace')
            .action((options, command) => this.handlePut(this.getCommandOptions(options, command)));
        workspaceCommand
            .command('list')
            .option('--path <path>', 'Workspace path scope')
            .option('--recursive', 'Recursively list descendants')
            .option('--limit <n>', 'Maximum number of entries')
            .option('--cursor <token>', 'Pagination cursor')
            .option('--json', 'Output as JSON')
            .description('List workspace entries')
            .action((options, command) => this.handleList(this.getCommandOptions(options, command)));

        workspaceCommand
            .command('delete')
            .requiredOption('--path <path>', 'Workspace path to delete')
            .option('--recursive', 'Recursively delete descendants')
            .option('--if-match <etag>', 'Optional etag precondition')
            .option('--json', 'Output as JSON')
            .description('Delete workspace content')
            .action((options, command) => this.handleDelete(this.getCommandOptions(options, command)));

        workspaceCommand
            .command('patch')
            .requiredOption('--path <path>', 'Workspace path to patch')
            .requiredOption('--ops-file <path>', 'Path to a JSON patch operations file')
            .option('--if-match <etag>', 'Optional etag precondition')
            .option('--json', 'Output as JSON')
            .description('Apply JSON Patch operations to workspace JSON content')
            .action((options, command) => this.handlePatch(this.getCommandOptions(options, command)));

        workspaceCommand
            .command('move')
            .requiredOption('--from <path>', 'Source workspace path')
            .requiredOption('--to <path>', 'Destination workspace path')
            .option('--if-match <etag>', 'Optional etag precondition')
            .option('--json', 'Output as JSON')
            .description('Move content from one workspace path to another')
            .action((options, command) => this.handleMove(this.getCommandOptions(options, command)));

        workspaceCommand
            .command('diff')
            .requiredOption('--path <path>', 'Workspace path to diff')
            .requiredOption('--from <version|etag>', 'Base revision (version or etag)')
            .option('--to <version|etag>', 'Target revision (defaults to latest)')
            .option('--json', 'Output as JSON')
            .description('Diff workspace content between revisions')
            .action((options, command) => this.handleDiff(this.getCommandOptions(options, command)));

        workspaceCommand
            .command('search')
            .requiredOption('--query <text>', 'Search text')
            .option('--path <path>', 'Workspace path scope')
            .option('--type <file|doc|blob|folder>', 'Filter by entry type')
            .option('--limit <n>', 'Maximum number of results', '20')
            .option('--json', 'Output as JSON')
            .description('Search workspace documents')
            .action((options, command) => this.handleSearch(this.getCommandOptions(options, command)));
    }

    private async handleGet(options: any): Promise<void> {
        await this.execute('get', options, async () => {
            const version = this.parseOptionalPositiveInt(options.version, '--version');
            return this.workspaceService.get({
                path: this.requiredString(options.path, '--path'),
                ...(version !== undefined ? { version } : {})
            });
        });
    }

    private async handlePut(options: any): Promise<void> {
        await this.execute('put', options, async () => {
            const path = this.requiredString(options.path, '--path');
            const content = this.resolveContentInput(options);
            return this.workspaceService.put({
                path,
                content,
                ...(options.contentType ? { contentType: String(options.contentType).trim() } : {}),
                ...(options.ifMatch ? { ifMatch: String(options.ifMatch).trim() } : {})
            });
        });
    }

    private async handleList(options: any): Promise<void> {
        await this.execute('list', options, async () => {
            const limit = this.parseOptionalPositiveInt(options.limit, '--limit');
            return this.workspaceService.list({
                ...(options.path ? { path: String(options.path).trim() } : {}),
                ...(options.recursive ? { recursive: true } : {}),
                ...(limit !== undefined ? { limit } : {}),
                ...(options.cursor ? { cursor: String(options.cursor).trim() } : {})
            });
        });
    }

    private async handleDelete(options: any): Promise<void> {
        await this.execute('delete', options, async () => {
            return this.workspaceService.delete({
                path: this.requiredString(options.path, '--path'),
                ...(options.recursive ? { recursive: true } : {}),
                ...(options.ifMatch ? { ifMatch: String(options.ifMatch).trim() } : {})
            });
        });
    }

    private async handlePatch(options: any): Promise<void> {
        await this.execute('patch', options, async () => {
            const operations = this.readPatchOperations(this.requiredString(options.opsFile, '--ops-file'));
            return this.workspaceService.patch({
                path: this.requiredString(options.path, '--path'),
                operations,
                ...(options.ifMatch ? { ifMatch: String(options.ifMatch).trim() } : {})
            });
        });
    }

    private async handleMove(options: any): Promise<void> {
        await this.execute('move', options, async () => {
            return this.workspaceService.move({
                from: this.requiredString(options.from, '--from'),
                to: this.requiredString(options.to, '--to'),
                ...(options.ifMatch ? { ifMatch: String(options.ifMatch).trim() } : {})
            });
        });
    }

    private async handleDiff(options: any): Promise<void> {
        await this.execute('diff', options, async () => {
            return this.workspaceService.diff({
                path: this.requiredString(options.path, '--path'),
                from: this.requiredString(options.from, '--from'),
                ...(options.to ? { to: String(options.to).trim() } : {})
            });
        });
    }

    private async handleSearch(options: any): Promise<void> {
        await this.execute('search', options, async () => {
            const type = this.parseTypeOption(options.type);
            const limit = this.parseOptionalPositiveInt(options.limit, '--limit') ?? 20;

            const input: WorkspaceSearchInput = {
                query: this.requiredString(options.query, '--query'),
                limit
            };
            if (options.path) {
                input.path = String(options.path).trim();
            }
            if (type) {
                input.type = type;
            }

            return this.workspaceService.search(input);
        });
    }

    private resolveContentInput(options: any): string {
        const sources = [
            options.content !== undefined ? 'content' : null,
            options.contentFile !== undefined ? 'contentFile' : null,
            options.contentB64 !== undefined ? 'contentB64' : null
        ].filter(Boolean);

        if (sources.length !== 1) {
            throw new Error('Exactly one of --content, --content-file, or --content-b64 is required.');
        }

        if (options.content !== undefined) {
            return String(options.content);
        }

        if (options.contentFile !== undefined) {
            const filePath = String(options.contentFile).trim();
            if (!filePath) {
                throw new Error('--content-file cannot be empty');
            }
            return fs.readFileSync(filePath, 'utf8');
        }

        if (options.contentB64 !== undefined) {
            const encoded = String(options.contentB64).trim();
            if (!encoded) {
                throw new Error('--content-b64 cannot be empty');
            }
            try {
                return Buffer.from(encoded, 'base64').toString('utf8');
            } catch (error) {
                throw new Error(`Invalid --content-b64 value: ${error}`);
            }
        }

        throw new Error('No content input was provided');
    }

    private readPatchOperations(filePath: string): JsonPatchOperation[] {
        const raw = fs.readFileSync(filePath, 'utf8');
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            throw new Error(`Invalid JSON in --ops-file: ${error}`);
        }

        if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error('--ops-file must contain a non-empty JSON array of patch operations');
        }

        const operations: JsonPatchOperation[] = [];
        for (const op of parsed) {
            if (typeof op !== 'object' || op === null || Array.isArray(op)) {
                throw new Error('--ops-file contains an invalid patch operation object');
            }

            const record = op as Record<string, unknown>;
            if (typeof record.op !== 'string' || typeof record.path !== 'string') {
                throw new Error('Each patch operation must include string fields: op and path');
            }

            operations.push({
                op: record.op as JsonPatchOperation['op'],
                path: record.path,
                ...(typeof record.from === 'string' ? { from: record.from } : {}),
                ...(record.value !== undefined ? { value: record.value } : {})
            });
        }

        return operations;
    }

    private parseOptionalPositiveInt(value: unknown, optionName: string): number | undefined {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }

        const parsed = Number.parseInt(String(value), 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
            throw new Error(`${optionName} must be a positive integer`);
        }
        return parsed;
    }

    private parseTypeOption(value: unknown): 'file' | 'doc' | 'blob' | 'folder' | undefined {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }

        const parsed = String(value).trim() as 'file' | 'doc' | 'blob' | 'folder';
        const allowed = new Set(['file', 'doc', 'blob', 'folder']);
        if (!allowed.has(parsed)) {
            throw new Error('--type must be one of: file, doc, blob, folder');
        }
        return parsed;
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
                    service: 'workspace',
                    command,
                    data
                }, null, 2));
                return;
            }

            if (command === 'get') {
                this.renderGetResult(data);
                return;
            }
            if (command === 'put') {
                this.renderPutResult(data);
                return;
            }
            if (command === 'list') {
                this.renderListResult(data);
                return;
            }
            if (command === 'delete') {
                this.renderDeleteResult(data);
                return;
            }
            if (command === 'patch') {
                this.renderPatchResult(data);
                return;
            }
            if (command === 'move') {
                this.renderMoveResult(data);
                return;
            }
            if (command === 'diff') {
                this.renderDiffResult(data);
                return;
            }
            if (command === 'search') {
                this.renderSearchResult(data);
                return;
            }

            console.log(chalk.green(`✅ workspace.${command} succeeded`));
            console.log(JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Workspace command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'workspace',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ workspace.${command} failed: ${error}`));
            process.exit(1);
        }
    }

    private renderGetResult(result: any): void {
        console.log(chalk.green('✅ workspace.get succeeded'));
        console.log(chalk.gray(`Path: ${result.path ?? '(unknown)'}`));
        if (result.version !== undefined) {
            console.log(chalk.gray(`Version: ${result.version}`));
        }
        if (result.etag) {
            console.log(chalk.gray(`ETag: ${result.etag}`));
        }
        if (result.contentType) {
            console.log(chalk.gray(`Content-Type: ${result.contentType}`));
        }
        console.log('');
        console.log(result.content ?? '');
    }

    private renderPutResult(result: any): void {
        console.log(chalk.green('✅ workspace.put succeeded'));
        console.log(chalk.gray(`Path: ${result.path ?? '(unknown)'}`));
        if (result.version !== undefined) {
            console.log(chalk.gray(`Version: ${result.version}`));
        }
        if (result.etag) {
            console.log(chalk.gray(`ETag: ${result.etag}`));
        }
    }

    private renderListResult(result: any): void {
        const entries = Array.isArray(result.entries) ? result.entries : [];
        console.log(chalk.green(`✅ workspace.list completed (${entries.length} entr${entries.length === 1 ? 'y' : 'ies'})`));
        if (result.cursor) {
            console.log(chalk.gray(`Cursor: ${result.cursor}`));
        }
        console.log('');

        if (entries.length === 0) {
            console.log(chalk.yellow('No entries found.'));
            return;
        }

        for (const entry of entries) {
            const typeLabel = entry.type ? ` (${entry.type})` : '';
            const sizeLabel = typeof entry.size === 'number' ? ` [${entry.size} B]` : '';
            console.log(chalk.blue(`• ${entry.path}${typeLabel}${sizeLabel}`));
        }
    }

    private renderDeleteResult(result: any): void {
        const deleted = result.deleted !== false;
        if (deleted) {
            console.log(chalk.green('✅ workspace.delete succeeded'));
        } else {
            console.log(chalk.yellow('⚠️ workspace.delete completed with no deletion'));
        }
        console.log(chalk.gray(`Path: ${result.path ?? '(unknown)'}`));
        if (result.version !== undefined) {
            console.log(chalk.gray(`Version: ${result.version}`));
        }
        if (result.etag) {
            console.log(chalk.gray(`ETag: ${result.etag}`));
        }
    }

    private renderPatchResult(result: any): void {
        console.log(chalk.green('✅ workspace.patch succeeded'));
        console.log(chalk.gray(`Path: ${result.path ?? '(unknown)'}`));
        console.log(chalk.gray(`Operations: ${result.operationCount ?? 0}`));
        if (result.version !== undefined) {
            console.log(chalk.gray(`Version: ${result.version}`));
        }
        if (result.etag) {
            console.log(chalk.gray(`ETag: ${result.etag}`));
        }
    }

    private renderMoveResult(result: any): void {
        const deleted = result.deletedSource !== false;
        console.log(chalk.green('✅ workspace.move succeeded'));
        console.log(chalk.gray(`From: ${result.from ?? '(unknown)'}`));
        console.log(chalk.gray(`To: ${result.to ?? '(unknown)'}`));
        console.log(chalk.gray(`Deleted source: ${deleted ? 'yes' : 'no'}`));
        if (result.version !== undefined) {
            console.log(chalk.gray(`Version: ${result.version}`));
        }
        if (result.etag) {
            console.log(chalk.gray(`ETag: ${result.etag}`));
        }
    }

    private renderDiffResult(result: any): void {
        const changed = result.changed === true;
        console.log(chalk.green(`✅ workspace.diff completed (${changed ? 'changed' : 'no changes'})`));
        console.log(chalk.gray(`Path: ${result.path ?? '(unknown)'}`));
        console.log(chalk.gray(`From: ${result.from ?? ''}`));
        console.log(chalk.gray(`To: ${result.to ?? ''}`));
        if (result.fromVersion !== undefined || result.toVersion !== undefined) {
            console.log(chalk.gray(`Versions: ${result.fromVersion ?? '-'} -> ${result.toVersion ?? '-'}`));
        }
        if (result.fromEtag || result.toEtag) {
            console.log(chalk.gray(`ETags: ${result.fromEtag ?? '-'} -> ${result.toEtag ?? '-'}`));
        }
        console.log('');
        console.log(result.diff ?? '');
    }

    private renderSearchResult(result: any): void {
        const matches = Array.isArray(result.matches) ? result.matches : [];
        console.log(chalk.green(`✅ workspace.search completed (${matches.length} match${matches.length === 1 ? '' : 'es'})`));
        console.log(chalk.gray(`Query: ${result.query ?? ''}`));
        console.log(chalk.gray(`Scanned: ${result.scanned ?? 0}`));
        console.log('');

        if (matches.length === 0) {
            console.log(chalk.yellow('No matches found.'));
            return;
        }

        for (const match of matches) {
            const typeLabel = match.type ? ` (${match.type})` : '';
            console.log(chalk.blue(`• ${match.path}${typeLabel}`));
            if (match.snippet) {
                console.log(chalk.gray(`  ${match.snippet}`));
            }
        }
    }
}
