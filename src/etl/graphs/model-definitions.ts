/**
 * Model Definitions - Generalized model definitions for the ETL system
 * 
 * @package     @imajin/cli
 * @subpackage  etl/graphs
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-03
 */

import { z } from 'zod';
import { ModelFactory } from './models.js';
import { GraphSchema } from '../core/interfaces.js';

// Base Entity Schemas - Common to all models
const BaseEntitySchema = {
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date(),
    updated: z.date().optional()
};

const BaseRelationshipSchema = {
    sourceId: z.string(),
    targetId: z.string(),
    type: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
};

// Content Model - For managing various types of content
const contentModelSchema: GraphSchema = {
    version: '1.0.0',
    entities: {
        content: z.object({
            ...BaseEntitySchema,
            type: z.enum(['article', 'post', 'page', 'document', 'media']),
            status: z.enum(['draft', 'published', 'archived']),
            visibility: z.enum(['public', 'private', 'restricted']),
            contentType: z.string(),
            content: z.string(),
            authorId: z.string(),
            category: z.string().optional(),
            language: z.string().default('en'),
            version: z.number().default(1)
        }),
        category: z.object({
            ...BaseEntitySchema,
            parentId: z.string().optional(),
            level: z.number().default(0),
            path: z.array(z.string()).default([])
        }),
        tag: z.object({
            ...BaseEntitySchema,
            usageCount: z.number().default(0)
        })
    },
    relationships: {
        contentCategories: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('belongs_to')
        }),
        contentTags: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('tagged_with')
        }),
        contentVersions: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('version_of'),
            version: z.number()
        })
    },
    constraints: {
        uniqueContentSlug: ['content', 'slug'],
        uniqueCategoryPath: ['category', 'path'],
        uniqueTagName: ['tag', 'name']
    }
};

// Interaction Model - For managing user interactions and relationships
const interactionModelSchema: GraphSchema = {
    version: '1.0.0',
    entities: {
        user: z.object({
            ...BaseEntitySchema,
            email: z.string().email(),
            status: z.enum(['active', 'inactive', 'suspended']),
            preferences: z.record(z.string(), z.any()).optional(),
            lastActive: z.date().optional()
        }),
        interaction: z.object({
            ...BaseEntitySchema,
            type: z.enum(['like', 'comment', 'share', 'follow', 'view']),
            sourceId: z.string(),
            targetId: z.string(),
            targetType: z.string(),
            value: z.any().optional()
        }),
        session: z.object({
            ...BaseEntitySchema,
            userId: z.string(),
            device: z.string().optional(),
            ip: z.string().optional(),
            expiresAt: z.date()
        })
    },
    relationships: {
        userInteractions: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('performed')
        }),
        userSessions: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('has_session')
        }),
        userRelationships: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('related_to'),
            relationshipType: z.string()
        })
    },
    constraints: {
        uniqueUserEmail: ['user', 'email'],
        uniqueSessionToken: ['session', 'token']
    }
};

// Asset Model - For managing digital assets and resources
const assetModelSchema: GraphSchema = {
    version: '1.0.0',
    entities: {
        asset: z.object({
            ...BaseEntitySchema,
            type: z.enum(['image', 'video', 'audio', 'document', 'other']),
            mimeType: z.string(),
            size: z.number(),
            url: z.string().url(),
            storage: z.object({
                provider: z.string(),
                bucket: z.string(),
                path: z.string()
            }),
            dimensions: z.object({
                width: z.number().optional(),
                height: z.number().optional(),
                duration: z.number().optional()
            }).optional()
        }),
        collection: z.object({
            ...BaseEntitySchema,
            type: z.string(),
            ownerId: z.string(),
            visibility: z.enum(['public', 'private', 'restricted'])
        })
    },
    relationships: {
        assetCollections: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('belongs_to')
        }),
        assetVersions: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('version_of'),
            version: z.number()
        })
    },
    constraints: {
        uniqueAssetPath: ['asset', ['storage', 'path']],
        uniqueCollectionName: ['collection', ['ownerId', 'name']]
    }
};

