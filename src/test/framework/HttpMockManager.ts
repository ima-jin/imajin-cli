/**
 * HttpMockManager - HTTP mocking framework for service testing
 *
 * @package     @imajin/cli
 * @subpackage  test/framework
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-02
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Axios HTTP client mocking
 * - Request/response validation
 * - API interaction testing
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export interface HttpRequest {
    method: string;
    url: string;
    headers?: Record<string, string>;
    data?: any;
    params?: Record<string, any>;
    timestamp: Date;
}

export interface MockResponse {
    status: number;
    data: any;
    headers?: Record<string, string>;
    delay?: number;
}

export interface MockError {
    code?: string;
    message: string;
    status?: number;
    response?: Partial<AxiosResponse>;
}

export interface RequestMatcher {
    method?: string;
    url?: string | RegExp;
    headers?: Record<string, string>;
    data?: any;
    params?: Record<string, any>;
}

/**
 * HTTP mocking framework for testing service API interactions
 */
export class HttpMockManager {
    private requestHistory: HttpRequest[] = [];
    private mockResponses: Map<string, MockResponse> = new Map();
    private mockErrors: Map<string, MockError> = new Map();
    private interceptors: number[] = [];
    private originalAxios: any;
    private cleanupRegistered: boolean = false;

    constructor() {
        this.setupMocks();
        // Do not auto-register cleanup to avoid Jest timing issues
        // Cleanup should be called manually in test teardown
    }

    /**
     * Setup axios mocking with request tracking
     */
    setupMocks(): void {
        // Store original axios methods
        this.originalAxios = {
            request: axios.request,
            get: axios.get,
            post: axios.post,
            put: axios.put,
            patch: axios.patch,
            delete: axios.delete
        };

        // Mock axios methods
        jest.spyOn(axios, 'request').mockImplementation(this.mockRequest.bind(this));
        jest.spyOn(axios, 'get').mockImplementation(this.mockGet.bind(this));
        jest.spyOn(axios, 'post').mockImplementation(this.mockPost.bind(this));
        jest.spyOn(axios, 'put').mockImplementation(this.mockPut.bind(this));
        jest.spyOn(axios, 'patch').mockImplementation(this.mockPatch.bind(this));
        jest.spyOn(axios, 'delete').mockImplementation(this.mockDelete.bind(this));

        // Mock axios.create to return instance with mocked methods
        jest.spyOn(axios, 'create').mockImplementation((config?: any) => {
            const instance = {
                request: this.mockRequest.bind(this),
                get: this.mockGet.bind(this),
                post: this.mockPost.bind(this),
                put: this.mockPut.bind(this),
                patch: this.mockPatch.bind(this),
                delete: this.mockDelete.bind(this),
                defaults: { ...axios.defaults, ...config },
                interceptors: {
                    request: { use: jest.fn(), eject: jest.fn() },
                    response: { use: jest.fn(), eject: jest.fn() }
                }
            } as any;
            return instance;
        });
    }

    /**
     * Register global cleanup to prevent mock leakage
     */
    private registerGlobalCleanup(): void {
        if (!this.cleanupRegistered && typeof afterEach === 'function') {
            afterEach(() => {
                this.clearMocks();
            });
            this.cleanupRegistered = true;
        }
    }

    /**
     * Mock successful HTTP response for URL pattern
     */
    mockSuccessResponse(url: string | RegExp, response: MockResponse): void {
        const key = this.createUrlKey(url);
        this.mockResponses.set(key, response);
        // Remove any error mock for this URL
        this.mockErrors.delete(key);
    }

    /**
     * Mock HTTP error response for URL pattern
     */
    mockErrorResponse(url: string | RegExp, error: MockError): void {
        const key = this.createUrlKey(url);
        this.mockErrors.set(key, error);
        // Remove any success mock for this URL
        this.mockResponses.delete(key);
    }

    /**
     * Clear all mocks and request history with enhanced cleanup
     */
    clearMocks(): void {
        this.requestHistory = [];
        this.mockResponses.clear();
        this.mockErrors.clear();
        
        // Clear any active interceptors
        for (const id of this.interceptors) {
            // Clear interceptor if axios supports it
            if (axios.interceptors?.request) {
                try {
                    axios.interceptors.request.eject(id);
                } catch (e) {
                    // Intentionally ignore errors during cleanup - interceptor may already be ejected
                }
            }
        }
        this.interceptors = [];
    }

    /**
     * Complete cleanup including axios restoration
     */
    destroy(): void {
        this.clearMocks();
        this.restoreAxios();
    }

    /**
     * Reset to original axios implementation
     */
    restoreAxios(): void {
        jest.restoreAllMocks();
    }

    /**
     * Get complete request history
     */
    getRequestHistory(): HttpRequest[] {
        return [...this.requestHistory];
    }

    /**
     * Get requests matching criteria
     */
    getRequestsMatching(matcher: RequestMatcher): HttpRequest[] {
        return this.requestHistory.filter(request => this.matchesRequest(request, matcher));
    }

