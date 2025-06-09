/**
 * Standard Graph Models - Core graph model definitions for user-to-user communication
 * 
 * @package     @imajin/cli
 * @subpackage  etl/graphs
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Graph-to-graph translation for user communication
 * - Standard model compatibility and bridging
 * - Context normalization for external graphs
 * - Type-safe graph operations across all models
 */

import { z } from 'zod';
import { CompatibilityMatrix, GraphModel, GraphSchema } from '../core/interfaces.js';

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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
    created: z.date()
});

export const PaymentMethodSchema = z.object({
    id: z.string(),
    userId: z.string(),
    type: z.enum(['card', 'bank', 'crypto', 'digital_wallet']),
    provider: z.string(),
    last4: z.string().optional(),
    isDefault: z.boolean().default(false),
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    specifications: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
    metadata: z.record(z.any()).optional(),
    created: z.date()
});

// Standard Graph Model Implementations
export interface SocialCommerceGraph extends GraphModel {
    readonly modelType: 'social-commerce';
    identity: z.infer<typeof PersonalProfileSchema>;
    catalog: {
        products: z.infer<typeof ProductSchema>[];
        services: z.infer<typeof ServiceSchema>[];
        events: z.infer<typeof EventSchema>[];
    };
    social: {
        connections: z.infer<typeof ConnectionSchema>[];
        reputation: {
            score: number;
            reviews: number;
            rating: number;
        };
    };
    commerce: {
        paymentMethods: z.infer<typeof PaymentMethodSchema>[];
        transactions: z.infer<typeof TransactionSchema>[];
    };
}

export interface CreativePortfolioGraph extends GraphModel {
    readonly modelType: 'creative-portfolio';
    identity: z.infer<typeof PersonalProfileSchema>;
    portfolio: {
        artworks: z.infer<typeof ArtworkSchema>[];
        collections: z.infer<typeof CollectionSchema>[];
        exhibitions: z.infer<typeof ExhibitionSchema>[];
    };
    professional: {
        commissions: z.infer<typeof CommissionSchema>[];
        availability: {
            isOpen: boolean;
            rates: Record<string, number>;
            schedule: Record<string, any>;
        };
    };
    social: {
        connections: z.infer<typeof ConnectionSchema>[];
    };
}

export interface ProfessionalNetworkGraph extends GraphModel {
    readonly modelType: 'professional-network';
    identity: z.infer<typeof PersonalProfileSchema>;
    experience: {
        positions: z.infer<typeof PositionSchema>[];
        skills: z.infer<typeof SkillSchema>[];
        certifications: z.infer<typeof CertificationSchema>[];
    };
    network: {
        connections: z.infer<typeof ConnectionSchema>[];
        recommendations: z.infer<typeof RecommendationSchema>[];
    };
}

export interface CommunityHubGraph extends GraphModel {
    readonly modelType: 'community-hub';
    identity: z.infer<typeof PersonalProfileSchema>;
    community: {
        groups: z.infer<typeof GroupSchema>[];
        discussions: z.infer<typeof DiscussionSchema>[];
        events: z.infer<typeof EventSchema>[];
    };
    resources: {
        items: z.infer<typeof ResourceSchema>[];
        categories: string[];
    };
    social: {
        connections: z.infer<typeof ConnectionSchema>[];
    };
}

// Graph Schema Definitions
export const SocialCommerceSchema: GraphSchema = {
    version: '1.0.0',
    entities: {
        PersonalProfile: PersonalProfileSchema,
        Product: ProductSchema,
        Service: ServiceSchema,
        Event: EventSchema,
        Connection: ConnectionSchema,
        Transaction: TransactionSchema,
        PaymentMethod: PaymentMethodSchema
    },
    relationships: {
        UserProduct: z.object({ userId: z.string(), productId: z.string() }),
        UserService: z.object({ userId: z.string(), serviceId: z.string() }),
        UserConnection: z.object({ userId: z.string(), connectionId: z.string() }),
        UserTransaction: z.object({ userId: z.string(), transactionId: z.string() })
    },
    constraints: {
        maxProducts: 1000,
        maxServices: 500,
        maxConnections: 5000
    }
};