// Register the base models
export const registerBaseModels = () => {
    // Content Model
    ModelFactory.registerModel({
        name: 'content',
        version: '1.0.0',
        schema: contentModelSchema,
        compatibility: {
            directCompatible: ['interaction', 'asset'],
            translatableFrom: ['interaction', 'asset'],
            translatableTo: ['interaction', 'asset']
        },
        metadata: {
            description: 'Content management model for various types of content',
            features: ['content management', 'categorization', 'versioning'],
            tags: ['content', 'cms', 'publishing']
        }
    });

    // Interaction Model
    ModelFactory.registerModel({
        name: 'interaction',
        version: '1.0.0',
        schema: interactionModelSchema,
        compatibility: {
            directCompatible: ['content', 'asset'],
            translatableFrom: ['content', 'asset'],
            translatableTo: ['content', 'asset']
        },
        metadata: {
            description: 'User interaction and relationship management model',
            features: ['user management', 'interaction tracking', 'session management'],
            tags: ['users', 'interactions', 'relationships']
        }
    });

    // Asset Model
    ModelFactory.registerModel({
        name: 'asset',
        version: '1.0.0',
        schema: assetModelSchema,
        compatibility: {
            directCompatible: ['content', 'interaction'],
            translatableFrom: ['content', 'interaction'],
            translatableTo: ['content', 'interaction']
        },
        metadata: {
            description: 'Digital asset and resource management model',
            features: ['asset management', 'storage', 'collections'],
            tags: ['assets', 'media', 'storage']
        }
    });
};

// Example: Social Commerce implementation using base models
const socialCommerceSchema: GraphSchema = {
    version: '1.0.0',
    entities: {
        // Extends content model for products
        product: z.object({
            ...BaseEntitySchema,
            type: z.literal('product'),
            price: z.number(),
            currency: z.string().default('USD'),
            inventory: z.number().default(0),
            isActive: z.boolean().default(true),
            images: z.array(z.string().url()).default([]),
            // Additional commerce-specific fields
            sku: z.string(),
            variants: z.array(z.object({
                id: z.string(),
                name: z.string(),
                price: z.number(),
                inventory: z.number()
            })).optional()
        }),
        // Extends content model for services
        service: z.object({
            ...BaseEntitySchema,
            type: z.literal('service'),
            pricing: z.object({
                type: z.enum(['hourly', 'fixed', 'subscription']),
                amount: z.number(),
                currency: z.string().default('USD'),
                interval: z.string().optional() // for subscription
            }),
            availability: z.object({
                isAvailable: z.boolean().default(true),
                schedule: z.record(z.string(), z.any()).optional()
            })
        }),
        // Extends interaction model for transactions
        transaction: z.object({
            ...BaseEntitySchema,
            type: z.literal('transaction'),
            amount: z.number(),
            currency: z.string().default('USD'),
            status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
            paymentMethod: z.string(),
            items: z.array(z.object({
                type: z.enum(['product', 'service']),
                id: z.string(),
                quantity: z.number(),
                price: z.number()
            }))
        })
    },
    relationships: {
        // Extends base relationships
        productCategories: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('categorized_as')
        }),
        serviceCategories: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('categorized_as')
        }),
        userTransactions: z.object({
            ...BaseRelationshipSchema,
            type: z.literal('purchased'),
            role: z.enum(['buyer', 'seller'])
        })
    },
    constraints: {
        uniqueProductSku: ['product', 'sku'],
        uniqueServiceName: ['service', ['name', 'ownerId']],
        uniqueTransactionId: ['transaction', 'id']
    }
};

// Register the social commerce model
export const registerSocialCommerceModel = () => {
    ModelFactory.registerModel({
        name: 'social-commerce',
        version: '1.0.0',
        schema: socialCommerceSchema,
        compatibility: {
            directCompatible: ['content', 'interaction', 'asset'],
            translatableFrom: ['content', 'interaction', 'asset'],
            translatableTo: ['content', 'interaction', 'asset']
        },
        metadata: {
            description: 'Social Commerce implementation using base models',
            features: [
                'product management',
                'service management',
                'transaction processing',
                'inventory tracking'
            ],
            tags: ['commerce', 'ecommerce', 'marketplace'],
            extends: ['content', 'interaction', 'asset']
        }
    });
};

// Update registerStandardModels to include both base and specific models
export const registerStandardModels = () => {
    // Register base models first
    registerBaseModels();
    
    // Register specific implementations
    registerSocialCommerceModel();
    // TODO: Add other specific model registrations here
    // registerCreativePortfolioModel();
    // registerProfessionalNetworkModel();
    // registerCommunityHubModel();
}; 