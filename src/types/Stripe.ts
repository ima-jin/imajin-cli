/**
 * Stripe - Types and interfaces for Stripe service integration
 * 
 * @package     @imajin/cli
 * @subpackage  types/services
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see        docs/services/stripe.md
 * 
 * Integration Points:
 * - Type-safe Stripe API models
 * - Webhook event validation
 * - Command parameter validation
 * - Real-time event streaming types
 */

import type Stripe from 'stripe';
import { z } from 'zod';
import type { RealTimeEvent } from './LLM.js';

// Stripe Configuration Schema
export const StripeConfigSchema = z.object({
    apiKey: z.string().min(1, 'Stripe API key is required'),
    webhookSecret: z.string().optional(),
    baseUrl: z.string().url().optional(),
    apiVersion: z.string().default('2023-10-16'),
    timeout: z.number().default(30000),
    maxNetworkRetries: z.number().default(3),
    realTimeWebhooks: z.boolean().default(true),
});

export type StripeConfig = z.infer<typeof StripeConfigSchema>;

// Payment Intent Commands
export const CreatePaymentIntentSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().min(3, 'Currency must be valid ISO code'),
    customerId: z.string().optional(),
    paymentMethodId: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.string()).optional(),
    automaticPaymentMethods: z.boolean().default(true),
    captureMethod: z.enum(['automatic', 'manual']).default('automatic'),
});

export type CreatePaymentIntentParams = z.infer<typeof CreatePaymentIntentSchema>;

// Customer Commands
export const CreateCustomerSchema = z.object({
    email: z.string().email('Valid email required'),
    name: z.string().optional(),
    phone: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.string()).optional(),
});

export type CreateCustomerParams = z.infer<typeof CreateCustomerSchema>;

// Subscription Commands
export const CreateSubscriptionSchema = z.object({
    customerId: z.string().min(1, 'Customer ID required'),
    priceId: z.string().min(1, 'Price ID required'),
    quantity: z.number().positive().default(1),
    trialDays: z.number().nonnegative().optional(),
    metadata: z.record(z.string()).optional(),
    prorationBehavior: z.enum(['create_prorations', 'none', 'always_invoice']).default('create_prorations'),
});

export type CreateSubscriptionParams = z.infer<typeof CreateSubscriptionSchema>;

// Webhook Event Types
export interface StripeWebhookEvent extends RealTimeEvent {
    stripeEvent: Stripe.Event;
    webhookId: string;
    verified: boolean;
}

// Response Types for LLM
export interface StripePaymentResponse {
    paymentIntent: {
        id: string;
        amount: number;
        currency: string;
        status: Stripe.PaymentIntent.Status;
        clientSecret?: string;
        customerId?: string;
        metadata?: Stripe.Metadata;
    };
    success: boolean;
    message: string;
}

export interface StripeCustomerResponse {
    customer: {
        id: string;
        email?: string;
        name?: string;
        created: number;
        metadata?: Stripe.Metadata;
    };
    success: boolean;
    message: string;
}

export interface StripeSubscriptionResponse {
    subscription: {
        id: string;
        customerId: string;
        status: Stripe.Subscription.Status;
        priceId: string;
        quantity: number;
        currentPeriodStart: number;
        currentPeriodEnd: number;
        metadata?: Stripe.Metadata;
    };
    success: boolean;
    message: string;
}

// Command Execution Context
export interface StripeCommandContext {
    service: 'stripe';
    command: string;
    params: any;
    userId?: string;
    realTime: boolean;
    correlationId?: string;
}

// Stripe Service Capabilities
export const StripeCapabilities = [
    'payment-processing',
    'subscription-management',
    'customer-management',
    'webhook-handling',
    'real-time-events',
    'payment-methods',
    'invoicing',
    'dispute-management',
] as const;

export type StripeCapability = typeof StripeCapabilities[number];

// Error Types
export interface StripeServiceError {
    type: 'stripe_error' | 'validation_error' | 'network_error' | 'auth_error';
    code?: string | undefined;
    message: string;
    details?: any;
    requestId?: string | undefined;
} 