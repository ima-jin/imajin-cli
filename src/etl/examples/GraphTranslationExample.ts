/**
 * GraphTranslationExample - Example usage of graph translation system
 * 
 * @package     @imajin/cli
 * @subpackage  etl/examples
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Example CLI commands for graph translation
 * - Sample data transformation workflows
 * - Real-world usage patterns for graph bridging
 * - Progress tracking and error handling examples
 */

import { EventEmitter } from 'events';
import { BridgeRegistry } from '../bridges/BridgeRegistry.js';
import { ETLContext } from '../core/interfaces.js';
import { GraphTranslationEngine } from '../graphs/GraphTranslationEngine.js';
import {
    CreativePortfolioGraph,
    SocialCommerceGraph,
    STANDARD_MODELS
} from '../graphs/models.js';
import { GraphTransformer } from '../transformers/GraphTransformer.js';

/**
 * Example graph translation workflows
 */
export class GraphTranslationExample {
    private engine: GraphTranslationEngine;
    private bridgeRegistry: BridgeRegistry;
    private transformer: GraphTransformer;

    constructor() {
        this.engine = new GraphTranslationEngine();
        this.bridgeRegistry = new BridgeRegistry();
        this.transformer = new GraphTransformer();
    }

    /**
     * Example 1: Same model communication (no translation needed)
     */
    async exampleDirectCommunication(): Promise<void> {
        console.log('\n🔄 Example 1: Direct Communication (Same Model)');
        console.log('================================================');

        // Two users both using social-commerce model
        const johnGraph = this.createSampleSocialCommerceGraph('john');
        const sarahGraph = this.createSampleSocialCommerceGraph('sarah');

        // Check if direct communication is possible
        const canCommunicateDirectly = this.engine.canCommunicateDirectly(
            johnGraph.modelType,
            sarahGraph.modelType
        );

        console.log(`✅ Direct communication possible: ${canCommunicateDirectly}`);

        if (canCommunicateDirectly) {
            console.log('💬 John and Sarah can interact directly - no ETL needed!');
            console.log(`📊 John has ${johnGraph.catalog.products.length} products`);
            console.log(`📊 Sarah has ${sarahGraph.catalog.products.length} products`);
        }
    }

    /**
     * Example 2: Cross-model translation (ETL required)
     */
    async exampleCrossModelTranslation(): Promise<void> {
        console.log('\n🔄 Example 2: Cross-Model Translation');
        console.log('======================================');

        // Mike uses creative-portfolio, John uses social-commerce
        const mikeGraph = this.createSampleCreativePortfolioGraph('mike');
        const context = this.createETLContext('cross-model-translation');

        // Translation required
        console.log(`🎨 Mike's model: ${mikeGraph.modelType} (${mikeGraph.portfolio.artworks.length} artworks)`);
        console.log('🔄 Translating to social-commerce model for John...');

        const result = await this.engine.translateGraph(
            mikeGraph,
            'social-commerce',
            context
        );

        if (result.success && result.translatedGraph) {
            const translatedGraph = result.translatedGraph as SocialCommerceGraph;
            console.log(`✅ Translation successful with ${result.confidence} confidence`);
            console.log(`🛍️ Mike's artworks now appear as ${translatedGraph.catalog.products.length} products in John's context`);
            console.log(`📈 Translation efficiency: ${this.engine.getEfficiency('creative-portfolio', 'social-commerce')}`);
        } else {
            console.log(`❌ Translation failed: ${result.error?.message}`);
        }
    }

    /**
     * Example 3: Context normalization for external graphs
     */
    async exampleContextNormalization(): Promise<void> {
        console.log('\n🔄 Example 3: Context Normalization');
        console.log('====================================');

        // External graph with unknown/custom structure
        const externalGraph = {
            user: {
                id: 'linda-123',
                name: 'Linda Chen',
                email: 'linda@example.com'
            },
            items: [
                { id: 'item-1', title: 'Custom Product A', price: 25.99 },
                { id: 'item-2', title: 'Custom Product B', price: 45.00 }
            ],
            connections: [
                { id: 'conn-1', friend_id: 'user-456', status: 'active' }
            ]
        };

        const context = this.createETLContext('context-normalization');

        console.log('🔍 Detecting external graph structure...');
        console.log('🔄 Normalizing to social-commerce context...');

        const result = await this.engine.normalizeToContext(
            externalGraph,
            'social-commerce',
            context
        );

        if (result.success && result.translatedGraph) {
            const normalizedGraph = result.translatedGraph as SocialCommerceGraph;
            console.log(`✅ Normalization successful with ${result.confidence} confidence`);
            console.log(`👤 User: ${normalizedGraph.identity.name}`);
            console.log(`🛍️ Products: ${normalizedGraph.catalog?.products?.length || 0}`);
        } else {
            console.log(`❌ Normalization failed: ${result.error?.message}`);
        }
    }

