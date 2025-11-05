/**
 * ServiceInterface - Core interfaces and contracts for service layer
 * 
 * @package     @imajin/cli
 * @subpackage  services/interfaces
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-07-03
 *
 * @see         docs/architecture.md
 * 
 * Defines:
 * - Service configuration contracts
 * - Health check interfaces
 * - Metrics and monitoring contracts
 * - Service lifecycle management
 */

import type { EventEmitter } from 'events';
import type { Container } from '../../container/Container.js';

// Service Status Enumeration
export enum ServiceStatus {
    INACTIVE = 'inactive',
    INITIALIZING = 'initializing',
    ACTIVE = 'active',
    DEGRADED = 'degraded',
    SHUTTING_DOWN = 'shutting_down',
    ERROR = 'error'
}

// Service Configuration Interface
export interface ServiceConfig {
    name: string;
    enabled: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    healthCheckInterval?: number;
    [key: string]: any; // Allow service-specific configuration
}

// Service Metrics Interface
export interface ServiceMetrics {
    operationsCount: number;
    errorsCount: number;
    averageResponseTime: number;
    lastActivity: Date;
    startTime: Date;
}

// Health Check Result Interface
export interface HealthCheckResult {
    name: string;
    healthy: boolean;
    message?: string;
    details?: Record<string, any>;
}

// Service Health Interface
export interface ServiceHealth {
    status: ServiceStatus;
    name: string;
    version: string;
    uptime: number;
    metrics: ServiceMetrics;
    checks: HealthCheckResult[];
}

// Base Service Interface
export interface IService {
    getName(): string;
    getVersion(): string;
    getStatus(): ServiceStatus;
    getMetrics(): ServiceMetrics;
    getConfig(): ServiceConfig;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    getHealth(): Promise<ServiceHealth>;
    updateConfig(config: Partial<ServiceConfig>): void;
}

// Service Factory Interface
export interface IServiceFactory {
    create<T extends IService>(
        serviceType: string,
        config: ServiceConfig,
        container: Container
    ): Promise<T>;
    register<T extends IService>(
        serviceType: string,
        factory: (config: ServiceConfig, container: Container) => Promise<T>
    ): void;
    getAvailableTypes(): string[];
}

// Service Registry Interface
export interface IServiceRegistry {
    register(service: IService): Promise<void>;
    unregister(serviceName: string): Promise<void>;
    get<T extends IService>(serviceName: string): T | undefined;
    getAll(): IService[];
    getByStatus(status: ServiceStatus): IService[];
    exists(serviceName: string): boolean;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    getHealth(): Promise<Record<string, ServiceHealth>>;
}

// Service Discovery Interface
export interface IServiceDiscovery {
    discover(criteria: ServiceDiscoveryCriteria): Promise<IService[]>;
    announce(service: IService): Promise<void>;
    withdraw(serviceName: string): Promise<void>;
    watch(callback: (event: ServiceDiscoveryEvent) => void): void;
}

// Service Discovery Criteria
export interface ServiceDiscoveryCriteria {
    name?: string;
    type?: string;
    version?: string;
    status?: ServiceStatus;
    capabilities?: string[];
    tags?: string[];
}

// Service Discovery Event
export interface ServiceDiscoveryEvent {
    type: 'registered' | 'unregistered' | 'status-changed';
    service: IService;
    timestamp: Date;
}

// Service Strategy Interface
export interface IServiceStrategy<T = any> {
    getName(): string;
    canHandle(input: T): boolean;
    handle(input: T): Promise<any>;
    getPriority(): number;
}

// Service Strategy Manager Interface
export interface IServiceStrategyManager<T = any> {
    addStrategy(strategy: IServiceStrategy<T>): void;
    removeStrategy(strategyName: string): void;
    getStrategy(input: T): IServiceStrategy<T> | undefined;
    getAllStrategies(): IServiceStrategy<T>[];
    execute(input: T): Promise<any>;
}

// Service Event Interface
export interface ServiceEvent {
    type: string;
    service: string;
    data: any;
    timestamp: Date;
    correlationId?: string;
}

// Service Integration Interface
export interface IServiceIntegration {
    getName(): string;
    getSourceService(): IService;
    getTargetService(): IService;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    isHealthy(): Promise<boolean>;
}

// Service Pipeline Interface
export interface IServicePipeline<TInput, TOutput> {
    getName(): string;
    execute(input: TInput): Promise<TOutput>;
    addStage(stage: IServicePipelineStage<any, any>): void;
    removeStage(stageName: string): void;
    getStages(): IServicePipelineStage<any, any>[];
}

// Service Pipeline Stage Interface
export interface IServicePipelineStage<TInput, TOutput> {
    getName(): string;
    process(input: TInput): Promise<TOutput>;
    canProcess(input: TInput): boolean;
    getOrder(): number;
}

// Service Context Interface
export interface ServiceContext {
    container: Container;
    logger: any;
    eventEmitter: EventEmitter;
    config: Record<string, any>;
    correlationId?: string;
    userId?: string;
    requestId?: string;
}

// Service Operation Result Interface
export interface ServiceOperationResult<T = any> {
    success: boolean;
    data?: T;
    error?: Error;
    duration: number;
    timestamp: Date;
    service: string;
    operation: string;
}

// Service Capability Interface
export interface ServiceCapability {
    name: string;
    description: string;
    version: string;
    endpoints?: string[];
    permissions?: string[];
    dependencies?: string[];
}

// Service Registration Options Interface
export interface ServiceRegistrationOptions {
    autoStart?: boolean;
    priority?: number;
    dependencies?: string[];
    capabilities?: ServiceCapability[];
    tags?: string[];
    metadata?: Record<string, any>;
} 