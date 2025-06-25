/**
 * CircuitBreaker - Circuit breaker pattern implementation for API resilience
 * 
 * @package     @imajin/cli
 * @subpackage  core/api
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-18
 *
 * Integration Points:
 * - API manager for request interception
 * - Service providers for configuration
 * - Event system for state change notifications
 */

import { EventEmitter } from 'events';
import { injectable } from 'tsyringe';
import { CIRCUIT_BREAKER_EVENTS } from '../../constants/CommonStrings.js';

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
    CLOSED = 'closed',     // Normal operation
    OPEN = 'open',         // Failing, rejecting requests
    HALF_OPEN = 'half-open' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
    readonly serviceId: string;
    readonly failureThreshold: number;      // Number of failures to trigger open
    readonly recoveryTimeout: number;       // Time before trying half-open (ms)
    readonly successThreshold: number;      // Successes needed to close from half-open
    readonly monitoringWindow: number;      // Time window for failure counting (ms)
    readonly enabled: boolean;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
    readonly serviceId: string;
    readonly state: CircuitBreakerState;
    readonly failures: number;
    readonly successes: number;
    readonly requests: number;
    readonly lastFailure?: number;
    readonly lastSuccess?: number;
    readonly openedAt?: number;
    readonly halfOpenedAt?: number;
    readonly nextAttemptAt?: number;
}

/**
 * Circuit breaker events
 */
export interface CircuitBreakerEvents {
    [CIRCUIT_BREAKER_EVENTS.STATE_CHANGED]: (serviceId: string, oldState: CircuitBreakerState, newState: CircuitBreakerState) => void;
    [CIRCUIT_BREAKER_EVENTS.CIRCUIT_OPENED]: (serviceId: string, stats: CircuitBreakerStats) => void;
    [CIRCUIT_BREAKER_EVENTS.CIRCUIT_CLOSED]: (serviceId: string, stats: CircuitBreakerStats) => void;
    [CIRCUIT_BREAKER_EVENTS.CIRCUIT_HALF_OPENED]: (serviceId: string, stats: CircuitBreakerStats) => void;
    [CIRCUIT_BREAKER_EVENTS.REQUEST_REJECTED]: (serviceId: string, reason: string) => void;
    [CIRCUIT_BREAKER_EVENTS.FALLBACK_EXECUTED]: (serviceId: string, fallbackResult: any) => void;
}

/**
 * Request execution result
 */
export interface RequestResult<T = any> {
    success: boolean;
    data?: T;
    error?: Error;
    fromFallback?: boolean;
    duration: number;
}

/**
 * Fallback function type
 */
export type FallbackFunction<T = any> = (error: Error, serviceId: string) => Promise<T> | T;

/**
 * Request function type
 */
export type RequestFunction<T = any> = () => Promise<T>;

/**
 * Circuit breaker internal state
 */
interface CircuitState {
    state: CircuitBreakerState;
    failures: number;
    successes: number;
    requests: number;
    lastFailure?: number;
    lastSuccess?: number;
    openedAt?: number;
    halfOpenedAt?: number;
    recentFailures: number[];
}

/**
 * Circuit breaker implementation
 */
@injectable()
export class CircuitBreaker extends EventEmitter {
    private readonly circuits = new Map<string, CircuitState>();
    private readonly configs = new Map<string, CircuitBreakerConfig>();
    private readonly fallbacks = new Map<string, FallbackFunction>();

    // Constants for commonly used strings
    private static readonly CIRCUIT_STATE_MSG = 'Circuit';
    private static readonly CIRCUIT_OPEN_MSG = 'Circuit breaker is';

    constructor() {
        super();
        this.setupCleanupTimer();
    }

    /**
     * Configure circuit breaker for a service
     */
    public configure(config: CircuitBreakerConfig): void {
        this.configs.set(config.serviceId, config);

        if (!this.circuits.has(config.serviceId)) {
            this.circuits.set(config.serviceId, {
                state: CircuitBreakerState.CLOSED,
                failures: 0,
                successes: 0,
                requests: 0,
                recentFailures: []
            });
        }
    }

    /**
     * Set fallback function for a service
     */
    public setFallback<T>(serviceId: string, fallback: FallbackFunction<T>): void {
        this.fallbacks.set(serviceId, fallback);
    }

