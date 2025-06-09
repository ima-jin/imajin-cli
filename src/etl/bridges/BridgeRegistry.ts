/**
 * BridgeRegistry - Registry for graph-to-graph bridge configurations
 * 
 * @package     @imajin/cli
 * @subpackage  etl/bridges
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Graph-to-graph bridge configurations for optimized translations
 * - Common translation paths with pre-computed efficiency scores
 * - Dynamic bridge generation for custom model pairs
 * - Bridge optimization based on usage patterns
 */

import { BridgeConfiguration, FieldMapping, TransformationRule } from '../core/interfaces.js';

/**
 * Registry for managing bridge configurations
 */
export class BridgeRegistry {
    private bridges = new Map<string, BridgeConfiguration>();
    private usageStats = new Map<string, { count: number; lastUsed: Date; averageEfficiency: number }>();

    constructor() {
        this.initializeStandardBridges();
    }

    /**
     * Get bridge configuration for model pair
     */
    getBridge(sourceModel: string, targetModel: string): BridgeConfiguration | null {
        const key = `${sourceModel}->${targetModel}`;
        return this.bridges.get(key) || null;
    }

    /**
     * Register a new bridge configuration
     */
    registerBridge(bridge: BridgeConfiguration): void {
        const key = `${bridge.sourceModel}->${bridge.targetModel}`;
        this.bridges.set(key, bridge);
    }

    /**
     * Get all available bridges
     */
    getAllBridges(): BridgeConfiguration[] {
        return Array.from(this.bridges.values());
    }

    /**
     * Get bridges for a specific source model
     */
    getBridgesFromModel(sourceModel: string): BridgeConfiguration[] {
        return Array.from(this.bridges.values())
            .filter(bridge => bridge.sourceModel === sourceModel);
    }

    /**
     * Get bridges for a specific target model
     */
    getBridgesToModel(targetModel: string): BridgeConfiguration[] {
        return Array.from(this.bridges.values())
            .filter(bridge => bridge.targetModel === targetModel);
    }

    /**
     * Get the most efficient bridge for a model pair
     */
    getMostEfficientBridge(sourceModel: string, targetModel: string): BridgeConfiguration | null {
        const bridges = Array.from(this.bridges.values())
            .filter(bridge =>
                bridge.sourceModel === sourceModel &&
                bridge.targetModel === targetModel
            )
            .sort((a, b) => b.efficiency - a.efficiency);

        return bridges[0] || null;
    }

    /**
     * Update bridge usage statistics
     */
    updateUsageStats(bridgeId: string, efficiency: number): void {
        const existing = this.usageStats.get(bridgeId);
        if (existing) {
            existing.count++;
            existing.lastUsed = new Date();
            existing.averageEfficiency = (existing.averageEfficiency + efficiency) / 2;
        } else {
            this.usageStats.set(bridgeId, {
                count: 1,
                lastUsed: new Date(),
                averageEfficiency: efficiency
            });
        }
    }

    /**
     * Get usage statistics for a bridge
     */
    getUsageStats(bridgeId: string) {
        return this.usageStats.get(bridgeId);
    }

    /**
     * Initialize standard bridge configurations
     */
    private initializeStandardBridges(): void {
        // Social Commerce to Creative Portfolio
        this.registerBridge(this.createSocialCommerceToCreativePortfolioBridge());
        this.registerBridge(this.createCreativePortfolioToSocialCommerceBridge());

        // Social Commerce to Professional Network
        this.registerBridge(this.createSocialCommerceToProfessionalNetworkBridge());
        this.registerBridge(this.createProfessionalNetworkToSocialCommerceBridge());

        // Social Commerce to Community Hub
        this.registerBridge(this.createSocialCommerceToCommunityHubBridge());
        this.registerBridge(this.createCommunityHubToSocialCommerceBridge());

        // Creative Portfolio to Professional Network
        this.registerBridge(this.createCreativePortfolioToProfessionalNetworkBridge());
        this.registerBridge(this.createProfessionalNetworkToCreativePortfolioBridge());

        // Creative Portfolio to Community Hub
        this.registerBridge(this.createCreativePortfolioToCommunityHubBridge());
        this.registerBridge(this.createCommunityHubToCreativePortfolioBridge());

        // Professional Network to Community Hub
        this.registerBridge(this.createProfessionalNetworkToCommunityHubBridge());
        this.registerBridge(this.createCommunityHubToProfessionalNetworkBridge());
    }

