/**
 * StripeTestData - Test data factory for Stripe API objects
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
 * - Stripe service testing
 * - HTTP mock response data
 * - Integration test fixtures
 */

export class StripeTestData {
    /**
     * Create mock Stripe customer object
     */
    static createCustomer(overrides?: Partial<StripeCustomer>): StripeCustomer {
        return {
            id: 'cus_test_123',
            object: 'customer',
            address: undefined,
            balance: 0,
            created: Math.floor(Date.now() / 1000),
            currency: 'usd',
            default_source: undefined,
            delinquent: false,
            description: 'Test customer for integration tests',
            discount: null,
            email: 'test@example.com',
            invoice_prefix: 'TEST',
            invoice_settings: {
                custom_fields: null,
                default_payment_method: null,
                footer: null,
                rendering_options: null
            },
            livemode: false,
            metadata: {},
            name: 'Test Customer',
            next_invoice_sequence: 1,
            phone: '+1234567890',
            preferred_locales: ['en'],
            shipping: null,
            tax_exempt: 'none',
            test_clock: null,
            ...overrides
        };
    }

    /**
     * Create mock Stripe payment intent object
     */
    static createPaymentIntent(overrides?: Partial<StripePaymentIntent>): StripePaymentIntent {
        return {
            id: 'pi_test_123',
            object: 'payment_intent',
            amount: 2000,
            amount_capturable: 0,
            amount_details: {
                tip: {}
            },
            amount_received: 0,
            application: undefined,
            application_fee_amount: undefined,
            automatic_payment_methods: undefined,
            canceled_at: undefined,
            cancellation_reason: undefined,
            capture_method: 'automatic',
            client_secret: 'pi_test_123_secret_test',
            confirmation_method: 'automatic',
            created: Math.floor(Date.now() / 1000),
            currency: 'usd',
            customer: 'cus_test_123',
            description: 'Test payment intent',
            invoice: undefined,
            last_payment_error: undefined,
            latest_charge: undefined,
            livemode: false,
            metadata: {},
            next_action: undefined,
            on_behalf_of: undefined,
            payment_method: undefined,
            payment_method_options: {},
            payment_method_types: ['card'],
            processing: undefined,
            receipt_email: 'test@example.com',
            review: undefined,
            setup_future_usage: undefined,
            shipping: undefined,
            source: undefined,
            statement_descriptor: undefined,
            statement_descriptor_suffix: undefined,
            status: 'requires_payment_method',
            transfer_data: undefined,
            transfer_group: undefined,
            ...overrides
        };
    }

    /**
     * Create mock Stripe subscription object
     */
    static createSubscription(overrides?: Partial<StripeSubscription>): StripeSubscription {
        return {
            id: 'sub_test_123',
            object: 'subscription',
            application: null,
            application_fee_percent: null,
            automatic_tax: {
                enabled: false
            },
            billing_cycle_anchor: Math.floor(Date.now() / 1000),
            billing_thresholds: null,
            cancel_at: null,
            cancel_at_period_end: false,
            canceled_at: null,
            cancellation_details: {
                comment: null,
                feedback: null,
                reason: null
            },
            collection_method: 'charge_automatically',
            created: Math.floor(Date.now() / 1000),
            currency: 'usd',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
            current_period_start: Math.floor(Date.now() / 1000),
            customer: 'cus_test_123',
            days_until_due: null,
            default_payment_method: null,
            default_source: null,
            default_tax_rates: [],
            description: null,
            discount: null,
            ended_at: null,
            invoice_settings: {
                issuer: {
                    type: 'self'
                }
            },
            items: {
                object: 'list',
                data: [
                    {
                        id: 'si_test_123',
                        object: 'subscription_item',
                        billing_thresholds: null,
                        created: Math.floor(Date.now() / 1000),
                        metadata: {},
                        price: {
                            id: 'price_test_123',
                            object: 'price',
                            active: true,
                            billing_scheme: 'per_unit',
                            created: Math.floor(Date.now() / 1000),
                            currency: 'usd',
                            custom_unit_amount: null,
                            livemode: false,
                            lookup_key: null,
                            metadata: {},
                            nickname: 'Pro Plan',
                            product: 'prod_test_123',
                            recurring: {
                                aggregate_usage: null,
                                interval: 'month',
                                interval_count: 1,
                                trial_period_days: null,
                                usage_type: 'licensed'
                            },
                            tax_behavior: 'unspecified',
                            tiers_mode: null,
                            transform_quantity: null,
                            type: 'recurring',
                            unit_amount: 2000,
                            unit_amount_decimal: '2000'
                        },
                        quantity: 1,
                        subscription: 'sub_test_123',
                        tax_rates: []
                    }
                ],
                has_more: false,
                total_count: 1,
                url: '/v1/subscription_items?subscription=sub_test_123'
            },
            latest_invoice: 'in_test_123',
            livemode: false,
            metadata: {},
            next_pending_invoice_item_invoice: null,
            on_behalf_of: null,
            pause_collection: null,
            payment_settings: {
                payment_method_options: null,
                payment_method_types: null,
                save_default_payment_method: 'off'
            },
            pending_invoice_item_interval: null,
            pending_setup_intent: null,
            pending_update: null,
            schedule: null,
            start_date: Math.floor(Date.now() / 1000),
            status: 'active',
            test_clock: null,
            transfer_data: null,
            trial_end: null,
            trial_settings: {
                end_behavior: {
                    missing_payment_method: 'create_invoice'
                }
            },
            trial_start: null,
            ...overrides
        };
    }

