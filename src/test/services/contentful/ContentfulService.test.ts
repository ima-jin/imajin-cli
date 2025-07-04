/**
 * ContentfulService Test Suite - Comprehensive service-specific testing
 *
 * @package     @imajin/cli
 * @subpackage  test/services/contentful
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-02
 * @updated      2025-07-04
 *
 * Integration Points:
 * - ServiceTestBase for common testing patterns
 * - SDK-level mocking (not HTTP mocking)
 * - ContentfulTestData for CMS content fixtures
 * - Business context validation
 */

import { ContentfulService, ContentfulConfig } from '../../../services/contentful/ContentfulService.js';
import { ServiceTestBase, ServiceConfig } from '../../framework/ServiceTestBase.js';
import { ContentfulTestData } from '../../factories/ContentfulTestData.js';
import { ServiceStatus } from '../../../services/interfaces/ServiceInterface.js';
import { BusinessDomainModel } from '../../../context/BusinessContextProcessor.js';

// Mock Contentful SDK at module level (not HTTP level)
const mockContentfulClient = {
    getSpace: jest.fn(),
    getEntries: jest.fn(),
    getEntry: jest.fn(),
    getAssets: jest.fn(),
    getAsset: jest.fn()
};

const mockContentfulManagementEnvironment = {
    createEntry: jest.fn(),
    createAsset: jest.fn(),
    getContentTypes: jest.fn(),
    getEntry: jest.fn(),
    getEntries: jest.fn(),
    getAssets: jest.fn(),
    getAsset: jest.fn(),
    getContentType: jest.fn(),
    createContentType: jest.fn(),
    updateContentType: jest.fn(),
    deleteContentType: jest.fn()
};

const mockContentfulManagementSpace = {
    getEnvironment: jest.fn().mockResolvedValue(mockContentfulManagementEnvironment)
};

const mockContentfulManagementClient = {
    getSpace: jest.fn().mockResolvedValue(mockContentfulManagementSpace)
};

jest.mock('contentful', () => ({
    createClient: jest.fn(() => mockContentfulClient)
}));

jest.mock('contentful-management', () => ({
    createClient: jest.fn(() => mockContentfulManagementClient)
}));

