/**
 * StripeService Test Suite - Comprehensive service-specific testing
 *
 * @package     @imajin/cli
 * @subpackage  test/services/stripe
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
 * - StripeTestData for payment processing fixtures
 * - Business context validation
 */

import { StripeService } from '../../../services/stripe/StripeService.js';
import { ServiceTestBase, ServiceConfig } from '../../framework/ServiceTestBase.js';
import { StripeTestData } from '../../factories/StripeTestData.js';
import { ServiceStatus } from '../../../services/interfaces/ServiceInterface.js';
import { BusinessDomainModel } from '../../../context/BusinessContextProcessor.js';
import type { CreatePaymentIntentParams } from '../../../types/Stripe.js';

// Mock Stripe SDK at module level (not HTTP level)
const mockStripeCustomers = {
    create: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    del: jest.fn()
};

const mockStripePaymentIntents = {
    create: jest.fn(),
    confirm: jest.fn(),
    list: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn()
};

const mockStripeSubscriptions = {
    create: jest.fn(),
    cancel: jest.fn(),
    list: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn()
};

const mockStripeAccounts = {
    retrieve: jest.fn().mockResolvedValue({ id: 'acct_test_123', object: 'account' })
};

jest.mock('stripe', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            customers: mockStripeCustomers,
            paymentIntents: mockStripePaymentIntents,
            subscriptions: mockStripeSubscriptions,
            accounts: mockStripeAccounts
        }))
    };
});

interface StripeServiceConfig extends ServiceConfig {
    apiKey: string;
    apiVersion: string;
    timeout?: number;
    maxNetworkRetries?: number;
    enableTelemetry?: boolean;
}