export const CreativePortfolioSchema: GraphSchema = {
    version: '1.0.0',
    entities: {
        PersonalProfile: PersonalProfileSchema,
        Artwork: ArtworkSchema,
        Collection: CollectionSchema,
        Exhibition: ExhibitionSchema,
        Commission: CommissionSchema,
        Connection: ConnectionSchema
    },
    relationships: {
        ArtworkCollection: z.object({ artworkId: z.string(), collectionId: z.string() }),
        ArtworkExhibition: z.object({ artworkId: z.string(), exhibitionId: z.string() }),
        UserConnection: z.object({ userId: z.string(), connectionId: z.string() })
    },
    constraints: {
        maxArtworks: 2000,
        maxCollections: 100,
        maxExhibitions: 200
    }
};

export const ProfessionalNetworkSchema: GraphSchema = {
    version: '1.0.0',
    entities: {
        PersonalProfile: PersonalProfileSchema,
        Position: PositionSchema,
        Skill: SkillSchema,
        Certification: CertificationSchema,
        Connection: ConnectionSchema,
        Recommendation: RecommendationSchema
    },
    relationships: {
        UserPosition: z.object({ userId: z.string(), positionId: z.string() }),
        UserSkill: z.object({ userId: z.string(), skillId: z.string() }),
        UserCertification: z.object({ userId: z.string(), certificationId: z.string() }),
        UserConnection: z.object({ userId: z.string(), connectionId: z.string() })
    },
    constraints: {
        maxPositions: 50,
        maxSkills: 200,
        maxCertifications: 100
    }
};

export const CommunityHubSchema: GraphSchema = {
    version: '1.0.0',
    entities: {
        PersonalProfile: PersonalProfileSchema,
        Group: GroupSchema,
        Discussion: DiscussionSchema,
        Event: EventSchema,
        Resource: ResourceSchema,
        Connection: ConnectionSchema
    },
    relationships: {
        UserGroup: z.object({ userId: z.string(), groupId: z.string() }),
        GroupDiscussion: z.object({ groupId: z.string(), discussionId: z.string() }),
        GroupEvent: z.object({ groupId: z.string(), eventId: z.string() }),
        UserConnection: z.object({ userId: z.string(), connectionId: z.string() })
    },
    constraints: {
        maxGroups: 100,
        maxDiscussions: 10000,
        maxResources: 5000
    }
};

// Compatibility Matrices
export const SocialCommerceCompatibility: CompatibilityMatrix = {
    directCompatible: ['social-commerce'],
    translatableFrom: ['creative-portfolio', 'professional-network', 'community-hub'],
    translatableTo: ['creative-portfolio', 'professional-network', 'community-hub'],
    bridgeRequired: ['custom']
};

export const CreativePortfolioCompatibility: CompatibilityMatrix = {
    directCompatible: ['creative-portfolio'],
    translatableFrom: ['social-commerce', 'professional-network', 'community-hub'],
    translatableTo: ['social-commerce', 'professional-network', 'community-hub'],
    bridgeRequired: ['custom']
};

export const ProfessionalNetworkCompatibility: CompatibilityMatrix = {
    directCompatible: ['professional-network'],
    translatableFrom: ['social-commerce', 'creative-portfolio', 'community-hub'],
    translatableTo: ['social-commerce', 'creative-portfolio', 'community-hub'],
    bridgeRequired: ['custom']
};

export const CommunityHubCompatibility: CompatibilityMatrix = {
    directCompatible: ['community-hub'],
    translatableFrom: ['social-commerce', 'creative-portfolio', 'professional-network'],
    translatableTo: ['social-commerce', 'creative-portfolio', 'professional-network'],
    bridgeRequired: ['custom']
};

// Model Registry
export const STANDARD_MODELS = {
    'social-commerce': {
        schema: SocialCommerceSchema,
        compatibility: SocialCommerceCompatibility
    },
    'creative-portfolio': {
        schema: CreativePortfolioSchema,
        compatibility: CreativePortfolioCompatibility
    },
    'professional-network': {
        schema: ProfessionalNetworkSchema,
        compatibility: ProfessionalNetworkCompatibility
    },
    'community-hub': {
        schema: CommunityHubSchema,
        compatibility: CommunityHubCompatibility
    }
} as const;

export type StandardModelType = keyof typeof STANDARD_MODELS; 