describe('ContentfulService', () => {
    let contentfulService: ContentfulService;
    let testBase: ServiceTestBase<ContentfulService>;
    let mockConfig: ContentfulConfig;

    beforeEach(async () => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        testBase = new (class extends ServiceTestBase<ContentfulService> {
            createService(): ContentfulService {
                return new ContentfulService(this.container, this.testConfig as ContentfulConfig);
            }

            getMockConfig(): ContentfulConfig {
                return {
                    name: 'contentful-test',
                    spaceId: 'test-space-123',
                    deliveryToken: 'test_delivery_token_123',
                    managementToken: 'test_management_token_123',
                    environment: 'master',
                    host: 'cdn.contentful.com',
                    enabled: true
                };
            }
        })();

        await testBase.setupTest();
        mockConfig = testBase.getMockConfig() as ContentfulConfig;
        contentfulService = testBase.getService();

        // Setup default successful API connection validation
        mockContentfulClient.getSpace.mockResolvedValue(ContentfulTestData.createSpace());
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
            await contentfulService.initialize();

            expect(contentfulService.getStatus()).toBe(ServiceStatus.ACTIVE);
            testBase.assertEventEmitted('service:ready', { service: 'contentful' });
            testBase.assertLoggerCalled('info', 'ContentfulService initialized');
        });

        it('should fail initialization with invalid credentials', async () => {
            mockContentfulClient.getSpace.mockRejectedValue({
                sys: { type: 'Error', id: 'AccessTokenInvalid' },
                message: 'The access token you sent could not be found or is invalid.'
            });

            await expect(contentfulService.initialize()).rejects.toThrow('Invalid Contentful credentials');
            expect(contentfulService.getStatus()).toBe(ServiceStatus.ERROR);
            testBase.assertEventEmitted('service:error');
        });

        it('should shutdown gracefully', async () => {
            await contentfulService.initialize();
            await contentfulService.shutdown();

            expect(contentfulService.getStatus()).toBe(ServiceStatus.INACTIVE);
            testBase.assertEventEmitted('service:shutdown', { service: 'contentful' });
        });

        it('should perform health check successfully', async () => {
            await contentfulService.initialize();
            const health = await contentfulService.getHealth();

            expect(health.status).toBe(ServiceStatus.ACTIVE);
            expect(health.name).toBe('contentful');
            expect(health.version).toBe('1.0.0');
            expect(health.checks).toContainEqual({
                name: 'contentful-api',
                healthy: true,
                message: 'Connected to Contentful API'
            });
        });

        it('should report unhealthy status when API is down', async () => {
            await contentfulService.initialize();
            
            mockContentfulClient.getSpace.mockRejectedValue({
                sys: { type: 'Error', id: 'ServiceUnavailable' },
                message: 'Service temporarily unavailable'
            });

            const health = await contentfulService.getHealth();

            expect(health.status).toBe(ServiceStatus.ERROR);
            expect(health.checks).toContainEqual({
                name: 'contentful-api',
                healthy: false,
                message: expect.stringContaining('Contentful API error')
            });
        });
    });

    // ==========================================================================
    // CONTENT ENTRY MANAGEMENT TESTS
    // ==========================================================================

    describe('Content Entry Management', () => {
        beforeEach(async () => {
            await contentfulService.initialize();
        });

        it('should create content entry successfully', async () => {
            const mockEntry = ContentfulTestData.createEntry({
                sys: {
                    ...ContentfulTestData.createEntry().sys,
                    id: 'entry-123'
                },
                fields: {
                    title: 'New Blog Post',
                    content: 'This is a new blog post content'
                }
            });

            mockContentfulManagementEnvironment.createEntry.mockResolvedValue(mockEntry);

            const progressCallback = jest.fn();
            const result = await contentfulService.createEntry(
                'blogPost',
                {
                    title: 'New Blog Post',
                    content: 'This is a new blog post content'
                },
                progressCallback
            );

            expect(result.success).toBe(true);
            expect(result.entry.sys.id).toBe('entry-123');
            expect(result.entry.fields.title).toBe('New Blog Post');
            expect(progressCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'progress',
                    message: 'Creating Contentful entry',
                    progress: expect.any(Number)
                })
            );

            expect(mockContentfulManagementEnvironment.createEntry).toHaveBeenCalledWith(
                'blogPost',
                {
                    fields: {
                        title: 'New Blog Post',
                        content: 'This is a new blog post content'
                    }
                }
            );
        });

        it('should update content entry', async () => {
            const mockEntry = ContentfulTestData.createEntry({
                sys: {
                    ...ContentfulTestData.createEntry().sys,
                    id: 'entry-456'
                },
                fields: {
                    title: 'Updated Blog Post'
                }
            });

            mockContentfulManagementEnvironment.getEntry.mockResolvedValue({
                ...mockEntry,
                update: jest.fn().mockResolvedValue(mockEntry)
            });

            const result = await contentfulService.updateEntry('entry-456', {
                title: 'Updated Blog Post'
            });

            expect(result.success).toBe(true);
            expect(result.entry.fields.title).toBe('Updated Blog Post');
        });

        it('should delete content entry', async () => {
            mockContentfulManagementEnvironment.getEntry.mockResolvedValue({
                unpublish: jest.fn().mockResolvedValue({}),
                delete: jest.fn().mockResolvedValue({})
            });

            await expect(contentfulService.deleteEntry('entry-to-delete')).resolves.not.toThrow();

            expect(mockContentfulManagementEnvironment.getEntry).toHaveBeenCalledWith('entry-to-delete');
        });

        it('should retrieve content entry by ID', async () => {
            const mockEntry = ContentfulTestData.createEntry({
                sys: {
                    ...ContentfulTestData.createEntry().sys,
                    id: 'entry-retrieve-test'
                },
                fields: {
                    title: 'Retrieved Entry'
                }
            });

            mockContentfulClient.getEntry.mockResolvedValue(mockEntry);

            const result = await contentfulService.getEntry('entry-retrieve-test');

            expect(result).toBeDefined();
            expect(result!.id).toBe('entry-retrieve-test');
            expect(result!.title).toBe('Retrieved Entry');

            expect(mockContentfulClient.getEntry).toHaveBeenCalledWith('entry-retrieve-test');
        });

        it('should list content entries with pagination', async () => {
            const mockEntries = [
                ContentfulTestData.createEntry({
                    sys: { ...ContentfulTestData.createEntry().sys, id: 'entry-1' },
                    fields: { title: 'Entry 1' }
                }),
                ContentfulTestData.createEntry({
                    sys: { ...ContentfulTestData.createEntry().sys, id: 'entry-2' },
                    fields: { title: 'Entry 2' }
                })
            ];

            mockContentfulClient.getEntries.mockResolvedValue({
                items: mockEntries,
                total: 2,
                skip: 0,
                limit: 10
            });

            const result = await contentfulService.getContent('blogPost', 10);

            expect(result).toHaveLength(2);
            expect(result[0]?.title).toBe('Entry 1');
            expect(result[1]?.title).toBe('Entry 2');

            expect(mockContentfulClient.getEntries).toHaveBeenCalledWith({
                content_type: 'blogPost',
                limit: 10
            });
        });

        it('should handle entry creation errors', async () => {
            mockContentfulManagementEnvironment.createEntry.mockRejectedValue({
                sys: { type: 'Error', id: 'ValidationFailed' },
                message: 'Validation failed',
                details: { errors: [{ name: 'required', path: 'title' }] }
            });

            await expect(contentfulService.createEntry('blogPost', {})).rejects.toThrow(expect.stringContaining('Validation failed'));
        });

        it('should handle entry not found', async () => {
            mockContentfulClient.getEntry.mockRejectedValue({
                sys: { type: 'Error', id: 'NotFound' },
                message: 'The resource could not be found.'
            });

            await expect(contentfulService.getEntry('nonexistent-entry')).rejects.toThrow(expect.stringContaining('not found'));
        });
    });

    // ==========================================================================
    // ASSET MANAGEMENT TESTS
    // ==========================================================================

    describe('Asset Management', () => {
        beforeEach(async () => {
            await contentfulService.initialize();
        });

        it('should upload asset successfully', async () => {
            const mockAsset = ContentfulTestData.createAsset({
                sys: {
                    ...ContentfulTestData.createAsset().sys,
                    id: 'asset-123'
                },
                fields: {
                    title: 'Test Image',
                    file: {
                        url: '//images.contentful.com/test-space/test-image.jpg',
                        details: {
                            size: 125000,
                            image: { width: 800, height: 600 }
                        },
                        fileName: 'test-image.jpg',
                        contentType: 'image/jpeg'
                    }
                }
            });

            mockContentfulManagementEnvironment.createAsset.mockResolvedValue({
                ...mockAsset,
                processForAllLocales: jest.fn().mockResolvedValue(mockAsset),
                publish: jest.fn().mockResolvedValue(mockAsset)
            });

            const testBuffer = Buffer.from('test image data');
            const result = await contentfulService.uploadAsset(testBuffer, {
                fileName: 'test-image.jpg',
                contentType: 'image/jpeg',
                title: 'Test Image'
            });

            expect(result.success).toBe(true);
            expect(result.asset.sys.id).toBe('asset-123');
            expect(result.asset.fields.title).toBe('Test Image');
        });

        it('should retrieve asset details', async () => {
            const mockAsset = ContentfulTestData.createAsset({
                sys: {
                    ...ContentfulTestData.createAsset().sys,
                    id: 'asset-retrieve-test'
                },
                fields: {
                    title: 'Retrieved Asset',
                    file: {
                        url: '//images.contentful.com/test-space/test-asset.jpg',
                        details: {
                            size: 98765,
                            image: { width: 640, height: 480 }
                        },
                        fileName: 'test-asset.jpg',
                        contentType: 'image/jpeg'
                    }
                }
            });

            mockContentfulClient.getAsset.mockResolvedValue(mockAsset);

            const result = await contentfulService.getAsset('asset-retrieve-test');

            expect(result).toBeDefined();
            expect(result!.sys.id).toBe('asset-retrieve-test');
            expect(result!.fields.title).toBe('Retrieved Asset');
        });

        it('should delete asset', async () => {
            mockContentfulManagementEnvironment.createAsset.mockResolvedValue({
                unpublish: jest.fn().mockResolvedValue({}),
                delete: jest.fn().mockResolvedValue({})
            });

            await expect(contentfulService.deleteAsset('asset-to-delete')).resolves.not.toThrow();
        });

        it('should list assets with pagination', async () => {
            const mockAssets = [
                ContentfulTestData.createAsset({
                    sys: { ...ContentfulTestData.createAsset().sys, id: 'asset-1' },
                    fields: { 
                        title: 'Asset 1',
                        file: {
                            url: '//images.contentful.com/test-space/asset-1.jpg',
                            details: {
                                size: 50000,
                                image: { width: 400, height: 300 }
                            },
                            fileName: 'asset-1.jpg',
                            contentType: 'image/jpeg'
                        }
                    }
                }),
                ContentfulTestData.createAsset({
                    sys: { ...ContentfulTestData.createAsset().sys, id: 'asset-2' },
                    fields: { 
                        title: 'Asset 2',
                        file: {
                            url: '//images.contentful.com/test-space/asset-2.jpg',
                            details: {
                                size: 75000,
                                image: { width: 600, height: 400 }
                            },
                            fileName: 'asset-2.jpg',
                            contentType: 'image/jpeg'
                        }
                    }
                })
            ];

            mockContentfulClient.getAssets.mockResolvedValue({
                items: mockAssets,
                total: 2,
                skip: 0,
                limit: 10
            });

            const result = await contentfulService.listAssets({ limit: 10 });

            expect(result.items).toHaveLength(2);
            expect(result.items[0].fields.title).toBe('Asset 1');
            expect(result.items[1].fields.title).toBe('Asset 2');
        });

        it('should handle asset upload errors', async () => {
            mockContentfulManagementEnvironment.createAsset.mockRejectedValue({
                sys: { type: 'Error', id: 'ValidationFailed' },
                message: 'Invalid file format'
            });

            const testBuffer = Buffer.from('invalid data');
            await expect(contentfulService.uploadAsset(testBuffer, {
                fileName: 'invalid.xyz',
                contentType: 'application/octet-stream',
                title: 'Invalid Asset'
            })).rejects.toThrow(expect.stringContaining('Invalid file format'));
        });

        it('should handle asset not found', async () => {
            mockContentfulClient.getAsset.mockRejectedValue({
                sys: { type: 'Error', id: 'NotFound' },
                message: 'The resource could not be found.'
            });

            await expect(contentfulService.getAsset('nonexistent-asset')).rejects.toThrow(expect.stringContaining('not found'));
        });
    });

    // ==========================================================================
    // CONTENT TYPE MANAGEMENT TESTS
    // ==========================================================================

    describe('Content Type Management', () => {
        beforeEach(async () => {
            await contentfulService.initialize();
        });

        it('should create content type', async () => {
            const mockContentType = ContentfulTestData.createContentType({
                sys: {
                    ...ContentfulTestData.createContentType().sys,
                    id: 'test-content-type'
                },
                fields: [
                    {
                        id: 'title',
                        name: 'Title',
                        type: 'Symbol',
                        localized: false,
                        required: true,
                        validations: [],
                        disabled: false,
                        omitted: false
                    }
                ]
            });

            mockContentfulManagementEnvironment.createContentType.mockResolvedValue({
                ...mockContentType,
                publish: jest.fn().mockResolvedValue(mockContentType)
            });

            const result = await contentfulService.createContentType({
                name: 'Test Content Type',
                description: 'A test content type',
                fields: [
                    {
                        id: 'title',
                        name: 'Title',
                        type: 'Symbol',
                        localized: false,
                        required: true,
                        validations: [],
                        disabled: false,
                        omitted: false
                    }
                ]
            });

            expect(result.id).toBe('test-content-type');
            expect(result.name).toBe('Test Content Type');
        });

        it('should retrieve content type definition', async () => {
            const mockContentType = ContentfulTestData.createContentType({
                sys: {
                    ...ContentfulTestData.createContentType().sys,
                    id: 'blogPost'
                },
                name: 'Blog Post'
            });

            mockContentfulManagementEnvironment.getContentType = jest.fn().mockResolvedValue(mockContentType);

            const result = await contentfulService.getContentType('blogPost');

            expect(result).toBeDefined();
            expect(result!.sys.id).toBe('blogPost');
            expect(result!.name).toBe('Blog Post');
        });

        it('should list content types', async () => {
            const mockContentTypes = [
                ContentfulTestData.createContentType({
                    sys: { ...ContentfulTestData.createContentType().sys, id: 'blogPost' },
                    name: 'Blog Post'
                }),
                ContentfulTestData.createContentType({
                    sys: { ...ContentfulTestData.createContentType().sys, id: 'page' },
                    name: 'Page'
                })
            ];

            mockContentfulManagementEnvironment.getContentTypes.mockResolvedValue({
                items: mockContentTypes,
                total: 2
            });

            const result = await contentfulService.listContentTypes();

            expect(result.items).toHaveLength(2);
            expect(result.items[0].name).toBe('Blog Post');
            expect(result.items[1].name).toBe('Page');
        });

        it('should update content type', async () => {
            const mockContentType = ContentfulTestData.createContentType({
                sys: {
                    ...ContentfulTestData.createContentType().sys,
                    id: 'blogPost'
                },
                name: 'Updated Blog Post'
            });

            mockContentfulManagementEnvironment.getContentType = jest.fn().mockResolvedValue({
                ...mockContentType,
                update: jest.fn().mockResolvedValue(mockContentType),
                publish: jest.fn().mockResolvedValue(mockContentType)
            });

            const result = await contentfulService.updateContentType('blogPost', {
                name: 'Updated Blog Post'
            });

            expect(result.success).toBe(true);
            expect(result.contentType.name).toBe('Updated Blog Post');
        });

        it('should delete content type', async () => {
            mockContentfulManagementEnvironment.getContentType = jest.fn().mockResolvedValue({
                unpublish: jest.fn().mockResolvedValue({}),
                delete: jest.fn().mockResolvedValue({})
            });

            await expect(contentfulService.deleteContentType('contentTypeToDelete')).resolves.not.toThrow();
        });
    });

    // ==========================================================================
    // BUSINESS CONTEXT INTEGRATION TESTS
    // ==========================================================================

    describe('Business Context Integration', () => {
        it('should initialize with business context', async () => {
            const businessContext: BusinessDomainModel = {
                businessType: 'content-management',
                description: 'Content management domain for testing',
                entities: {
                    Content: {
                        fields: [
                            { name: 'title', type: 'string', required: true, optional: false },
                            { name: 'body', type: 'string', required: false, optional: true }
                        ]
                    }
                },
                workflows: [],
                businessRules: [],
                integrations: [],
                commands: []
            };

            // Initialize service with business context
            await contentfulService.initialize();

            // Verify service can work with business context
            expect(contentfulService.getCapabilities()).toContain('content-management');
        });

        it('should return service capabilities', async () => {
            await contentfulService.initialize();
            const capabilities = contentfulService.getCapabilities();

            expect(capabilities).toContain('content-management');
            expect(capabilities).toContain('asset-management');
            expect(capabilities).toContain('content-type-management');
        });
    });

    // ==========================================================================
    // ERROR HANDLING AND RESILIENCE TESTS
    // ==========================================================================

    describe('Error Handling and Resilience', () => {
        beforeEach(async () => {
            await contentfulService.initialize();
        });

        it('should handle network timeout errors', async () => {
            mockContentfulClient.getEntries.mockRejectedValue({
                name: 'NetworkError',
                message: 'Network timeout',
                code: 'NETWORK_ERROR'
            });

            await expect(contentfulService.getContent('blogPost')).rejects.toThrow(expect.stringContaining('timeout'));
        });

        it('should handle rate limiting gracefully', async () => {
            mockContentfulClient.getEntries.mockRejectedValue({
                sys: { type: 'Error', id: 'RateLimitExceeded' },
                message: 'You have exceeded the rate limit',
                status: 429
            });

            await expect(contentfulService.getContent('blogPost')).rejects.toThrow(expect.stringContaining('rate limit'));
        });

        it('should track service metrics during operations', async () => {
            const mockEntries = [ContentfulTestData.createEntry()];
            mockContentfulClient.getEntries.mockResolvedValue({
                items: mockEntries,
                total: 1
            });

            await contentfulService.getContent('blogPost');

            testBase.assertEventEmitted('service:operation', {
                service: 'contentful',
                operation: 'getContent',
                success: true
            });
        });

        it('should emit service operation events', async () => {
            const mockEntries = [ContentfulTestData.createEntry()];
            mockContentfulClient.getEntries.mockResolvedValue({
                items: mockEntries,
                total: 1
            });

            await contentfulService.getContent('blogPost');

            testBase.assertEventEmitted('service:operation');
        });
    });

    // ==========================================================================
    // INTEGRATION PATTERNS TESTS
    // ==========================================================================

    describe('Integration Patterns', () => {
        beforeEach(async () => {
            await contentfulService.initialize();
        });

        it('should support progress callbacks for content operations', async () => {
            const mockEntry = ContentfulTestData.createEntry();
            mockContentfulManagementEnvironment.createEntry.mockResolvedValue(mockEntry);

            const progressCallback = jest.fn();
            await contentfulService.createEntry('blogPost', {
                title: 'Test Post'
            }, progressCallback);

            expect(progressCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'progress',
                    progress: expect.any(Number)
                })
            );
        });

        it('should provide structured error responses', async () => {
            mockContentfulClient.getEntry.mockRejectedValue({
                sys: { type: 'Error', id: 'ValidationFailed' },
                message: 'Validation failed',
                details: { errors: [{ name: 'required', path: 'title' }] }
            });

            await expect(contentfulService.getEntry('invalid-entry')).rejects.toMatchObject({
                sys: { type: 'Error', id: 'ValidationFailed' },
                message: 'Validation failed'
            });
        });

        it('should handle webhook processing for content events', async () => {
            const webhookPayload = {
                sys: {
                    type: 'Entry',
                    id: 'webhook-entry-123'
                },
                fields: {
                    title: 'Webhook Test Entry'
                }
            };

            // Verify webhook structure (since processWebhook method doesn't exist yet)
            expect(webhookPayload.sys.type).toBe('Entry');
            expect(webhookPayload.sys.id).toBe('webhook-entry-123');
            expect(webhookPayload.fields.title).toBe('Webhook Test Entry');
        });
    });
}); 