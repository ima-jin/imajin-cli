/**
 * CloudinaryTestData - Test data factory for Cloudinary media objects
 *
 * @package     @imajin/cli
 * @subpackage  test/factories
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-02
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Cloudinary service testing
 * - HTTP mock response data
 * - Integration test fixtures
 */

export class CloudinaryTestData {
    /**
     * Create mock Cloudinary upload response
     */
    static createUploadResponse(overrides?: Partial<CloudinaryUploadResponse>): CloudinaryUploadResponse {
        return {
            public_id: 'test/sample-image',
            version: 1641024000,
            signature: 'test-signature-123',
            width: 1200,
            height: 800,
            format: 'jpg',
            resource_type: 'image',
            created_at: '2025-01-02T00:00:00Z',
            tags: ['test', 'sample'],
            bytes: 245760,
            type: 'upload',
            etag: 'test-etag-123',
            placeholder: false,
            url: 'http://res.cloudinary.com/test-cloud/image/upload/v1641024000/test/sample-image.jpg',
            secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1641024000/test/sample-image.jpg',
            folder: 'test',
            original_filename: 'sample-image',
            original_extension: 'jpg',
            api_key: '123456789012345',
            ...overrides
        };
    }

    /**
     * Create mock Cloudinary video upload response
     */
    static createVideoUploadResponse(overrides?: Partial<CloudinaryVideoUploadResponse>): CloudinaryVideoUploadResponse {
        return {
            public_id: 'test/sample-video',
            version: 1641024000,
            signature: 'test-video-signature-123',
            width: 1920,
            height: 1080,
            format: 'mp4',
            resource_type: 'video',
            created_at: '2025-01-02T00:00:00Z',
            tags: ['test', 'video', 'sample'],
            bytes: 5242880, // 5MB
            type: 'upload',
            etag: 'test-video-etag-123',
            placeholder: false,
            url: 'http://res.cloudinary.com/test-cloud/video/upload/v1641024000/test/sample-video.mp4',
            secure_url: 'https://res.cloudinary.com/test-cloud/video/upload/v1641024000/test/sample-video.mp4',
            folder: 'test',
            original_filename: 'sample-video',
            original_extension: 'mp4',
            api_key: '123456789012345',
            duration: 30.5,
            bit_rate: 1200000,
            frame_rate: 30,
            video: {
                codec: 'h264',
                level: 31,
                profile: 'Main',
                bit_rate: 1200000,
                dar: '16:9',
                pix_format: 'yuv420p'
            },
            audio: {
                codec: 'aac',
                bit_rate: 128000,
                frequency: 44100,
                channels: 2,
                channel_layout: 'stereo'
            },
            ...overrides
        };
    }

    /**
     * Create mock Cloudinary resource response
     */
    static createResource(overrides?: Partial<CloudinaryResource>): CloudinaryResource {
        return {
            public_id: 'test/sample-resource',
            format: 'jpg',
            version: 1641024000,
            resource_type: 'image',
            type: 'upload',
            created_at: '2025-01-02T00:00:00Z',
            bytes: 245760,
            width: 1200,
            height: 800,
            folder: 'test',
            url: 'http://res.cloudinary.com/test-cloud/image/upload/v1641024000/test/sample-resource.jpg',
            secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1641024000/test/sample-resource.jpg',
            status: 'active',
            access_mode: 'public',
            access_control: null,
            etag: 'test-resource-etag-123',
            last_updated: {
                updated_at: '2025-01-02T00:00:00Z'
            },
            uploaded_at: '2025-01-02T00:00:00Z',
            tags: ['test', 'resource'],
            context: {},
            metadata: {},
            ...overrides
        };
    }

