/**
 * Stripe - Types and interfaces for Stripe service integration
 * 
 * @package     @imajin/cli
 * @subpackage  types
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 * @updated      2025-07-03
 *
 * @see        docs/services/stripe.md
 * 
 * Integration Points:
 * - Type-safe Stripe API models
 * - Universal element mapping interfaces
 * - Real-time event handling schemas
 * - LLM-friendly command contexts
 * - ETL pipeline data structures
 */

import type Stripe from 'stripe';
import { z } from 'zod';
// Business context types will be resolved at runtime through BusinessTypeRegistry

// Stripe Configuration Schema
export const StripeConfigSchema = z.object({
    apiKey: z.string().min(1, 'Stripe API key is required'),
    apiVersion: z.string().default('2024-06-20'),
    timeout: z.number().default(60000),
    maxNetworkRetries: z.number().default(3),
    enableTelemetry: z.boolean().default(false),
});

export type StripeConfig = z.infer<typeof StripeConfigSchema>;

// Payment Intent Schema
export const CreatePaymentIntentSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().min(3, 'Currency code must be at least 3 characters'),
    customerId: z.string().optional(),
    paymentMethodId: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    captureMethod: z.enum(['automatic', 'manual']).default('automatic'),
    automaticPaymentMethods: z.boolean().default(true),
});

// Customer Data Interfaces
export interface StripeCustomerData {
    id: string;
    email: string;
    name: string;
    phone?: string;
    created: Date;
    metadata?: Record<string, string>;
}

export interface StripeCustomerResponse {
    customer: StripeCustomerData;
    businessEntity: any; // Business context entity resolved at runtime
    success: boolean;
    message: string;
}

// Payment Intent Interfaces
export interface CreatePaymentIntentParams {
    amount: number;
    currency: string;
    customerId?: string;
    paymentMethodId?: string;
    description?: string;
    metadata?: Record<string, string>;
    captureMethod?: 'automatic' | 'manual';
    automaticPaymentMethods?: boolean;
}

export interface StripePaymentData {
    id: string;
    amount: number;
    currency: string;
    status: Stripe.PaymentIntent.Status;
    clientSecret?: string | null;
    customerId?: string;
    metadata?: Record<string, string>;
}

export interface StripePaymentResponse {
    paymentIntent: StripePaymentData;
    businessEntity: any; // Business context entity resolved at runtime
    success: boolean;
    message: string;
}

// Subscription Interfaces
export interface StripeSubscriptionData {
    id: string;
    customerId: string;
    status: Stripe.Subscription.Status;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    metadata?: Record<string, string>;
}

export interface StripeSubscriptionResponse {
    subscription: StripeSubscriptionData;
    businessEntity: any; // Business context entity resolved at runtime
    success: boolean;
    message: string;
}

// Command Context Interface
export interface StripeCommandContext {
    service: 'stripe';
    operation: string;
    params: Record<string, any>;
    metadata?: Record<string, string>;
}

// Service Capabilities
export const StripeCapabilities = [
    'customer-management',
    'payment-processing',
    'subscription-management',
    'catalog-browsing',
    'universal-element-mapping',
    'real-time-progress',
    'business-error-handling',
] as const;

export type StripeCapability = typeof StripeCapabilities[number];

// Error Handling Interface
export interface StripeServiceError {
    type: 'stripe_error' | 'validation_error' | 'network_error' | 'auth_error';
    message: string;
    code: string;
    statusCode: number;
    details?: {
        decline_code?: string;
        param?: string;
        request_log_url?: string;
    };
} 