    /**
     * Create mock Stripe product object
     */
    static createProduct(overrides?: Partial<StripeProduct>): StripeProduct {
        return {
            id: 'prod_test_123',
            object: 'product',
            active: true,
            attributes: [],
            created: Math.floor(Date.now() / 1000),
            default_price: 'price_test_123',
            description: 'Test product for integration tests',
            images: [],
            livemode: false,
            metadata: {},
            name: 'Test Product',
            package_dimensions: null,
            shippable: null,
            statement_descriptor: null,
            tax_code: null,
            type: 'service',
            unit_label: null,
            updated: Math.floor(Date.now() / 1000),
            url: null,
            ...overrides
        };
    }

    /**
     * Create mock Stripe invoice object
     */
    static createInvoice(overrides?: Partial<StripeInvoice>): StripeInvoice {
        return {
            id: 'in_test_123',
            object: 'invoice',
            account_country: 'US',
            account_name: 'Test Account',
            account_tax_ids: null,
            amount_due: 2000,
            amount_paid: 0,
            amount_remaining: 2000,
            amount_shipping: 0,
            application: null,
            application_fee_amount: null,
            attempt_count: 0,
            attempted: false,
            auto_advance: true,
            automatic_tax: {
                enabled: false,
                status: null
            },
            billing_reason: 'subscription_cycle',
            charge: null,
            collection_method: 'charge_automatically',
            created: Math.floor(Date.now() / 1000),
            currency: 'usd',
            custom_fields: null,
            customer: 'cus_test_123',
            customer_address: null,
            customer_email: 'test@example.com',
            customer_name: 'Test Customer',
            customer_phone: null,
            customer_shipping: null,
            customer_tax_exempt: 'none',
            customer_tax_ids: [],
            default_payment_method: null,
            default_source: null,
            default_tax_rates: [],
            description: null,
            discount: null,
            discounts: [],
            due_date: Math.floor(Date.now() / 1000) + 86400, // 1 day
            effective_at: null,
            ending_balance: null,
            footer: null,
            from_invoice: null,
            hosted_invoice_url: 'https://invoice.stripe.com/i/test',
            invoice_pdf: 'https://pay.stripe.com/invoice/test/pdf',
            issuer: {
                type: 'self'
            },
            last_finalization_error: null,
            latest_revision: null,
            lines: {
                object: 'list',
                data: [],
                has_more: false,
                total_count: 0,
                url: '/v1/invoices/in_test_123/lines'
            },
            livemode: false,
            metadata: {},
            next_payment_attempt: Math.floor(Date.now() / 1000) + 86400,
            number: 'TEST-001',
            on_behalf_of: null,
            paid: false,
            paid_out_of_band: false,
            payment_intent: 'pi_test_123',
            payment_settings: {
                default_mandate: null,
                payment_method_options: null,
                payment_method_types: null
            },
            period_end: Math.floor(Date.now() / 1000),
            period_start: Math.floor(Date.now() / 1000) - 2592000,
            post_payment_credit_notes_amount: 0,
            pre_payment_credit_notes_amount: 0,
            quote: null,
            receipt_number: null,
            rendering: null,
            rendering_options: null,
            shipping_cost: null,
            shipping_details: null,
            starting_balance: 0,
            statement_descriptor: null,
            status: 'draft',
            status_transitions: {
                finalized_at: null,
                marked_uncollectible_at: null,
                paid_at: null,
                voided_at: null
            },
            subscription: 'sub_test_123',
            subscription_details: {
                metadata: {}
            },
            subtotal: 2000,
            subtotal_excluding_tax: null,
            tax: null,
            test_clock: null,
            total: 2000,
            total_discount_amounts: [],
            total_excluding_tax: null,
            total_tax_amounts: [],
            transfer_data: null,
            webhooks_delivered_at: null,
            ...overrides
        };
    }

    /**
     * Create mock error response
     */
    static createError(type: string = 'card_error', code?: string): StripeError {
        return {
            error: {
                type,
                code: code || 'card_declined',
                decline_code: 'generic_decline',
                message: 'Your card was declined.',
                param: undefined,
                payment_intent: {
                    id: 'pi_test_123',
                    last_payment_error: {
                        type,
                        code: code || 'card_declined',
                        decline_code: 'generic_decline',
                        message: 'Your card was declined.'
                    }
                }
            }
        };
    }