    /**
     * Example 4: Bridge optimization and efficiency
     */
    async exampleBridgeOptimization(): Promise<void> {
        console.log('\n🔄 Example 4: Bridge Optimization');
        console.log('==================================');

        // Compare efficiency scores between different model pairs
        const modelPairs = [
            ['social-commerce', 'creative-portfolio'],
            ['social-commerce', 'professional-network'],
            ['social-commerce', 'community-hub'],
            ['creative-portfolio', 'professional-network'],
            ['professional-network', 'community-hub']
        ];

        console.log('📊 Translation Efficiency Matrix:');
        console.log('Source → Target | Efficiency | Bridge Available');
        console.log('------------------------------------------------');

        for (const [source, target] of modelPairs) {
            if (source && target) {
                const efficiency = this.engine.getEfficiency(source as any, target as any);
                const bridge = this.bridgeRegistry.getBridge(source, target);

                console.log(`${source.padEnd(16)} → ${target.padEnd(16)} | ${(efficiency * 100).toFixed(1)}%      | ${bridge ? '✅' : '❌'}`);
            }
        }

        // Show most efficient bridge
        const bestBridge = this.bridgeRegistry.getMostEfficientBridge('social-commerce', 'creative-portfolio');
        if (bestBridge) {
            console.log(`\n🎯 Most efficient bridge: ${bestBridge.id} (${(bestBridge.efficiency * 100).toFixed(1)}% efficiency)`);
            console.log(`📋 Mappings: ${bestBridge.mappings.length}`);
            console.log(`🔧 Transformations: ${bestBridge.transformations.length}`);
        }
    }

    /**
     * Example 5: CLI command patterns
     */
    async exampleCLICommands(): Promise<void> {
        console.log('\n🔄 Example 5: CLI Command Patterns');
        console.log('===================================');

        console.log('These would be the actual CLI commands:');
        console.log('');
        console.log('# Traditional service ETL');
        console.log('imajin etl extract stripe-customers | transform to-universal | load my-crm');
        console.log('');
        console.log('# Graph translation');
        console.log('imajin graph:translate mikes-portfolio --to social-commerce --output events');
        console.log('imajin graph:normalize lindas-custom-api --context my-social-commerce');
        console.log('imajin graph:bridge creative-portfolio social-commerce --optimize');
        console.log('');
        console.log('# Discovery based on model compatibility');
        console.log('imajin discover --model social-commerce --direct-compatible');
        console.log('imajin discover --model creative-portfolio --translatable-to social-commerce');
        console.log('');
        console.log('# Real-time graph operations');
        console.log('imajin graph:sync johns-commerce sarahs-commerce --live');
        console.log('imajin graph:bridge-generate custom-model social-commerce --auto');
    }

    /**
     * Run all examples
     */
    async runAllExamples(): Promise<void> {
        console.log('🚀 Graph Translation System Examples');
        console.log('=====================================');

        await this.exampleDirectCommunication();
        await this.exampleCrossModelTranslation();
        await this.exampleContextNormalization();
        await this.exampleBridgeOptimization();
        await this.exampleCLICommands();

        console.log('\n✅ All examples completed!');
        console.log('\n📚 The graph translation system enables:');
        console.log('   • Direct communication between same-model users');
        console.log('   • Automatic translation between different standard models');
        console.log('   • Context normalization for external/custom graphs');
        console.log('   • Optimized bridge configurations for efficiency');
        console.log('   • Real-time progress tracking and error handling');
    }

    /**
     * Create sample social commerce graph
     */
    private createSampleSocialCommerceGraph(userId: string): SocialCommerceGraph {
        return {
            modelType: 'social-commerce',
            version: '1.0.0',
            schema: STANDARD_MODELS['social-commerce'].schema,
            compatibilityMap: STANDARD_MODELS['social-commerce'].compatibility,
            metadata: {
                created: new Date().toISOString(),
                source: 'example'
            },
            identity: {
                id: `${userId}-123`,
                name: `${userId.charAt(0).toUpperCase() + userId.slice(1)} Doe`,
                email: `${userId}@example.com`,
                created: new Date(),
                updated: new Date()
            },
            catalog: {
                products: [
                    {
                        id: `${userId}-prod-1`,
                        name: 'Sample Product A',
                        description: 'A great product',
                        price: 29.99,
                        currency: 'USD',
                        category: 'electronics',
                        tags: ['tech', 'gadget'],
                        images: ['https://example.com/image1.jpg'],
                        inventory: 10,
                        isActive: true,
                        created: new Date()
                    }
                ],
                services: [
                    {
                        id: `${userId}-svc-1`,
                        name: 'Consulting Service',
                        description: 'Professional consulting',
                        hourlyRate: 150,
                        currency: 'USD',
                        category: 'consulting',
                        tags: ['professional'],
                        isAvailable: true,
                        created: new Date()
                    }
                ],
                events: [
                    {
                        id: `${userId}-evt-1`,
                        title: 'Product Launch',
                        description: 'Launching our new product',
                        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        location: 'Virtual Event',
                        currency: 'USD',
                        isVirtual: true,
                        tags: ['launch', 'product'],
                        created: new Date()
                    }
                ]
            },
            social: {
                connections: [
                    {
                        id: `${userId}-conn-1`,
                        userId: `${userId}-123`,
                        connectedUserId: 'other-user-456',
                        type: 'friend',
                        status: 'active',
                        created: new Date()
                    }
                ],
                reputation: {
                    score: 4.5,
                    reviews: 25,
                    rating: 4.8
                }
            },
            commerce: {
                paymentMethods: [
                    {
                        id: `${userId}-pay-1`,
                        userId: `${userId}-123`,
                        type: 'card',
                        provider: 'stripe',
                        last4: '4242',
                        isDefault: true,
                        created: new Date()
                    }
                ],
                transactions: [
                    {
                        id: `${userId}-txn-1`,
                        fromUserId: `${userId}-123`,
                        toUserId: 'customer-789',
                        amount: 29.99,
                        currency: 'USD',
                        type: 'payment',
                        status: 'completed',
                        created: new Date()
                    }
                ]
            }
        };
    }

