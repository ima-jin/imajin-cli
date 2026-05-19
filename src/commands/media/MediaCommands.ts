import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiMediaService } from '../../services/imajin-ai/ImajinAiMediaService.js';

export class MediaCommands {
    constructor(
        private readonly mediaService: ImajinAiMediaService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const mediaCommand = program
            .command('media')
            .description('Media operations backed by imajin-ai');

        mediaCommand
            .command('upload')
            .requiredOption('--file <path>', 'File path to upload')
            .option('--folder-id <id>', 'Optional destination folder id')
            .option('--access <public|private|trusted>', 'Optional access scope')
            .option('--fair-file <path>', 'Optional .fair payload file path')
            .option('--json', 'Output as JSON')
            .description('Upload media asset')
            .action((options, command) => this.handleUpload(this.getCommandOptions(options, command)));

        mediaCommand
            .command('get')
            .requiredOption('--id <asset-id>', 'Asset id')
            .option('--include <fair,folders,references,content,og,transcript>', 'Optional include list')
            .option('--json', 'Output as JSON')
            .description('Get media asset')
            .action((options, command) => this.handleGet(this.getCommandOptions(options, command)));
    }

    private async handleUpload(options: any): Promise<void> {
        await this.execute(
            'upload',
            options,
            async () => {
                const filePath = this.requiredString(options.file, '--file');
                const fileBuffer = fs.readFileSync(filePath);
                const contentBase64 = fileBuffer.toString('base64');
                const fileName = path.basename(filePath);

                return this.mediaService.uploadAsset({
                    fileName,
                    contentBase64,
                    ...(options.folderId ? { folderId: String(options.folderId).trim() } : {}),
                    ...(options.access ? { access: String(options.access).trim() as any } : {}),
                    ...(options.fairFile ? { fair: fs.readFileSync(String(options.fairFile), 'utf8') } : {})
                });
            }
        );
    }

    private async handleGet(options: any): Promise<void> {
        await this.execute(
            'get',
            options,
            async () => this.mediaService.getAsset({
                id: this.requiredString(options.id, '--id'),
                ...(options.include ? { include: this.parseIncludeList(options.include) } : {})
            })
        );
    }

    private parseIncludeList(value: unknown): string[] {
        return this.requiredString(value, '--include')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
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
                    service: 'media',
                    command,
                    data
                }, null, 2));
                return;
            }

            console.log(chalk.green(`✅ media.${command} succeeded`));
            console.log(JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Media command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'media',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ media.${command} failed: ${error}`));
            process.exit(1);
        }
    }
}
