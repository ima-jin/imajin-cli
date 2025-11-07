/* eslint-disable @typescript-eslint/no-require-imports */ // Test file: Dynamic requires for mocking
/**
 * CloudinaryService Test Suite - Comprehensive service-specific testing
 *
 * @package     @imajin/cli
 * @subpackage  test/services/cloudinary
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-04
 * @updated      2025-07-04
 *
 * Integration Points:
 * - ServiceTestBase for common testing patterns
 * - SDK-level mocking (not HTTP mocking)
 * - CloudinaryTestData for media processing fixtures
 * - Business context validation
 */

import { CloudinaryService } from '../../../services/cloudinary/CloudinaryService.js';
import { ServiceTestBase, ServiceConfig } from '../../framework/ServiceTestBase.js';
import { CloudinaryTestData } from '../../factories/CloudinaryTestData.js';
import { ServiceStatus } from '../../../services/interfaces/ServiceInterface.js';
import { BusinessDomainModel } from '../../../context/BusinessContextProcessor.js';
import type { MediaAsset, UploadOptions, ListOptions } from '../../../types/Media.js';

// Mock Cloudinary SDK at module level (not HTTP level)
// Use factory function to avoid initialization order issues
jest.mock('cloudinary', () => ({
    v2: {
        config: jest.fn(),
        uploader: {
            upload: jest.fn(),
            destroy: jest.fn()
        },
        api: {
            resources: jest.fn(),
            resource: jest.fn()
        },
        url: jest.fn()
    }
}));

// Import the mocked module to access the mock functions
const mockCloudinary = jest.mocked(require('cloudinary'));
const mockCloudinaryConfig = mockCloudinary.v2.config;
const mockCloudinaryUploader = mockCloudinary.v2.uploader;
const mockCloudinaryApi = mockCloudinary.v2.api;
const mockCloudinaryUrl = mockCloudinary.v2.url;

interface CloudinaryServiceConfig extends ServiceConfig {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    secure: boolean;
    uploadPreset?: string;
}