    /**
     * Verify specific request was made
     */
    verifyRequest(expectedRequest: Partial<HttpRequest>): void {
        const matchingRequests = this.requestHistory.filter(request => 
            this.matchesPartialRequest(request, expectedRequest)
        );

        if (matchingRequests.length === 0) {
            throw new Error(
                `Expected request not found. Expected: ${JSON.stringify(expectedRequest, null, 2)}\n` +
                `Actual requests: ${JSON.stringify(this.requestHistory, null, 2)}`
            );
        }
    }

    /**
     * Verify request count for URL pattern
     */
    verifyRequestCount(url: string | RegExp, expectedCount: number): void {
        const matchingRequests = this.requestHistory.filter(request => 
            this.matchesUrl(request.url, url)
        );

        if (matchingRequests.length !== expectedCount) {
            throw new Error(
                `Expected ${expectedCount} requests to ${url}, but found ${matchingRequests.length}`
            );
        }
    }

    /**
     * Assert no requests were made to URL pattern
     */
    verifyNoRequestsTo(url: string | RegExp): void {
        this.verifyRequestCount(url, 0);
    }

    // Private mock implementations
    private async mockRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.handleMockRequest('request', config.url || '', config);
    }

    private async mockGet(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.handleMockRequest('GET', url, config);
    }

    private async mockPost(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.handleMockRequest('POST', url, { ...config, data });
    }

    private async mockPut(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.handleMockRequest('PUT', url, { ...config, data });
    }

    private async mockPatch(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.handleMockRequest('PATCH', url, { ...config, data });
    }

    private async mockDelete(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.handleMockRequest('DELETE', url, config);
    }

    private async handleMockRequest(
        method: string, 
        url: string, 
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        // Record request
        const request: HttpRequest = {
            method: method.toUpperCase(),
            url: url,
            headers: config?.headers as Record<string, string>,
            data: config?.data,
            params: config?.params,
            timestamp: new Date()
        };
        this.requestHistory.push(request);

        // Find matching mock
        const mockResponse = this.findMockResponse(url);
        const mockError = this.findMockError(url);

        // Add delay if specified
        if (mockResponse?.delay) {
            await new Promise(resolve => setTimeout(resolve, mockResponse.delay));
        }

        // Return error if configured
        if (mockError) {
            const axiosError = new Error(mockError.message) as AxiosError;
            if (mockError.code) {
                axiosError.code = mockError.code;
            }
            axiosError.response = {
                status: mockError.status || 500,
                statusText: mockError.message,
                data: mockError.response?.data,
                headers: mockError.response?.headers || {},
                config: config as any
            } as AxiosResponse;
            throw axiosError;
        }

        // Return success response
        if (mockResponse) {
            return {
                status: mockResponse.status,
                statusText: 'OK',
                data: mockResponse.data,
                headers: mockResponse.headers || {},
                config: config as any
            } as AxiosResponse;
        }

        // Default response if no mock configured
        return {
            status: 200,
            statusText: 'OK',
            data: {},
            headers: {},
            config: config as any
        } as AxiosResponse;
    }

    private createUrlKey(url: string | RegExp): string {
        return url instanceof RegExp ? url.toString() : url;
    }

    private findMockResponse(url: string): MockResponse | undefined {
        for (const [key, response] of this.mockResponses) {
            if (this.matchesUrlKey(url, key)) {
                return response;
            }
        }
        return undefined;
    }

    private findMockError(url: string): MockError | undefined {
        for (const [key, error] of this.mockErrors) {
            if (this.matchesUrlKey(url, key)) {
                return error;
            }
        }
        return undefined;
    }

    private matchesUrlKey(url: string, key: string): boolean {
        if (key.startsWith('/') && key.endsWith('/')) {
            // RegExp pattern
            const regex = new RegExp(key.slice(1, -1));
            return regex.test(url);
        }
        return url === key || url.includes(key);
    }

    private matchesUrl(url: string, pattern: string | RegExp): boolean {
        if (pattern instanceof RegExp) {
            return pattern.test(url);
        }
        return url === pattern || url.includes(pattern);
    }

    private matchesRequest(request: HttpRequest, matcher: RequestMatcher): boolean {
        if (matcher.method && request.method !== matcher.method.toUpperCase()) {
            return false;
        }
        if (matcher.url && !this.matchesUrl(request.url, matcher.url)) {
            return false;
        }
        if (matcher.headers) {
            for (const [key, value] of Object.entries(matcher.headers)) {
                if (request.headers?.[key] !== value) {
                    return false;
                }
            }
        }
        if (matcher.data && JSON.stringify(request.data) !== JSON.stringify(matcher.data)) {
            return false;
        }
        if (matcher.params) {
            for (const [key, value] of Object.entries(matcher.params)) {
                if (request.params?.[key] !== value) {
                    return false;
                }
            }
        }
        return true;
    }

    private matchesPartialRequest(request: HttpRequest, partial: Partial<HttpRequest>): boolean {
        for (const [key, value] of Object.entries(partial)) {
            if (key === 'url' && typeof value === 'string') {
                if (!this.matchesUrl(request.url, value)) {
                    return false;
                }
            } else if (request[key as keyof HttpRequest] !== value) {
                return false;
            }
        }
        return true;
    }
} 