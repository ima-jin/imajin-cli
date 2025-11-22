/**
 * BaseExtractor Tests
 *
 * Comprehensive test suite for HTTP-based data extraction with pagination,
 * rate limiting, authentication, and error handling.
 *
 * @package     @imajin/cli
 * @subpackage  etl/extractors/__tests__
 */

import { EventEmitter } from 'node:events';
import { z } from 'zod';
import { BaseExtractor, BaseExtractorConfig } from '../BaseExtractor.js';
import type { ETLContext, ETLResult } from '../../core/interfaces.js';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * Test data schema
 */
const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email()
});

type User = z.infer<typeof UserSchema>;

/**
 * Concrete test extractor implementation
 */
class TestExtractor extends BaseExtractor<User> {
    public readonly name = 'test-extractor';
    public readonly description = 'Test extractor for unit tests';
    public readonly outputSchema = UserSchema;

    protected async performExtraction(
        context: ETLContext,
        config: BaseExtractorConfig
    ): Promise<User[]> {
        if (!config.baseUrl) {
            return [];
        }

        if (config.pagination) {
            return this.extractWithPagination<User>(
                '/users',
                {},
                context,
                config
            );
        }

        return this.makeRequest<User[]>('/users', {}, context);
    }
}

/**
 * Create test ETL context
 */
function createTestContext(): ETLContext {
    return {
        id: 'test-context',
        pipelineId: 'test-pipeline',
        events: new EventEmitter(),
        metadata: {},
        startTime: new Date()
    };
}

