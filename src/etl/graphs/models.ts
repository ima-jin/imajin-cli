/**
 * Dynamic Graph Models - Core graph model definitions for user-to-user communication
 * 
 * @package     @imajin/cli
 * @subpackage  etl/graphs
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Graph-to-graph translation for user communication
 * - Dynamic model compatibility and bridging
 * - Context normalization for external graphs
 * - Type-safe graph operations across all models
 */

import { z } from 'zod';
import { CompatibilityMatrix, GraphModel, GraphSchema } from '../core/interfaces.js';

// Re-export interfaces needed by other modules
export type { GraphModel, GraphSchema, CompatibilityMatrix };

// Define TranslationMapping interface for business context integration
export interface TranslationMapping {
    sourceModel: string;
    targetModel: string;
    mappings: Record<string, any>;
    confidence: number;
    bidirectional: boolean;
    metadata: Record<string, any>;
}

// Universal Elements - Common to all graph models
export const PersonalProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    avatar: z.string().url().optional(),
    bio: z.string().optional(),
    location: z.string().optional(),
    timezone: z.string().optional(),
    created: z.date(),
    updated: z.date()
});

export const ConnectionSchema = z.object({
    id: z.string(),
    userId: z.string(),
    connectedUserId: z.string(),
    type: z.enum(['friend', 'follower', 'professional', 'collaborator']),
    status: z.enum(['active', 'pending', 'blocked']),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const EventSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    startDate: z.date(),
    endDate: z.date().optional(),
    location: z.string().optional(),
    isVirtual: z.boolean().default(false),
    capacity: z.number().optional(),
    price: z.number().optional(),
    currency: z.string().default('USD'),
    tags: z.array(z.string()).default([]),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

// Social Commerce Model
export const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    price: z.number(),
    currency: z.string().default('USD'),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    images: z.array(z.string().url()).default([]),
    inventory: z.number().default(0),
    isActive: z.boolean().default(true),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const ServiceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    hourlyRate: z.number().optional(),
    fixedPrice: z.number().optional(),
    currency: z.string().default('USD'),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    duration: z.number().optional(), // in minutes
    isAvailable: z.boolean().default(true),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const TransactionSchema = z.object({
    id: z.string(),
    fromUserId: z.string(),
    toUserId: z.string(),
    amount: z.number(),
    currency: z.string().default('USD'),
    type: z.enum(['payment', 'refund', 'transfer']),
    status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
    productId: z.string().optional(),
    serviceId: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const PaymentMethodSchema = z.object({
    id: z.string(),
    userId: z.string(),
    type: z.enum(['card', 'bank', 'crypto', 'digital_wallet']),
    provider: z.string(),
    last4: z.string().optional(),
    isDefault: z.boolean().default(false),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

// Creative Portfolio Model  
export const ArtworkSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    medium: z.string(),
    dimensions: z.string().optional(),
    year: z.number(),
    price: z.number().optional(),
    currency: z.string().default('USD'),
    isForSale: z.boolean().default(false),
    images: z.array(z.string().url()).default([]),
    tags: z.array(z.string()).default([]),
    exhibitions: z.array(z.string()).default([]),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const CollectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    theme: z.string().optional(),
    artworkIds: z.array(z.string()).default([]),
    isPublic: z.boolean().default(true),
    coverImage: z.string().url().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const ExhibitionSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    venue: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    artworkIds: z.array(z.string()).default([]),
    isGroup: z.boolean().default(false),
    website: z.string().url().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const CommissionSchema = z.object({
    id: z.string(),
    clientId: z.string(),
    title: z.string(),
    description: z.string(),
    budget: z.number(),
    currency: z.string().default('USD'),
    deadline: z.date(),
    status: z.enum(['inquiry', 'accepted', 'in_progress', 'completed', 'cancelled']),
    specifications: z.record(z.string(), z.any()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

// Professional Network Model
export const PositionSchema = z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    startDate: z.date(),
    endDate: z.date().optional(),
    isCurrent: z.boolean().default(false),
    description: z.string().optional(),
    location: z.string().optional(),
    skills: z.array(z.string()).default([]),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const SkillSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    endorsements: z.number().default(0),
    yearsExperience: z.number().optional(),
    certifications: z.array(z.string()).default([]),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const CertificationSchema = z.object({
    id: z.string(),
    name: z.string(),
    issuer: z.string(),
    issueDate: z.date(),
    expiryDate: z.date().optional(),
    credentialId: z.string().optional(),
    verificationUrl: z.string().url().optional(),
    skills: z.array(z.string()).default([]),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const RecommendationSchema = z.object({
    id: z.string(),
    fromUserId: z.string(),
    toUserId: z.string(),
    content: z.string(),
    relationship: z.string(),
    skills: z.array(z.string()).default([]),
    isPublic: z.boolean().default(true),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

// Community Hub Model
export const GroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    isPublic: z.boolean().default(true),
    memberCount: z.number().default(0),
    rules: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    coverImage: z.string().url().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const DiscussionSchema = z.object({
    id: z.string(),
    groupId: z.string(),
    authorId: z.string(),
    title: z.string(),
    content: z.string(),
    type: z.enum(['question', 'discussion', 'announcement', 'poll']),
    tags: z.array(z.string()).default([]),
    replies: z.number().default(0),
    likes: z.number().default(0),
    isPinned: z.boolean().default(false),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

export const ResourceSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    type: z.enum(['document', 'link', 'video', 'image', 'tool']),
    url: z.string().url(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    downloads: z.number().default(0),
    rating: z.number().min(0).max(5).optional(),
    isPublic: z.boolean().default(true),
    metadata: z.record(z.string(), z.any()).optional(),
    created: z.date()
});

// Dynamic Model Registry
export interface ModelDefinition {
    name: string;
    version: string;
    schema: GraphSchema;
    compatibility: CompatibilityMatrix;
    metadata?: Record<string, any>;
    validate?: (data: any) => Promise<boolean>;
}

export class ModelRegistry {
    private static instance: ModelRegistry;
    private models: Map<string, ModelDefinition> = new Map();
    private versionMap: Map<string, Set<string>> = new Map(); // name -> Set of versions

    private constructor() {}

    public static getInstance(): ModelRegistry {
        if (!ModelRegistry.instance) {
            ModelRegistry.instance = new ModelRegistry();
        }
        return ModelRegistry.instance;
    }

    public registerModel(definition: ModelDefinition): void {
        if (!definition.name || !definition.version || !definition.schema) {
            throw new Error('Invalid model definition: name, version, and schema are required');
        }

        const modelKey = `${definition.name}@${definition.version}`;
        
        // Store the model definition
        this.models.set(modelKey, definition);

        // Track versions
        if (!this.versionMap.has(definition.name)) {
            this.versionMap.set(definition.name, new Set());
        }
        this.versionMap.get(definition.name)?.add(definition.version);
    }

    public getModel(name: string, version?: string): ModelDefinition | undefined {
        if (version) {
            return this.models.get(`${name}@${version}`);
        }

        // If no version specified, get the latest version
        const versions = this.versionMap.get(name);
        if (!versions || versions.size === 0) {
return undefined;
}

        const latestVersion = Array.from(versions).sort().pop();
        return this.models.get(`${name}@${latestVersion}`);
    }

    public getAllModels(): ModelDefinition[] {
        return Array.from(this.models.values());
    }

    public getModelNames(): string[] {
        return Array.from(this.versionMap.keys());
    }

    public getModelVersions(name: string): string[] {
        return Array.from(this.versionMap.get(name) || []);
    }

    public isModelRegistered(name: string, version?: string): boolean {
        if (version) {
            return this.models.has(`${name}@${version}`);
        }
        return this.versionMap.has(name);
    }

    public getCompatibilityMatrix(name: string, version?: string): CompatibilityMatrix | undefined {
        const model = this.getModel(name, version);
        return model?.compatibility;
    }

    public validateModelData(name: string, version: string, data: any): Promise<boolean> {
        const model = this.getModel(name, version);
        if (!model) {
            throw new Error(`Model ${name}@${version} not found`);
        }

        if (model.validate) {
            return model.validate(data);
        }

        // Default validation using schema
        try {
            Object.entries(model.schema.entities).forEach(([key, schema]) => {
                schema.parse(data[key]);
            });
            return Promise.resolve(true);
        } catch (error) {
            return Promise.resolve(false);
        }
    }

    public unregisterModel(name: string, version: string): boolean {
        const modelKey = `${name}@${version}`;
        const success = this.models.delete(modelKey);
        
        if (success) {
            const versions = this.versionMap.get(name);
            if (versions) {
                versions.delete(version);
                if (versions.size === 0) {
                    this.versionMap.delete(name);
                }
            }
        }
        
        return success;
    }
}

// Model Factory
export class ModelFactory {
    private static registry = ModelRegistry.getInstance();

    public static async createModel<T extends GraphModel>(
        type: string,
        version: string,
        data: Partial<T>
    ): Promise<T> {
        const modelDef = this.registry.getModel(type, version);
        if (!modelDef) {
            throw new Error(`Model ${type}@${version} not found`);
        }

        // Validate the data against the model schema
        const isValid = await this.registry.validateModelData(type, version, data);
        if (!isValid) {
            throw new Error(`Invalid data for model ${type}@${version}`);
        }

        // Create the model instance
        const model: GraphModel = {
            modelType: type,
            version: version,
            schema: modelDef.schema,
            compatibilityMap: modelDef.compatibility,
            metadata: {
                ...modelDef.metadata,
                ...data.metadata
            }
        };

        return model as T;
    }

    public static registerModel(definition: ModelDefinition): void {
        this.registry.registerModel(definition);
    }

    public static unregisterModel(name: string, version: string): boolean {
        return this.registry.unregisterModel(name, version);
    }

    public static getModelDefinition(name: string, version?: string): ModelDefinition | undefined {
        return this.registry.getModel(name, version);
    }

    public static getAllModelDefinitions(): ModelDefinition[] {
        return this.registry.getAllModels();
    }

    public static getModelNames(): string[] {
        return this.registry.getModelNames();
    }

    public static getModelVersions(name: string): string[] {
        return this.registry.getModelVersions(name);
    }

    public static isModelRegistered(name: string, version?: string): boolean {
        return this.registry.isModelRegistered(name, version);
    }

    public static getCompatibilityMatrix(name: string, version?: string): CompatibilityMatrix | undefined {
        return this.registry.getCompatibilityMatrix(name, version);
    }
}

// Default Models Registration
export const registerDefaultModels = () => {
    const registry = ModelRegistry.getInstance();

    // Social Commerce Model
    registry.registerModel({
        name: 'social-commerce',
        version: '1.0.0',
        schema: {
            version: '1.0.0',
            entities: {
                profile: PersonalProfileSchema,
                product: ProductSchema,
                service: ServiceSchema,
                transaction: TransactionSchema,
                paymentMethod: PaymentMethodSchema,
                event: EventSchema,
                connection: ConnectionSchema
            },
            relationships: {
                hasProducts: z.object({
                    userId: z.string(),
                    productId: z.string()
                }),
                hasServices: z.object({
                    userId: z.string(),
                    serviceId: z.string()
                }),
                hasTransactions: z.object({
                    userId: z.string(),
                    transactionId: z.string()
                })
            },
            constraints: {
                maxProducts: 1000,
                maxServices: 100,
                maxTransactions: 10000
            }
        },
        compatibility: {
            directCompatible: ['social-commerce'],
            translatableFrom: ['creative-portfolio', 'professional-network'],
            translatableTo: ['creative-portfolio', 'professional-network']
        }
    });

    // Creative Portfolio Model
    registry.registerModel({
        name: 'creative-portfolio',
        version: '1.0.0',
        schema: {
            version: '1.0.0',
            entities: {
                profile: PersonalProfileSchema,
                artwork: ArtworkSchema,
                collection: CollectionSchema,
                exhibition: ExhibitionSchema,
                commission: CommissionSchema,
                connection: ConnectionSchema
            },
            relationships: {
                hasArtworks: z.object({
                    userId: z.string(),
                    artworkId: z.string()
                }),
                hasCollections: z.object({
                    userId: z.string(),
                    collectionId: z.string()
                }),
                hasExhibitions: z.object({
                    userId: z.string(),
                    exhibitionId: z.string()
                })
            },
            constraints: {
                maxArtworks: 1000,
                maxCollections: 100,
                maxExhibitions: 50
            }
        },
        compatibility: {
            directCompatible: ['creative-portfolio'],
            translatableFrom: ['social-commerce', 'professional-network'],
            translatableTo: ['social-commerce', 'professional-network']
        }
    });

    // Professional Network Model
    registry.registerModel({
        name: 'professional-network',
        version: '1.0.0',
        schema: {
            version: '1.0.0',
            entities: {
                profile: PersonalProfileSchema,
                position: PositionSchema,
                skill: SkillSchema,
                certification: CertificationSchema,
                recommendation: RecommendationSchema,
                connection: ConnectionSchema
            },
            relationships: {
                hasPositions: z.object({
                    userId: z.string(),
                    positionId: z.string()
                }),
                hasSkills: z.object({
                    userId: z.string(),
                    skillId: z.string()
                }),
                hasCertifications: z.object({
                    userId: z.string(),
                    certificationId: z.string()
                })
            },
            constraints: {
                maxPositions: 50,
                maxSkills: 100,
                maxCertifications: 50
            }
        },
        compatibility: {
            directCompatible: ['professional-network'],
            translatableFrom: ['social-commerce', 'creative-portfolio'],
            translatableTo: ['social-commerce', 'creative-portfolio']
        }
    });

    // Community Hub Model
    registry.registerModel({
        name: 'community-hub',
        version: '1.0.0',
        schema: {
            version: '1.0.0',
            entities: {
                profile: PersonalProfileSchema,
                group: GroupSchema,
                discussion: DiscussionSchema,
                event: EventSchema,
                resource: ResourceSchema,
                connection: ConnectionSchema
            },
            relationships: {
                hasGroups: z.object({
                    userId: z.string(),
                    groupId: z.string()
                }),
                hasDiscussions: z.object({
                    userId: z.string(),
                    discussionId: z.string()
                }),
                hasResources: z.object({
                    userId: z.string(),
                    resourceId: z.string()
                })
            },
            constraints: {
                maxGroups: 50,
                maxDiscussions: 1000,
                maxResources: 500
            }
        },
        compatibility: {
            directCompatible: ['community-hub'],
            translatableFrom: ['social-commerce', 'creative-portfolio', 'professional-network'],
            translatableTo: ['social-commerce', 'creative-portfolio', 'professional-network']
        }
    });
};

// Initialize default models
registerDefaultModels();

// Export types
export type ModelType = string;
export type ModelData<T extends GraphModel> = Partial<T>; 