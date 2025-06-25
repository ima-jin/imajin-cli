/**
 * MetadataExtractor - Extract metadata from media files
 * 
 * @package     @imajin/cli
 * @subpackage  media/metadata
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-18
 *
 * Integration Points:
 * - Media file analysis
 * - EXIF data extraction
 * - Format detection
 * - Dimension analysis
 */

import * as path from 'path';

import type { MediaMetadata } from '../../types/Media.js';

export class MetadataExtractor {
    /**
     * Extract metadata from buffer
     */
    public static async extractFromBuffer(buffer: Buffer, fileName: string): Promise<MediaMetadata> {
        const extension = path.extname(fileName).toLowerCase();
        const metadata: MediaMetadata = {
            format: extension.substring(1) || 'unknown'
        };

        // Basic format detection
        if (this.isImageFormat(extension)) {
            return this.extractImageMetadata(buffer, metadata);
        } else if (this.isVideoFormat(extension)) {
            return this.extractVideoMetadata(buffer, metadata);
        }

        return metadata;
    }

    /**
     * Extract image metadata
     */
    private static extractImageMetadata(buffer: Buffer, metadata: MediaMetadata): MediaMetadata {
        const format = metadata.format;

        // PNG metadata
        if (format === 'png' && buffer.length >= 24) {
            const ihdrStart = this.findPNGChunk(buffer, 'IHDR');
            if (ihdrStart !== -1) {
                metadata.width = buffer.readUInt32BE(ihdrStart + 8);
                metadata.height = buffer.readUInt32BE(ihdrStart + 12);
                metadata.bitrate = buffer.readUInt8(ihdrStart + 16);
            }
        }

        // JPEG metadata
        else if ((format === 'jpg' || format === 'jpeg') && buffer.length >= 4) {
            const dimensions = this.extractJPEGDimensions(buffer);
            if (dimensions) {
                metadata.width = dimensions.width;
                metadata.height = dimensions.height;
            }
        }

        // GIF metadata
        else if (format === 'gif' && buffer.length >= 10) {
            // GIF dimensions are at bytes 6-9 (little endian)
            metadata.width = buffer.readUInt16LE(6);
            metadata.height = buffer.readUInt16LE(8);
        }

        // WebP metadata
        else if (format === 'webp' && buffer.length >= 30) {
            const webpData = this.extractWebPData(buffer);
            if (webpData) {
                metadata.width = webpData.width;
                metadata.height = webpData.height;
            }
        }

        return metadata;
    }

    /**
     * Extract video metadata (basic)
     */
    private static extractVideoMetadata(buffer: Buffer, metadata: MediaMetadata): MediaMetadata {
        // For video files, metadata extraction is more complex and typically requires
        // libraries like ffprobe. This is a basic implementation.

        if (metadata.format === 'mp4' && buffer.length >= 32) {
            // Look for ftyp box to confirm MP4 format
            const ftypIndex = buffer.indexOf('ftyp');
            if (ftypIndex !== -1) {
                metadata.codec = 'h264'; // Default assumption
                metadata.hasAudio = true; // Default assumption
            }
        }

        return metadata;
    }

    /**
     * Find PNG chunk by type
     */
    private static findPNGChunk(buffer: Buffer, chunkType: string): number {
        // PNG signature is 8 bytes, then chunks start
        let offset = 8;

        while (offset < buffer.length - 8) {
            const chunkLength = buffer.readUInt32BE(offset);
            const type = buffer.toString('ascii', offset + 4, offset + 8);

            if (type === chunkType) {
                return offset;
            }

            // Move to next chunk (length + type + data + crc)
            offset += 4 + 4 + chunkLength + 4;
        }

        return -1;
    }

    /**
     * Extract JPEG dimensions
     */
    private static extractJPEGDimensions(buffer: Buffer): { width: number; height: number } | null {
        let offset = 2; // Skip initial 0xFFD8

        while (offset < buffer.length - 4) {
            // Look for SOF (Start of Frame) markers
            if (buffer[offset] === 0xFF && offset + 1 < buffer.length) {
                const marker = buffer[offset + 1];

                // SOF0, SOF1, SOF2, SOF3, SOF5, SOF6, SOF7, SOF9, SOF10, SOF11, SOF13, SOF14, SOF15
                if (marker !== undefined &&
                    ((marker >= 0xC0 && marker <= 0xC3) ||
                        (marker >= 0xC5 && marker <= 0xC7) ||
                        (marker >= 0xC9 && marker <= 0xCB) ||
                        (marker >= 0xCD && marker <= 0xCF))) {

                    // SOF structure: FF marker, length (2 bytes), precision (1), height (2), width (2)
                    if (offset + 9 < buffer.length) {
                        const height = buffer.readUInt16BE(offset + 5);
                        const width = buffer.readUInt16BE(offset + 7);
                        return { width, height };
                    }
                }

                // Skip this segment
                const segmentLength = buffer.readUInt16BE(offset + 2);
                offset += 2 + segmentLength;
            } else {
                offset++;
            }
        }

        return null;
    }

    /**
     * Extract WebP data
     */
    private static extractWebPData(buffer: Buffer): { width: number; height: number } | null {
        // Check for RIFF header
        if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
        if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null;

        // Look for VP8 chunk
        const vp8Index = buffer.indexOf('VP8 ');
        if (vp8Index !== -1 && vp8Index + 20 < buffer.length) {
            // VP8 bitstream header contains dimensions
            const width = buffer.readUInt16LE(vp8Index + 16) & 0x3FFF;
            const height = buffer.readUInt16LE(vp8Index + 18) & 0x3FFF;
            return { width, height };
        }

        return null;
    }

    /**
     * Check if format is an image
     */
    private static isImageFormat(extension: string): boolean {
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'].includes(extension);
    }

    /**
     * Check if format is a video
     */
    private static isVideoFormat(extension: string): boolean {
        return ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv'].includes(extension);
    }

    /**
     * Get file type from magic bytes
     */
    public static detectFormat(buffer: Buffer): string {
        if (buffer.length < 4) return 'unknown';

        // JPEG
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpeg';

        // PNG
        if (buffer[0] === 0x89 && buffer[1] === 0x50 &&
            buffer[2] === 0x4E && buffer[3] === 0x47) return 'png';

        // GIF
        if (buffer.toString('ascii', 0, 3) === 'GIF') return 'gif';

        // WebP
        if (buffer.length >= 12) {
            const riff = buffer.toString('ascii', 0, 4);
            const webp = buffer.toString('ascii', 8, 12);
            if (riff === 'RIFF' && webp === 'WEBP') return 'webp';
        }

        // MP4
        if (buffer.length >= 8) {
            const ftyp = buffer.toString('ascii', 4, 8);
            if (ftyp === 'ftyp') return 'mp4';
        }

        // BMP
        if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'bmp';

        return 'unknown';
    }
} 