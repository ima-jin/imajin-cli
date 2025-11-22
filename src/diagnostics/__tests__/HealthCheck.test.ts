/**
 * HealthCheck Tests
 *
 * Comprehensive test suite for health check system covering check registration,
 * execution, reporting, timeout handling, and core health checks.
 *
 * @package     @imajin/cli
 * @subpackage  diagnostics/__tests__
 */

import {
    HealthCheck,
    HealthCheckManager,
    HealthStatus,
    HealthStatusLevel,
    CoreHealthChecks
} from '../HealthCheck.js';

describe('HealthCheckManager', () => {
    let manager: HealthCheckManager;

    beforeEach(() => {
        manager = new HealthCheckManager();
    });

    // =====================================================================
    // Registration
    // =====================================================================
    describe('Check Registration', () => {
        it('should register a health check', () => {
            const check: HealthCheck = {
                name: 'test-check',
                async check(): Promise<HealthStatus> {
                    return {
                        status: 'healthy',
                        timestamp: new Date()
                    };
                }
            };

            manager.registerCheck(check);

            expect(manager.hasCheck('test-check')).toBe(true);
        });

        it('should register multiple health checks', () => {
            const checks: HealthCheck[] = [
                {
                    name: 'check-1',
                    async check(): Promise<HealthStatus> {
                        return { status: 'healthy', timestamp: new Date() };
                    }
                },
                {
                    name: 'check-2',
                    async check(): Promise<HealthStatus> {
                        return { status: 'healthy', timestamp: new Date() };
                    }
                }
            ];

            manager.registerChecks(checks);

            expect(manager.hasCheck('check-1')).toBe(true);
            expect(manager.hasCheck('check-2')).toBe(true);
        });

        it('should remove a health check', () => {
            const check: HealthCheck = {
                name: 'removable-check',
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            };

            manager.registerCheck(check);
            expect(manager.hasCheck('removable-check')).toBe(true);

            manager.removeCheck('removable-check');
            expect(manager.hasCheck('removable-check')).toBe(false);
        });

        it('should get all check names', () => {
            manager.registerCheck({
                name: 'check-1',
                async check() {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });
            manager.registerCheck({
                name: 'check-2',
                async check() {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });

            const names = manager.getCheckNames();

            expect(names).toContain('check-1');
            expect(names).toContain('check-2');
            expect(names).toHaveLength(2);
        });

        it('should get check configuration', () => {
            const check: HealthCheck = {
                name: 'configured-check',
                timeout: 5000,
                critical: true,
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            };

            manager.registerCheck(check);

            const config = manager.getCheckConfig('configured-check');

            expect(config).toBeDefined();
            expect(config?.timeout).toBe(5000);
            expect(config?.critical).toBe(true);
        });
    });

    // =====================================================================
    // Health Check Execution
    // =====================================================================
    describe('Health Check Execution', () => {
        it('should run all health checks', async () => {
            manager.registerCheck({
                name: 'check-1',
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });
            manager.registerCheck({
                name: 'check-2',
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });

            const report = await manager.runHealthChecks();

            expect(report.checks).toHaveProperty('check-1');
            expect(report.checks).toHaveProperty('check-2');
            expect(report.checks['check-1']).toBeDefined();
            expect(report.checks['check-1']?.status).toBe('healthy');
            expect(report.checks['check-2']).toBeDefined();
            expect(report.checks['check-2']?.status).toBe('healthy');
        });

        it('should run a specific health check', async () => {
            manager.registerCheck({
                name: 'specific-check',
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });

            const result = await manager.runCheck('specific-check');

            expect(result).not.toBeNull();
            expect(result?.status).toBe('healthy');
        });

        it('should return null for non-existent check', async () => {
            const result = await manager.runCheck('nonexistent');

            expect(result).toBeNull();
        });

        it('should handle check failures gracefully', async () => {
            manager.registerCheck({
                name: 'failing-check',
                async check(): Promise<HealthStatus> {
                    throw new Error('Check failed');
                }
            });

            const report = await manager.runHealthChecks();

            expect(report.checks['failing-check']).toBeDefined();
            expect(report.checks['failing-check']?.status).toBe('unhealthy');
            expect(report.checks['failing-check']?.details).toHaveProperty('error');
        });

        it('should handle check timeouts', async () => {
            manager.registerCheck({
                name: 'slow-check',
                timeout: 100,
                async check(): Promise<HealthStatus> {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    return { status: 'healthy', timestamp: new Date() };
                }
            });

            const report = await manager.runHealthChecks();

            expect(report.checks['slow-check']).toBeDefined();
            expect(report.checks['slow-check']?.status).toBe('unhealthy');
        });

        it('should use default timeout when not specified', async () => {
            manager.registerCheck({
                name: 'check-with-default-timeout',
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });

            const report = await manager.runHealthChecks();

            expect(report.checks['check-with-default-timeout']).toBeDefined();
        });
    });

    // =====================================================================
    // Health Report Generation
    // =====================================================================
    describe('Health Report Generation', () => {
        it('should include overall health status', async () => {
            manager.registerCheck({
                name: 'test-check',
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });

            const report = await manager.runHealthChecks();

            expect(report.overall).toBeDefined();
            expect(['healthy', 'degraded', 'unhealthy']).toContain(report.overall);
        });

        it('should include timestamp', async () => {
            const report = await manager.runHealthChecks();

            expect(report.timestamp).toBeDefined();
            expect(typeof report.timestamp).toBe('string');
        });

        it('should include uptime', async () => {
            const report = await manager.runHealthChecks();

            expect(report.uptime).toBeDefined();
            expect(typeof report.uptime).toBe('number');
            expect(report.uptime).toBeGreaterThanOrEqual(0);
        });

        it('should include version', async () => {
            const report = await manager.runHealthChecks();

            expect(report.version).toBeDefined();
            expect(typeof report.version).toBe('string');
        });

        it('should include performance metrics', async () => {
            const report = await manager.runHealthChecks();

            expect(report.performance).toBeDefined();
            expect(report.performance.memory).toBeDefined();
            expect(report.performance.cpu).toBeDefined();
            expect(report.performance.eventLoop).toBeDefined();
        });

        it('should include memory metrics', async () => {
            const report = await manager.runHealthChecks();

            expect(report.performance.memory.used).toBeGreaterThan(0);
            expect(report.performance.memory.total).toBeGreaterThan(0);
            expect(report.performance.memory.percentage).toBeGreaterThanOrEqual(0);
            expect(report.performance.memory.percentage).toBeLessThanOrEqual(100);
        });

        it('should include CPU metrics', async () => {
            const report = await manager.runHealthChecks();

            expect(report.performance.cpu.loadAverage).toBeDefined();
            expect(Array.isArray(report.performance.cpu.loadAverage)).toBe(true);
        });
    });

    // =====================================================================
    // Overall Health Determination
    // =====================================================================
    describe('Overall Health Determination', () => {
        it('should be healthy when all checks pass', async () => {
            manager.registerCheck({
                name: 'check-1',
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });
            manager.registerCheck({
                name: 'check-2',
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });

            const report = await manager.runHealthChecks();

            expect(report.overall).toBe('healthy');
        });

        it('should be degraded when non-critical check fails', async () => {
            manager.registerCheck({
                name: 'non-critical-failing',
                critical: false,
                async check(): Promise<HealthStatus> {
                    return { status: 'unhealthy', timestamp: new Date() };
                }
            });

            const report = await manager.runHealthChecks();

            expect(report.overall).toBe('degraded');
        });

        it('should be unhealthy when critical check fails', async () => {
            manager.registerCheck({
                name: 'critical-failing',
                critical: true,
                async check(): Promise<HealthStatus> {
                    return { status: 'unhealthy', timestamp: new Date() };
                }
            });

            const report = await manager.runHealthChecks();

            expect(report.overall).toBe('unhealthy');
        });

        it('should be degraded when any check is degraded', async () => {
            manager.registerCheck({
                name: 'degraded-check',
                async check(): Promise<HealthStatus> {
                    return { status: 'degraded', timestamp: new Date() };
                }
            });

            const report = await manager.runHealthChecks();

            expect(report.overall).toBe('degraded');
        });
    });

    // =====================================================================
    // Last Report Caching
    // =====================================================================
    describe('Last Report Caching', () => {
        it('should cache last report', async () => {
            manager.registerCheck({
                name: 'test-check',
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });

            await manager.runHealthChecks();

            const lastReport = manager.getLastReport();

            expect(lastReport).not.toBeNull();
            expect(lastReport?.checks).toHaveProperty('test-check');
        });

        it('should return null when no checks have run', () => {
            const lastReport = manager.getLastReport();

            expect(lastReport).toBeNull();
        });

        it('should update last report on each run', async () => {
            manager.registerCheck({
                name: 'test-check',
                async check(): Promise<HealthStatus> {
                    return { status: 'healthy', timestamp: new Date() };
                }
            });

            await manager.runHealthChecks();
            const firstReport = manager.getLastReport();

            await new Promise(resolve => setTimeout(resolve, 10));

            await manager.runHealthChecks();
            const secondReport = manager.getLastReport();

            expect(secondReport?.timestamp).not.toBe(firstReport?.timestamp);
        });
    });
});

// =====================================================================
// CoreHealthChecks
// =====================================================================
describe('CoreHealthChecks', () => {
    describe('Process Health Check', () => {
        it('should create process health check', () => {
            const check = CoreHealthChecks.createProcessHealthCheck();

            expect(check.name).toBe('process');
            expect(check.critical).toBe(true);
            expect(check.timeout).toBe(5000);
        });

        it('should return healthy status for normal memory usage', async () => {
            const check = CoreHealthChecks.createProcessHealthCheck();

            const result = await check.check();

            expect(result.status).toBeDefined();
            expect(result.details).toHaveProperty('memory');
            expect(result.details).toHaveProperty('uptime');
        });

        it('should include memory metrics', async () => {
            const check = CoreHealthChecks.createProcessHealthCheck();

            const result = await check.check();

            expect(result.details.memory.heapUsed).toBeGreaterThan(0);
            expect(result.details.memory.heapTotal).toBeGreaterThan(0);
            expect(result.details.memory.heapPercentage).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Service Provider Health Check', () => {
        it('should create service provider health check', () => {
            const check = CoreHealthChecks.createServiceProviderHealthCheck();

            expect(check.name).toBe('service_providers');
            expect(check.critical).toBe(true);
        });

        it('should check all providers', async () => {
            const check = CoreHealthChecks.createServiceProviderHealthCheck();

            const result = await check.check();

            expect(result.details.providers).toBeDefined();
            expect(Array.isArray(result.details.providers)).toBe(true);
        });
    });

    describe('Exception System Health Check', () => {
        it('should create exception system health check', () => {
            const check = CoreHealthChecks.createExceptionSystemHealthCheck();

            expect(check.name).toBe('exception_system');
            expect(check.critical).toBe(true);
        });

        it('should check exception system components', async () => {
            const check = CoreHealthChecks.createExceptionSystemHealthCheck();

            const result = await check.check();

            expect(result.details).toHaveProperty('errorHandler');
            expect(result.details).toHaveProperty('errorRecovery');
        });
    });

    describe('ETL System Health Check', () => {
        it('should create ETL health check', () => {
            const check = CoreHealthChecks.createETLHealthCheck();

            expect(check.name).toBe('etl_system');
            expect(check.critical).toBe(true);
        });

        it('should check ETL components', async () => {
            const check = CoreHealthChecks.createETLHealthCheck();

            const result = await check.check();

            expect(result.details).toHaveProperty('pipeline');
            expect(result.details).toHaveProperty('transformers');
            expect(result.details).toHaveProperty('extractors');
            expect(result.details).toHaveProperty('loaders');
        });
    });

    describe('Plugin System Health Check', () => {
        it('should create plugin system health check', () => {
            const check = CoreHealthChecks.createPluginSystemHealthCheck();

            expect(check.name).toBe('plugin_system');
            expect(check.critical).toBe(false);
        });

        it('should check plugin system components', async () => {
            const check = CoreHealthChecks.createPluginSystemHealthCheck();

            const result = await check.check();

            expect(result.details).toHaveProperty('pluginManager');
            expect(result.details).toHaveProperty('pluginLoading');
        });
    });

    describe('Event System Health Check', () => {
        it('should create event system health check', () => {
            const check = CoreHealthChecks.createEventSystemHealthCheck();

            expect(check.name).toBe('event_system');
            expect(check.critical).toBe(false);
        });

        it('should check event system components', async () => {
            const check = CoreHealthChecks.createEventSystemHealthCheck();

            const result = await check.check();

            expect(result.details).toHaveProperty('eventEmitter');
            expect(result.details).toHaveProperty('eventHandlers');
        });
    });

    describe('All Core Checks', () => {
        it('should return all core health checks', () => {
            const checks = CoreHealthChecks.getAllCoreChecks();

            expect(Array.isArray(checks)).toBe(true);
            expect(checks.length).toBe(6);

            const checkNames = checks.map(c => c.name);
            expect(checkNames).toContain('process');
            expect(checkNames).toContain('service_providers');
            expect(checkNames).toContain('exception_system');
            expect(checkNames).toContain('etl_system');
            expect(checkNames).toContain('plugin_system');
            expect(checkNames).toContain('event_system');
        });
    });
});
