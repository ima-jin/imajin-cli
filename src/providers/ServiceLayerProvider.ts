/**
 * ServiceLayerProvider - Service provider for the service layer architecture
 * 
 * @package     @imajin/cli
 * @subpackage  providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see         docs/architecture.md
 * 
 * Integration Points:
 * - Service registry registration with Container
 * - Service factory registration with Container
 * - Strategy manager registration with Container
 * - CLI commands for service management
 * - Event system integration
 */

import { Command } from 'commander';
import type { Container } from '../container/Container.js';
import type { Logger } from '../logging/Logger.js';
import { ServiceFactory, ServiceRegistry, ServiceStrategyManager } from '../services/index.js';
import type { ImajinConfig } from '../types/Config.js';
import type { ServiceIntrospection } from '../types/LLM.js';
import { ServiceProvider } from './ServiceProvider.js';

export class ServiceLayerProvider extends ServiceProvider {
    private serviceRegistry?: ServiceRegistry;
    private serviceFactory?: ServiceFactory;
    private strategyManager?: ServiceStrategyManager;

    constructor(container: Container, program: Command) {
        super(container, program);
    }

    /**
     * Get provider name
     */
    getName(): string {
        return 'service-layer';
    }

    /**
     * Get provider version
     */
    getVersion(): string {
        return '0.1.0';
    }

    /**
     * Get services provided by this provider
     */
    getServices(): string[] {
        return [
            'service-registry',
            'service-factory',
            'strategy-manager',
            'service-discovery',
            'service-management'
        ];
    }

    /**
     * Check if provider provides a specific service
     */
    provides(service: string): boolean {
        return this.getServices().includes(service) || service === 'service-layer';
    }

    /**
     * Register services with the container
     */
    async register(): Promise<void> {
        const logger = this.container.resolve<Logger>('logger');

        // Create and register ServiceRegistry
        this.serviceRegistry = new ServiceRegistry(this.container);
        this.container.singleton('serviceRegistry', () => this.serviceRegistry!);

        // Create and register ServiceFactory
        this.serviceFactory = new ServiceFactory(this.container);
        this.container.singleton('serviceFactory', () => this.serviceFactory!);

        // Create and register ServiceStrategyManager
        this.strategyManager = new ServiceStrategyManager(this.container);
        this.container.singleton('strategyManager', () => this.strategyManager!);

        logger.info('Service layer components registered');
    }

    /**
     * Boot the service provider
     */
    async boot(): Promise<void> {
        const logger = this.container.resolve<Logger>('logger');

        // Initialize the service registry
        if (this.serviceRegistry) {
            await this.serviceRegistry.initialize();
        }

        logger.info('Service layer provider booted successfully');
    }

    /**
     * Register commands with CLI program
     */
    registerCommands(program: Command): void {
        // Service management commands
        const serviceCmd = program
            .command('service')
            .description('Service layer management commands');

        // List all services
        serviceCmd
            .command('list')
            .description('List all registered services')
            .option('--status <status>', 'Filter by service status')
            .option('--json', 'Output in JSON format')
            .action((options) => {
                this.handleListServices(options);
            });

        // Service health check
        serviceCmd
            .command('health')
            .description('Check health of all services')
            .option('--service <name>', 'Check specific service')
            .option('--json', 'Output in JSON format')
            .action((options) => {
                this.handleHealthCheck(options);
            });

        // Service statistics
        serviceCmd
            .command('stats')
            .description('Display service layer statistics')
            .option('--json', 'Output in JSON format')
            .action((options) => {
                this.handleStatistics(options);
            });

        // Restart service
        serviceCmd
            .command('restart')
            .argument('<service>', 'Service name to restart')
            .description('Restart a specific service')
            .action((serviceName: string) => {
                this.handleRestartService(serviceName);
            });

        // Factory management commands
        const factoryCmd = program
            .command('factory')
            .description('Service factory management commands');

        // List available service types
        factoryCmd
            .command('types')
            .description('List available service types')
            .option('--category <category>', 'Filter by category')
            .option('--json', 'Output in JSON format')
            .action((options) => {
                this.handleListServiceTypes(options);
            });

        // Strategy management commands
        const strategyCmd = program
            .command('strategy')
            .description('Strategy manager commands');

        // List strategies
        strategyCmd
            .command('list')
            .description('List all registered strategies')
            .option('--json', 'Output in JSON format')
            .action((options) => {
                this.handleListStrategies(options);
            });
    }

