/**
 * StripeCustomerAdapter - Adapter between Stripe Customer and Universal Customer
 * 
 * @package     @imajin/cli
 * @subpackage  services/stripe/adapters
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * @see        docs/services/stripe-adapters.md
 * 
 * Integration Points:
 * - Universal Customer schema mapping
 * - Type collision prevention
 * - ETL pipeline transformations
 * - Cross-service data consistency
 */

import type Stripe from 'stripe';
import { z } from 'zod';
import { ServiceAdapter, ServiceNamespaces, TypeRegistry, UniversalCustomer } from '../../../types/Core.js';

// Stripe-specific Customer type (namespaced to prevent collisions)
export interface StripeCustomer {
    id: string;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    created: number;
    updated: number;
    metadata?: Stripe.Metadata;
    // Stripe-specific fields
    balance?: number;
    delinquent?: boolean;
    default_source?: string | null;
    invoice_prefix?: string | null;
}

// Register this type in the collision detection system
TypeRegistry.register('Customer', ServiceNamespaces.stripe);

/**
 * Adapter for converting between Stripe Customer and Universal Customer
 */
export class StripeCustomerAdapter implements ServiceAdapter<StripeCustomer, UniversalCustomer> {

    /**
     * Convert Stripe Customer to Universal Customer format
     */
    toUniversal(stripeCustomer: StripeCustomer): UniversalCustomer {
        return {
            id: stripeCustomer.id,
            email: stripeCustomer.email || '',
            name: stripeCustomer.name || undefined,
            phone: stripeCustomer.phone || undefined,
            createdAt: new Date(stripeCustomer.created * 1000),
            updatedAt: new Date(stripeCustomer.updated * 1000),
            metadata: stripeCustomer.metadata || undefined,
            sourceService: 'stripe',
            // Store Stripe-specific data that doesn't map to universal schema
            serviceData: {
                balance: stripeCustomer.balance,
                delinquent: stripeCustomer.delinquent,
                default_source: stripeCustomer.default_source,
                invoice_prefix: stripeCustomer.invoice_prefix,
            },
        };
    }

    /**
     * Convert Universal Customer to Stripe Customer format
     */
    fromUniversal(universalCustomer: UniversalCustomer): StripeCustomer {
        const serviceData = universalCustomer.serviceData || {};

        return {
            id: universalCustomer.id,
            email: universalCustomer.email,
            name: universalCustomer.name || null,
            phone: universalCustomer.phone || null,
            created: Math.floor(universalCustomer.createdAt.getTime() / 1000),
            updated: Math.floor(universalCustomer.updatedAt.getTime() / 1000),
            metadata: universalCustomer.metadata as Stripe.Metadata,
            // Restore Stripe-specific fields
            balance: serviceData.balance || 0,
            delinquent: serviceData.delinquent || false,
            default_source: serviceData.default_source || null,
            invoice_prefix: serviceData.invoice_prefix || null,
        };
    }

    /**
     * Validate if an entity is a valid Stripe Customer
     */
    validate(entity: unknown): entity is StripeCustomer {
        try {
            const schema = z.object({
                id: z.string(),
                email: z.string().nullable().optional(),
                name: z.string().nullable().optional(),
                phone: z.string().nullable().optional(),
                created: z.number(),
                updated: z.number(),
                metadata: z.record(z.string()).optional(),
                balance: z.number().optional(),
                delinquent: z.boolean().optional(),
                default_source: z.string().nullable().optional(),
                invoice_prefix: z.string().nullable().optional(),
            });

            schema.parse(entity);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get service namespace
     */
    getNamespace() {
        return ServiceNamespaces.stripe;
    }

    /**
     * Transform Stripe API response to our StripeCustomer type
     */
    fromStripeAPI(apiCustomer: Stripe.Customer): StripeCustomer {
        return {
            id: apiCustomer.id,
            email: apiCustomer.email,
            name: apiCustomer.name ?? null,
            phone: apiCustomer.phone ?? null,
            created: apiCustomer.created,
            updated: Date.now() / 1000, // Stripe doesn't provide updated field
            metadata: apiCustomer.metadata,
            balance: apiCustomer.balance,
            delinquent: apiCustomer.delinquent ?? false,
            default_source: typeof apiCustomer.default_source === 'string' ? apiCustomer.default_source : null,
            invoice_prefix: apiCustomer.invoice_prefix ?? null,
        };
    }
} 