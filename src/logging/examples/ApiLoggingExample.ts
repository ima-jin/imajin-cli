/**
 * ApiLoggingExample - Demonstrates comprehensive API logging capabilities
 * 
 * @package     @imajin/cli
 * @subpackage  logging/examples
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 *
 * Integration Points:
 * - HTTP client integration
 * - Rate limiting system
 * - Error handling system
 * - Performance monitoring
 */

import { ApiLogger, LoggerConfig } from '../index.js';

export class ApiLoggingExample {
    private logger: ApiLogger;

    constructor() {
        // Configure logger for API operations
        const config: Partial<LoggerConfig> = {
            level: 'debug',
            enableColors: true,
            monitoring: {
                enabled: true,
                serviceName: 'stripe-api-client',
                metrics: {
                    logCount: true,
                    errorRate: true,
                    latency: true,
                },
            },
            transports: [
                {
                    type: 'console',
                    level: 'info',
                },
                {
                    type: 'file',
                    level: 'debug',
                    options: {
                        filename: 'logs/api-debug.log',
                    },
                },
                {
                    type: 'file',
                    level: 'error',
                    options: {
                        filename: 'logs/api-errors.log',
                    },
                },
            ],
        };

        this.logger = new ApiLogger(config);
    }

    /**
     * Example: Stripe API call with comprehensive logging
     */
    public async createStripeCustomer(customerData: any): Promise<any> {
        const method = 'POST';
        const url = 'https://api.stripe.com/v1/customers';
        const startTime = Date.now();

        try {
            // Log request start
            this.logger.apiRequestStart(method, url, {
                headers: {
                    'Authorization': 'Bearer sk_test_...',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: customerData,
                timeout: 30000,
            });

            // Simulate API call
            const response = await this.simulateApiCall(method, url, customerData);
            const duration = Date.now() - startTime;

            // Log successful response
            this.logger.apiResponse(method, url, {
                status: response.status,
                headers: response.headers,
                body: response.data,
                duration,
                rateLimitInfo: {
                    remaining: 95,
                    resetTime: new Date(Date.now() + 3600000), // 1 hour from now
                },
            });

            return response.data;

        } catch (error) {
            const duration = Date.now() - startTime;

            // Log API error
            this.logger.apiError(method, url, error as Error, {
                duration,
                retryAttempt: 0,
                willRetry: false,
            });

            throw error;
        }
    }

    /**
     * Example: API call with retry logic and rate limiting
     */
    public async createCustomerWithRetry(customerData: any, maxRetries: number = 3): Promise<any> {
        const method = 'POST';
        const url = 'https://api.stripe.com/v1/customers';
        let attempt = 0;

        while (attempt < maxRetries) {
            const startTime = Date.now();

            try {
                // Log request start with retry attempt
                this.logger.apiRequestStart(method, url, {
                    headers: {
                        'Authorization': 'Bearer sk_test_...',
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: customerData,
                    timeout: 30000,
                    retryAttempt: attempt,
                });

                const response = await this.simulateApiCall(method, url, customerData);
                const duration = Date.now() - startTime;

                // Check for rate limiting
                const rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining'] || '100');
                const rateLimitReset = new Date(parseInt(response.headers['x-ratelimit-reset'] || '0') * 1000);

                if (rateLimitRemaining <= 10) {
                    this.logger.rateLimitEvent('stripe', {
                        remaining: rateLimitRemaining,
                        resetTime: rateLimitReset,
                        action: 'approaching',
                    });
                }

                // Log successful response
                this.logger.apiResponse(method, url, {
                    status: response.status,
                    headers: response.headers,
                    body: response.data,
                    duration,
                    rateLimitInfo: {
                        remaining: rateLimitRemaining,
                        resetTime: rateLimitReset,
                    },
                });

                return response.data;

            } catch (error) {
                const duration = Date.now() - startTime;
                attempt++;
                const willRetry = attempt < maxRetries;

                // Handle rate limiting
                if ((error as any).status === 429) {
                    const retryAfter = parseInt((error as any).headers?.['retry-after'] || '60');
                    
                    this.logger.rateLimitEvent('stripe', {
                        remaining: 0,
                        resetTime: new Date(Date.now() + retryAfter * 1000),
                        retryAfter,
                        action: 'hit',
                    });

                    if (willRetry) {
                        this.logger.info(`Rate limited, waiting ${retryAfter}s before retry ${attempt}/${maxRetries}`);
                        await this.sleep(retryAfter * 1000);
                    }
                }

                // Handle network errors
                if ((error as any).code === 'ECONNRESET' || (error as any).code === 'ETIMEDOUT') {
                    this.logger.networkError(error as Error, {
                        operation: 'create_customer',
                        endpoint: url,
                        timeout: 30000,
                        retryAttempt: attempt,
                    });
                }

                // Log API error
                this.logger.apiError(method, url, error as Error, {
                    duration,
                    retryAttempt: attempt,
                    willRetry,
                });

                if (!willRetry) {
                    throw error;
                }
            }
        }

        throw new Error(`Failed after ${maxRetries} attempts`);
    }

    /**
     * Example: Performance monitoring
     */
    public async performBulkOperation(items: any[]): Promise<void> {
        const startTime = Date.now();
        const startMemory = process.memoryUsage();
        const startCpu = process.cpuUsage();

        try {
            // Process items...
            for (let i = 0; i < items.length; i++) {
                await this.createStripeCustomer(items[i]);
                
                // Log progress every 10 items
                if ((i + 1) % 10 === 0) {
                    const currentTime = Date.now();
                    const currentMemory = process.memoryUsage();
                    const currentCpu = process.cpuUsage(startCpu);

                    this.logger.performanceMetrics(`bulk_operation_progress_${i + 1}`, {
                        duration: currentTime - startTime,
                        memoryUsage: currentMemory,
                        cpuUsage: currentCpu,
                        itemsProcessed: i + 1,
                    });
                }
            }

            // Log final performance metrics
            const endTime = Date.now();
            const endMemory = process.memoryUsage();
            const endCpu = process.cpuUsage(startCpu);

            this.logger.performanceMetrics('bulk_operation_complete', {
                duration: endTime - startTime,
                memoryUsage: endMemory,
                cpuUsage: endCpu,
                itemsProcessed: items.length,
            });

            // Log API metrics summary
            this.logger.logApiMetricsSummary();

        } catch (error) {
            this.logger.error('Bulk operation failed', error as Error, {
                type: 'bulk_operation_error',
                itemsProcessed: items.length,
            });
            throw error;
        }
    }

    /**
     * Simulate API call for demonstration
     */
    private async simulateApiCall(method: string, url: string, data: any): Promise<any> {
        // Simulate network delay
        await this.sleep(Math.random() * 1000 + 500);

        // Simulate occasional failures
        if (Math.random() < 0.1) {
            const error = new Error('Network timeout') as any;
            error.code = 'ETIMEDOUT';
            throw error;
        }

        // Simulate rate limiting
        if (Math.random() < 0.05) {
            const error = new Error('Rate limit exceeded') as any;
            error.status = 429;
            error.headers = { 'retry-after': '60' };
            throw error;
        }

        // Return successful response
        return {
            status: 200,
            headers: {
                'x-ratelimit-remaining': '95',
                'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600,
            },
            data: {
                id: 'cus_' + (()=>{const{randomBytes}=require("crypto");const b=randomBytes(6);return b.toString("base64").replace(/[^a-z0-9]/gi,"").toLowerCase().substring(0,9);})(),
                email: data.email,
                name: data.name,
                created: Math.floor(Date.now() / 1000),
            },
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Example usage
export async function runApiLoggingExample(): Promise<void> {
    console.log('🚀 API Logging System Example');
    console.log('=============================\n');

    const example = new ApiLoggingExample();

    try {
        // Single API call
        console.log('📞 Single API call with logging...');
        await example.createStripeCustomer({
            email: 'john@example.com',
            name: 'John Doe',
        });

        // API call with retry logic
        console.log('\n🔄 API call with retry logic...');
        await example.createCustomerWithRetry({
            email: 'jane@example.com',
            name: 'Jane Smith',
        });

        // Bulk operation with performance monitoring
        console.log('\n📊 Bulk operation with performance monitoring...');
        const bulkData = Array.from({ length: 5 }, (_, i) => ({
            email: `user${i}@example.com`,
            name: `User ${i}`,
        }));
        
        await example.performBulkOperation(bulkData);

        console.log('\n✅ API logging example completed successfully!');

    } catch (error) {
        console.error('\n❌ API logging example failed:', error);
    }
} 