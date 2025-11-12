/**
 * StripeCustomerAdapter - Business context-aware Stripe customer adapter
 * 
 * @package     @imajin/cli
 * @subpackage  services/stripe/adapters
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-25
 *
 * Integration Points:
 * - Business context customer schema mapping
 * - Type-safe transformations using business models
 * - Stripe metadata handling for business fields
 * - Backward compatibility during transition
 */

import { ServiceAdapter } from '../../../types/Core.js';
import { BusinessTypeRegistry } from '../../../context/BusinessTypeRegistry.js';
import type { BusinessDomainModel } from '../../../context/BusinessContextProcessor.js';

export interface StripeCustomer {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
    created: number;
}

/**
 * Adapter for converting between Stripe Customer and Business Context Customer
 */
export class StripeCustomerAdapter implements ServiceAdapter<StripeCustomer, any> {
    constructor(private readonly businessContext: BusinessDomainModel) {}
    
    /**
     * Validate service entity against its schema
     */
    validate(entity: unknown): entity is StripeCustomer {
        return (
            typeof entity === 'object' &&
            entity !== null &&
            typeof (entity as any).id === 'string' &&
            typeof (entity as any).email === 'string'
        );
    }

    /**
     * Get service namespace
     */
    getNamespace(): 'stripe' {
        return 'stripe';
    }
    
    /**
     * Convert Stripe Customer to Business Context Customer format
     */
    toBusinessContext(stripeCustomer: StripeCustomer): any {
        const customerSchema = BusinessTypeRegistry.getSchema('customer');
        const businessCustomer: any = {
            id: stripeCustomer.id,
            email: stripeCustomer.email,
            name: stripeCustomer.name,
            phone: stripeCustomer.phone,
            createdAt: new Date(stripeCustomer.created * 1000),
            updatedAt: new Date(),
            sourceService: 'stripe',
        };
        
        // Map Stripe metadata to business context fields
        if (stripeCustomer.metadata) {
            this.mapMetadataToBusinessFields(stripeCustomer.metadata, businessCustomer);
        }
        
        // Validate against business schema
        return customerSchema.parse(businessCustomer);
    }
    
    /**
     * Convert Business Context Customer to Stripe Customer format
     */
    fromBusinessContext(businessCustomer: any): StripeCustomer {
        const stripeCustomer: StripeCustomer = {
            id: businessCustomer.id,
            email: businessCustomer.email,
            name: businessCustomer.name,
            phone: businessCustomer.phone,
            created: Math.floor(businessCustomer.createdAt?.getTime() / 1000) || Date.now() / 1000,
            metadata: {}
        };
        
        // Map business context fields to Stripe metadata
        this.mapBusinessFieldsToMetadata(businessCustomer, stripeCustomer.metadata!);
        
        return stripeCustomer;
    }
    
    // Legacy compatibility methods removed - use toBusinessContext/fromBusinessContext directly
    
    private mapMetadataToBusinessFields(metadata: Record<string, string>, businessCustomer: any): void {
        // Map known Stripe metadata fields to business context
        const customerEntity = this.businessContext.entities.customer;
        if (!customerEntity) {
return;
}
        
        for (const field of customerEntity.fields) {
            const metadataValue = metadata[field.name];
            if (metadataValue !== undefined) {
                businessCustomer[field.name] = this.parseMetadataValue(metadataValue, field.type);
            }
        }
    }
    
    private mapBusinessFieldsToMetadata(businessCustomer: any, metadata: Record<string, string>): void {
        // Map business context fields to Stripe metadata
        const customerEntity = this.businessContext.entities.customer;
        if (!customerEntity) {
return;
}
        
        for (const field of customerEntity.fields) {
            if (businessCustomer[field.name] !== undefined) {
                metadata[field.name] = String(businessCustomer[field.name]);
            }
        }
    }
    
    private parseMetadataValue(value: string, type: string): any {
        switch (type) {
            case 'number':
                return Number(value);
            case 'boolean':
                return value === 'true';
            case 'array':
                return value.split(',');
            default:
                return value;
        }
    }
} 