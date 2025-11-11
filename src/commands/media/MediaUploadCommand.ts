/**
 * MediaUploadCommand - CLI command for uploading media files
 * 
 * @package     @imajin/cli
 * @subpackage  commands/media
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * @see        docs/commands/media.md
 * 
 * Integration Points:
 * - MediaProcessor for file processing
 * - Event system for progress tracking
 * - Exception handling for user feedback
 */

import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import { glob } from 'glob';
import * as path from 'node:path';

import type { Container } from '../../container/Container.js';
import type { Logger } from '../../logging/Logger.js';
import type { MediaProcessor } from '../../media/MediaProcessor.js';
import type { MediaProcessingEvent, MediaProcessingOptions } from '../../types/Media.js';

import { BaseException } from '../../exceptions/BaseException.js';
import { ValidationError } from '../../exceptions/ValidationError.js';
import { CommonOptions } from '../../utils/commonOptions.js';

export interface MediaUploadOptions {
    provider?: string;
    folder?: string;
    tags?: string[];
    optimize?: boolean;
    resize?: string;
    format?: string;
    quality?: number;
    public?: boolean;
    overwrite?: boolean;
    batch?: boolean;
    output?: string;
}

export class MediaUploadCommand {
    private readonly container: Container;
    private readonly mediaProcessor: MediaProcessor;
    private readonly logger: Logger | null = null;

    constructor(container: Container) {
        this.container = container;
        this.mediaProcessor = container.resolve('MediaProcessor');
        try {
            this.logger = container.resolve('logger');
        } catch (error) {
            // Logger not available - intentionally ignored during initialization
        }
    }

    /**
     * Register the command with Commander
     */
    public register(program: Command): void {
        const uploadCommand = program
            .command('media:upload')
            .description('Upload media files to configured provider')
            .argument('<files...>', 'File paths or glob patterns to upload')
            .option('-p, --provider <provider>', 'Media provider to use (local, cloudinary, aws)')
            .option('-f, --folder <folder>', 'Upload to specific folder')
            .option('-t, --tags <tags>', 'Comma-separated tags', this.parseTags)
            .option('--optimize', 'Automatically optimize uploaded files')
            .option('--resize <dimensions>', 'Resize images (e.g., 1920x1080)')
            .addOption(CommonOptions.format())
            .option('-q, --quality <quality>', 'Set quality (1-100)', Number.parseInt)
            .option('--public', 'Make files publicly accessible')
            .option('--overwrite', 'Overwrite existing files')
            .option('--batch', 'Process files in batch mode')
            .addOption(CommonOptions.output())
            .action(async (files: string[], options: MediaUploadOptions) => {
                await this.execute(files, options);
            });

        uploadCommand.addHelpText('after', `
Examples:
  $ imajin media:upload ./image.jpg --optimize --resize 1920x1080
  $ imajin media:upload ./photos/*.jpg --provider cloudinary --folder vacation
  $ imajin media:upload ./video.mp4 --format webm --quality 85
  $ imajin media:upload ./media/* --batch --tags nature,landscape
        `);
    }

    /**
     * Execute the upload command
     */
    private async execute(filePatterns: string[], options: MediaUploadOptions): Promise<void> {
        try {
            this.logger?.debug('Media upload command starting', { filePatterns, options });
            console.log('🎨 Starting media upload...\n');

            // Resolve file patterns to actual file paths
            const filePaths = await this.resolveFilePatterns(filePatterns);

            if (filePaths.length === 0) {
                throw ValidationError.invalidValue('files', filePatterns, undefined, {
                    message: 'No files found matching the specified patterns'
                });
            }

            console.log(`📁 Found ${filePaths.length} file(s) to upload`);

            // Validate options
            this.validateOptions(options);

            // Prepare processing options
            const processingOptions = this.prepareProcessingOptions(options);

            // Set up progress tracking
            this.setupProgressTracking();

            // Process files
            if (options.batch && filePaths.length > 1) {
                await this.processBatch(filePaths, processingOptions);
            } else {
                await this.processIndividual(filePaths, processingOptions);
            }

            console.log('\n✅ Media upload completed successfully!');

            this.logger?.info('Media upload completed', { fileCount: filePaths.length, options });

        } catch (error) {
            this.logger?.error('Media upload failed', error as Error, { filePatterns, options });
            if (error instanceof BaseException) {
                console.error(`\n❌ ${error.getFormattedError()}`);
                process.exit(1);
            } else {
                console.error(`\n❌ Unexpected error: ${error}`);
                process.exit(1);
            }
        }
    }

    /**
     * Resolve file patterns to actual file paths
     */
    private async resolveFilePatterns(patterns: string[]): Promise<string[]> {
        const filePaths: string[] = [];

        for (const pattern of patterns) {
            try {
                // Check if it's a direct file path
                const stats = await fs.stat(pattern);
                if (stats.isFile()) {
                    filePaths.push(pattern);
                    continue;
                }
                if (stats.isDirectory()) {
                    // Add all media files in directory
                    const dirFiles = await glob(path.join(pattern, '**/*.{jpg,jpeg,png,gif,webp,mp4,mov,avi}'));
                    filePaths.push(...dirFiles);
                    continue;
                }
            } catch {
                // Not a direct path, try as glob pattern
                const globFiles = await glob(pattern);
                filePaths.push(...globFiles);
            }
        }

        // Remove duplicates and ensure files exist
        const uniquePaths = [...new Set(filePaths)];
        const validPaths: string[] = [];

        for (const filePath of uniquePaths) {
            try {
                const stats = await fs.stat(filePath);
                if (stats.isFile()) {
                    validPaths.push(filePath);
                }
            } catch {
                console.warn(`⚠️  File not found: ${filePath}`);
            }
        }

        return validPaths;
    }