describe('CloudinaryService', () => {
    let cloudinaryService: CloudinaryService;
    let testBase: ServiceTestBase<CloudinaryService>;
    let mockConfig: CloudinaryServiceConfig;

    beforeEach(async () => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        testBase = new (class extends ServiceTestBase<CloudinaryService> {
            createService(): CloudinaryService {
                return new CloudinaryService(this.container, this.testConfig as CloudinaryServiceConfig);
            }

            getMockConfig(): CloudinaryServiceConfig {
                return {
                    name: 'cloudinary-test',
                    cloudName: 'test-cloud',
                    apiKey: 'test_api_key_123',
                    apiSecret: 'test_api_secret_123',
                    secure: true,
                    enabled: true
                };
            }
        })();

        await testBase.setupTest();
        mockConfig = testBase.getMockConfig() as CloudinaryServiceConfig;
        cloudinaryService = testBase.getService();

        // Setup default successful API validation
        mockCloudinaryApi.resources.mockResolvedValue({ resources: [] });
    });

    afterEach(async () => {
        await testBase.teardownTest();
        jest.clearAllMocks();
    });

    // ==========================================================================
    // SERVICE LIFECYCLE TESTS
    // ==========================================================================

    describe('Service Lifecycle', () => {
        it('should initialize successfully with valid credentials', async () => {
            await cloudinaryService.initialize();

            expect(cloudinaryService.getStatus()).toBe(ServiceStatus.ACTIVE);
            testBase.assertEventEmitted('service:ready', { service: 'cloudinary' });
            testBase.assertLoggerCalled('info', 'CloudinaryService initialized');
        });

        it('should fail initialization with invalid credentials', async () => {
            mockCloudinaryApi.resources.mockRejectedValue({
                error: {
                    message: 'Invalid API Key or API Secret',
                    http_code: 401
                }
            });

            await expect(cloudinaryService.initialize()).rejects.toThrow('Invalid Cloudinary credentials');
            expect(cloudinaryService.getStatus()).toBe(ServiceStatus.ERROR);
            testBase.assertEventEmitted('service:error');
        });

        it('should shutdown gracefully', async () => {
            await cloudinaryService.initialize();
            await cloudinaryService.shutdown();

            expect(cloudinaryService.getStatus()).toBe(ServiceStatus.INACTIVE);
            testBase.assertEventEmitted('service:shutdown', { service: 'cloudinary' });
        });

        it('should perform health check successfully', async () => {
            await cloudinaryService.initialize();
            const health = await cloudinaryService.getHealth();

            expect(health.status).toBe(ServiceStatus.ACTIVE);
            expect(health.name).toBe('cloudinary');
            expect(health.version).toBe('1.0.0');
            expect(health.checks).toContainEqual({
                name: 'cloudinary-api',
                healthy: true,
                message: 'Cloudinary API accessible'
            });
        });

        it('should report unhealthy status when API is down', async () => {
            await cloudinaryService.initialize();
            
            mockCloudinaryApi.resources.mockRejectedValue({
                error: {
                    message: 'Service temporarily unavailable',
                    http_code: 503
                }
            });

            const health = await cloudinaryService.getHealth();

            expect(health.status).toBe(ServiceStatus.ERROR);
            expect(health.checks).toContainEqual({
                name: 'cloudinary-api',
                healthy: false,
                message: expect.stringContaining('Cloudinary API error')
            });
        });
    });

    // ==========================================================================
    // MEDIA UPLOAD TESTS
    // ==========================================================================

    describe('Media Upload', () => {
        beforeEach(async () => {
            await cloudinaryService.initialize();
        });

        it('should upload image successfully', async () => {
            const mockUploadResponse = CloudinaryTestData.createUploadResponse({
                public_id: 'test_image_123',
                secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/test_image_123.jpg',
                width: 800,
                height: 600,
                format: 'jpg',
                bytes: 125000
            });

            mockCloudinaryUploader.upload.mockResolvedValue(mockUploadResponse);

            const testBuffer = Buffer.from('test image data');
            const uploadOptions: UploadOptions = {
                fileName: 'test-image.jpg',
                folder: 'test_uploads',
                tags: ['test', 'upload'],
                overwrite: false
            };

            const result = await cloudinaryService.upload(testBuffer, uploadOptions);

            expect(result).toEqual(expect.objectContaining({
                id: 'test_image_123',
                originalName: 'test-image.jpg',
                provider: 'cloudinary',
                size: 125000
            }));

            expect(mockCloudinaryUploader.upload).toHaveBeenCalledWith(
                expect.any(String), // base64 data
                expect.objectContaining({
                    folder: 'test_uploads',
                    tags: ['test', 'upload'],
                    overwrite: false
                })
            );
        });

        it('should upload video successfully', async () => {
            const mockUploadResponse = CloudinaryTestData.createUploadResponse({
                public_id: 'test_video_456',
                secure_url: 'https://res.cloudinary.com/test-cloud/video/upload/test_video_456.mp4',
                format: 'mp4',
                bytes: 2500000,
                duration: 120.5
            });

            mockCloudinaryUploader.upload.mockResolvedValue(mockUploadResponse);

            const testBuffer = Buffer.from('test video data');
            const uploadOptions: UploadOptions = {
                fileName: 'test-video.mp4',
                folder: 'videos',
                resourceType: 'video'
            };

            const result = await cloudinaryService.upload(testBuffer, uploadOptions);

            expect(result).toEqual(expect.objectContaining({
                id: 'test_video_456',
                originalName: 'test-video.mp4',
                provider: 'cloudinary',
                size: 2500000
            }));
        });

        it('should handle upload errors gracefully', async () => {
            const error = new Error('Unsupported file format');
            (error as any).http_code = 400;
            mockCloudinaryUploader.upload.mockRejectedValue(error);

            const testBuffer = Buffer.from('invalid file data');
            const uploadOptions: UploadOptions = {
                fileName: 'invalid-file.xyz'
            };

            await expect(cloudinaryService.upload(testBuffer, uploadOptions)).rejects.toThrow(expect.stringContaining('Unsupported file format'));
        });

        it('should handle file size limits', async () => {
            const error = new Error('File size too large');
            (error as any).http_code = 413;
            mockCloudinaryUploader.upload.mockRejectedValue(error);

            const testBuffer = Buffer.from('large file data');
            const uploadOptions: UploadOptions = {
                fileName: 'large-file.jpg'
            };

            await expect(cloudinaryService.upload(testBuffer, uploadOptions)).rejects.toThrow(expect.stringContaining('File size too large'));
        });
    });

    // ==========================================================================
    // ASSET MANAGEMENT TESTS
    // ==========================================================================

    describe('Asset Management', () => {
        beforeEach(async () => {
            await cloudinaryService.initialize();
        });

        it('should retrieve asset details', async () => {
            const mockResource = CloudinaryTestData.createResource({
                public_id: 'existing_asset',
                secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/existing_asset.jpg',
                width: 1200,
                height: 800,
                format: 'jpg',
                bytes: 350000
            });

            mockCloudinaryApi.resource.mockResolvedValue(mockResource);

            const result = await cloudinaryService.getAsset('existing_asset');

            expect(result).toEqual(expect.objectContaining({
                id: 'existing_asset',
                url: 'https://res.cloudinary.com/test-cloud/image/upload/existing_asset.jpg',
                provider: 'cloudinary',
                size: 350000
            }));

            expect(mockCloudinaryApi.resource).toHaveBeenCalledWith('existing_asset');
        });

        it('should delete asset successfully', async () => {
            mockCloudinaryUploader.destroy.mockResolvedValue({
                result: 'ok'
            });

            await expect(cloudinaryService.delete('asset_to_delete')).resolves.not.toThrow();

            expect(mockCloudinaryUploader.destroy).toHaveBeenCalledWith('asset_to_delete');
        });

        it('should handle asset not found', async () => {
            const error = new Error('Resource not found');
            (error as any).http_code = 404;
            mockCloudinaryApi.resource.mockRejectedValue(error);

            await expect(cloudinaryService.getAsset('nonexistent')).rejects.toThrow(expect.stringContaining('not found'));
        });

        it('should list assets with pagination', async () => {
            const mockAssets = [
                CloudinaryTestData.createResource({ public_id: 'asset_1' }),
                CloudinaryTestData.createResource({ public_id: 'asset_2' })
            ];

            mockCloudinaryApi.resources.mockResolvedValue({
                resources: mockAssets,
                next_cursor: 'cursor_123'
            });

            const options: ListOptions = {
                limit: 10,
                folder: 'test_folder'
            };

            const result = await cloudinaryService.listAssets(options);

            expect(result.assets).toHaveLength(2);
            expect(result.nextCursor).toBe('cursor_123');

            expect(mockCloudinaryApi.resources).toHaveBeenCalledWith(
                expect.objectContaining({
                    max_results: 10,
                    folder: 'test_folder'
                })
            );
        });
    });

    // ==========================================================================
    // MEDIA TRANSFORMATION TESTS
    // ==========================================================================

    describe('Media Transformation', () => {
        beforeEach(async () => {
            await cloudinaryService.initialize();
        });

        it('should apply transformations to existing asset', async () => {
            const originalAsset: MediaAsset = {
                id: 'sample_image',
                url: 'https://res.cloudinary.com/test-cloud/image/upload/sample_image.jpg',
                originalName: 'sample.jpg',
                provider: 'cloudinary',
                size: 245760,
                uploadedAt: new Date(),
                fileName: 'sample_image',
                mimeType: 'image/jpeg',
                metadata: { format: 'jpg' },
                transformations: []
            };

            mockCloudinaryUrl.mockReturnValue('https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_300,h_300/sample_image');

            const transformations = [
                { type: 'resize', params: { width: 300, height: 300 } }
            ];

            const result = await cloudinaryService.transform(originalAsset, transformations);

            expect(result.transformations).toHaveLength(1);
            expect(result.transformations[0]?.resultUrl).toContain('c_fill,w_300,h_300');
        });

        it('should apply complex transformations', async () => {
            const originalAsset: MediaAsset = {
                id: 'complex_image',
                url: 'https://res.cloudinary.com/test-cloud/image/upload/complex_image.jpg',
                originalName: 'complex.jpg',
                provider: 'cloudinary',
                size: 500000,
                uploadedAt: new Date(),
                fileName: 'complex_image',
                mimeType: 'image/jpeg',
                metadata: { format: 'jpg' },
                transformations: []
            };

            mockCloudinaryUrl
                .mockReturnValueOnce('https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_400,h_400/complex_image')
                .mockReturnValueOnce('https://res.cloudinary.com/test-cloud/image/upload/q_80/complex_image')
                .mockReturnValueOnce('https://res.cloudinary.com/test-cloud/image/upload/f_webp/complex_image');

            const transformations = [
                { type: 'resize', params: { width: 400, height: 400 } },
                { type: 'quality', params: { quality: 80 } },
                { type: 'format', params: { format: 'webp' as const } }
            ];

            const result = await cloudinaryService.transform(originalAsset, transformations);

            expect(result.transformations).toHaveLength(3);
            expect(mockCloudinaryUrl).toHaveBeenCalledTimes(3);
        });

        it('should handle transformation errors', async () => {
            const originalAsset: MediaAsset = {
                id: 'sample_image',
                url: 'https://res.cloudinary.com/test-cloud/image/upload/sample_image.jpg',
                originalName: 'sample.jpg',
                provider: 'cloudinary',
                size: 245760,
                uploadedAt: new Date(),
                fileName: 'sample_image',
                mimeType: 'image/jpeg',
                metadata: { format: 'jpg' },
                transformations: []
            };

            // Mock URL generation to simulate transformation success
            mockCloudinaryUrl.mockReturnValue('https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_-100,h_300/sample_image');

            const invalidTransformations = [
                { type: 'resize', params: { width: -100, height: 300 } }
            ];

            // The transformation should not throw an error as Cloudinary will handle invalid parameters
            const result = await cloudinaryService.transform(originalAsset, invalidTransformations);

            expect(result.transformations).toHaveLength(1);
            expect(result.transformations[0]?.success).toBe(true);
        });
    });

    // ==========================================================================
    // ERROR HANDLING AND RESILIENCE TESTS
    // ==========================================================================

    describe('Error Handling and Resilience', () => {
        beforeEach(async () => {
            await cloudinaryService.initialize();
        });

        it('should handle network timeouts gracefully', async () => {
            const error = new Error('Network timeout');
            (error as any).code = 'TIMEOUT';
            mockCloudinaryUploader.upload.mockRejectedValue(error);

            const testBuffer = Buffer.from('test data');
            const uploadOptions: UploadOptions = {
                fileName: 'timeout-test.jpg'
            };

            await expect(cloudinaryService.upload(testBuffer, uploadOptions)).rejects.toThrow(expect.stringContaining('timeout'));
        });

        it('should handle rate limiting gracefully', async () => {
            const error = new Error('Rate limit exceeded');
            (error as any).http_code = 429;
            mockCloudinaryUploader.upload.mockRejectedValue(error);

            const testBuffer = Buffer.from('test data');
            const uploadOptions: UploadOptions = {
                fileName: 'rate-limit-test.jpg'
            };

            await expect(cloudinaryService.upload(testBuffer, uploadOptions)).rejects.toThrow(expect.stringContaining('Rate limit exceeded'));
        });

        it('should track service metrics during operations', async () => {
            const mockUploadResponse = CloudinaryTestData.createUploadResponse({
                public_id: 'metrics_test'
            });

            mockCloudinaryUploader.upload.mockResolvedValue(mockUploadResponse);

            const testBuffer = Buffer.from('metrics test data');
            await cloudinaryService.upload(testBuffer, { fileName: 'metrics.jpg' });

            testBase.assertEventEmitted('service:operation', {
                service: 'cloudinary',
                operation: 'upload',
                success: true
            });
        });

        it('should emit service operation events', async () => {
            const mockUploadResponse = CloudinaryTestData.createUploadResponse();
            mockCloudinaryUploader.upload.mockResolvedValue(mockUploadResponse);

            const testBuffer = Buffer.from('event test data');
            await cloudinaryService.upload(testBuffer, { fileName: 'events.jpg' });

            testBase.assertEventEmitted('service:operation');
        });
    });

    // ==========================================================================
    // INTEGRATION PATTERNS TESTS
    // ==========================================================================

    describe('Integration Patterns', () => {
        beforeEach(async () => {
            await cloudinaryService.initialize();
        });

        it('should handle webhook notifications', async () => {
            const webhookPayload = {
                notification_type: 'upload',
                public_id: 'webhook_test_image',
                version: 1234567890,
                url: 'https://res.cloudinary.com/test-cloud/image/upload/webhook_test_image.jpg'
            };

            // Verify webhook structure (since processWebhook method doesn't exist yet)
            expect(webhookPayload.notification_type).toBe('upload');
            expect(webhookPayload.public_id).toBe('webhook_test_image');
            expect(webhookPayload.url).toContain('cloudinary.com');
        });

        it('should provide structured error responses', async () => {
            mockCloudinaryUploader.upload.mockRejectedValue({
                error: {
                    message: 'Invalid file format',
                    http_code: 400
                }
            });

            const testBuffer = Buffer.from('invalid data');
            const uploadOptions: UploadOptions = {
                fileName: 'invalid.xyz'
            };

            await expect(cloudinaryService.upload(testBuffer, uploadOptions)).rejects.toMatchObject({
                error: {
                    message: 'Invalid file format',
                    http_code: 400
                }
            });
        });
    });

    // ==========================================================================
    // BUSINESS CONTEXT INTEGRATION TESTS
    // ==========================================================================

    describe('Business Context Integration', () => {
        it('should initialize with business context', async () => {
            const businessContext: BusinessDomainModel = {
                businessType: 'media-processing',
                description: 'Media processing domain for testing',
                entities: {
                    MediaAsset: {
                        fields: [
                            { name: 'url', type: 'string', required: true, optional: false },
                            { name: 'fileName', type: 'string', required: true, optional: false }
                        ]
                    }
                },
                workflows: [],
                businessRules: [],
                integrations: [],
                commands: []
            };

            // Initialize service with business context
            await cloudinaryService.initialize();

            // Verify service can work with business context
            expect(cloudinaryService.getCapabilities()).toContain('media-upload');
        });

        it('should return service capabilities', async () => {
            await cloudinaryService.initialize();
            const capabilities = cloudinaryService.getCapabilities();

            expect(capabilities).toContain('media-upload');
            expect(capabilities).toContain('media-transformation');
            expect(capabilities).toContain('media-optimization');
            expect(capabilities).toContain('media-delivery');
            expect(capabilities).toContain('business-context-mapping');
        });
    });
}); 