/**
 * StripeService - Core Stripe API integration service
 * 
 * @package     @imajin/cli
 * @subpackage  services/stripe
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see        docs/services/stripe-api.md
 * 
 * Integration Points:
 * - Stripe SDK with automatic retries
 * - Webhook event handling for real-time updates
 * - Structured logging for debugging
 * - Rate limiting and error handling
 * - Type-safe API responses
 */

import { EventEmitter } from 'events';
import Stripe from 'stripe';
import type { Logger } from '../logging/Logger.js';
import type { LLMProgressCallback, LLMProgressEvent } from '../types/LLM.js';
import type {
    CreatePaymentIntentParams,
    StripeConfig,
    StripePaymentResponse,
    StripeServiceError,
} from '../types/Stripe.js';

export class StripeService extends EventEmitter {
    private readonly client: Stripe;
    private readonly config: StripeConfig;
    private readonly logger: Logger;

    constructor(config: StripeConfig, logger: Logger) {
        super();
        this.config = config;
        this.logger = logger;
        this.client = new Stripe(config.apiKey, {
            apiVersion: config.apiVersion as Stripe.LatestApiVersion,
            timeout: config.timeout,
            maxNetworkRetries: config.maxNetworkRetries,
        });

        this.logger.info('StripeService initialized');
    }

    /**
     * Create a payment intent with real-time progress
     */
    async createPaymentIntent(
        params: CreatePaymentIntentParams,
        progressCallback?: LLMProgressCallback
    ): Promise<StripePaymentResponse> {
        this.emitProgress(progressCallback, {
            type: 'start',
            message: 'Creating payment intent...',
            progress: 0,
            data: { amount: params.amount, currency: params.currency },
            timestamp: new Date(),
        });

        try {
            const createParams: Stripe.PaymentIntentCreateParams = {
                amount: params.amount,
                currency: params.currency,
                metadata: params.metadata || {},
                capture_method: params.captureMethod,
            };

            if (params.customerId) createParams.customer = params.customerId;
            if (params.paymentMethodId) createParams.payment_method = params.paymentMethodId;
            if (params.description) createParams.description = params.description;
            if (params.automaticPaymentMethods) {
                createParams.automatic_payment_methods = { enabled: true };
            }

            const paymentIntent = await this.client.paymentIntents.create(createParams);

            this.emitProgress(progressCallback, {
                type: 'complete',
                message: `Payment intent created: ${paymentIntent.id}`,
                progress: 100,
                data: { paymentIntentId: paymentIntent.id },
                timestamp: new Date(),
            });

            const response: StripePaymentResponse = {
                paymentIntent: {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    status: paymentIntent.status,
                    ...(paymentIntent.client_secret && { clientSecret: paymentIntent.client_secret }),
                    ...(paymentIntent.customer && { customerId: paymentIntent.customer as string }),
                    ...(paymentIntent.metadata && { metadata: paymentIntent.metadata }),
                },
                success: true,
                message: 'Payment intent created successfully',
            };

            this.logger.info('Payment intent created', { paymentIntentId: paymentIntent.id });
            return response;

        } catch (error) {
            const stripeError = this.handleStripeError(error);

            this.emitProgress(progressCallback, {
                type: 'error',
                message: `Failed to create payment intent: ${stripeError.message}`,
                progress: 0,
                data: stripeError,
                timestamp: new Date(),
            });

            this.logger.error('Failed to create payment intent', new Error(stripeError.message), {
                type: stripeError.type
            });
            throw stripeError;
        }
    }

    /**
     * Create a customer with real-time progress
     */
    async createCustomer(
        customerData: Stripe.CustomerCreateParams,
        progressCallback?: LLMProgressCallback
    ): Promise<Stripe.Customer> {
        this.emitProgress(progressCallback, {
            type: 'start',
            message: 'Creating customer...',
            progress: 0,
            data: { email: customerData.email, name: customerData.name },
            timestamp: new Date(),
        });

        try {
            const customer = await this.client.customers.create(customerData);

            this.emitProgress(progressCallback, {
                type: 'complete',
                message: `Customer created: ${customer.id}`,
                progress: 100,
                data: { customerId: customer.id },
                timestamp: new Date(),
            });

            this.logger.info('Customer created', { customerId: customer.id });
            return customer;

        } catch (error) {
            const stripeError = this.handleStripeError(error);

            this.emitProgress(progressCallback, {
                type: 'error',
                message: `Failed to create customer: ${stripeError.message}`,
                progress: 0,
                data: stripeError,
                timestamp: new Date(),
            });

            this.logger.error('Failed to create customer', new Error(stripeError.message), {
                type: stripeError.type
            });
            throw stripeError;
        }
    }

    /**
     * Update a subscription with real-time progress
     */
    async updateSubscription(
        subscriptionId: string,
        updateData: Stripe.SubscriptionUpdateParams,
        progressCallback?: LLMProgressCallback
    ): Promise<Stripe.Subscription> {
        this.emitProgress(progressCallback, {
            type: 'start',
            message: 'Updating subscription...',
            progress: 0,
            data: { subscriptionId },
            timestamp: new Date(),
        });

        try {
            const subscription = await this.client.subscriptions.update(subscriptionId, updateData);

            this.emitProgress(progressCallback, {
                type: 'complete',
                message: `Subscription updated: ${subscription.id}`,
                progress: 100,
                data: { subscriptionId: subscription.id },
                timestamp: new Date(),
            });

            this.logger.info('Subscription updated', { subscriptionId: subscription.id });
            return subscription;

        } catch (error) {
            const stripeError = this.handleStripeError(error);

            this.emitProgress(progressCallback, {
                type: 'error',
                message: `Failed to update subscription: ${stripeError.message}`,
                progress: 0,
                data: stripeError,
                timestamp: new Date(),
            });

            this.logger.error('Failed to update subscription', new Error(stripeError.message), {
                type: stripeError.type
            });
            throw stripeError;
        }
    }

    /**
     * Get service capabilities for LLM introspection
     */
    getCapabilities(): string[] {
        return [
            'payment-processing',
            'subscription-management',
            'customer-management',
            'webhook-handling',
            'real-time-events',
        ];
    }

    /**
     * Handle Stripe errors consistently
     */
    private handleStripeError(error: any): StripeServiceError {
        if (error instanceof Stripe.errors.StripeError) {
            return {
                type: 'stripe_error',
                ...(error.code && { code: error.code }),
                message: error.message,
                details: error,
                ...(error.requestId && { requestId: error.requestId }),
            };
        }

        return {
            type: 'network_error',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            details: error,
        };
    }

    /**
     * Emit progress events to LLM
     */
    private emitProgress(
        callback: LLMProgressCallback | undefined,
        event: LLMProgressEvent
    ): void {
        if (callback) {
            callback(event);
        }
        // Also emit as service event for real-time coordination
        this.emit('progress', event);
    }
} 