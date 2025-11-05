/**
 * MonitoringServiceProvider - Monitoring and diagnostics service provider
 * 
 * @package     @imajin/cli
 * @subpackage  providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 *
 * Integration Points:
 * - Health check system registration
 * - Metrics collection setup
 * - System monitoring initialization
 * - Core health checks registration
 */

import { Command } from 'commander';
import { Container } from '../container/Container.js';
import type { Logger } from '../logging/Logger.js';
import { ServiceProvider } from './ServiceProvider.js';
import { SystemMonitor, HealthCheckManager, MetricsCollector, CoreHealthChecks } from '../diagnostics/index.js';

export class MonitoringServiceProvider extends ServiceProvider {
    private logger!: Logger;
    constructor(container: Container, program: Command) {
        super(container, program);
    }

    public getName(): string {
        return 'monitoring';
    }

    public async register(): Promise<void> {
        // Get logger from container
        this.logger = this.container.resolve<Logger>('logger');

        // Register monitoring components
        this.container.singleton('SystemMonitor', () => new SystemMonitor());
        this.container.singleton('HealthCheckManager', () => new HealthCheckManager());
        this.container.singleton('MetricsCollector', () => new MetricsCollector());
    }

    public async boot(): Promise<void> {
        const systemMonitor = this.container.resolve<SystemMonitor>('SystemMonitor');
        const healthManager = systemMonitor.getHealthManager();

        // Register core health checks
        const coreChecks = CoreHealthChecks.getAllCoreChecks();
        healthManager.registerChecks(coreChecks);

        // Start monitoring
        systemMonitor.startMonitoring(60000); // Check every minute

        this.logger.info('Monitoring and diagnostics services initialized', {
            provider: 'MonitoringServiceProvider',
            interval: '60000ms',
            checksRegistered: coreChecks.length
        });
    }

    public getServices(): string[] {
        return ['monitoring', 'health-checks', 'metrics'];
    }
} 