    /**
     * Get service introspection for LLM discovery
     */
    getIntrospection(): ServiceIntrospection {
        return {
            name: this.getName(),
            description: 'Service layer architecture providing business logic encapsulation and service management',
            version: this.getVersion(),
            commands: [
                {
                    name: 'service:list',
                    description: 'List all registered services with their status',
                    usage: 'imajin service list [--status <status>] [--json]',
                    service: 'service-layer',
                    arguments: [],
                    options: [
                        {
                            name: '--status',
                            description: 'Filter services by status (active, inactive, error, etc.)',
                            type: 'string'
                        },
                        {
                            name: '--json',
                            description: 'Output in JSON format for programmatic usage',
                            type: 'boolean'
                        }
                    ],
                    examples: [
                        'imajin service list',
                        'imajin service list --status active',
                        'imajin service list --json'
                    ]
                },
                {
                    name: 'service:health',
                    description: 'Check health status of services',
                    usage: 'imajin service health [--service <name>] [--json]',
                    service: 'service-layer',
                    arguments: [],
                    options: [
                        {
                            name: '--service',
                            description: 'Check specific service by name',
                            type: 'string'
                        },
                        {
                            name: '--json',
                            description: 'Output in JSON format',
                            type: 'boolean'
                        }
                    ],
                    examples: [
                        'imajin service health',
                        'imajin service health --service stripe',
                        'imajin service health --json'
                    ]
                },
                {
                    name: 'factory:types',
                    description: 'List available service types from factory',
                    usage: 'imajin factory types [--category <category>] [--json]',
                    service: 'service-layer',
                    arguments: [],
                    options: [
                        {
                            name: '--category',
                            description: 'Filter by service category',
                            type: 'string'
                        },
                        {
                            name: '--json',
                            description: 'Output in JSON format',
                            type: 'boolean'
                        }
                    ],
                    examples: [
                        'imajin factory types',
                        'imajin factory types --category payment',
                        'imajin factory types --json'
                    ]
                }
            ],
            capabilities: this.getServices(),
            realTimeSupported: true,
            authentication: {
                required: false
            }
        };
    }

    // Private command handlers

