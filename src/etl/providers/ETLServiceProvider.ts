import { ServiceProvider } from '../../providers/ServiceProvider.js';
import { DefaultBridgeRegistry, BridgeComponent } from '../bridges.js';
import { ETLPipeline } from '../core/ETLPipeline.js';
import { GraphTranslationEngine } from '../graphs/GraphTranslationEngine.js';
import { EventEmitter } from 'node:events';
import { Logger } from '../../logging/Logger.js';
import type { Command } from 'commander';
import type { Container } from '../../container/Container.js';

/**
 * ETLServiceProvider - ETL Pipeline Service Registration
 * 
 * @package     @imajin/cli
 * @subpackage  etl/providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-04
 *
 * Integration Points:
 * - Bridge Registry
 * - ETL Pipeline
 * - Graph Translation
 * - Event System
 */
export class ETLServiceProvider extends ServiceProvider {
    private readonly bridgeRegistry: DefaultBridgeRegistry;
    private readonly pipeline: ETLPipeline;
    private readonly graphTranslator: GraphTranslationEngine;
    private readonly events: EventEmitter;

    constructor(container: Container, program: Command) {
        super(container, program);
        this.bridgeRegistry = new DefaultBridgeRegistry();
        this.pipeline = new ETLPipeline({
            id: 'default',
            name: 'Default Pipeline',
            description: 'Default ETL pipeline',
            steps: []
        });
        this.graphTranslator = new GraphTranslationEngine();
        this.events = new EventEmitter();
    }

    public getName(): string {
        return 'etl';
    }

    public register(): void {
        // Register core ETL services
        this.container.singleton('etl.bridgeRegistry', () => this.bridgeRegistry);
        this.container.singleton('etl.pipeline', () => this.pipeline);
        this.container.singleton('etl.graphTranslator', () => this.graphTranslator);
        this.container.singleton('etl.events', () => this.events);

        // Register bridge component factory
        this.container.singleton('etl.bridgeComponent', () => {
            return (bridge: any) => new BridgeComponent(bridge, this.bridgeRegistry);
        });
    }

    public boot(): void {
        const logger = this.container.resolve<Logger>('logger');
        let eventManager: any;
        
        try {
            eventManager = this.container.resolve('eventManager');
        } catch {
            // Event manager might not be available
            eventManager = null;
        }

        // Initialize bridge registry if method exists
        if (this.bridgeRegistry && typeof (this.bridgeRegistry as any).initialize === 'function') {
            (this.bridgeRegistry as any).initialize();
        }
        
        // Don't execute pipeline during boot - it should be executed when needed with proper context
        // Pipeline execution requires ETLContext which should be provided at runtime
        
        // Register event listeners with event manager if available
        if (eventManager && typeof eventManager.registerListener === 'function') {
            eventManager.registerListener({
                eventType: 'etl.bridge.registered'
            }, {
                handle: (bridge: any) => {
                    logger.info(`Bridge registered: ${bridge.id}`);
                }
            });

            eventManager.registerListener({
                eventType: 'etl.pipeline.started'
            }, {
                handle: (pipelineId: string) => {
                    logger.info(`Pipeline started: ${pipelineId}`);
                }
            });

            eventManager.registerListener({
                eventType: 'etl.pipeline.completed'
            }, {
                handle: (pipelineId: string, _result: any) => {
                    logger.info(`Pipeline completed: ${pipelineId}`);
                }
            });
        }
    }

    public registerCommands(program: Command): void {
        // Register ETL commands
        program
            .command('etl')
            .description('ETL pipeline operations')
            .action(() => {
                // ETL command implementation
            });

        program
            .command('bridge')
            .description('Bridge management operations')
            .action(() => {
                // Bridge command implementation
            });

        program
            .command('graph')
            .description('Graph translation operations')
            .action(() => {
                // Graph command implementation
            });
    }

    public getServices(): string[] {
        return [
            'etl.bridgeRegistry',
            'etl.pipeline',
            'etl.graphTranslator',
            'etl.bridgeComponent',
            'etl.events'
        ];
    }

    public provides(service: string): boolean {
        return this.getServices().includes(service);
    }
} 