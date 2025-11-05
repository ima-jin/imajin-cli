/**
 * EventServiceProvider - Event system service provider
 * 
 * @package     @imajin/cli
 * @subpackage  core/events
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Service provider system registration
 * - Event manager lifecycle management
 * - Default event listeners setup
 * - Application event system initialization
 */

import type { Command } from 'commander';
import type { Container } from '../../container/Container.js';
import { ServiceProvider } from '../../providers/ServiceProvider.js';
import { SystemEventType } from './Event.js';
import { EventManager, type EventManagerConfig } from './EventManager.js';
import { Logger } from '../../logging/Logger.js';

/**
 * Event service provider configuration
 */
export interface EventServiceProviderConfig extends EventManagerConfig {
    autoInitialize?: boolean;
    registerGlobalListeners?: boolean;
}

/**
 * Event system service provider
 */
export class EventServiceProvider extends ServiceProvider {
    private eventManager: EventManager | null = null;
    private config: EventServiceProviderConfig;
    private logger: Logger;

    constructor(
        container: Container,
        program: Command,
        config: EventServiceProviderConfig = {}
    ) {
        super(container, program);
        this.config = {
            autoInitialize: config.autoInitialize !== false,
            registerGlobalListeners: config.registerGlobalListeners !== false,
            ...config
        };
        this.logger = new Logger({ level: 'debug' });
    }

    /**
     * Register event services with the container
     */
    public async register(): Promise<void> {
        // Create event manager instance
        this.eventManager = new EventManager(this.config);

        // Register event manager in container
        this.container.singleton('EventManager', () => this.eventManager!);

        // Register event manager singleton accessor
        this.container.singleton('events', () => this.eventManager!);

        // Register event-related types and interfaces
        this.registerEventTypes();
    }

    /**
     * Bootstrap event services
     */
    public async boot(): Promise<void> {
        if (!this.eventManager) {
            throw new Error('EventManager not registered. Call register() first.');
        }

        // Initialize event manager if auto-initialize is enabled
        if (this.config.autoInitialize) {
            await this.eventManager.initialize();
        }

        // Register global event listeners
        if (this.config.registerGlobalListeners) {
            this.registerGlobalEventListeners();
        }

        // Emit service registration event
        await this.eventManager.emit(SystemEventType.SERVICE_REGISTERED, {
            serviceName: 'EventServiceProvider',
            version: this.getVersion()
        });
    }

    /**
     * Get service provider name
     */
    public getName(): string {
        return 'Event System';
    }

    /**
     * Get service provider version
     */
    public getVersion(): string {
        return '0.1.0';
    }

    /**
     * Check if this provider provides a specific service
     */
    public provides(service: string): boolean {
        const providedServices = [
            'EventManager',
            'events',
            'eventEmitter',
            'eventSystem'
        ];
        return providedServices.includes(service);
    }

    /**
     * Get list of services this provider offers
     */
    public getServices(): string[] {
        return [
            'EventManager',
            'events',
            'eventEmitter',
            'eventSystem'
        ];
    }

    /**
     * Get the event manager instance
     */
    public getEventManager(): EventManager | null {
        return this.eventManager;
    }

    /**
     * Register event-related types in container
     */
    private registerEventTypes(): void {
        // Register event factory functions
        this.container.bind('createProgressEvent', () =>
            (step: string, current: number, total: number, message?: string) => ({
                step,
                current,
                total,
                percent: Math.round((current / total) * 100),
                message
            })
        );

        this.container.bind('createCommandEvent', () =>
            (commandName: string, args: any[], options: any, result?: any, error?: Error, duration?: number) => ({
                commandName,
                args,
                options,
                result,
                error,
                duration
            })
        );

        this.container.bind('createErrorEvent', () =>
            (error: Error, context?: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => ({
                error,
                context,
                stack: error.stack,
                severity
            })
        );
    }

    /**
     * Register global event listeners
     */
    private registerGlobalEventListeners(): void {
        if (!this.eventManager) {
            return;
        }

        // Application lifecycle listeners
        this.eventManager.registerListener({
            name: 'ApplicationStartedLogger',
            eventType: SystemEventType.APPLICATION_STARTED,
            handle: async (event) => {
                this.logger.info('Application started', event.payload);
            }
        });

        this.eventManager.registerListener({
            name: 'ApplicationStoppedLogger',
            eventType: SystemEventType.APPLICATION_STOPPED,
            handle: async (event) => {
                this.logger.info('Application stopped', event.payload);
            }
        });

        // Command execution listeners
        this.eventManager.registerListener({
            name: 'CommandStartedLogger',
            eventType: SystemEventType.COMMAND_STARTED,
            handle: async (event) => {
                const { commandName } = event.payload;
                this.logger.info('Command started', { commandName });
            }
        });

        this.eventManager.registerListener({
            name: 'CommandCompletedLogger',
            eventType: SystemEventType.COMMAND_COMPLETED,
            handle: async (event) => {
                const { commandName, duration } = event.payload;
                this.logger.info('Command completed', { commandName, duration });
            }
        });

        this.eventManager.registerListener({
            name: 'CommandFailedLogger',
            eventType: SystemEventType.COMMAND_FAILED,
            handle: async (event) => {
                const { commandName, error } = event.payload;
                this.logger.error('Command failed', error, { commandName });
            }
        });

        // Error handling listeners
        this.eventManager.registerListener({
            name: 'ErrorLogger',
            eventType: SystemEventType.ERROR_OCCURRED,
            handle: async (event) => {
                const { error, severity, context } = event.payload;
                this.logger.log(severity, `Error occurred: ${error.message}`, { error, context });
            }
        });

        // Progress tracking listeners
        this.eventManager.registerListener({
            name: 'ProgressLogger',
            eventType: SystemEventType.PROGRESS_UPDATED,
            handle: async (event) => {
                const { step, percent, message } = event.payload;
                this.logger.debug('Progress updated', { step, percent, message });
            }
        });

        // Service lifecycle listeners
        this.eventManager.registerListener({
            name: 'ServiceRegisteredLogger',
            eventType: SystemEventType.SERVICE_REGISTERED,
            handle: async (event) => {
                const { serviceName, version } = event.payload;
                this.logger.info('Service registered', { serviceName, version });
            }
        });

        this.eventManager.registerListener({
            name: 'ServiceStartedLogger',
            eventType: SystemEventType.SERVICE_STARTED,
            handle: async (event) => {
                const { serviceName } = event.payload;
                this.logger.info('Service started', { serviceName });
            }
        });

        this.eventManager.registerListener({
            name: 'ServiceStoppedLogger',
            eventType: SystemEventType.SERVICE_STOPPED,
            handle: async (event) => {
                const { serviceName } = event.payload;
                this.logger.info('Service stopped', { serviceName });
            }
        });

        // Plugin lifecycle listeners
        this.eventManager.registerListener({
            name: 'PluginLoadedLogger',
            eventType: SystemEventType.PLUGIN_LOADED,
            handle: async (event) => {
                const { pluginName, version } = event.payload;
                this.logger.info('Plugin loaded', { pluginName, version });
            }
        });

        this.eventManager.registerListener({
            name: 'PluginUnloadedLogger',
            eventType: SystemEventType.PLUGIN_UNLOADED,
            handle: async (event) => {
                const { pluginName } = event.payload;
                this.logger.info('Plugin unloaded', { pluginName });
            }
        });
    }
} 