    private async handleListServices(options: any): Promise<void> {
        if (!this.serviceRegistry) {
            console.error('❌ Service registry not available');
            return;
        }

        try {
            let services = this.serviceRegistry.getAll();

            // Filter by status if specified
            if (options.status) {
                services = this.serviceRegistry.getByStatus(options.status);
            }

            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    data: services.map(service => ({
                        name: service.getName(),
                        version: service.getVersion(),
                        status: service.getStatus(),
                        metrics: service.getMetrics()
                    })),
                    total: services.length
                }, null, 2));
            } else {
                console.log(`\n📋 Registered Services (${services.length}):\n`);
                services.forEach(service => {
                    const status = service.getStatus();
                    const statusIcon = this.getStatusIcon(status);
                    console.log(`  ${statusIcon} ${service.getName()} (v${service.getVersion()}) - ${status}`);
                });
            }
        } catch (error) {
            console.error('❌ Failed to list services:', error);
        }
    }

    private async handleHealthCheck(options: any): Promise<void> {
        if (!this.serviceRegistry) {
            console.error('❌ Service registry not available');
            return;
        }

        try {
            if (options.service) {
                // Check specific service
                const service = this.serviceRegistry.get(options.service);
                if (!service) {
                    console.error(`❌ Service '${options.service}' not found`);
                    return;
                }

                const health = await service.getHealth();
                if (options.json) {
                    console.log(JSON.stringify({ success: true, data: health }, null, 2));
                } else {
                    this.displayServiceHealth(health);
                }
            } else {
                // Check all services
                const healthReport = await this.serviceRegistry.getHealth();
                if (options.json) {
                    console.log(JSON.stringify({ success: true, data: healthReport }, null, 2));
                } else {
                    console.log('\n🏥 Service Health Report:\n');
                    Object.values(healthReport).forEach(health => {
                        this.displayServiceHealth(health);
                    });
                }
            }
        } catch (error) {
            console.error('❌ Failed to check service health:', error);
        }
    }

    private handleStatistics(options: any): void {
        if (!this.serviceRegistry || !this.serviceFactory || !this.strategyManager) {
            console.error('❌ Service layer components not available');
            return;
        }

        const registryStats = this.serviceRegistry.getStatistics();
        const factoryStats = this.serviceFactory.getStatistics();
        const strategyStats = this.strategyManager.getStatistics();

        const stats = {
            registry: registryStats,
            factory: factoryStats,
            strategies: strategyStats
        };

        if (options.json) {
            console.log(JSON.stringify({ success: true, data: stats }, null, 2));
        } else {
            console.log('\n📊 Service Layer Statistics:\n');
            console.log(`Registry: ${registryStats.total} services`);
            console.log(`Factory: ${factoryStats.totalFactories} types`);
            console.log(`Strategies: ${strategyStats.totalStrategies} strategies`);
        }
    }

    private async handleRestartService(serviceName: string): Promise<void> {
        if (!this.serviceRegistry) {
            console.error('❌ Service registry not available');
            return;
        }

        try {
            const service = this.serviceRegistry.get(serviceName);
            if (!service) {
                console.error(`❌ Service '${serviceName}' not found`);
                return;
            }

            console.log(`🔄 Restarting service: ${serviceName}`);
            await service.shutdown();
            await service.initialize();
            console.log(`✅ Service restarted: ${serviceName}`);
        } catch (error) {
            console.error(`❌ Failed to restart service '${serviceName}':`, error);
        }
    }

    private handleListServiceTypes(options: any): void {
        if (!this.serviceFactory) {
            console.error('❌ Service factory not available');
            return;
        }

        const definitions = this.serviceFactory.getDefinitions();
        let filteredDefinitions = definitions;

        if (options.category) {
            filteredDefinitions = definitions.filter(def => def.category === options.category);
        }

        if (options.json) {
            console.log(JSON.stringify({
                success: true,
                data: filteredDefinitions,
                total: filteredDefinitions.length
            }, null, 2));
        } else {
            console.log(`\n🏭 Available Service Types (${filteredDefinitions.length}):\n`);
            filteredDefinitions.forEach(def => {
                console.log(`  📦 ${def.name} - ${def.description || 'No description'}`);
                if (def.category) {
                    console.log(`      Category: ${def.category}`);
                }
            });
        }
    }

    private handleListStrategies(options: any): void {
        if (!this.strategyManager) {
            console.error('❌ Strategy manager not available');
            return;
        }

        const strategies = this.strategyManager.getAllStrategies();

        if (options.json) {
            console.log(JSON.stringify({
                success: true,
                data: strategies.map(s => ({
                    name: s.getName(),
                    priority: s.getPriority()
                })),
                total: strategies.length
            }, null, 2));
        } else {
            console.log(`\n🎯 Registered Strategies (${strategies.length}):\n`);
            strategies.forEach(strategy => {
                console.log(`  🔥 ${strategy.getName()} (Priority: ${strategy.getPriority()})`);
            });
        }
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'active': return '✅';
            case 'inactive': return '⚪';
            case 'error': return '❌';
            case 'degraded': return '⚠️';
            case 'initializing': return '🔄';
            case 'shutting_down': return '🛑';
            default: return '❓';
        }
    }

    private displayServiceHealth(health: any): void {
        const statusIcon = this.getStatusIcon(health.status);
        console.log(`${statusIcon} ${health.name} (${health.status})`);
        console.log(`   Uptime: ${Math.floor(health.uptime / 1000)}s`);
        console.log(`   Operations: ${health.metrics.operationsCount}`);
        console.log(`   Errors: ${health.metrics.errorsCount}`);
        if (health.checks.length > 0) {
            health.checks.forEach((check: any) => {
                const checkIcon = check.healthy ? '✅' : '❌';
                console.log(`   ${checkIcon} ${check.name}: ${check.message || 'OK'}`);
            });
        }
        console.log('');
    }
} 