    /**
     * Validate command options
     */
    private validateOptions(options: MediaUploadOptions): void {
        if (options.quality && (options.quality < 1 || options.quality > 100)) {
            throw ValidationError.invalidValue('quality', options.quality, undefined, {
                message: 'Quality must be between 1 and 100'
            });
        }

        if (options.resize && !this.isValidDimensions(options.resize)) {
            throw ValidationError.invalidValue('resize', options.resize, undefined, {
                message: 'Resize format must be WIDTHxHEIGHT (e.g., 1920x1080)'
            });
        }

        if (options.format && !this.isValidFormat(options.format)) {
            throw ValidationError.invalidValue('format', options.format,
                ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'mp4', 'webm'], {
                message: 'Invalid output format'
            });
        }
    }

    /**
     * Prepare processing options from command options
     */
    private prepareProcessingOptions(options: MediaUploadOptions): MediaProcessingOptions {
        const processingOptions: MediaProcessingOptions = {};

        if (options.provider) {
processingOptions.provider = options.provider;
}
        if (options.folder) {
processingOptions.folder = options.folder;
}
        if (options.tags) {
processingOptions.tags = options.tags;
}
        if (options.public !== undefined) {
processingOptions.public = options.public;
}
        if (options.overwrite !== undefined) {
processingOptions.overwrite = options.overwrite;
}

        return processingOptions;
    }

    /**
     * Set up progress tracking
     */
    private setupProgressTracking(): void {
        this.mediaProcessor.on('upload.started', (event: MediaProcessingEvent) => {
            console.log(`📤 Uploading: ${event.data.fileName}`);
        });

        this.mediaProcessor.on('upload.completed', (event: MediaProcessingEvent) => {
            const asset = event.data.asset;
            console.log(`✅ Uploaded: ${asset.fileName} (${this.formatFileSize(asset.size)})`);
            console.log(`   URL: ${asset.url}`);
        });

        this.mediaProcessor.on('upload.failed', (event: MediaProcessingEvent) => {
            console.error(`❌ Failed: ${event.data.fileName}`);
            console.error(`   Error: ${event.data.error.message}`);
        });

        this.mediaProcessor.on('transform.completed', (event: MediaProcessingEvent) => {
            console.log(`🔄 Transformed: ${event.data.asset.fileName}`);
        });

        this.mediaProcessor.on('batch.progress', (event: MediaProcessingEvent) => {
            const { completed, failed, total } = event.data.progress;
            const percentage = Math.round((completed + failed) / total * 100);
            console.log(`📊 Progress: ${completed}/${total} completed (${percentage}%)`);
        });
    }

    /**
     * Process files individually
     */
    private async processIndividual(filePaths: string[], options: MediaProcessingOptions): Promise<void> {
        for (const filePath of filePaths) {
            try {
                const buffer = await fs.readFile(filePath);
                const fileName = path.basename(filePath);

                let asset = await this.mediaProcessor.upload(buffer, fileName, options);

                // Apply additional transformations if specified
                asset = await this.applyTransformations(asset, options);

                console.log(`📋 Metadata: ${asset.metadata.width}x${asset.metadata.height}, ${asset.metadata.format}`);

            } catch (error) {
                console.error(`❌ Failed to process ${filePath}: ${error}`);
            }
        }
    }

    /**
     * Process files in batch mode
     */
    private async processBatch(filePaths: string[], options: MediaProcessingOptions): Promise<void> {
        console.log('📦 Processing in batch mode...');

        const files: Array<{ buffer: Buffer; fileName: string }> = [];

        // Read all files
        for (const filePath of filePaths) {
            try {
                const buffer = await fs.readFile(filePath);
                const fileName = path.basename(filePath);
                files.push({ buffer, fileName });
            } catch (error) {
                console.error(`❌ Failed to read ${filePath}: ${error}`);
            }
        }

        // Process batch
        const batchOperation = await this.mediaProcessor.batchUpload(files, options);

        console.log(`📊 Batch completed: ${batchOperation.progress.completed} successful, ${batchOperation.progress.failed} failed`);
    }

    /**
     * Apply additional transformations based on options
     */
    private async applyTransformations(asset: any, _options: any): Promise<any> {
        // This would apply transformations like resize, format conversion, etc.
        // For now, return the asset as-is
        return asset;
    }

    /**
     * Parse comma-separated tags
     */
    private parseTags(value: string): string[] {
        return value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    /**
     * Validate dimensions format (WIDTHxHEIGHT)
     */
    private isValidDimensions(dimensions: string): boolean {
        const pattern = /^\d+x\d+$/;
        return pattern.test(dimensions);
    }

    /**
     * Validate output format
     */
    private isValidFormat(format: string): boolean {
        const validFormats = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'mp4', 'webm', 'mov'];
        return validFormats.includes(format.toLowerCase());
    }

    /**
     * Format file size for display
     */
    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
} 