    /**
     * Create Social Commerce to Creative Portfolio bridge
     */
    private createSocialCommerceToCreativePortfolioBridge(): BridgeConfiguration {
        return {
            id: 'social-commerce-creative-portfolio-bridge',
            sourceModel: 'social-commerce',
            targetModel: 'creative-portfolio',
            mappings: [
                ...this.getBaseMappings(),
                {
                    sourceField: 'catalog.products',
                    targetField: 'portfolio.artworks',
                    transformation: 'products-to-artworks',
                    required: false
                },
                {
                    sourceField: 'catalog.services',
                    targetField: 'professional.commissions',
                    transformation: 'services-to-commissions',
                    required: false
                },
                {
                    sourceField: 'catalog.events',
                    targetField: 'portfolio.exhibitions',
                    transformation: 'events-to-exhibitions',
                    required: false
                },
                {
                    sourceField: 'commerce.transactions',
                    targetField: 'professional.commissions',
                    transformation: 'transactions-to-commissions',
                    required: false
                }
            ],
            transformations: [
                this.getProductsToArtworksTransformation(),
                this.getServicesToCommissionsTransformation(),
                this.getEventsToExhibitionsTransformation()
            ],
            efficiency: 0.75,
            lossyFields: ['commerce.paymentMethods', 'social.reputation'],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Bridge from social commerce model to creative portfolio model'
            }
        };
    }

    /**
     * Create Creative Portfolio to Social Commerce bridge
     */
    private createCreativePortfolioToSocialCommerceBridge(): BridgeConfiguration {
        return {
            id: 'creative-portfolio-social-commerce-bridge',
            sourceModel: 'creative-portfolio',
            targetModel: 'social-commerce',
            mappings: [
                ...this.getBaseMappings(),
                {
                    sourceField: 'portfolio.artworks',
                    targetField: 'catalog.products',
                    transformation: 'artworks-to-products',
                    required: false
                },
                {
                    sourceField: 'professional.commissions',
                    targetField: 'catalog.services',
                    transformation: 'commissions-to-services',
                    required: false
                },
                {
                    sourceField: 'portfolio.exhibitions',
                    targetField: 'catalog.events',
                    transformation: 'exhibitions-to-events',
                    required: false
                }
            ],
            transformations: [
                this.getArtworksToProductsTransformation(),
                this.getCommissionsToServicesTransformation(),
                this.getExhibitionsToEventsTransformation()
            ],
            efficiency: 0.75,
            lossyFields: ['professional.availability'],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Bridge from creative portfolio model to social commerce model'
            }
        };
    }

    /**
     * Create Social Commerce to Professional Network bridge
     */
    private createSocialCommerceToProfessionalNetworkBridge(): BridgeConfiguration {
        return {
            id: 'social-commerce-professional-network-bridge',
            sourceModel: 'social-commerce',
            targetModel: 'professional-network',
            mappings: [
                ...this.getBaseMappings(),
                {
                    sourceField: 'catalog.services',
                    targetField: 'experience.skills',
                    transformation: 'services-to-skills',
                    required: false
                },
                {
                    sourceField: 'social.reputation',
                    targetField: 'network.recommendations',
                    transformation: 'reputation-to-recommendations',
                    required: false
                }
            ],
            transformations: [
                this.getServicesToSkillsTransformation(),
                this.getReputationToRecommendationsTransformation()
            ],
            efficiency: 0.65,
            lossyFields: ['catalog.products', 'commerce.transactions'],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Bridge from social commerce model to professional network model'
            }
        };
    }

    /**
     * Create Professional Network to Social Commerce bridge
     */
    private createProfessionalNetworkToSocialCommerceBridge(): BridgeConfiguration {
        return {
            id: 'professional-network-social-commerce-bridge',
            sourceModel: 'professional-network',
            targetModel: 'social-commerce',
            mappings: [
                ...this.getBaseMappings(),
                {
                    sourceField: 'experience.skills',
                    targetField: 'catalog.services',
                    transformation: 'skills-to-services',
                    required: false
                },
                {
                    sourceField: 'experience.positions',
                    targetField: 'identity.bio',
                    transformation: 'positions-to-bio',
                    required: false
                }
            ],
            transformations: [
                this.getSkillsToServicesTransformation(),
                this.getPositionsToBioTransformation()
            ],
            efficiency: 0.65,
            lossyFields: ['experience.certifications'],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Bridge from professional network model to social commerce model'
            }
        };
    }

    /**
     * Base mappings common to all bridges
     */
    private getBaseMappings(): FieldMapping[] {
        return [
            {
                sourceField: 'identity.id',
                targetField: 'identity.id',
                required: true
            },
            {
                sourceField: 'identity.name',
                targetField: 'identity.name',
                required: true
            },
            {
                sourceField: 'identity.email',
                targetField: 'identity.email',
                required: true
            },
            {
                sourceField: 'identity.avatar',
                targetField: 'identity.avatar',
                required: false
            },
            {
                sourceField: 'identity.bio',
                targetField: 'identity.bio',
                required: false
            },
            {
                sourceField: 'identity.location',
                targetField: 'identity.location',
                required: false
            }
        ];
    }

    /**
     * Transformation functions
     */
    private getProductsToArtworksTransformation(): TransformationRule {
        return {
            name: 'products-to-artworks',
            sourceFields: ['catalog.products'],
            targetField: 'portfolio.artworks',
            rule: (products: any[]) => {
                return products.map(product => ({
                    id: product.id,
                    title: product.name,
                    description: product.description,
                    medium: product.category,
                    year: new Date().getFullYear(),
                    price: product.price,
                    currency: product.currency,
                    isForSale: product.isActive,
                    images: product.images,
                    tags: product.tags,
                    created: product.created
                }));
            }
        };
    }

    private getArtworksToProductsTransformation(): TransformationRule {
        return {
            name: 'artworks-to-products',
            sourceFields: ['portfolio.artworks'],
            targetField: 'catalog.products',
            rule: (artworks: any[]) => {
                return artworks.map(artwork => ({
                    id: artwork.id,
                    name: artwork.title,
                    description: artwork.description || `${artwork.medium} artwork from ${artwork.year}`,
                    price: artwork.price || 0,
                    currency: artwork.currency,
                    category: artwork.medium,
                    tags: artwork.tags,
                    images: artwork.images,
                    inventory: artwork.isForSale ? 1 : 0,
                    isActive: artwork.isForSale,
                    created: artwork.created
                }));
            }
        };
    }

    private getServicesToCommissionsTransformation(): TransformationRule {
        return {
            name: 'services-to-commissions',
            sourceFields: ['catalog.services'],
            targetField: 'professional.commissions',
            rule: (services: any[]) => {
                return services.map(service => ({
                    id: `commission-${service.id}`,
                    clientId: 'unknown',
                    title: service.name,
                    description: service.description,
                    budget: service.fixedPrice || service.hourlyRate || 0,
                    currency: service.currency,
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    status: service.isAvailable ? 'inquiry' : 'completed',
                    created: service.created
                }));
            }
        };
    }

    private getCommissionsToServicesTransformation(): TransformationRule {
        return {
            name: 'commissions-to-services',
            sourceFields: ['professional.commissions'],
            targetField: 'catalog.services',
            rule: (commissions: any[]) => {
                return commissions.map(commission => ({
                    id: commission.id,
                    name: commission.title,
                    description: commission.description,
                    fixedPrice: commission.budget,
                    currency: commission.currency,
                    category: 'commission',
                    tags: [commission.status],
                    isAvailable: commission.status === 'inquiry',
                    created: commission.created
                }));
            }
        };
    }

    private getEventsToExhibitionsTransformation(): TransformationRule {
        return {
            name: 'events-to-exhibitions',
            sourceFields: ['catalog.events'],
            targetField: 'portfolio.exhibitions',
            rule: (events: any[]) => {
                return events.map(event => ({
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    venue: event.location || 'Virtual',
                    startDate: event.startDate,
                    endDate: event.endDate || event.startDate,
                    artworkIds: [],
                    isGroup: true,
                    created: event.created
                }));
            }
        };
    }

    private getExhibitionsToEventsTransformation(): TransformationRule {
        return {
            name: 'exhibitions-to-events',
            sourceFields: ['portfolio.exhibitions'],
            targetField: 'catalog.events',
            rule: (exhibitions: any[]) => {
                return exhibitions.map(exhibition => ({
                    id: exhibition.id,
                    title: exhibition.title,
                    description: exhibition.description,
                    startDate: exhibition.startDate,
                    endDate: exhibition.endDate,
                    location: exhibition.venue,
                    isVirtual: exhibition.venue === 'Virtual',
                    tags: exhibition.isGroup ? ['group-exhibition'] : ['solo-exhibition'],
                    created: exhibition.created
                }));
            }
        };
    }

    private getServicesToSkillsTransformation(): TransformationRule {
        return {
            name: 'services-to-skills',
            sourceFields: ['catalog.services'],
            targetField: 'experience.skills',
            rule: (services: any[]) => {
                return services.map(service => ({
                    id: `skill-${service.id}`,
                    name: service.name,
                    category: service.category,
                    level: 'advanced' as const,
                    endorsements: 0,
                    created: service.created
                }));
            }
        };
    }

    private getSkillsToServicesTransformation(): TransformationRule {
        return {
            name: 'skills-to-services',
            sourceFields: ['experience.skills'],
            targetField: 'catalog.services',
            rule: (skills: any[]) => {
                return skills.map(skill => ({
                    id: `service-${skill.id}`,
                    name: skill.name,
                    description: `Professional ${skill.name} services`,
                    category: skill.category,
                    tags: [skill.level],
                    isAvailable: true,
                    created: skill.created
                }));
            }
        };
    }

    private getReputationToRecommendationsTransformation(): TransformationRule {
        return {
            name: 'reputation-to-recommendations',
            sourceFields: ['social.reputation'],
            targetField: 'network.recommendations',
            rule: (reputation: any) => {
                return [{
                    id: 'reputation-summary',
                    fromUserId: 'system',
                    toUserId: 'current-user',
                    content: `Has ${reputation.reviews} reviews with ${reputation.rating} average rating`,
                    relationship: 'customer',
                    skills: [],
                    isPublic: true,
                    created: new Date()
                }];
            }
        };
    }

    private getPositionsToBioTransformation(): TransformationRule {
        return {
            name: 'positions-to-bio',
            sourceFields: ['experience.positions'],
            targetField: 'identity.bio',
            rule: (positions: any[]) => {
                if (!positions.length) return '';

                const currentPosition = positions.find(p => p.isCurrent);
                const totalExperience = positions.length;

                if (currentPosition) {
                    return `Currently ${currentPosition.title} at ${currentPosition.company}. ${totalExperience} positions of professional experience.`;
                } else {
                    const latestPosition = positions[0];
                    return `Previously ${latestPosition.title} at ${latestPosition.company}. ${totalExperience} positions of professional experience.`;
                }
            }
        };
    }

    // Placeholder methods for additional bridges (can be implemented similarly)
    private createSocialCommerceToCommunityHubBridge(): BridgeConfiguration {
        return {
            id: 'social-commerce-community-hub-bridge',
            sourceModel: 'social-commerce',
            targetModel: 'community-hub',
            mappings: this.getBaseMappings(),
            transformations: [],
            efficiency: 0.80,
            lossyFields: [],
            metadata: { created: new Date().toISOString(), version: '1.0.0' }
        };
    }

    private createCommunityHubToSocialCommerceBridge(): BridgeConfiguration {
        return {
            id: 'community-hub-social-commerce-bridge',
            sourceModel: 'community-hub',
            targetModel: 'social-commerce',
            mappings: this.getBaseMappings(),
            transformations: [],
            efficiency: 0.80,
            lossyFields: [],
            metadata: { created: new Date().toISOString(), version: '1.0.0' }
        };
    }

    private createCreativePortfolioToProfessionalNetworkBridge(): BridgeConfiguration {
        return {
            id: 'creative-portfolio-professional-network-bridge',
            sourceModel: 'creative-portfolio',
            targetModel: 'professional-network',
            mappings: this.getBaseMappings(),
            transformations: [],
            efficiency: 0.60,
            lossyFields: [],
            metadata: { created: new Date().toISOString(), version: '1.0.0' }
        };
    }

    private createProfessionalNetworkToCreativePortfolioBridge(): BridgeConfiguration {
        return {
            id: 'professional-network-creative-portfolio-bridge',
            sourceModel: 'professional-network',
            targetModel: 'creative-portfolio',
            mappings: this.getBaseMappings(),
            transformations: [],
            efficiency: 0.60,
            lossyFields: [],
            metadata: { created: new Date().toISOString(), version: '1.0.0' }
        };
    }

    private createCreativePortfolioToCommunityHubBridge(): BridgeConfiguration {
        return {
            id: 'creative-portfolio-community-hub-bridge',
            sourceModel: 'creative-portfolio',
            targetModel: 'community-hub',
            mappings: this.getBaseMappings(),
            transformations: [],
            efficiency: 0.70,
            lossyFields: [],
            metadata: { created: new Date().toISOString(), version: '1.0.0' }
        };
    }

    private createCommunityHubToCreativePortfolioBridge(): BridgeConfiguration {
        return {
            id: 'community-hub-creative-portfolio-bridge',
            sourceModel: 'community-hub',
            targetModel: 'creative-portfolio',
            mappings: this.getBaseMappings(),
            transformations: [],
            efficiency: 0.70,
            lossyFields: [],
            metadata: { created: new Date().toISOString(), version: '1.0.0' }
        };
    }

    private createProfessionalNetworkToCommunityHubBridge(): BridgeConfiguration {
        return {
            id: 'professional-network-community-hub-bridge',
            sourceModel: 'professional-network',
            targetModel: 'community-hub',
            mappings: this.getBaseMappings(),
            transformations: [],
            efficiency: 0.85,
            lossyFields: [],
            metadata: { created: new Date().toISOString(), version: '1.0.0' }
        };
    }

    private createCommunityHubToProfessionalNetworkBridge(): BridgeConfiguration {
        return {
            id: 'community-hub-professional-network-bridge',
            sourceModel: 'community-hub',
            targetModel: 'professional-network',
            mappings: this.getBaseMappings(),
            transformations: [],
            efficiency: 0.85,
            lossyFields: [],
            metadata: { created: new Date().toISOString(), version: '1.0.0' }
        };
    }
} 