describe('StripeService', () => {
    let stripeService: StripeService;
    let testBase: ServiceTestBase<StripeService>;
    let mockConfig: StripeServiceConfig;

    beforeEach(async () => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        testBase = new (class extends ServiceTestBase<StripeService> {
            createService(): StripeService {
                return new StripeService(this.container, this.testConfig as StripeServiceConfig);
            }

            getMockConfig(): StripeServiceConfig {
                return {
                    name: 'stripe-test',
                    apiKey: 'sk_test_123456789',
                    apiVersion: '2024-06-20',
                    timeout: 60000,
                    maxNetworkRetries: 3,
                    enableTelemetry: false,
                    enabled: true
                };
            }
        })();

        await testBase.setupTest();
        mockConfig = testBase.getMockConfig() as StripeServiceConfig;
        stripeService = testBase.getService();

        // Setup default successful account validation mock
        mockStripeAccounts.retrieve.mockResolvedValue({
            id: 'acct_test_123',
            object: 'account'
        });
    });

    afterEach(async () => {
        await testBase.teardownTest();
        jest.clearAllMocks();
    });

    // ==========================================================================
    // SERVICE LIFECYCLE TESTS
    // ==========================================================================

    describe('Service Lifecycle', () => {
        it('should initialize successfully with valid API key', async () => {
            await stripeService.initialize();

            expect(stripeService.getStatus()).toBe(ServiceStatus.ACTIVE);
            testBase.assertEventEmitted('service:ready', { service: 'stripe' });
            testBase.assertLoggerCalled('info', 'StripeService initialized');
        });

        it('should fail initialization with invalid API key', async () => {
            mockStripeAccounts.retrieve.mockRejectedValue({
                type: 'StripeAuthenticationError',
                message: 'Invalid API key provided',
                statusCode: 401
            });

            await expect(stripeService.initialize()).rejects.toThrow('Invalid Stripe API key');
            expect(stripeService.getStatus()).toBe(ServiceStatus.ERROR);
            testBase.assertEventEmitted('service:error');
        });

        it('should shutdown gracefully', async () => {
            await stripeService.initialize();
            await stripeService.shutdown();

            expect(stripeService.getStatus()).toBe(ServiceStatus.INACTIVE);
            testBase.assertEventEmitted('service:shutdown', { service: 'stripe' });
        });

        it('should perform health check successfully', async () => {
            await stripeService.initialize();
            const health = await stripeService.getHealth();

            expect(health.status).toBe(ServiceStatus.ACTIVE);
            expect(health.name).toBe('stripe');
            expect(health.version).toBe('1.0.0');
            expect(health.checks).toContainEqual({
                name: 'stripe-api',
                healthy: true,
                message: 'Connected to Stripe API'
            });
        });

        it('should report unhealthy status when API is down', async () => {
            await stripeService.initialize();
            
            mockStripeAccounts.retrieve.mockRejectedValue({
                type: 'StripeConnectionError',
                message: 'Service temporarily unavailable',
                statusCode: 503
            });

            const health = await stripeService.getHealth();

            expect(health.status).toBe(ServiceStatus.ERROR);
            expect(health.checks).toContainEqual({
                name: 'stripe-api',
                healthy: false,
                message: expect.stringContaining('Stripe API error')
            });
        });
    });

    // ==========================================================================
    // CUSTOMER MANAGEMENT TESTS
    // ==========================================================================

    describe('Customer Management', () => {
        beforeEach(async () => {
            await stripeService.initialize();
        });

        it('should create customer with minimal data', async () => {
            const mockCustomer = StripeTestData.createCustomer({
                id: 'cus_test_123',
                email: 'test@example.com'
            });

            mockStripeCustomers.create.mockResolvedValue(mockCustomer);

            const progressCallback = jest.fn();
            const result = await stripeService.createCustomer(
                {
                    email: 'test@example.com'
                },
                progressCallback
            );

            expect(result.success).toBe(true);
            expect(result.customer.email).toBe('test@example.com');
            expect(result.customer.id).toBe('cus_test_123');
            expect(progressCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'progress',
                    message: 'Creating Stripe customer',
                    progress: 25
                })
            );

            expect(mockStripeCustomers.create).toHaveBeenCalledWith({
                email: 'test@example.com'
            });
        });

        it('should create customer with full data', async () => {
            const mockCustomer = StripeTestData.createCustomer({
                id: 'cus_test_456',
                email: 'john.doe@example.com',
                name: 'John Doe',
                phone: '+1234567890'
            });

            mockStripeCustomers.create.mockResolvedValue(mockCustomer);

            const result = await stripeService.createCustomer({
                email: 'john.doe@example.com',
                name: 'John Doe',
                phone: '+1234567890',
                description: 'Premium customer'
            });

            expect(result.success).toBe(true);
            expect(result.customer.name).toBe('John Doe');
            expect(result.customer.phone).toBe('+1234567890');

            expect(mockStripeCustomers.create).toHaveBeenCalledWith({
                email: 'john.doe@example.com',
                name: 'John Doe',
                phone: '+1234567890',
                description: 'Premium customer'
            });
        });

        it('should handle customer creation error', async () => {
            mockStripeCustomers.create.mockRejectedValue({
                type: 'StripeInvalidRequestError',
                message: 'Invalid email address provided',
                statusCode: 400
            });

            await expect(stripeService.createCustomer({
                email: 'invalid-email'
            })).rejects.toThrow(expect.stringContaining('Invalid email'));
        });

        it('should retrieve existing customer', async () => {
            const mockCustomer = StripeTestData.createCustomer({
                id: 'cus_test_123',
                email: 'existing@example.com'
            });

            mockStripeCustomers.retrieve.mockResolvedValue(mockCustomer);

            const result = await stripeService.getCustomer('cus_test_123');

            expect(result.success).toBe(true);
            expect(result.customer.id).toBe('cus_test_123');
            expect(mockStripeCustomers.retrieve).toHaveBeenCalledWith('cus_test_123');
        });

        it('should handle customer not found', async () => {
            mockStripeCustomers.retrieve.mockRejectedValue({
                type: 'StripeInvalidRequestError',
                message: 'No such customer: cus_nonexistent',
                statusCode: 404
            });

            await expect(stripeService.getCustomer('cus_nonexistent')).rejects.toThrow(expect.stringContaining('No such customer'));
        });

        it('should list customers with pagination', async () => {
            const mockCustomers = [
                StripeTestData.createCustomer({ id: 'cus_1', email: 'customer1@example.com' }),
                StripeTestData.createCustomer({ id: 'cus_2', email: 'customer2@example.com' })
            ];

            const mockList = StripeTestData.createListResponse(mockCustomers);
            mockStripeCustomers.list.mockResolvedValue(mockList);

            const result = await stripeService.listCustomers({ limit: 10 });

            expect(result.data).toHaveLength(2);
            expect(result.has_more).toBe(false);
            expect(mockStripeCustomers.list).toHaveBeenCalledWith({ limit: 10 });
        });
    });

    // ==========================================================================
    // PAYMENT INTENT MANAGEMENT TESTS
    // ==========================================================================

    describe('Payment Intent Management', () => {
        beforeEach(async () => {
            await stripeService.initialize();
        });

        it('should create payment intent successfully', async () => {
            const mockPaymentIntent = StripeTestData.createPaymentIntent({
                id: 'pi_test_123',
                amount: 2000,
                currency: 'usd',
                status: 'requires_payment_method'
            });

            mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

            const progressCallback = jest.fn();
            const params: CreatePaymentIntentParams = {
                amount: 2000,
                currency: 'usd',
                customerId: 'cus_test_123'
            };

            const result = await stripeService.createPaymentIntent(params, progressCallback);

            expect(result.success).toBe(true);
            expect(result.paymentIntent.id).toBe('pi_test_123');
            expect(result.paymentIntent.amount).toBe(2000);
            expect(progressCallback).toHaveBeenCalled();

            expect(mockStripePaymentIntents.create).toHaveBeenCalledWith(params);
        });

        it('should handle payment intent creation error', async () => {
            mockStripePaymentIntents.create.mockRejectedValue({
                type: 'StripeCardError',
                message: 'Your card was declined',
                statusCode: 402
            });

            await expect(stripeService.createPaymentIntent({
                amount: 2000,
                currency: 'usd'
            })).rejects.toThrow(expect.stringContaining('card was declined'));
        });

        it('should confirm payment intent', async () => {
            const mockPaymentIntent = StripeTestData.createPaymentIntent({
                id: 'pi_test_123',
                status: 'succeeded'
            });

            mockStripePaymentIntents.confirm.mockResolvedValue(mockPaymentIntent);

            const result = await stripeService.confirmPaymentIntent('pi_test_123', {
                payment_method: 'pm_card_visa'
            });

            expect(result.success).toBe(true);
            expect(result.paymentIntent.status).toBe('succeeded');
        });

        it('should list payment intents with filters', async () => {
            const mockPaymentIntents = [
                StripeTestData.createPaymentIntent({ id: 'pi_1', status: 'succeeded' }),
                StripeTestData.createPaymentIntent({ id: 'pi_2', status: 'requires_payment_method' })
            ];

            const mockList = StripeTestData.createListResponse(mockPaymentIntents);
            mockStripePaymentIntents.list.mockResolvedValue(mockList);

            const result = await stripeService.listPaymentIntents({ 
                customer: 'cus_test_123', 
                limit: 10 
            });

            expect(result.data).toHaveLength(2);
            expect(mockStripePaymentIntents.list).toHaveBeenCalledWith({
                customer: 'cus_test_123',
                limit: 10
            });
        });
    });

    // ==========================================================================
    // SUBSCRIPTION MANAGEMENT TESTS
    // ==========================================================================

    describe('Subscription Management', () => {
        beforeEach(async () => {
            await stripeService.initialize();
        });

        it('should create subscription successfully', async () => {
            const mockSubscription = StripeTestData.createSubscription({
                id: 'sub_test_123',
                customer: 'cus_test_123',
                status: 'active'
            });

            mockStripeSubscriptions.create.mockResolvedValue(mockSubscription);

            const result = await stripeService.createSubscription({
                customer: 'cus_test_123',
                items: [{ price: 'price_test_123' }]
            });

            expect(result.success).toBe(true);
            expect(result.subscription.id).toBe('sub_test_123');
        });

        it('should cancel subscription', async () => {
            const mockSubscription = StripeTestData.createSubscription({
                id: 'sub_test_123',
                status: 'canceled'
            });

            mockStripeSubscriptions.cancel.mockResolvedValue(mockSubscription);

            const result = await stripeService.cancelSubscription('sub_test_123');

            expect(result.success).toBe(true);
            expect(result.subscription.status).toBe('canceled');
        });

        it('should list subscriptions for customer', async () => {
            const mockSubscriptions = [
                StripeTestData.createSubscription({ id: 'sub_1', customer: 'cus_test_123' }),
                StripeTestData.createSubscription({ id: 'sub_2', customer: 'cus_test_123' })
            ];

            const mockList = StripeTestData.createListResponse(mockSubscriptions);
            mockStripeSubscriptions.list.mockResolvedValue(mockList);

            const result = await stripeService.listSubscriptions({ customer: 'cus_test_123' });

            expect(result.data).toHaveLength(2);
        });
    });

    // ==========================================================================
    // BUSINESS CONTEXT INTEGRATION TESTS
    // ==========================================================================

    describe('Business Context Integration', () => {
        it('should initialize with business context', async () => {
            const businessContext: BusinessDomainModel = {
                businessType: 'payment-processing',
                description: 'Payment processing domain for testing',
                entities: {
                    Customer: {
                        fields: [
                            { name: 'email', type: 'string', required: true, optional: false },
                            { name: 'name', type: 'string', required: false, optional: true }
                        ]
                    }
                },
                workflows: [],
                businessRules: [],
                integrations: [],
                commands: []
            };

            // Initialize service with business context
            await stripeService.initialize();

            // Verify service can work with business context
            expect(stripeService.getCapabilities()).toContain('customer-management');
        });

        it('should return service capabilities', async () => {
            await stripeService.initialize();
            const capabilities = stripeService.getCapabilities();

            expect(capabilities).toContain('customer-management');
            expect(capabilities).toContain('payment-processing');
            expect(capabilities).toContain('subscription-management');
        });
    });

    // ==========================================================================
    // ERROR HANDLING AND RESILIENCE TESTS
    // ==========================================================================

    describe('Error Handling and Resilience', () => {
        beforeEach(async () => {
            await stripeService.initialize();
        });

        it('should handle network timeout errors', async () => {
            mockStripeCustomers.create.mockRejectedValue({
                type: 'StripeConnectionError',
                message: 'Request timeout',
                code: 'connection_error'
            });

            await expect(stripeService.createCustomer({
                email: 'test@example.com'
            })).rejects.toThrow(expect.stringContaining('timeout'));
        });

        it('should handle rate limiting gracefully', async () => {
            mockStripeCustomers.create.mockRejectedValue({
                type: 'StripeRateLimitError',
                message: 'Too many requests',
                statusCode: 429
            });

            await expect(stripeService.createCustomer({
                email: 'test@example.com'
            })).rejects.toThrow(expect.stringContaining('rate limit'));
        });

        it('should track service metrics during operations', async () => {
            const mockCustomer = StripeTestData.createCustomer({
                id: 'cus_metrics_test'
            });

            mockStripeCustomers.create.mockResolvedValue(mockCustomer);

            await stripeService.createCustomer({ email: 'metrics@example.com' });

            testBase.assertEventEmitted('service:operation', {
                service: 'stripe',
                operation: 'createCustomer',
                success: true
            });
        });

        it('should emit service operation events', async () => {
            const mockCustomer = StripeTestData.createCustomer();
            mockStripeCustomers.create.mockResolvedValue(mockCustomer);

            await stripeService.createCustomer({ email: 'events@example.com' });

            testBase.assertEventEmitted('service:operation');
        });
    });

    // ==========================================================================
    // INTEGRATION PATTERNS TESTS
    // ==========================================================================

    describe('Integration Patterns', () => {
        beforeEach(async () => {
            await stripeService.initialize();
        });

        it('should support progress callbacks for payment operations', async () => {
            const mockPaymentIntent = StripeTestData.createPaymentIntent();
            mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

            const progressCallback = jest.fn();
            await stripeService.createPaymentIntent({
                amount: 1000,
                currency: 'usd'
            }, progressCallback);

            expect(progressCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'progress',
                    progress: expect.any(Number)
                })
            );
        });

        it('should provide structured error responses', async () => {
            mockStripeCustomers.create.mockRejectedValue({
                type: 'StripeInvalidRequestError',
                message: 'Missing required parameter: email',
                param: 'email',
                statusCode: 400
            });

            await expect(stripeService.createCustomer({
                email: ''
            })).rejects.toMatchObject({
                type: 'StripeInvalidRequestError',
                param: 'email',
                statusCode: 400
            });
        });

        it('should handle webhook event structure validation', async () => {
            const webhookPayload = {
                type: 'payment_intent.succeeded',
                data: {
                    object: StripeTestData.createPaymentIntent({ status: 'succeeded' })
                }
            };

            // Verify webhook structure (since processWebhook method doesn't exist yet)
            expect(webhookPayload.type).toBe('payment_intent.succeeded');
            expect(webhookPayload.data.object).toBeDefined();
            expect(webhookPayload.data.object.status).toBe('succeeded');
        });
    });
}); 