describe('BaseExtractor', () => {
    let extractor: TestExtractor;
    let context: ETLContext;
    let mockHttpClient: any;

    beforeEach(() => {
        context = createTestContext();

        // Setup mock HTTP client
        mockHttpClient = {
            request: jest.fn(),
            interceptors: {
                request: { use: jest.fn() },
                response: { use: jest.fn() }
            }
        };

        mockedAxios.create = jest.fn().mockReturnValue(mockHttpClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // =====================================================================
    // Constructor & Initialization
    // =====================================================================
    describe('Constructor & Initialization', () => {
        it('should initialize with default configuration', () => {
            extractor = new TestExtractor();

            expect(extractor.name).toBe('test-extractor');
            expect(extractor.description).toBe('Test extractor for unit tests');
            expect(extractor.outputSchema).toBeDefined();
        });

        it('should initialize with baseUrl', () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com'
            });

            expect(mockedAxios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: 'https://api.example.com'
                })
            );
        });

        it('should initialize with custom headers', () => {
            extractor = new TestExtractor({
                headers: {
                    'X-Custom-Header': 'test-value',
                    'Accept': 'application/json'
                }
            });

            expect(mockedAxios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    headers: {
                        'X-Custom-Header': 'test-value',
                        'Accept': 'application/json'
                    }
                })
            );
        });

        it('should initialize with timeout', () => {
            extractor = new TestExtractor({
                timeout: 5000
            });

            expect(mockedAxios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeout: 5000
                })
            );
        });

        it('should use default timeout if not specified', () => {
            extractor = new TestExtractor({});

            expect(mockedAxios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeout: 30000
                })
            );
        });
    });

    // =====================================================================
    // Data Extraction
    // =====================================================================
    describe('Data Extraction', () => {
        beforeEach(() => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com'
            });
        });

        it('should extract data successfully', async () => {
            const mockData: User[] = [
                { id: 1, name: 'Alice', email: 'alice@example.com' },
                { id: 2, name: 'Bob', email: 'bob@example.com' }
            ];

            mockHttpClient.request.mockResolvedValue({ data: mockData });

            const result = await extractor.extract(context);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockData);
            expect(result.processed).toBe(2);
        });

        it('should include metadata in result', async () => {
            mockHttpClient.request.mockResolvedValue({ data: [] });

            const result = await extractor.extract(context);

            expect(result.metadata).toMatchObject({
                extractor: 'test-extractor'
            });
        });

        it('should track duration', async () => {
            mockHttpClient.request.mockResolvedValue({ data: [] });

            const result = await extractor.extract(context);

            expect(result.duration).toBeGreaterThanOrEqual(0);
        });

        it('should emit step:start event', async () => {
            const startSpy = jest.fn();
            context.events.on('step:start', startSpy);

            mockHttpClient.request.mockResolvedValue({ data: [] });

            await extractor.extract(context);

            expect(startSpy).toHaveBeenCalledWith('test-extractor', context);
        });

        it('should emit step:complete event', async () => {
            const completeSpy = jest.fn();
            context.events.on('step:complete', completeSpy);

            mockHttpClient.request.mockResolvedValue({ data: [] });

            await extractor.extract(context);

            expect(completeSpy).toHaveBeenCalledWith(
                'test-extractor',
                expect.objectContaining({ success: true }),
                context
            );
        });

        it('should emit data:extracted event with count', async () => {
            const extractedSpy = jest.fn();
            context.events.on('data:extracted', extractedSpy);

            mockHttpClient.request.mockResolvedValue({
                data: [{ id: 1, name: 'Test', email: 'test@example.com' }]
            });

            await extractor.extract(context);

            expect(extractedSpy).toHaveBeenCalledWith(1, context);
        });

        it('should handle extraction errors gracefully', async () => {
            mockHttpClient.request.mockRejectedValue(new Error('Network error'));

            const result = await extractor.extract(context);

            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toBe('Network error');
            expect(result.processed).toBe(0);
        });

        it('should emit step:error event on failure', async () => {
            const errorSpy = jest.fn();
            context.events.on('step:error', errorSpy);

            mockHttpClient.request.mockRejectedValue(new Error('Test error'));

            await extractor.extract(context);

            expect(errorSpy).toHaveBeenCalledWith(
                'test-extractor',
                expect.any(Error),
                context
            );
        });

        it('should handle null response as error', async () => {
            mockHttpClient.request.mockResolvedValue({ data: null });

            const result = await extractor.extract(context);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    // =====================================================================
    // Authentication
    // =====================================================================
    describe('Authentication', () => {
        it('should add bearer token authentication', () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                auth: {
                    type: 'bearer',
                    token: 'test-token-123'
                }
            });

            const interceptor = (mockedAxios.create as jest.Mock).mock.results[0]!.value
                .interceptors.request.use.mock.calls[0][0];

            const config: any = { headers: {} };
            const result = interceptor(config);

            expect(result.headers.Authorization).toBe('Bearer test-token-123');
        });

        it('should add basic authentication', () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                auth: {
                    type: 'basic',
                    username: 'user',
                    password: 'pass'
                }
            });

            const interceptor = (mockedAxios.create as jest.Mock).mock.results[0]!.value
                .interceptors.request.use.mock.calls[0][0];

            const config: any = { headers: {} };
            const result = interceptor(config);

            const expectedEncoded = Buffer.from('user:pass').toString('base64');
            expect(result.headers.Authorization).toBe(`Basic ${expectedEncoded}`);
        });

        it('should add API key authentication', () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                auth: {
                    type: 'api-key',
                    apiKey: 'my-api-key',
                    headerName: 'X-API-Key'
                }
            });

            const interceptor = (mockedAxios.create as jest.Mock).mock.results[0]!.value
                .interceptors.request.use.mock.calls[0][0];

            const config: any = { headers: {} };
            const result = interceptor(config);

            expect(result.headers['X-API-Key']).toBe('my-api-key');
        });

        it('should validate bearer token auth', async () => {
            extractor = new TestExtractor({
                auth: {
                    type: 'bearer',
                    token: 'valid-token'
                }
            });

            const isValid = await extractor.validate();

            expect(isValid).toBe(true);
        });

        it('should invalidate missing bearer token', async () => {
            extractor = new TestExtractor({
                auth: {
                    type: 'bearer'
                }
            });

            const isValid = await extractor.validate();

            expect(isValid).toBe(false);
        });

        it('should validate basic auth credentials', async () => {
            extractor = new TestExtractor({
                auth: {
                    type: 'basic',
                    username: 'user',
                    password: 'pass'
                }
            });

            const isValid = await extractor.validate();

            expect(isValid).toBe(true);
        });

        it('should invalidate missing API key', async () => {
            extractor = new TestExtractor({
                auth: {
                    type: 'api-key',
                    apiKey: 'key'
                    // Missing headerName
                }
            });

            const isValid = await extractor.validate();

            expect(isValid).toBe(false);
        });
    });

    // =====================================================================
    // Pagination
    // =====================================================================
    describe('Pagination', () => {
        beforeEach(() => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                pagination: {
                    type: 'page',
                    pageSize: 10,
                    maxPages: 3
                }
            });
        });

        it('should handle page-based pagination', async () => {
            mockHttpClient.request
                .mockResolvedValueOnce({
                    data: { data: Array(10).fill({ id: 1, name: 'User', email: 'user@example.com' }) }
                })
                .mockResolvedValueOnce({
                    data: { data: Array(10).fill({ id: 2, name: 'User', email: 'user@example.com' }) }
                })
                .mockResolvedValueOnce({
                    data: { data: Array(5).fill({ id: 3, name: 'User', email: 'user@example.com' }) }
                });

            const result = await extractor.extract(context);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(25);
            expect(mockHttpClient.request).toHaveBeenCalledTimes(3);
        });

        it('should respect maxPages limit', async () => {
            mockHttpClient.request.mockResolvedValue({
                data: { data: Array(10).fill({ id: 1, name: 'User', email: 'user@example.com' }), has_more: true }
            });

            await extractor.extract(context);

            expect(mockHttpClient.request).toHaveBeenCalledTimes(3); // maxPages = 3
        });

        it('should stop when no more data', async () => {
            mockHttpClient.request
                .mockResolvedValueOnce({
                    data: { data: Array(10).fill({ id: 1, name: 'User', email: 'user@example.com' }) }
                })
                .mockResolvedValueOnce({
                    data: { data: [] }
                });

            await extractor.extract(context);

            expect(mockHttpClient.request).toHaveBeenCalledTimes(2);
        });

        it('should use correct page parameters', async () => {
            mockHttpClient.request.mockResolvedValue({ data: { data: [] } });

            await extractor.extract(context);

            expect(mockHttpClient.request).toHaveBeenCalledWith(
                expect.objectContaining({
                    params: expect.objectContaining({
                        page: expect.any(Number),
                        per_page: 10
                    })
                })
            );
        });

        it('should handle offset-based pagination', async () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                pagination: {
                    type: 'offset',
                    pageSize: 20,
                    maxPages: 2,
                    offsetParam: 'skip',
                    sizeParam: 'take'
                }
            });

            mockHttpClient.request.mockResolvedValue({
                data: { data: Array(20).fill({ id: 1, name: 'User', email: 'user@example.com' }) }
            });

            await extractor.extract(context);

            const firstCall = mockHttpClient.request.mock.calls[0][0];
            const secondCall = mockHttpClient.request.mock.calls[1][0];

            expect(firstCall.params.skip).toBe(0);
            expect(firstCall.params.take).toBe(20);
            expect(secondCall.params.skip).toBe(20);
            expect(secondCall.params.take).toBe(20);
        });

        it('should handle cursor-based pagination', async () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                pagination: {
                    type: 'cursor',
                    pageSize: 10,
                    cursorParam: 'after'
                }
            });

            mockHttpClient.request
                .mockResolvedValueOnce({
                    data: {
                        data: Array(10).fill({ id: 1, name: 'User', email: 'user@example.com' }),
                        next_cursor: 'cursor-abc'
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        data: Array(10).fill({ id: 2, name: 'User', email: 'user@example.com' }),
                        next_cursor: null
                    }
                });

            await extractor.extract(context);

            const secondCall = mockHttpClient.request.mock.calls[1][0];
            expect(secondCall.params.after).toBe('cursor-abc');
        });

        it('should emit progress events during pagination', async () => {
            const progressSpy = jest.fn();
            context.events.on('progress', progressSpy);

            mockHttpClient.request
                .mockResolvedValueOnce({ data: { data: Array(10).fill({ id: 1, name: 'User', email: 'user@example.com' }) } })
                .mockResolvedValueOnce({ data: { data: [] } });

            await extractor.extract(context);

            expect(progressSpy).toHaveBeenCalled();
            expect(progressSpy.mock.calls[0][0]).toMatchObject({
                stage: 'extract',
                step: expect.stringContaining('page')
            });
        });

        it('should handle multiple pages with consistent structure', async () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                pagination: {
                    type: 'cursor',
                    cursorParam: 'cursor'
                }
            });

            mockHttpClient.request
                .mockResolvedValueOnce({ data: { data: [{ id: 1, name: 'User1', email: 'user1@example.com' }], has_more: true, next_cursor: 'cursor1' } })
                .mockResolvedValueOnce({ data: { data: [{ id: 2, name: 'User2', email: 'user2@example.com' }], has_more: false } });

            const result = await extractor.extract(context);

            expect(result.data).toHaveLength(2);
        });
    });

    // =====================================================================
    // Rate Limiting
    // =====================================================================
    describe('Rate Limiting', () => {
        it('should respect rate limit', async () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                rateLimit: {
                    requestsPerSecond: 2
                }
            });

            mockHttpClient.request.mockResolvedValue({ data: [] });

            const startTime = Date.now();

            // Make 4 requests
            await extractor.extract(context);
            await extractor.extract(context);
            await extractor.extract(context);
            await extractor.extract(context);

            const duration = Date.now() - startTime;

            // With 2 requests/second, 4 requests should take at least 1500ms
            expect(duration).toBeGreaterThan(1000);
        });

        it('should handle burst size', async () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                rateLimit: {
                    requestsPerSecond: 5,
                    burstSize: 10
                }
            });

            mockHttpClient.request.mockResolvedValue({ data: [] });

            const startTime = Date.now();

            for (let i = 0; i < 5; i++) {
                await extractor.extract(context);
            }

            const duration = Date.now() - startTime;

            // First 5 requests should be relatively fast
            expect(duration).toBeLessThan(2000);
        });
    });

    // =====================================================================
    // Output Validation
    // =====================================================================
    describe('Output Validation', () => {
        beforeEach(() => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                validateOutput: true
            });
        });

        it('should validate output against schema', async () => {
            const validData: User[] = [
                { id: 1, name: 'Alice', email: 'alice@example.com' }
            ];

            mockHttpClient.request.mockResolvedValue({ data: validData });

            const result = await extractor.extract(context);

            expect(result.success).toBe(true);
        });

        it('should reject invalid output', async () => {
            const invalidData = [
                { id: 1, name: 'Alice', email: 'invalid-email' }
            ];

            mockHttpClient.request.mockResolvedValue({ data: invalidData });

            const result = await extractor.extract(context);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('validation failed');
        });

        it('should skip validation when disabled', async () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                validateOutput: false
            });

            const invalidData = [
                { id: 1, name: 'Alice', email: 'invalid-email' }
            ];

            mockHttpClient.request.mockResolvedValue({ data: invalidData });

            const result = await extractor.extract(context);

            expect(result.success).toBe(true);
        });
    });

    // =====================================================================
    // Error Handling & Retry
    // =====================================================================
    describe('Error Handling & Retry', () => {
        beforeEach(() => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com'
            });
        });

        it('should configure retry interceptor', () => {
            const responseInterceptor = (mockedAxios.create as jest.Mock).mock.results[0]!.value
                .interceptors.response.use;

            // Verify response interceptor was added (for retry logic)
            expect(responseInterceptor).toHaveBeenCalled();
            expect(responseInterceptor.mock.calls[0]).toHaveLength(2); // success and error handlers
        });

        it('should have error handler for retries', () => {
            const errorHandler = (mockedAxios.create as jest.Mock).mock.results[0]!.value
                .interceptors.response.use.mock.calls[0][1];

            // Verify error handler exists
            expect(typeof errorHandler).toBe('function');
        });

        it('should not retry on other errors', async () => {
            const retryInterceptor = (mockedAxios.create as jest.Mock).mock.results[0]!.value
                .interceptors.response.use.mock.calls[0][1];

            const error = {
                response: { status: 404 },
                config: { url: '/test' }
            };

            await expect(retryInterceptor(error)).rejects.toEqual(error);
        });
    });

    // =====================================================================
    // Metadata
    // =====================================================================
    describe('Metadata', () => {
        it('should return extractor metadata', async () => {
            extractor = new TestExtractor({
                baseUrl: 'https://api.example.com',
                headers: { 'X-Custom': 'test' }
            });

            const metadata = await extractor.getMetadata();

            expect(metadata.name).toBe('test-extractor');
            expect(metadata.description).toBe('Test extractor for unit tests');
            expect(metadata.config).toMatchObject({
                baseUrl: 'https://api.example.com',
                headers: { 'X-Custom': 'test' }
            });
        });

        it('should include output schema in metadata', async () => {
            extractor = new TestExtractor();

            const metadata = await extractor.getMetadata();

            expect(metadata.outputSchema).toBeDefined();
        });
    });
});