    /**
     * Create sample creative portfolio graph
     */
    private createSampleCreativePortfolioGraph(userId: string): CreativePortfolioGraph {
        return {
            modelType: 'creative-portfolio',
            version: '1.0.0',
            schema: STANDARD_MODELS['creative-portfolio'].schema,
            compatibilityMap: STANDARD_MODELS['creative-portfolio'].compatibility,
            metadata: {
                created: new Date().toISOString(),
                source: 'example'
            },
            identity: {
                id: `${userId}-123`,
                name: `${userId.charAt(0).toUpperCase() + userId.slice(1)} Artist`,
                email: `${userId}@example.com`,
                created: new Date(),
                updated: new Date()
            },
            portfolio: {
                artworks: [
                    {
                        id: `${userId}-art-1`,
                        title: 'Digital Landscape',
                        description: 'A beautiful digital landscape',
                        medium: 'Digital Art',
                        year: 2024,
                        price: 500,
                        currency: 'USD',
                        isForSale: true,
                        images: ['https://example.com/artwork1.jpg'],
                        tags: ['landscape', 'digital'],
                        exhibitions: [],
                        created: new Date()
                    },
                    {
                        id: `${userId}-art-2`,
                        title: 'Abstract Expression',
                        description: 'An abstract piece',
                        medium: 'Oil on Canvas',
                        year: 2023,
                        price: 750,
                        currency: 'USD',
                        isForSale: true,
                        images: ['https://example.com/artwork2.jpg'],
                        tags: ['abstract', 'oil'],
                        exhibitions: [],
                        created: new Date()
                    }
                ],
                collections: [
                    {
                        id: `${userId}-coll-1`,
                        name: 'Digital Dreams',
                        description: 'A collection of digital artworks',
                        theme: 'Digital Art',
                        artworkIds: [`${userId}-art-1`],
                        isPublic: true,
                        created: new Date()
                    }
                ],
                exhibitions: [
                    {
                        id: `${userId}-exh-1`,
                        title: 'Solo Exhibition 2024',
                        description: 'My latest works',
                        venue: 'Local Gallery',
                        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                        artworkIds: [`${userId}-art-1`, `${userId}-art-2`],
                        isGroup: false,
                        created: new Date()
                    }
                ]
            },
            professional: {
                commissions: [
                    {
                        id: `${userId}-comm-1`,
                        clientId: 'client-456',
                        title: 'Custom Portrait',
                        description: 'A custom portrait commission',
                        budget: 1200,
                        currency: 'USD',
                        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                        status: 'in_progress',
                        created: new Date()
                    }
                ],
                availability: {
                    isOpen: true,
                    rates: {
                        portrait: 800,
                        landscape: 600,
                        abstract: 500
                    },
                    schedule: {
                        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                        workingHours: '9:00-17:00'
                    }
                }
            },
            social: {
                connections: [
                    {
                        id: `${userId}-conn-1`,
                        userId: `${userId}-123`,
                        connectedUserId: 'artist-789',
                        type: 'collaborator',
                        status: 'active',
                        created: new Date()
                    }
                ]
            }
        };
    }

    /**
     * Create ETL context for examples
     */
    private createETLContext(operationId: string): ETLContext {
        const context: ETLContext = {
            id: `ctx-${operationId}-${Date.now()}`,
            pipelineId: `pipeline-${operationId}`,
            metadata: {
                operation: operationId,
                example: true
            },
            startTime: new Date(),
            events: new EventEmitter()
        };

        // Add event listeners for progress tracking
        context.events.on('progress', (progress) => {
            console.log(`   📊 ${progress.message} (${progress.percentage || 0}%)`);
        });

        context.events.on('step:error', (step, error) => {
            console.log(`   ❌ Error in ${step}: ${error.message}`);
        });

        return context;
    }
}

// Export for usage in other files
export default GraphTranslationExample; 