    /**
     * Create mock successful API response
     */
    static createApiResponse<T>(data: T): StripeApiResponse<T> {
        return {
            data,
            status: 200,
            headers: {
                'content-type': 'application/json',
                'request-id': 'req_test_123'
            }
        };
    }

    /**
     * Create mock list response
     */
    static createListResponse<T>(data: T[], hasMore: boolean = false): StripeListResponse<T> {
        return {
            object: 'list',
            data,
            has_more: hasMore,
            url: '/v1/test',
            total_count: data.length
        };
    }

    /**
     * Create valid customer data for testing
     */
    createValidCustomerData(): any {
        return {
            email: 'test@example.com',
            name: 'Test Customer',
            description: 'Performance test customer'
        };
    }

    /**
     * Create valid payment data for testing  
     */
    createValidPaymentData(): any {
        return {
            amount: 2000,
            currency: 'usd',
            payment_method_types: ['card'],
            description: 'Performance test payment'
        };
    }

    /**
     * Create valid subscription data for testing
     */
    createValidSubscriptionData(): any {
        return {
            customer: 'cus_test_123',
            items: [{
                price: 'price_test_123'
            }]
        };
    }

    /**
     * Create mock customer for testing
     */
    createMockCustomer(overrides?: any): any {
        return StripeTestData.createCustomer(overrides);
    }

    /**
     * Create mock customer list for testing
     */
    createMockCustomerList(): any {
        return StripeTestData.createListResponse([
            StripeTestData.createCustomer(),
            StripeTestData.createCustomer({ id: 'cus_test_456' }),
            StripeTestData.createCustomer({ id: 'cus_test_789' })
        ]);
    }

    /**
     * Create mock payment intent for testing
     */
    createMockPaymentIntent(overrides?: any): any {
        return StripeTestData.createPaymentIntent(overrides);
    }

    /**
     * Create mock subscription for testing
     */
    createMockSubscription(overrides?: any): any {
        return StripeTestData.createSubscription(overrides);
    }
}

// Type definitions for Stripe objects (simplified for testing)
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
export interface StripeCustomer {
    id: string;
    object: 'customer';
    address?: any | undefined;
    balance: number;
    created: number;
    currency?: string | undefined;
    default_source?: string | undefined;
    delinquent: boolean;
    description?: string | undefined;
    discount?: any | undefined;
    email?: string | undefined;
    invoice_prefix: string;
    invoice_settings: any;
    livemode: boolean;
    metadata: Record<string, string>;
    name?: string | undefined;
    next_invoice_sequence: number;
    phone?: string | undefined;
    preferred_locales: string[];
    shipping?: any | undefined;
    tax_exempt: string;
    test_clock?: any | undefined;
}

export interface StripePaymentIntent {
    id: string;
    object: 'payment_intent';
    amount: number;
    amount_capturable: number;
    amount_details: any;
    amount_received: number;
    application?: string | undefined;
    application_fee_amount?: number | undefined;
    automatic_payment_methods?: any | undefined;
    canceled_at?: number | undefined;
    cancellation_reason?: string | undefined;
    capture_method: string;
    client_secret: string;
    confirmation_method: string;
    created: number;
    currency: string;
    customer?: string;
    description?: string;
    invoice?: string | undefined;
    last_payment_error?: any | undefined;
    latest_charge?: string | undefined;
    livemode: boolean;
    metadata: Record<string, string>;
    next_action?: any | undefined;
    on_behalf_of?: string | undefined;
    payment_method?: string | undefined;
    payment_method_options: any;
    payment_method_types: string[];
    processing?: any | undefined;
    receipt_email?: string;
    review?: string | undefined;
    setup_future_usage?: string | undefined;
    shipping?: any | undefined;
    source?: string | undefined;
    statement_descriptor?: string | undefined;
    statement_descriptor_suffix?: string | undefined;
    status: string;
    transfer_data?: any | undefined;
    transfer_group?: string | undefined;
}

export interface StripeSubscription {
    id: string;
    object: 'subscription';
    [key: string]: any;
}

export interface StripeProduct {
    id: string;
    object: 'product';
    [key: string]: any;
}

export interface StripeInvoice {
    id: string;
    object: 'invoice';
    [key: string]: any;
}

export interface StripeError {
    error: {
        type: string;
        code: string;
        decline_code?: string;
        message: string;
        param?: string | undefined;
        payment_intent?: any;
    };
}

export interface StripeApiResponse<T> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

export interface StripeListResponse<T> {
    object: 'list';
    data: T[];
    has_more: boolean;
    url: string;
    total_count: number;
}
/* eslint-enable @typescript-eslint/no-redundant-type-constituents */ 