    /**
     * Execute a request through the circuit breaker
     */
    public async execute<T>(
        serviceId: string,
        request: RequestFunction<T>,
        fallback?: FallbackFunction<T>
    ): Promise<RequestResult<T>> {
        const config = this.configs.get(serviceId);
        if (!config || !config.enabled) {
            // Circuit breaker not configured or disabled
            return this.executeDirectly(request);
        }

        const circuit = this.circuits.get(serviceId)!;
        const startTime = Date.now();

        // Check if request should be allowed
        if (!this.canExecute(serviceId)) {
            const error = new Error(`${CircuitBreaker.CIRCUIT_OPEN_MSG} ${circuit.state} for service: ${serviceId}`);
            this.emit(CIRCUIT_BREAKER_EVENTS.REQUEST_REJECTED, serviceId, `${CircuitBreaker.CIRCUIT_STATE_MSG} ${circuit.state}`);

            const fallbackFn = fallback ?? this.fallbacks.get(serviceId);
            if (fallbackFn) {
                try {
                    const fallbackResult = await fallbackFn(error, serviceId);
                    this.emit(CIRCUIT_BREAKER_EVENTS.FALLBACK_EXECUTED, serviceId, fallbackResult);

                    return {
                        success: true,
                        data: fallbackResult,
                        fromFallback: true,
                        duration: Date.now() - startTime
                    };
                } catch (fallbackError) {
                    return {
                        success: false,
                        error: fallbackError as Error,
                        fromFallback: true,
                        duration: Date.now() - startTime
                    };
                }
            }

            return {
                success: false,
                error,
                duration: Date.now() - startTime
            };
        }

        // Execute the request
        try {
            const result = await request();
            this.recordSuccess(serviceId);

            return {
                success: true,
                data: result,
                duration: Date.now() - startTime
            };
        } catch (error) {
            this.recordFailure(serviceId);

            return {
                success: false,
                error: error as Error,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Check if a request can be executed
     */
    public canExecute(serviceId: string): boolean {
        const config = this.configs.get(serviceId);
        if (!config || !config.enabled) {
            return true;
        }

        const circuit = this.circuits.get(serviceId);
        if (!circuit) {
            return true;
        }

        const now = Date.now();

        switch (circuit.state) {
            case CircuitBreakerState.CLOSED:
                return true;

            case CircuitBreakerState.OPEN:
                if (now - (circuit.openedAt || 0) >= config.recoveryTimeout) {
                    this.transitionToHalfOpen(serviceId);
                    return true;
                }
                return false;

            case CircuitBreakerState.HALF_OPEN:
                return true;

            default:
                return false;
        }
    }

    /**
     * Get circuit breaker statistics
     */
    public getStats(serviceId: string): CircuitBreakerStats | null {
        const circuit = this.circuits.get(serviceId);
        const config = this.configs.get(serviceId);

        if (!circuit || !config) {
            return null;
        }

        const nextAttemptAt = circuit.state === CircuitBreakerState.OPEN && circuit.openedAt
            ? circuit.openedAt + config.recoveryTimeout
            : undefined;

        return {
            serviceId,
            state: circuit.state,
            failures: circuit.failures,
            successes: circuit.successes,
            requests: circuit.requests,
            ...(circuit.lastFailure !== undefined && { lastFailure: circuit.lastFailure }),
            ...(circuit.lastSuccess !== undefined && { lastSuccess: circuit.lastSuccess }),
            ...(circuit.openedAt !== undefined && { openedAt: circuit.openedAt }),
            ...(circuit.halfOpenedAt !== undefined && { halfOpenedAt: circuit.halfOpenedAt }),
            ...(nextAttemptAt !== undefined && { nextAttemptAt })
        };
    }

    /**
     * Get all circuit breaker statistics
     */
    public getAllStats(): CircuitBreakerStats[] {
        return Array.from(this.circuits.keys())
            .map(serviceId => this.getStats(serviceId))
            .filter(stats => stats !== null) as CircuitBreakerStats[];
    }

    /**
     * Manually reset a circuit breaker
     */
    public reset(serviceId: string): void {
        const circuit = this.circuits.get(serviceId);
        if (circuit) {
            const oldState = circuit.state;
            circuit.state = CircuitBreakerState.CLOSED;
            circuit.failures = 0;
            circuit.successes = 0;
            circuit.recentFailures = [];
            delete circuit.openedAt;
            delete circuit.halfOpenedAt;

            this.emit(CIRCUIT_BREAKER_EVENTS.STATE_CHANGED, serviceId, oldState, CircuitBreakerState.CLOSED);
            this.emit(CIRCUIT_BREAKER_EVENTS.CIRCUIT_CLOSED, serviceId, this.getStats(serviceId)!);
        }
    }

    /**
     * Reset all circuit breakers
     */
    public resetAll(): void {
        for (const serviceId of this.circuits.keys()) {
            this.reset(serviceId);
        }
    }

    /**
     * Execute request directly without circuit breaker
     */
    private async executeDirectly<T>(request: RequestFunction<T>): Promise<RequestResult<T>> {
        const startTime = Date.now();

        try {
            const result = await request();
            return {
                success: true,
                data: result,
                duration: Date.now() - startTime
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Record a successful request
     */
    private recordSuccess(serviceId: string): void {
        const circuit = this.circuits.get(serviceId);
        const config = this.configs.get(serviceId);

        if (!circuit || !config) return;

        circuit.successes++;
        circuit.requests++;
        circuit.lastSuccess = Date.now();

        if (circuit.state === CircuitBreakerState.HALF_OPEN) {
            if (circuit.successes >= config.successThreshold) {
                this.transitionToClosed(serviceId);
            }
        }
    }

    /**
     * Record a failed request
     */
    private recordFailure(serviceId: string): void {
        const circuit = this.circuits.get(serviceId);
        const config = this.configs.get(serviceId);

        if (!circuit || !config) return;

        const now = Date.now();
        circuit.failures++;
        circuit.requests++;
        circuit.lastFailure = now;
        circuit.recentFailures.push(now);

        // Clean old failures outside monitoring window
        const cutoff = now - config.monitoringWindow;
        circuit.recentFailures = circuit.recentFailures.filter((time: number) => time > cutoff);

        if (circuit.state === CircuitBreakerState.CLOSED) {
            if (circuit.recentFailures.length >= config.failureThreshold) {
                this.transitionToOpen(serviceId);
            }
        } else if (circuit.state === CircuitBreakerState.HALF_OPEN) {
            this.transitionToOpen(serviceId);
        }
    }

    /**
     * Transition to OPEN state
     */
    private transitionToOpen(serviceId: string): void {
        const circuit = this.circuits.get(serviceId);
        if (!circuit) return;

        const oldState = circuit.state;
        circuit.state = CircuitBreakerState.OPEN;
        circuit.openedAt = Date.now();

        this.emit(CIRCUIT_BREAKER_EVENTS.STATE_CHANGED, serviceId, oldState, CircuitBreakerState.OPEN);
        this.emit(CIRCUIT_BREAKER_EVENTS.CIRCUIT_OPENED, serviceId, this.getStats(serviceId)!);
    }

    /**
     * Transition to HALF_OPEN state
     */
    private transitionToHalfOpen(serviceId: string): void {
        const circuit = this.circuits.get(serviceId);
        if (!circuit) return;

        const oldState = circuit.state;
        circuit.state = CircuitBreakerState.HALF_OPEN;
        circuit.halfOpenedAt = Date.now();
        circuit.successes = 0; // Reset success counter for half-open evaluation

        this.emit(CIRCUIT_BREAKER_EVENTS.STATE_CHANGED, serviceId, oldState, CircuitBreakerState.HALF_OPEN);
        this.emit(CIRCUIT_BREAKER_EVENTS.CIRCUIT_HALF_OPENED, serviceId, this.getStats(serviceId)!);
    }

    /**
     * Transition to CLOSED state
     */
    private transitionToClosed(serviceId: string): void {
        const circuit = this.circuits.get(serviceId);
        if (!circuit) return;

        const oldState = circuit.state;
        circuit.state = CircuitBreakerState.CLOSED;
        circuit.failures = 0;
        circuit.recentFailures = [];
        delete circuit.openedAt;
        delete circuit.halfOpenedAt;

        this.emit(CIRCUIT_BREAKER_EVENTS.STATE_CHANGED, serviceId, oldState, CircuitBreakerState.CLOSED);
        this.emit(CIRCUIT_BREAKER_EVENTS.CIRCUIT_CLOSED, serviceId, this.getStats(serviceId)!);
    }

    /**
     * Setup cleanup timer for old failure records
     */
    private setupCleanupTimer(): void {
        setInterval(() => {
            const now = Date.now();

            for (const [serviceId, circuit] of this.circuits.entries()) {
                const config = this.configs.get(serviceId);
                if (config) {
                    const cutoff = now - config.monitoringWindow;
                    circuit.recentFailures = circuit.recentFailures.filter((time: number) => time > cutoff);
                }
            }
        }, 60 * 1000); // Run every minute
    }
}

// Type-safe event emitter interface augmentation
declare module './CircuitBreaker' {
    interface CircuitBreaker {
        on<K extends keyof CircuitBreakerEvents>(event: K, listener: CircuitBreakerEvents[K]): this;
        emit<K extends keyof CircuitBreakerEvents>(event: K, ...args: Parameters<CircuitBreakerEvents[K]>): boolean;
    }
} 