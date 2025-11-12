/**
 * LocalFileService - Local filesystem media service
 * 
 * @package     @imajin/cli
 * @subpackage  services/localfile
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-01
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Local filesystem storage
 * - Basic image transformations
 * - Metadata extraction
 * - URL generation for local serving
 * - BaseService compliance with health checks and metrics
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type { EventEmitter } from 'node:events';
import type { Container } from '../../container/Container.js';
import { BaseService } from '../BaseService.js';
import type { ServiceConfig } from '../interfaces/ServiceInterface.js';
import type {
    ListOptions,
    MediaAsset,
    MediaMetadata,
    Transformation,
    UploadOptions
} from '../../types/Media.js';

export interface LocalFileConfig extends ServiceConfig {
    storagePath: string;
    publicPath: string;
    baseUrl: string;
    maxFileSize: number;
}

export class LocalFileService extends BaseService {
    private localFileConfig: LocalFileConfig;

    constructor(
        container: Container,
        config: LocalFileConfig,
        eventEmitter?: EventEmitter
    ) {
        super(container, config, eventEmitter);
        this.localFileConfig = config;
    }

    public getName(): string {
        return 'localfile';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    protected async onInitialize(): Promise<void> {
        // Ensure storage directories exist
        await fs.mkdir(this.localFileConfig.storagePath, { recursive: true });
        await fs.mkdir(this.localFileConfig.publicPath, { recursive: true });
        
        this.emit('service:ready', { service: 'localfile' });
        this.logger.info('LocalFileService initialized', {
            storagePath: this.localFileConfig.storagePath,
            publicPath: this.localFileConfig.publicPath,
            baseUrl: this.localFileConfig.baseUrl
        });
    }

    protected async onShutdown(): Promise<void> {
        this.emit('service:shutdown', { service: 'localfile' });
        this.logger.info('LocalFileService shut down');
    }

    protected async onHealthCheck(): Promise<Array<{ name: string; healthy: boolean; message?: string; }>> {
        try {
            // Test filesystem access
            const testPath = path.join(this.localFileConfig.storagePath, '.health-check');
            await fs.writeFile(testPath, 'ok');
            await fs.unlink(testPath);
            
            return [{
                name: 'local-filesystem',
                healthy: true,
                message: 'Local filesystem accessible'
            }];
        } catch (error) {
            return [{
                name: 'local-filesystem',
                healthy: false,
                message: `Filesystem error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }];
        }
    }

    // ==========================================================================
    // MEDIA OPERATIONS WITH METRICS TRACKING
    // ==========================================================================

    /**
     * Upload a file to local storage
     */
    async upload(file: Buffer, options: UploadOptions): Promise<MediaAsset> {
        return this.execute('upload', async () => {
            // Validate file size
            if (file.length > this.localFileConfig.maxFileSize) {
                throw new Error(`File size exceeds maximum allowed size (${this.localFileConfig.maxFileSize} bytes)`);
            }

            // Generate unique filename
            const fileName = options.fileName || 'unknown';
            const extension = path.extname(fileName);
            const baseName = path.basename(fileName, extension);
            const uniqueId = uuidv4().substring(0, 8);
            const uniqueFileName = `${baseName}_${uniqueId}${extension}`;

            // Determine storage paths
            const folderPath = options.folder ? path.join(this.localFileConfig.storagePath, options.folder) : this.localFileConfig.storagePath;
            const publicFolderPath = options.folder ? path.join(this.localFileConfig.publicPath, options.folder) : this.localFileConfig.publicPath;

            const storageFilePath = path.join(folderPath, uniqueFileName);
            const publicFilePath = path.join(publicFolderPath, uniqueFileName);

            // Ensure directories exist
            await fs.mkdir(folderPath, { recursive: true });
            await fs.mkdir(publicFolderPath, { recursive: true });

            // Check if file exists and handle overwrite
            if (!options.overwrite) {
                try {
                    await fs.access(storageFilePath);
                    throw new Error('File already exists. Use --overwrite to replace it.');
                } catch (error) {
                    // File doesn't exist, which is what we want
                    if (!(error instanceof Error) || !error.message.includes('ENOENT')) {
                        throw error;
                    }
                }
            }

            // Write file to storage
            await fs.writeFile(storageFilePath, file);

            // Copy to public directory if different
            if (storageFilePath !== publicFilePath) {
                await fs.writeFile(publicFilePath, file);
            }

            // Generate URL
            const relativePath = options.folder ? `${options.folder}/${uniqueFileName}` : uniqueFileName;
            const url = `${this.localFileConfig.baseUrl}/${relativePath}`;

            // Extract metadata
            const metadata = await this.extractMetadata(storageFilePath, file);

            // Create asset
            const asset: MediaAsset = {
                id: uniqueId,
                originalName: fileName,
                fileName: uniqueFileName,
                mimeType: this.getMimeType(extension),
                size: file.length,
                url,
                provider: this.getName(),
                uploadedAt: new Date(),
                metadata,
                transformations: []
            };

            this.logger.info('File uploaded to local storage', {
                assetId: asset.id,
                size: asset.size,
                mimeType: asset.mimeType,
                path: storageFilePath
            });

            return asset;
        });
    }

    /**
     * Transform an existing asset (basic transformations only)
     */
    async transform(asset: MediaAsset, transformations: Transformation[]): Promise<MediaAsset> {
        return this.execute('transform', async () => {
            // For local provider, we'll create a new file with transformations applied
            const originalPath = this.getAssetPath(asset);
            const originalBuffer = await fs.readFile(originalPath);

            // Apply transformations (basic implementation)
            let transformedBuffer = originalBuffer;

            for (const transformation of transformations) {
                transformedBuffer = await this.applyTransformation(transformedBuffer, transformation);
            }

            // Generate new filename for transformed asset
            const extension = path.extname(asset.fileName);
            const baseName = path.basename(asset.fileName, extension);
            const transformationId = uuidv4().substring(0, 8);
            const transformedFileName = `${baseName}_t${transformationId}${extension}`;

            // Save transformed file
            const folderPath = path.dirname(originalPath);
            const transformedPath = path.join(folderPath, transformedFileName);
            await fs.writeFile(transformedPath, transformedBuffer);

            // Update asset
            const transformedAsset: MediaAsset = {
                ...asset,
                id: `${asset.id}_${transformationId}`,
                fileName: transformedFileName,
                size: transformedBuffer.length,
                url: asset.url.replace(asset.fileName, transformedFileName),
                transformations: [
                    ...(asset.transformations || []),
                    ...transformations.map(t => ({
                        id: uuidv4(),
                        transformation: t,
                        appliedAt: new Date(),
                        resultUrl: asset.url.replace(asset.fileName, transformedFileName),
                        fileSize: transformedBuffer.length,
                        success: true
                    }))
                ]
            };

            this.logger.info('Asset transformed', {
                originalId: asset.id,
                transformedId: transformedAsset.id,
                transformations: transformations.length
            });

            return transformedAsset;
        });
    }

    /**
     * Delete an asset
     */
    async delete(assetId: string): Promise<void> {
        return this.execute('delete', async () => {
            // Find and delete asset files (simplified - in practice you'd have a metadata store)
            const storageFiles = await this.findFilesRecursive(this.localFileConfig.storagePath);
            const publicFiles = await this.findFilesRecursive(this.localFileConfig.publicPath);
            
            for (const filePath of [...storageFiles, ...publicFiles]) {
                if (path.basename(filePath).includes(assetId)) {
                    await fs.unlink(filePath);
                }
            }

            this.logger.info('Asset deleted from local storage', { assetId });
        });
    }

    /**
     * Get asset metadata
     */
    async getMetadata(assetId: string): Promise<MediaMetadata> {
        return this.execute('getMetadata', async () => {
            const assetPath = await this.findAssetPath(assetId);
            const buffer = await fs.readFile(assetPath);
            return this.extractMetadata(assetPath, buffer);
        });
    }

    /**
     * Get asset details
     */
    async getAsset(assetId: string): Promise<MediaAsset> {
        return this.execute('getAsset', async () => {
            const assetPath = await this.findAssetPath(assetId);
            const buffer = await fs.readFile(assetPath);
            const stats = await fs.stat(assetPath);
            const fileName = path.basename(assetPath);
            const extension = path.extname(fileName);

            const asset: MediaAsset = {
                id: assetId,
                originalName: fileName,
                fileName: fileName,
                mimeType: this.getMimeType(extension),
                size: stats.size,
                url: this.generateUrlFromPath(assetPath),
                provider: this.getName(),
                uploadedAt: stats.birthtime,
                metadata: await this.extractMetadata(assetPath, buffer),
                transformations: []
            };

            return asset;
        });
    }

    /**
     * List assets with pagination
     */
    async listAssets(options: ListOptions): Promise<MediaAsset[]> {
        return this.execute('listAssets', async () => {
            const searchPath = options.folder 
                ? path.join(this.localFileConfig.storagePath, options.folder)
                : this.localFileConfig.storagePath;

            const allFiles = await this.findFilesRecursive(searchPath);
            
            // Filter by tags if provided (stored in filename for simplicity)
            let filteredFiles = allFiles;
            if (options.tags?.length) {
                filteredFiles = allFiles.filter(filePath => {
                    const fileName = path.basename(filePath);
                    return options.tags!.some(tag => fileName.includes(tag));
                });
            }

            // Apply pagination
            const limit = options.limit || 10;
            const offset = options.offset || 0;
            const paginatedFiles = filteredFiles.slice(offset, offset + limit);

            // Convert to MediaAsset objects
            const assets: MediaAsset[] = [];
            for (const filePath of paginatedFiles) {
                try {
                    const stats = await fs.stat(filePath);
                    const fileName = path.basename(filePath);
                    const extension = path.extname(fileName);
                    const assetId = this.extractAssetIdFromFileName(fileName);

                    if (assetId) {
                        const asset: MediaAsset = {
                            id: assetId,
                            originalName: fileName,
                            fileName: fileName,
                            mimeType: this.getMimeType(extension),
                            size: stats.size,
                            url: this.generateUrlFromPath(filePath),
                            provider: this.getName(),
                            uploadedAt: stats.birthtime,
                            metadata: { format: extension.slice(1) },
                            transformations: []
                        };
                        assets.push(asset);
                    }
                } catch (error) {
                    // Skip files that can't be read - may be permissions or corrupted files
                    this.logger?.debug('Skipping file that cannot be read', {
                        file: entry.name,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    continue;
                }
            }

            return assets;
        });
    }

    // ==========================================================================
    // PRIVATE HELPER METHODS
    // ==========================================================================

    private async extractMetadata(filePath: string, _buffer: Buffer): Promise<MediaMetadata> {
        const extension = path.extname(filePath).slice(1);

        return {
            format: extension,
            // Add more metadata extraction as needed
        };
    }

    private async applyTransformation(buffer: Buffer, _transformation: Transformation): Promise<Buffer> {
        // Basic transformation implementation - in practice you'd use libraries like Sharp
        // For now, just return the original buffer
        return buffer;
    }

    private getMimeType(extension: string): string {
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.webm': 'video/webm',
        };

        return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
    }

    private getAssetPath(asset: MediaAsset): string {
        return path.join(this.localFileConfig.storagePath, asset.fileName);
    }

    private async findFilesRecursive(dir: string): Promise<string[]> {
        const files: string[] = [];
        
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    files.push(...await this.findFilesRecursive(fullPath));
                } else if (entry.isFile()) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Directory doesn't exist or can't be read - return empty array
            this.logger?.debug('Cannot read directory', {
                dir,
                error: error instanceof Error ? error.message : String(error)
            });
        }
        
        return files;
    }

    private async findAssetPath(assetId: string): Promise<string> {
        const allFiles = await this.findFilesRecursive(this.localFileConfig.storagePath);
        
        for (const filePath of allFiles) {
            if (path.basename(filePath).includes(assetId)) {
                return filePath;
            }
        }
        
        throw new Error(`Asset not found: ${assetId}`);
    }

    private generateUrlFromPath(filePath: string): string {
        const relativePath = path.relative(this.localFileConfig.storagePath, filePath);
        return `${this.localFileConfig.baseUrl}/${relativePath.replaceAll('\\', '/')}`;
    }

    private extractAssetIdFromFileName(fileName: string): string | null {
        // Extract UUID-like ID from filename (assumes format: name_XXXXXXXX.ext)
        const match = /_([a-f0-9]{8})\./.exec(fileName);
        return match ? (match[1] ?? null) : null;
    }
} 