    /**
     * Create mock Cloudinary transformation response
     */
    static createTransformationResponse(overrides?: Partial<CloudinaryTransformationResponse>): CloudinaryTransformationResponse {
        return {
            public_id: 'test/transformed-image',
            version: 1641024000,
            signature: 'test-transform-signature-123',
            width: 600,
            height: 400,
            format: 'webp',
            resource_type: 'image',
            created_at: '2025-01-02T00:00:00Z',
            tags: ['test', 'transformed'],
            bytes: 98304, // Smaller after transformation
            type: 'upload',
            etag: 'test-transform-etag-123',
            placeholder: false,
            url: 'http://res.cloudinary.com/test-cloud/image/upload/c_scale,w_600,f_webp/v1641024000/test/sample-image.webp',
            secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/c_scale,w_600,f_webp/v1641024000/test/sample-image.webp',
            api_key: 'test-api-key',
            transformation: [
                {
                    crop: 'scale',
                    width: 600,
                    format: 'webp'
                }
            ],
            ...overrides
        };
    }

    /**
     * Create mock Cloudinary folder response
     */
    static createFolder(overrides?: Partial<CloudinaryFolder>): CloudinaryFolder {
        return {
            name: 'test-folder',
            path: 'test/test-folder',
            external_id: 'test-folder-123',
            ...overrides
        };
    }

    /**
     * Create mock Cloudinary search response
     */
    static createSearchResponse(resources: CloudinaryResource[], hasMore: boolean = false): CloudinarySearchResponse {
        return {
            total_count: resources.length,
            time: 50,
            resources,
            next_cursor: hasMore ? 'next-cursor-token' : ''
        };
    }

    /**
     * Create mock Cloudinary upload preset
     */
    static createUploadPreset(overrides?: Partial<CloudinaryUploadPreset>): CloudinaryUploadPreset {
        return {
            name: 'test-preset',
            unsigned: true,
            settings: {
                folder: 'test',
                use_filename: true,
                unique_filename: false,
                resource_type: 'auto',
                format: 'auto',
                quality: 'auto',
                transformation: [
                    {
                        crop: 'limit',
                        width: 2000,
                        height: 2000
                    }
                ],
                tags: 'test,auto-upload',
                context: {
                    source: 'test-upload'
                }
            },
            ...overrides
        };
    }

    /**
     * Create mock Cloudinary error response
     */
    static createError(message: string = 'Invalid request', code: number = 400): CloudinaryError {
        return {
            error: {
                message,
                http_code: code
            }
        };
    }

    /**
     * Create mock Cloudinary webhook notification
     */
    static createWebhookNotification(overrides?: Partial<CloudinaryWebhookNotification>): CloudinaryWebhookNotification {
        return {
            notification_type: 'upload',
            timestamp: Math.floor(Date.now() / 1000),
            request_id: 'test-request-123',
            asset_id: 'test-asset-123',
            public_id: 'test/webhook-upload',
            version: 1641024000,
            version_id: 'test-version-123',
            width: 1200,
            height: 800,
            format: 'jpg',
            resource_type: 'image',
            created_at: '2025-01-02T00:00:00Z',
            tags: ['webhook', 'test'],
            bytes: 245760,
            type: 'upload',
            etag: 'test-webhook-etag-123',
            url: 'http://res.cloudinary.com/test-cloud/image/upload/v1641024000/test/webhook-upload.jpg',
            secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1641024000/test/webhook-upload.jpg',
            ...overrides
        };
    }

    /**
     * Create mock Cloudinary admin API response
     */
    static createAdminApiResponse<T>(data: T): CloudinaryAdminApiResponse<T> {
        return {
            ...data as any,
            rate_limit_remaining: 4999,
            rate_limit_reset_at: new Date(Date.now() + 3600000).toISOString()
        };
    }

    // Instance methods for performance testing
    createMockUploadResult(overrides?: any): any {
        return CloudinaryTestData.createUploadResponse(overrides);
    }

    createMockDeleteResult(publicId?: string): any {
        return { result: 'ok', public_id: publicId };
    }

