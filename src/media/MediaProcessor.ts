/**
 * MediaProcessor - Core media processing orchestration
 * 
 * @package     @imajin/cli
 * @subpackage  media
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Media provider coordination
 * - Event-driven progress tracking
 * - Batch operation management
 * - Transformation pipeline
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import type {
    BatchOperation,
    MediaAsset,
    MediaProcessingConfig,
    MediaProcessingEvent,
    MediaProcessingOptions,
    MediaProvider,
    Transformation,
    UploadOptions
} from '../types/Media.js';

import { ExceptionUtils } from '../exceptions/index.js';
import { ValidationError } from '../exceptions/ValidationError.js';

export class MediaProcessor extends EventEmitter {
    private config: MediaProcessingConfig;
    private providers: Map<string, MediaProvider> = new Map();

    constructor(config: MediaProcessingConfig) {
        super();
        this.config = config;
    }

    /**
     * Register a media provider
     */
    public registerProvider(name: string, provider: MediaProvider): void {
        this.providers.set(name, provider);
    }

    /**
     * Get a provider by name
     */
    public getProvider(name?: string): MediaProvider {
        const providerName = name || this.config.defaultProvider;
        const provider = this.providers.get(providerName);

        if (!provider) {
            throw ValidationError.invalidValue('provider', providerName, Array.from(this.providers.keys()), {
                message: `Provider '${providerName}' not found or not registered`
            });
        }

        return provider;
    }

    /**
     * Upload a single file
     */
    public async upload(
        buffer: Buffer,
        fileName: string,
        options: MediaProcessingOptions = {}
    ): Promise<MediaAsset> {
        try {
            // Validate file
            this.validateFile(buffer, fileName);

            // Get provider
            const provider = this.getProvider(options.provider);

            // Emit start event
            this.emit('upload.started', {
                type: 'upload.started',
                timestamp: new Date(),
                data: { fileName, provider: provider.name }
            } as MediaProcessingEvent);

            // Prepare upload options
            const uploadOptions: UploadOptions = {
                fileName,
                public: options.public || false,
                overwrite: options.overwrite || false
            };

            // Add optional properties only if they have values
            if (options.folder) {
uploadOptions.folder = options.folder;
}
            if (options.tags) {
uploadOptions.tags = options.tags;
}

            // Upload file
            const asset = await provider.upload(buffer, uploadOptions);

            // Emit completion event
            this.emit('upload.completed', {
                type: 'upload.completed',
                timestamp: new Date(),
                data: { asset }
            } as MediaProcessingEvent);

            return asset;

        } catch (error) {
            const normalizedError = ExceptionUtils.normalize(error, {
                operation: 'upload',
                fileName
            });

            // Emit error event
            this.emit('upload.failed', {
                type: 'upload.failed',
                timestamp: new Date(),
                data: { fileName, error: normalizedError }
            } as MediaProcessingEvent);

            throw normalizedError;
        }
    }

    /**
     * Upload multiple files in batch
     */
    public async batchUpload(
        files: Array<{ buffer: Buffer; fileName: string }>,
        options: MediaProcessingOptions = {}
    ): Promise<BatchOperation> {
        const batchId = uuidv4();
        const batchOperation: BatchOperation = {
            id: batchId,
            type: 'upload',
            status: 'processing',
            startedAt: new Date(),
            progress: {
                total: files.length,
                completed: 0,
                failed: 0,
                errors: []
            },
            results: []
        };

        try {
            // Emit batch start
            this.emit('batch.started', {
                type: 'batch.started',
                timestamp: new Date(),
                data: { batchId, fileCount: files.length }
            } as MediaProcessingEvent);

            // Process files concurrently with controlled parallelism
            const maxConcurrent = 5;
            const chunks = this.chunkArray(files, maxConcurrent);

            for (const chunk of chunks) {
                const promises = chunk.map(async ({ buffer, fileName }) => {
                    try {
                        const asset = await this.upload(buffer, fileName, options);
                        batchOperation.results.push({ success: true, asset });
                        batchOperation.progress.completed++;
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        batchOperation.progress.failed++;
                        batchOperation.progress.errors.push({
                            fileName,
                            error: errorMessage
                        });
                        batchOperation.results.push({ success: false, fileName, error: errorMessage });
                    }

                    // Emit progress update
                    this.emit('batch.progress', {
                        type: 'batch.progress',
                        timestamp: new Date(),
                        data: { batchId, progress: batchOperation.progress }
                    } as MediaProcessingEvent);
                });

                await Promise.all(promises);
            }

            batchOperation.status = 'completed';
            batchOperation.completedAt = new Date();

            // Emit batch completion
            this.emit('batch.completed', {
                type: 'batch.completed',
                timestamp: new Date(),
                data: { batchOperation }
            } as MediaProcessingEvent);

            return batchOperation;

        } catch (error) {
            batchOperation.status = 'failed';
            batchOperation.completedAt = new Date();

            throw ExceptionUtils.normalize(error, {
                operation: 'batchUpload',
                batchId
            });
        }
    }

    /**
     * Transform an existing asset
     */
    public async transform(
        asset: MediaAsset,
        transformations: Transformation[],
        providerName?: string
    ): Promise<MediaAsset> {
        try {
            const provider = this.getProvider(providerName || asset.provider);

            // Emit start event
            this.emit('transform.started', {
                type: 'transform.started',
                timestamp: new Date(),
                data: { asset, transformations }
            } as MediaProcessingEvent);

            const transformedAsset = await provider.transform(asset, transformations);

            // Emit completion event
            this.emit('transform.completed', {
                type: 'transform.completed',
                timestamp: new Date(),
                data: { asset: transformedAsset }
            } as MediaProcessingEvent);

            return transformedAsset;

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'transform',
                assetId: asset.id
            });
        }
    }

    /**
     * Delete an asset
     */
    public async delete(assetId: string, providerName?: string): Promise<void> {
        try {
            const provider = this.getProvider(providerName);
            await provider.delete(assetId);

            this.emit('asset.deleted', {
                type: 'asset.deleted',
                timestamp: new Date(),
                data: { assetId, provider: provider.name }
            } as MediaProcessingEvent);

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'delete',
                assetId
            });
        }
    }

    /**
     * Get asset details
     */
    public async getAsset(assetId: string, providerName?: string): Promise<MediaAsset> {
        try {
            const provider = this.getProvider(providerName);
            return await provider.getAsset(assetId);
        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'getAsset',
                assetId
            });
        }
    }

    /**
     * Validate uploaded file
     */
    private validateFile(buffer: Buffer, fileName: string): void {
        const { limits } = this.config;

        // Check file size
        if (buffer.length > limits.maxFileSize) {
            throw ValidationError.invalidValue('fileSize', buffer.length, undefined, {
                message: `File size (${buffer.length} bytes) exceeds maximum allowed size (${limits.maxFileSize} bytes)`
            });
        }

        // Check file extension
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension && !limits.allowedFormats.includes(extension)) {
            throw ValidationError.invalidValue('fileFormat', extension, limits.allowedFormats, {
                message: `File format '${extension}' is not allowed`
            });
        }

        // Basic file validation (check if it's actually a media file)
        if (buffer.length < 10) {
            throw ValidationError.invalidValue('fileContent', buffer.length, undefined, {
                message: 'File appears to be empty or corrupted'
            });
        }

        // Check magic bytes for common formats
        if (!this.hasValidMagicBytes(buffer)) {
            throw ValidationError.invalidValue('fileContent', 'invalid', undefined, {
                message: 'File does not appear to be a valid media file'
            });
        }
    }

    /**
     * Check if file has valid magic bytes for media files
     */
    private hasValidMagicBytes(buffer: Buffer): boolean {
        if (buffer.length < 4) {
return false;
}

        const magic = buffer.subarray(0, 4);

        // JPEG
        if (magic[0] === 0xFF && magic[1] === 0xD8) {
return true;
}

        // PNG
        if (magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4E && magic[3] === 0x47) {
return true;
}

        // GIF
        if (magic.toString('ascii', 0, 3) === 'GIF') {
return true;
}

        // WebP
        if (buffer.length >= 12) {
            const riff = buffer.toString('ascii', 0, 4);
            const webp = buffer.toString('ascii', 8, 12);
            if (riff === 'RIFF' && webp === 'WEBP') {
return true;
}
        }

        // MP4/MOV (check for ftyp box)
        if (buffer.length >= 8) {
            const ftyp = buffer.toString('ascii', 4, 8);
            if (ftyp === 'ftyp') {
return true;
}
        }

        return true; // Allow other formats for now
    }

    /**
     * Split array into chunks
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Get processing statistics
     */
    public getStats(): {
        providers: string[];
        defaultProvider: string;
        limits: any;
    } {
        return {
            providers: Array.from(this.providers.keys()),
            defaultProvider: this.config.defaultProvider,
            limits: this.config.limits
        };
    }
} 