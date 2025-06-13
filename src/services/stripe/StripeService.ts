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
import { EventEmitter } from 'events';
import type { Logger } from '../../logging/Logger.js';
import type { LLMProgressCallback, LLMProgressEvent } from '../../types/LLM.js';
import { BusinessTypeRegistry } from '../../context/BusinessTypeRegistry.js';
import { transformToBusinessEntity } from '../../context/BusinessSchemaRegistry.js';
import type { BusinessDomainModel } from '../../context/BusinessContextProcessor.js';
import type {
    StripeConfig,
    StripeCustomerData,
    StripeCustomerResponse,
    StripePaymentData,
    StripePaymentResponse,
    StripeSubscriptionData,
    StripeSubscriptionResponse,
    CreatePaymentIntentParams,
    StripeCommandContext,
    StripeServiceError,
} from '../../types/Stripe.js';

/**
 * Business Context-Aware Stripe Service
 */
export class StripeService extends EventEmitter {
    private stripe: Stripe;
    private logger: Logger;
    private businessContext?: BusinessDomainModel;

    constructor(
        private config: StripeConfig,
        logger: Logger
    ) {
        super();
        this.logger = logger;
        
        this.stripe = new Stripe(config.apiKey, {
            apiVersion: config.apiVersion as any,
            timeout: config.timeout,
            maxNetworkRetries: config.maxNetworkRetries,
            telemetry: config.enableTelemetry,
        });

        this.logger.info('StripeService initialized', {
            service: 'stripe',
            apiVersion: config.apiVersion,
        });
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
        const operationId = `create-customer-${Date.now()}`;
        
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

        } catch (error) {
            const stripeError = this.handleStripeError(error);
            
            progressCallback?.({
                type: 'error',
                message: 'Failed to create customer',
                progress: 100,
                data: { error: stripeError },
                timestamp: new Date(),
            });

            throw stripeError;
        }
    }

    /**
     * Get customer by ID with business context mapping
     */
    async getCustomer(
        customerId: string,
        progressCallback?: LLMProgressCallback
    ): Promise<StripeCustomerResponse> {
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

            const businessEntity = await this.mapToBusinessContext('customer', customerData);

            progressCallback?.({
                type: 'complete',
                message: 'Customer retrieved and mapped',
                progress: 100,
                data: { customer: customerData },
                timestamp: new Date(),
            });

            return {
                customer: customerData,
                businessEntity,
                success: true,
                message: 'Customer retrieved successfully',
            };

        } catch (error) {
            const stripeError = this.handleStripeError(error);
            
            progressCallback?.({
                type: 'error',
                message: 'Failed to retrieve customer',
                progress: 100,
                data: { error: stripeError },
                timestamp: new Date(),
            });

            throw stripeError;
        }
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
        try {
            progressCallback?.({
                type: 'progress',
                message: 'Creating payment intent',
                progress: 25,
                data: { amount: params.amount, currency: params.currency },
                timestamp: new Date(),
            });

            const createParams: any = {
                amount: Math.round(params.amount * 100), // Convert to cents
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
                amount: paymentIntent.amount / 100, // Convert back from cents
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

        } catch (error) {
            const stripeError = this.handleStripeError(error);
            
            progressCallback?.({
                type: 'error',
                message: 'Failed to create payment intent',
                progress: 100,
                data: { error: stripeError },
                timestamp: new Date(),
            });

            throw stripeError;
        }
    }

    // ==========================================================================
    // ADDITIONAL STRIPE OPERATIONS
    // ==========================================================================

    /**
     * List customers
     */
    async listCustomers(options: any, progressCallback?: (event: any) => void): Promise<any> {
        try {
            const customers = await this.stripe.customers.list(options);
            
            return {
                customers: customers.data.map(customer => ({
                    id: customer.id,
                    email: customer.email,
                    name: customer.name,
                    phone: customer.phone,
                    created: new Date(customer.created * 1000),
                    metadata: customer.metadata
                })),
                hasMore: customers.has_more,
                totalCount: customers.data.length
            };
        } catch (error) {
            throw this.handleStripeError(error);
        }
    }

    /**
     * Confirm payment intent
     */
    async confirmPaymentIntent(paymentIntentId: string, options: any = {}, progressCallback?: (event: any) => void): Promise<any> {
        try {
            const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, options);
            
            return {
                id: paymentIntent.id,
                status: paymentIntent.status,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                clientSecret: paymentIntent.client_secret,
                paymentMethod: paymentIntent.payment_method
            };
        } catch (error) {
            throw this.handleStripeError(error);
        }
    }

    /**
     * List payment intents
     */
    async listPaymentIntents(options: any, progressCallback?: (event: any) => void): Promise<any> {
        try {
            const paymentIntents = await this.stripe.paymentIntents.list(options);
            
            return {
                payments: paymentIntents.data.map(pi => ({
                    id: pi.id,
                    amount: pi.amount / 100,
                    currency: pi.currency,
                    status: pi.status,
                    created: new Date(pi.created * 1000),
                    customerId: pi.customer as string
                })),
                hasMore: paymentIntents.has_more,
                totalCount: paymentIntents.data.length
            };
        } catch (error) {
            throw this.handleStripeError(error);
        }
    }

    /**
     * Create subscription
     */
    async createSubscription(params: any, progressCallback?: (event: any) => void): Promise<any> {
        try {
            const subscription = await this.stripe.subscriptions.create(params);
            
            return {
                id: subscription.id,
                status: subscription.status,
                customerId: subscription.customer as string,
                currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
                currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                items: subscription.items.data
            };
        } catch (error) {
            throw this.handleStripeError(error);
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId: string, options: any = {}, progressCallback?: (event: any) => void): Promise<any> {
        try {
            const subscription = await this.stripe.subscriptions.cancel(subscriptionId, options);
            
            return {
                id: subscription.id,
                status: subscription.status,
                canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
            };
        } catch (error) {
            throw this.handleStripeError(error);
        }
    }

    /**
     * List subscriptions
     */
    async listSubscriptions(options: any, progressCallback?: (event: any) => void): Promise<any> {
        try {
            const subscriptions = await this.stripe.subscriptions.list(options);
            
            return {
                subscriptions: subscriptions.data.map(sub => ({
                    id: sub.id,
                    status: sub.status,
                    customerId: sub.customer as string,
                    currentPeriodStart: new Date((sub as any).current_period_start * 1000),
                    currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
                    items: sub.items.data
                })),
                hasMore: subscriptions.has_more,
                totalCount: subscriptions.data.length
            };
        } catch (error) {
            throw this.handleStripeError(error);
        }
    }

    /**
     * List products
     */
    async listProducts(options: any, progressCallback?: (event: any) => void): Promise<any> {
        try {
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
        } catch (error) {
            throw this.handleStripeError(error);
        }
    }

    /**
     * List prices
     */
    async listPrices(options: any, progressCallback?: (event: any) => void): Promise<any> {
        try {
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
        } catch (error) {
            throw this.handleStripeError(error);
        }
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