    createMockTransformationResult(publicId?: string, options?: any): any {
        return CloudinaryTestData.createTransformationResponse({ 
            public_id: publicId,
            ...options 
        });
    }

    createMockResource(publicId?: string, options?: any): any {
        return CloudinaryTestData.createResource({ 
            public_id: publicId || 'test/sample',
            ...options 
        });
    }

    createMockResourceList(options?: any): any {
        return CloudinaryTestData.createSearchResponse([
            CloudinaryTestData.createResource(),
            CloudinaryTestData.createResource({ public_id: 'test/image2' }),
            CloudinaryTestData.createResource({ public_id: 'test/image3' })
        ]);
    }

    createMockBulkDeleteResult(options?: any): any {
        return {
            batch_id: 'batch-123',
            status: 'completed',
            deleted: ['test/image1', 'test/image2', 'test/image3']
        };
    }

    createMockUrl(publicId?: string, options?: any): string {
        return `https://res.cloudinary.com/test-cloud/image/upload/${publicId || 'test/sample.jpg'}`;
    }

    createMockImageTag(publicId?: string, options?: any): string {
        const url = this.createMockUrl(publicId, options);
        return `<img src="${url}" alt="test image" />`;
    }
}

// Type definitions for Cloudinary objects (simplified for testing)
export interface CloudinaryUploadResponse {
    public_id: string;
    version: number;
    signature: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    created_at: string;
    tags: string[];
    bytes: number;
    type: string;
    etag: string;
    placeholder: boolean;
    url: string;
    secure_url: string;
    folder?: string;
    original_filename?: string;
    original_extension?: string;
    api_key: string;
    duration?: number; // Optional duration for video uploads
}

export interface CloudinaryVideoUploadResponse extends CloudinaryUploadResponse {
    duration: number;
    bit_rate: number;
    frame_rate: number;
    video: {
        codec: string;
        level: number;
        profile: string;
        bit_rate: number;
        dar: string;
        pix_format: string;
    };
    audio: {
        codec: string;
        bit_rate: number;
        frequency: number;
        channels: number;
        channel_layout: string;
    };
}

export interface CloudinaryResource {
    public_id: string;
    format: string;
    version: number;
    resource_type: string;
    type: string;
    created_at: string;
    bytes: number;
    width: number;
    height: number;
    folder?: string;
    url: string;
    secure_url: string;
    status: string;
    access_mode: string;
    access_control: any;
    etag: string;
    last_updated: {
        updated_at: string;
    };
    uploaded_at: string;
    tags: string[];
    context: Record<string, any>;
    metadata: Record<string, any>;
}

export interface CloudinaryTransformationResponse extends CloudinaryUploadResponse {
    transformation: Array<Record<string, any>>;
}

export interface CloudinaryFolder {
    name: string;
    path: string;
    external_id: string;
}

export interface CloudinarySearchResponse {
    total_count: number;
    time: number;
    resources: CloudinaryResource[];
    next_cursor: string;
}

export interface CloudinaryUploadPreset {
    name: string;
    unsigned: boolean;
    settings: {
        folder?: string;
        use_filename?: boolean;
        unique_filename?: boolean;
        resource_type?: string;
        format?: string;
        quality?: string;
        transformation?: Array<Record<string, any>>;
        tags?: string;
        context?: Record<string, any>;
    };
}

export interface CloudinaryError {
    error: {
        message: string;
        http_code: number;
    };
}

export interface CloudinaryWebhookNotification {
    notification_type: string;
    timestamp: number;
    request_id: string;
    asset_id: string;
    public_id: string;
    version: number;
    version_id: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    created_at: string;
    tags: string[];
    bytes: number;
    type: string;
    etag: string;
    url: string;
    secure_url: string;
}

export interface CloudinaryAdminApiResponse<T> extends Record<string, any> {
    rate_limit_remaining: number;
    rate_limit_reset_at: string;
} 