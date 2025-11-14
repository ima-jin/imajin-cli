/* eslint-disable no-console */ // CLI Output: Media operation status logging
/**
 * LocalMediaProvider - Local filesystem media provider
 *
 * @package     @imajin/cli
 * @subpackage  media/providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * @see        docs/media/providers.md
 * 
 * Integration Points:
 * - Local filesystem storage
 * - Basic image transformations
 * - Metadata extraction
 * - URL generation for local serving
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line deprecation/deprecation
import type {
    ListOptions,
    MediaAsset,
    MediaMetadata,
    MediaProvider,
    Transformation,
    UploadOptions
} from '../../types/Media.js';

import { ExceptionUtils } from '../../exceptions/index.js';
import { ValidationError } from '../../exceptions/ValidationError.js';

export interface LocalProviderConfig {
    storagePath: string;
    publicPath: string;
    baseUrl: string;
    maxFileSize: number;
}

// eslint-disable-next-line deprecation/deprecation
export class LocalMediaProvider implements MediaProvider {
    public readonly name = 'local';
    private readonly config: LocalProviderConfig;

    constructor(config: LocalProviderConfig) {
        this.config = config;
        // Initialize directories asynchronously (fire and forget with error handling)
        this.ensureDirectories().catch((error) => {
            console.warn(`⚠️  Could not initialize directories: ${error}`);
        });
    }

    /**
     * Upload a file to local storage
     */
    public async upload(file: Buffer, options: UploadOptions): Promise<MediaAsset> {
        try {
            // Validate file size
            if (file.length > this.config.maxFileSize) {
                throw ValidationError.invalidValue('fileSize', file.length, undefined, {
                    message: `File size exceeds maximum allowed size (${this.config.maxFileSize} bytes)`
                });
            }

            // Generate unique filename
            const fileName = options.fileName || 'unknown';
            const extension = path.extname(fileName);
            const baseName = path.basename(fileName, extension);
            const uniqueId = uuidv4().substring(0, 8);
            const uniqueFileName = `${baseName}_${uniqueId}${extension}`;

            // Determine storage paths
            const folderPath = options.folder ? path.join(this.config.storagePath, options.folder) : this.config.storagePath;
            const publicFolderPath = options.folder ? path.join(this.config.publicPath, options.folder) : this.config.publicPath;

            const storageFilePath = path.join(folderPath, uniqueFileName);
            const publicFilePath = path.join(publicFolderPath, uniqueFileName);

            // Ensure directories exist
            await fs.mkdir(folderPath, { recursive: true });
            await fs.mkdir(publicFolderPath, { recursive: true });

            // Check if file exists and handle overwrite
            if (!options.overwrite) {
                try {
                    await fs.access(storageFilePath);
                    throw ValidationError.invalidValue('file', uniqueFileName, undefined, {
                        message: 'File already exists. Use --overwrite to replace it.'
                    });
                } catch (error) {
                    // File doesn't exist, which is what we want
                    if (error instanceof ValidationError) {
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
            const url = `${this.config.baseUrl}/${relativePath}`;

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
                provider: this.name,
                uploadedAt: new Date(),
                metadata,
                transformations: []
            };

            return asset;

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'upload',
                provider: this.name,
                fileName: options.fileName
            });
        }
    }

    /**
     * Transform an existing asset (basic transformations only)
     */
    public async transform(asset: MediaAsset, transformations: Transformation[]): Promise<MediaAsset> {
        try {
            // For local provider, we'll create a new file with transformations applied
            const originalPath = this.getAssetPath(asset);
            const originalBuffer = await fs.readFile(originalPath);

            // Apply transformations (basic implementation)
            let transformedBuffer = originalBuffer;

            for (const transformation of transformations) {
                transformedBuffer = await LocalMediaProvider.applyTransformation(transformedBuffer, transformation);
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

            return transformedAsset;

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'transform',
                provider: this.name,
                assetId: asset.id
            });
        }
    }

    /**
     * Delete an asset
     */
    public async delete(assetId: string): Promise<void> {
        try {
            // Find asset file (this is simplified - in practice you'd have a metadata store)
            const storagePath = this.config.storagePath;
            const files = await this.findFilesRecursive(storagePath);

            for (const filePath of files) {
                const fileName = path.basename(filePath);
                if (fileName.includes(assetId)) {
                    await fs.unlink(filePath);

                    // Also delete from public directory
                    const relativePath = path.relative(storagePath, filePath);
                    const publicPath = path.join(this.config.publicPath, relativePath);
                    try {
                        await fs.unlink(publicPath);
                    } catch {
                        // Public file might not exist
                    }
                    return;
                }
            }

            throw ValidationError.invalidValue('asset', assetId, undefined, {
                message: `Asset not found: ${assetId}`
            });

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'delete',
                provider: this.name,
                assetId
            });
        }
    }

    /**
     * Get asset metadata
     */
    public async getMetadata(assetId: string): Promise<MediaMetadata> {
        try {
            const asset = await this.getAsset(assetId);
            return asset.metadata;
        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'getMetadata',
                provider: this.name,
                assetId
            });
        }
    }

    /**
     * Get asset details
     */
    public async getAsset(assetId: string): Promise<MediaAsset> {
        try {
            // Find asset file
            const storagePath = this.config.storagePath;
            const files = await this.findFilesRecursive(storagePath);

            for (const filePath of files) {
                const fileName = path.basename(filePath);
                if (fileName.includes(assetId)) {
                    const stats = await fs.stat(filePath);
                    const buffer = await fs.readFile(filePath);
                    const metadata = await this.extractMetadata(filePath, buffer);

                    const relativePath = path.relative(storagePath, filePath);
                    const url = `${this.config.baseUrl}/${relativePath.replace(path.sep, '/')}`;

                    const asset: MediaAsset = {
                        id: assetId,
                        originalName: fileName,
                        fileName,
                        mimeType: this.getMimeType(path.extname(fileName)),
                        size: stats.size,
                        url,
                        provider: this.name,
                        uploadedAt: stats.birthtime,
                        metadata,
                        transformations: []
                    };

                    return asset;
                }
            }

            throw ValidationError.invalidValue('asset', assetId, undefined, {
                message: `Asset not found: ${assetId}`
            });

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'getAsset',
                provider: this.name,
                assetId
            });
        }
    }

    /**
     * List assets
     */
    public async listAssets(options: ListOptions): Promise<MediaAsset[]> {
        try {
            const searchPath = options.folder
                ? path.join(this.config.storagePath, options.folder)
                : this.config.storagePath;

            const files = await this.findFilesRecursive(searchPath);
            const assets: MediaAsset[] = [];

            for (const filePath of files.slice(0, options.limit || 100)) {
                try {
                    const fileName = path.basename(filePath);
                    const stats = await fs.stat(filePath);

                    // Extract asset ID from filename (assuming format: name_id.ext)
                    const match = /_([a-f0-9]{8})\./.exec(fileName);
                    const assetId = match ? match[1] : fileName;

                    const relativePath = path.relative(this.config.storagePath, filePath);
                    const url = `${this.config.baseUrl}/${relativePath.replace(path.sep, '/')}`;

                    const asset: MediaAsset = {
                        id: assetId || fileName,
                        originalName: fileName,
                        fileName,
                        mimeType: this.getMimeType(path.extname(fileName)),
                        size: stats.size,
                        url,
                        provider: this.name,
                        uploadedAt: stats.birthtime,
                        metadata: { format: path.extname(fileName).substring(1) },
                        transformations: []
                    };

                    assets.push(asset);
                } catch (error) {
                    // Skip files that can't be processed
                    console.warn(`⚠️  Could not process file ${filePath}: ${error}`);
                }
            }

            // Sort assets
            if (options.sortBy) {
                assets.sort((a, b) => {
                    let aValue: string | number;
                    let bValue: string | number;

                    if (options.sortBy === 'name') {
                        aValue = a.fileName;
                        bValue = b.fileName;
                    } else if (options.sortBy === 'size') {
                        aValue = a.size;
                        bValue = b.size;
                    } else {
                        aValue = a.uploadedAt.getTime();
                        bValue = b.uploadedAt.getTime();
                    }

                    if (options.sortOrder === 'asc') {
                        return aValue > bValue ? 1 : -1;
                    } else {
                        return aValue < bValue ? 1 : -1;
                    }
                });
            }

            return assets;

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'listAssets',
                provider: this.name,
                options
            });
        }
    }

    /**
     * Extract metadata from file
     */
    private async extractMetadata(filePath: string, buffer: Buffer): Promise<MediaMetadata> {
        const extension = path.extname(filePath).toLowerCase();
        const metadata: MediaMetadata = {
            format: extension.substring(1)
        };

        // Basic image metadata extraction
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) {
            // For a full implementation, you'd use a library like 'sharp' or 'exifr'
            // For now, we'll do basic magic number detection
            if (extension === '.png' && buffer.length >= 24) {
                // PNG dimensions are at bytes 16-23
                metadata.width = buffer.readUInt32BE(16);
                metadata.height = buffer.readUInt32BE(20);
            } else if ((extension === '.jpg' || extension === '.jpeg') && buffer.length >= 4) {
                // JPEG requires more complex parsing - simplified here
                metadata.width = 0; // Would extract from EXIF/segments
                metadata.height = 0;
            }
        }

        return metadata;
    }

    /**
     * Apply basic transformation to buffer
     */
    private static async applyTransformation(buffer: Buffer, transformation: Transformation): Promise<Buffer> {
        // For local provider, transformations are not yet implemented
        // In a real implementation, you'd use libraries like Sharp, ImageMagick, or FFmpeg
        // to handle transformation types: optimize, format, etc.
        // For now, return the original buffer unchanged
        void transformation; // Mark as intentionally unused
        return buffer;
    }

    /**
     * Get MIME type from extension
     */
    private getMimeType(extension: string): string {
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo'
        };

        return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
    }

    /**
     * Get full file path for an asset
     */
    private getAssetPath(asset: MediaAsset): string {
        // Extract folder from URL if present
        const urlPath = new URL(asset.url).pathname;
        const relativePath = urlPath.replace(`/${this.config.baseUrl.split('/').pop()}/`, '');
        return path.join(this.config.storagePath, relativePath);
    }

    /**
     * Find all files recursively in a directory
     */
    private async findFilesRecursive(dir: string): Promise<string[]> {
        const files: string[] = [];

        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    const subFiles = await this.findFilesRecursive(fullPath);
                    files.push(...subFiles);
                } else if (entry.isFile()) {
                    // Only include media files
                    const ext = path.extname(entry.name).toLowerCase();
                    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi'].includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch {
            // Directory might not exist or be accessible - return accumulated files
        }

        return files;
    }

    /**
     * Ensure required directories exist
     */
    private async ensureDirectories(): Promise<void> {
        try {
            await fs.mkdir(this.config.storagePath, { recursive: true });
            await fs.mkdir(this.config.publicPath, { recursive: true });
        } catch (error) {
            console.warn(`⚠️  Could not create directories: ${error}`);
        }
    }
} 