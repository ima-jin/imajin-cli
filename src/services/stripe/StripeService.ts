/**
 * StripeService - Business context-aware Stripe integration
 * 
 * @package     @imajin/cli
 * @subpackage  services/stripe
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-04
 *
 * Integration Points:
 * - Business Context mapping (Customer → Business Customer Entity)
 * - Real-time progress tracking via events
 * - Structured error handling with recovery
 * - Rate limiting and retry logic
 * - Background job processing for long operations
 * - Comprehensive logging and audit trails
 */

import Stripe from 'stripe';
import type { EventEmitter } from 'node:events';
import type { Container } from '../../container/Container.js';
import { BaseService } from '../BaseService.js';
import type { ServiceConfig } from '../interfaces/ServiceInterface.js';
import type { LLMProgressCallback } from '../../types/LLM.js';
import { BusinessTypeRegistry } from '../../context/BusinessTypeRegistry.js';
import { transformToBusinessEntity } from '../../context/BusinessSchemaRegistry.js';
import type { BusinessDomainModel } from '../../context/BusinessContextProcessor.js';
import type {
    StripeCustomerData,
    StripeCustomerResponse,
    StripePaymentData,
    StripePaymentResponse,
    CreatePaymentIntentParams,
    StripeServiceError,
} from '../../types/Stripe.js';

export interface StripeServiceConfig extends ServiceConfig {
    apiKey: string;
    apiVersion: string;
    timeout?: number;
    maxNetworkRetries?: number;
    enableTelemetry?: boolean;
}

/**
 * Business Context-Aware Stripe Service
 */
export class StripeService extends BaseService {
    private stripe!: Stripe;
    private businessContext?: BusinessDomainModel;
    private readonly stripeConfig: StripeServiceConfig;

    constructor(
        container: Container,
        config: StripeServiceConfig,
        eventEmitter?: EventEmitter
    ) {
        super(container, config, eventEmitter);
        this.stripeConfig = config;
        this.initializeStripe();
    }

    public getName(): string {
        return 'stripe';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    private initializeStripe(): void {
        this.stripe = new Stripe(this.stripeConfig.apiKey, {
            apiVersion: this.stripeConfig.apiVersion as any,
            timeout: this.stripeConfig.timeout || 60000,
            maxNetworkRetries: this.stripeConfig.maxNetworkRetries || 3,
            telemetry: this.stripeConfig.enableTelemetry || false,
        });
    }

    protected async onInitialize(): Promise<void> {
        // Test Stripe API connectivity
        await this.validateApiKey();
        this.emit('service:ready', { service: 'stripe' });

        this.logger.info('StripeService initialized');
    }

    protected async onShutdown(): Promise<void> {
        this.emit('service:shutdown', { service: 'stripe' });
        this.logger.info('StripeService shut down');
    }

    protected async onHealthCheck(): Promise<Array<{ name: string; healthy: boolean; message?: string; }>> {
        const checks = [];
        
        try {
            // Test Stripe API connectivity
            await this.stripe.accounts.retrieve();
            checks.push({
                name: 'stripe-api',
                healthy: true,
                message: 'Connected to Stripe API'
            });
        } catch (error) {
            checks.push({
                name: 'stripe-api',
                healthy: false,
                message: `Stripe API error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }

        return checks;
    }

    private async validateApiKey(): Promise<void> {
        try {
            await this.stripe.accounts.retrieve();
        } catch (error) {
            throw new Error(`Invalid Stripe API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Initialize with business context
     */
    async initializeWithBusinessContext(context: BusinessDomainModel): Promise<void> {
        this.businessContext = context;
        BusinessTypeRegistry.initialize(context);
        
        this.logger.info('Stripe service initialized with business context', {
            businessType: context.businessType,
            entities: Object.keys(context.entities),
        });
    }

    // ==========================================================================
    // CUSTOMER MANAGEMENT WITH BUSINESS CONTEXT
    // ==========================================================================

    /**
     * Create a customer with business context mapping
     */
    async createCustomer(
        params: {
            email: string;
            name?: string;
            phone?: string;
            description?: string;
            metadata?: Record<string, string>;
        },
        progressCallback?: LLMProgressCallback
    ): Promise<StripeCustomerResponse> {
        return this.execute('createCustomer', async () => {
            try {
                progressCallback?.({
                    type: 'progress',
                    message: 'Creating Stripe customer',
                    progress: 25,
                    data: { email: params.email },
                    timestamp: new Date(),
                });

                const createParams: any = {
                    email: params.email,
                };

                // Only add optional parameters if they are defined
                if (params.name) {
                    createParams.name = params.name;
                }
                if (params.phone) {
                    createParams.phone = params.phone;
                }
                if (params.description) {
                    createParams.description = params.description;
                }
                if (params.metadata) {
                    createParams.metadata = params.metadata;
                }

                const customer = await this.stripe.customers.create(createParams);

                const customerData: StripeCustomerData = {
                    id: customer.id,
                    email: customer.email!,
                    name: customer.name || '',
                    phone: customer.phone || '',
                    created: new Date(customer.created * 1000),
                    metadata: customer.metadata,
                };

                // Map to business context instead of Universal type
                const businessEntity = await this.mapToBusinessContext('customer', customerData);

                const response: StripeCustomerResponse = {
                    customer: customerData,
                    businessEntity,
                    success: true,
                    message: `Customer created successfully`,
                };

                this.emit('customer-created', { customer: customerData, businessEntity });

                progressCallback?.({
                    type: 'complete',
                    message: 'Customer created and mapped to business context',
                    progress: 100,
                    data: response,
                    timestamp: new Date(),
                });

                this.logger.info('Customer created successfully', {
                    customerId: customer.id,
                    email: customer.email,
                    businessType: this.businessContext?.businessType,
                });

                return response;
            } catch (error: any) {
                // Handle Stripe-specific errors
                if (error.type === 'StripeInvalidRequestError') {
                    throw new Error(error.message);
                }
                if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                    throw new Error(`Network timeout: ${error.message}`);
                }
                if (error.statusCode === 429) {
                    throw new Error(`Rate limit exceeded: ${error.message}`);
                }
                throw error;
            }
        });
    }

    /**
     * Get customer by ID with business context mapping
     */
    async getCustomer(
        customerId: string,
        progressCallback?: LLMProgressCallback
    ): Promise<StripeCustomerResponse> {
        return this.execute('getCustomer', async () => {
            try {
                progressCallback?.({
                    type: 'progress',
                    message: 'Retrieving customer from Stripe',
                    progress: 50,
                    data: { customerId },
                    timestamp: new Date(),
                });

                const customer = await this.stripe.customers.retrieve(customerId);

                if (customer.deleted) {
                    throw new Error(`Customer ${customerId} has been deleted`);
                }

                const customerData: StripeCustomerData = {
                    id: customer.id,
                    email: customer.email!,
                    name: customer.name || '',
                    phone: customer.phone || '',
                    created: new Date(customer.created * 1000),
                    metadata: customer.metadata,
                };

                // Map to business context
                const businessEntity = await this.mapToBusinessContext('customer', customerData);

                const response: StripeCustomerResponse = {
                    customer: customerData,
                    businessEntity,
                    success: true,
                    message: `Customer retrieved successfully`,
                };

                progressCallback?.({
                    type: 'complete',
                    message: 'Customer retrieved and mapped to business context',
                    progress: 100,
                    data: response,
                    timestamp: new Date(),
                });

                return response;
            } catch (error: any) {
                // Handle Stripe-specific errors
                if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
                    throw new Error(error.message);
                }
                throw error;
            }
        });
    }

    // ==========================================================================
    // PAYMENT PROCESSING WITH BUSINESS CONTEXT
    // ==========================================================================

    /**
     * Create a payment intent with business context mapping
     */
    async createPaymentIntent(
        params: CreatePaymentIntentParams,
        progressCallback?: LLMProgressCallback
    ): Promise<StripePaymentResponse> {
        return this.execute('createPaymentIntent', async () => {
            try {
                progressCallback?.({
                    type: 'progress',
                    message: 'Creating payment intent',
                    progress: 25,
                    data: { amount: params.amount, currency: params.currency },
                    timestamp: new Date(),
                });

                const createParams: any = {
                    amount: Math.round(params.amount), // Amount should be in cents
                    currency: params.currency.toLowerCase(),
                    capture_method: params.captureMethod || 'automatic',
                    metadata: params.metadata || {},
                };

                // Only add optional parameters if they exist
                if (params.customerId) {
                    createParams.customer = params.customerId;
                }
                if (params.paymentMethodId) {
                    createParams.payment_method = params.paymentMethodId;
                }
                if (params.description) {
                    createParams.description = params.description;
                }
                if (params.automaticPaymentMethods) {
                    createParams.automatic_payment_methods = { enabled: true };
                }

                const paymentIntent = await this.stripe.paymentIntents.create(createParams);

                const paymentData: StripePaymentData = {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount, // Keep in cents for consistency with Stripe API
                    currency: paymentIntent.currency.toUpperCase(),
                    status: paymentIntent.status,
                    clientSecret: paymentIntent.client_secret,
                    metadata: paymentIntent.metadata,
                };

                // Only add customerId if it exists
                if (paymentIntent.customer) {
                    (paymentData as any).customerId = paymentIntent.customer as string;
                }

                const businessEntity = await this.mapToBusinessContext('payment', paymentData);

                const response: StripePaymentResponse = {
                    paymentIntent: paymentData,
                    businessEntity,
                    success: true,
                    message: 'Payment intent created successfully',
                };

                this.emit('payment-intent-created', { paymentIntent: paymentData, businessEntity });

                progressCallback?.({
                    type: 'complete',
                    message: 'Payment intent created and mapped',
                    progress: 100,
                    data: response,
                    timestamp: new Date(),
                });

                return response;
            } catch (error: any) {
                // Handle Stripe-specific errors
                if (error.type === 'StripeCardError') {
                    throw new Error(error.message);
                }
                if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                    throw new Error(`Network timeout: ${error.message}`);
                }
                if (error.statusCode === 429) {
                    throw new Error(`Rate limit exceeded: ${error.message}`);
                }
                throw error;
            }
        });
    }

    // ==========================================================================
    // ADDITIONAL STRIPE OPERATIONS
    // ==========================================================================

    /**
     * List customers
     */
    async listCustomers(options: any, _progressCallback?: (event: any) => void): Promise<any> {
        return this.execute('listCustomers', async () => {
            const customers = await this.stripe.customers.list(options);

            return {
                data: customers.data.map(customer => ({
                    customer: {
                        id: customer.id,
                        email: customer.email,
                        name: customer.name,
                        phone: customer.phone,
                        created: new Date(customer.created * 1000),
                        metadata: customer.metadata
                    }
                })),
                has_more: customers.has_more,
                totalCount: customers.data.length
            };
        });
    }

    /**
     * Confirm payment intent
     */
    async confirmPaymentIntent(paymentIntentId: string, options: any = {}, _progressCallback?: (event: any) => void): Promise<any> {
        return this.execute('confirmPaymentIntent', async () => {
            const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, options);

            const paymentData = {
                id: paymentIntent.id,
                status: paymentIntent.status,
                amount: paymentIntent.amount, // Keep in cents
                currency: paymentIntent.currency,
                clientSecret: paymentIntent.client_secret,
                paymentMethod: paymentIntent.payment_method
            };

            return {
                success: true,
                message: 'Payment intent confirmed successfully',
                paymentIntent: paymentData
            };
        });
    }

    /**
     * List payment intents
     */
    async listPaymentIntents(options: any, _progressCallback?: (event: any) => void): Promise<any> {
        return this.execute('listPaymentIntents', async () => {
            const paymentIntents = await this.stripe.paymentIntents.list(options);

            return {
                data: paymentIntents.data.map(pi => ({
                    id: pi.id,
                    amount: pi.amount, // Keep in cents
                    currency: pi.currency,
                    status: pi.status,
                    created: new Date(pi.created * 1000),
                    customerId: pi.customer as string
                })),
                has_more: paymentIntents.has_more,
                totalCount: paymentIntents.data.length
            };
        });
    }

    /**
     * Create subscription
     */
    async createSubscription(params: any, _progressCallback?: (event: any) => void): Promise<any> {
        return this.execute('createSubscription', async () => {
            const subscription = await this.stripe.subscriptions.create(params);

            const subscriptionData = {
                id: subscription.id,
                status: subscription.status,
                customerId: subscription.customer as string,
                currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
                currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                items: subscription.items.data
            };

            return {
                success: true,
                message: 'Subscription created successfully',
                subscription: subscriptionData
            };
        });
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId: string, options: any = {}, _progressCallback?: (event: any) => void): Promise<any> {
        return this.execute('cancelSubscription', async () => {
            const subscription = await this.stripe.subscriptions.cancel(subscriptionId, options);

            const subscriptionData = {
                id: subscription.id,
                status: subscription.status,
                canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
            };

            return {
                success: true,
                message: 'Subscription canceled successfully',
                subscription: subscriptionData
            };
        });
    }

    /**
     * List subscriptions
     */
    async listSubscriptions(options: any, _progressCallback?: (event: any) => void): Promise<any> {
        return this.execute('listSubscriptions', async () => {
            const subscriptions = await this.stripe.subscriptions.list(options);

            return {
                data: subscriptions.data.map(sub => ({
                    id: sub.id,
                    status: sub.status,
                    customerId: sub.customer as string,
                    currentPeriodStart: new Date((sub as any).current_period_start * 1000),
                    currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
                    items: sub.items.data
                })),
                has_more: subscriptions.has_more,
                totalCount: subscriptions.data.length
            };
        });
    }

    /**
     * List products
     */
    async listProducts(options: any, _progressCallback?: (event: any) => void): Promise<any> {
        return this.execute('listProducts', async () => {
            const products = await this.stripe.products.list(options);

            return {
                products: products.data.map(product => ({
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    active: product.active,
                    created: new Date(product.created * 1000),
                    metadata: product.metadata
                })),
                hasMore: products.has_more,
                totalCount: products.data.length
            };
        });
    }

    /**
     * Get a single product by ID
     */
    async getProduct(productId: string, _progressCallback?: (event: any) => void): Promise<any> {
        return this.execute('getProduct', async () => {
            const product = await this.stripe.products.retrieve(productId);

            return {
                product: {
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    active: product.active,
                    created: new Date(product.created * 1000),
                    updated: new Date(product.updated * 1000),
                    metadata: product.metadata,
                    images: product.images,
                    defaultPrice: product.default_price,
                    url: product.url,
                }
            };
        });
    }

    /**
     * List prices
     */
    async listPrices(options: any, _progressCallback?: (event: any) => void): Promise<any> {
        return this.execute('listPrices', async () => {
            const prices = await this.stripe.prices.list(options);
            
            return {
                prices: prices.data.map(price => ({
                    id: price.id,
                    productId: price.product,
                    unitAmount: price.unit_amount ? price.unit_amount / 100 : null,
                    currency: price.currency,
                    type: price.type,
                    active: price.active,
                    created: new Date(price.created * 1000)
                })),
                hasMore: prices.has_more,
                totalCount: prices.data.length
            };
        });
    }

    // ==========================================================================
    // BUSINESS CONTEXT MAPPING
    // ==========================================================================

    /**
     * Map Stripe data to business context
     */
    private async mapToBusinessContext(entityType: string, stripeData: any): Promise<any> {
        if (!this.businessContext) {
            // Return generic business entity if no context available
            return {
                ...stripeData,
                sourceService: 'stripe',
                updatedAt: new Date(),
            };
        }

        try {
            return transformToBusinessEntity(entityType, {
                ...stripeData,
                sourceService: 'stripe',
            });
        } catch (error) {
            this.logger.warn('Failed to map to business context, using generic mapping', {
                entityType,
                error: String(error),
            });

            return {
                ...stripeData,
                sourceService: 'stripe',
                updatedAt: new Date(),
            };
        }
    }

    /**
     * Handle Stripe API errors
     */
    private handleStripeError(error: any): StripeServiceError {
        if (error instanceof Stripe.errors.StripeError) {
            return {
                type: 'stripe_error',
                message: error.message,
                code: error.code || 'unknown',
                statusCode: error.statusCode || 500,
                details: {
                    decline_code: (error as any).decline_code,
                    param: (error as any).param,
                    request_log_url: (error as any).request_log_url,
                },
            };
        }

        return {
            type: 'network_error',
            message: error.message || 'Unknown error occurred',
            code: 'unknown',
            statusCode: 500,
        };
    }

    /**
     * Get service capabilities
     */
    getCapabilities(): string[] {
        return [
            'customer-management',
            'payment-processing',
            'subscription-management',
            'business-context-mapping',
            'real-time-progress',
            'structured-errors',
        ];
    }

    /**
     * Get business context information
     */
    getBusinessContext(): BusinessDomainModel | null {
        return this.businessContext || null;
    }
} 