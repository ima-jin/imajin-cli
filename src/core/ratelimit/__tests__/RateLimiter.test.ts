/**
 * RateLimiter Tests - Core rate limiting system
 *
 * Focus: Strategy coordination, violation tracking, event emission
 */

import 'reflect-metadata';
import { RateLimiter, RateLimitConfig, RateLimitViolation } from '../RateLimiter.js';

describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter();
    });

    afterEach(() => {
        // Clean up any timers
        rateLimiter.removeAllListeners();
    });

    describe('Configuration', () => {
        it('should configure rate limiting for a service', () => {
            const config: RateLimitConfig = {
                serviceId: 'test-service',
                strategy: 'fixed-window',
                limit: 10,
                window: 60000,
                enabled: true
            };

            rateLimiter.configure(config);

            const status = rateLimiter.getStatus('test-service');
            expect(status.serviceId).toBe('test-service');
            expect(status.strategy).toBe('fixed-window');
        });

        it('should support multiple service configurations', () => {
            rateLimiter.configure({
                serviceId: 'service-1',
                strategy: 'fixed-window',
                limit: 10,
                window: 60000,
                enabled: true
            });

            rateLimiter.configure({
                serviceId: 'service-2',
                strategy: 'token-bucket',
                limit: 20,
                window: 30000,
                enabled: true
            });

            const allStatus = rateLimiter.getAllStatus();
            expect(allStatus).toHaveLength(2);
            expect(allStatus.map(s => s.serviceId)).toContain('service-1');
            expect(allStatus.map(s => s.serviceId)).toContain('service-2');
        });

        it('should disable rate limiting when enabled is false', () => {
            rateLimiter.configure({
                serviceId: 'disabled-service',
                strategy: 'fixed-window',
                limit: 10,
                window: 60000,
                enabled: false
            });

            // Should allow unlimited requests
            for (let i = 0; i < 20; i++) {
                expect(rateLimiter.canMakeRequest('disabled-service')).toBe(true);
                rateLimiter.recordRequest('disabled-service');
            }
        });

        it('should emit strategy-changed event on configuration', (done) => {
            rateLimiter.on('strategy-changed', (serviceId, strategy) => {
                expect(serviceId).toBe('test-service');
                expect(strategy).toBe('token-bucket');
                done();
            });

            rateLimiter.configure({
                serviceId: 'test-service',
                strategy: 'token-bucket',
                limit: 10,
                window: 60000,
                enabled: true
            });
        });

        it('should remove strategy when reconfigured as disabled', () => {
            // First enable
            rateLimiter.configure({
                serviceId: 'toggle-service',
                strategy: 'fixed-window',
                limit: 5,
                window: 60000,
                enabled: true
            });

            // Use up all requests
            for (let i = 0; i < 5; i++) {
                rateLimiter.recordRequest('toggle-service');
            }

            expect(rateLimiter.canMakeRequest('toggle-service')).toBe(false);

            // Now disable
            rateLimiter.configure({
                serviceId: 'toggle-service',
                strategy: 'fixed-window',
                limit: 5,
                window: 60000,
                enabled: false
            });

            // Should now allow requests
            expect(rateLimiter.canMakeRequest('toggle-service')).toBe(true);
        });
    });

    describe('Request Management', () => {
        beforeEach(() => {
            rateLimiter.configure({
                serviceId: 'test-service',
                strategy: 'fixed-window',
                limit: 5,
                window: 60000,
                enabled: true
            });
        });

        it('should allow requests within limit', () => {
            for (let i = 0; i < 5; i++) {
                expect(rateLimiter.canMakeRequest('test-service')).toBe(true);
                rateLimiter.recordRequest('test-service');
            }
        });

        it('should block requests exceeding limit', () => {
            // Use up all 5 requests
            for (let i = 0; i < 5; i++) {
                rateLimiter.recordRequest('test-service');
            }

            // 6th request should be blocked
            expect(rateLimiter.canMakeRequest('test-service')).toBe(false);
        });

        it('should allow requests for unconfigured services', () => {
            expect(rateLimiter.canMakeRequest('unknown-service')).toBe(true);
        });

        it('should track remaining requests', () => {
            const status1 = rateLimiter.getStatus('test-service');
            expect(status1.remainingRequests).toBe(5);

            rateLimiter.recordRequest('test-service');

            const status2 = rateLimiter.getStatus('test-service');
            expect(status2.remainingRequests).toBe(4);

            rateLimiter.recordRequest('test-service');
            rateLimiter.recordRequest('test-service');

            const status3 = rateLimiter.getStatus('test-service');
            expect(status3.remainingRequests).toBe(2);
        });

        it('should return wait time when rate limited', () => {
            // Use up all requests
            for (let i = 0; i < 5; i++) {
                rateLimiter.recordRequest('test-service');
            }

            const waitTime = rateLimiter.getWaitTime('test-service');
            expect(waitTime).toBeGreaterThan(0);
            expect(waitTime).toBeLessThanOrEqual(60000); // Within window
        });

        it('should return zero wait time when under limit', () => {
            const waitTime = rateLimiter.getWaitTime('test-service');
            expect(waitTime).toBe(0);
        });

        it('should return zero wait time for unconfigured service', () => {
            const waitTime = rateLimiter.getWaitTime('unknown-service');
            expect(waitTime).toBe(0);
        });
    });

    describe('Status Reporting', () => {
        it('should return status for configured service', () => {
            rateLimiter.configure({
                serviceId: 'status-test',
                strategy: 'sliding-window',
                limit: 10,
                window: 30000,
                enabled: true
            });

            const status = rateLimiter.getStatus('status-test');

            expect(status.serviceId).toBe('status-test');
            expect(status.canMakeRequest).toBe(true);
            expect(status.remainingRequests).toBe(10);
            expect(status.strategy).toBe('sliding-window');
            expect(typeof status.resetTime).toBe('number');
            expect(typeof status.waitTime).toBe('number');
        });

        it('should return unlimited status for unconfigured service', () => {
            const status = rateLimiter.getStatus('unconfigured');

            expect(status.serviceId).toBe('unconfigured');
            expect(status.canMakeRequest).toBe(true);
            expect(status.remainingRequests).toBe(Infinity);
            expect(status.resetTime).toBe(0);
            expect(status.waitTime).toBe(0);
            expect(status.strategy).toBe('none');
        });

        it('should return all service statuses', () => {
            rateLimiter.configure({
                serviceId: 'service-a',
                strategy: 'fixed-window',
                limit: 10,
                window: 60000,
                enabled: true
            });

            rateLimiter.configure({
                serviceId: 'service-b',
                strategy: 'token-bucket',
                limit: 20,
                window: 30000,
                enabled: true
            });

            const allStatus = rateLimiter.getAllStatus();

            expect(allStatus).toHaveLength(2);
            expect(allStatus.some(s => s.serviceId === 'service-a')).toBe(true);
            expect(allStatus.some(s => s.serviceId === 'service-b')).toBe(true);
        });
    });

    describe('Reset Functionality', () => {
        beforeEach(() => {
            rateLimiter.configure({
                serviceId: 'reset-test',
                strategy: 'fixed-window',
                limit: 3,
                window: 60000,
                enabled: true
            });
        });

        it('should reset rate limits for a service', () => {
            // Use up all requests
            for (let i = 0; i < 3; i++) {
                rateLimiter.recordRequest('reset-test');
            }

            expect(rateLimiter.canMakeRequest('reset-test')).toBe(false);

            // Reset
            rateLimiter.reset('reset-test');

            expect(rateLimiter.canMakeRequest('reset-test')).toBe(true);
            const status = rateLimiter.getStatus('reset-test');
            expect(status.remainingRequests).toBe(3);
        });

        it('should emit rate-limit-reset event', (done) => {
            rateLimiter.on('rate-limit-reset', (serviceId) => {
                expect(serviceId).toBe('reset-test');
                done();
            });

            rateLimiter.reset('reset-test');
        });

        it('should reset all services', () => {
            rateLimiter.configure({
                serviceId: 'service-1',
                strategy: 'fixed-window',
                limit: 2,
                window: 60000,
                enabled: true
            });

            rateLimiter.configure({
                serviceId: 'service-2',
                strategy: 'fixed-window',
                limit: 2,
                window: 60000,
                enabled: true
            });

            // Use up requests
            rateLimiter.recordRequest('service-1');
            rateLimiter.recordRequest('service-1');
            rateLimiter.recordRequest('service-2');
            rateLimiter.recordRequest('service-2');

            expect(rateLimiter.canMakeRequest('service-1')).toBe(false);
            expect(rateLimiter.canMakeRequest('service-2')).toBe(false);

            // Reset all
            rateLimiter.resetAll();

            expect(rateLimiter.canMakeRequest('service-1')).toBe(true);
            expect(rateLimiter.canMakeRequest('service-2')).toBe(true);
        });

        it('should handle reset for unconfigured service gracefully', () => {
            expect(() => {
                rateLimiter.reset('nonexistent');
            }).not.toThrow();
        });
    });

    describe('Violation Tracking', () => {
        beforeEach(() => {
            rateLimiter.configure({
                serviceId: 'violation-test',
                strategy: 'fixed-window',
                limit: 2,
                window: 60000,
                enabled: true
            });
        });

        it('should record violations when limit exceeded', (done) => {
            rateLimiter.on('rate-limit-exceeded', (violation: RateLimitViolation) => {
                expect(violation.serviceId).toBe('violation-test');
                expect(violation.limit).toBe(2);
                expect(typeof violation.timestamp).toBe('number');
                done();
            });

            // Use up limit
            rateLimiter.recordRequest('violation-test');
            rateLimiter.recordRequest('violation-test');

            // This should trigger violation
            rateLimiter.canMakeRequest('violation-test');
        });

        it('should track multiple violations', () => {
            // Use up limit
            rateLimiter.recordRequest('violation-test');
            rateLimiter.recordRequest('violation-test');

            // Trigger multiple violations
            for (let i = 0; i < 5; i++) {
                rateLimiter.canMakeRequest('violation-test');
            }

            const violations = rateLimiter.getViolations('violation-test');
            expect(violations.length).toBeGreaterThan(0);
        });

        it('should return empty array for services with no violations', () => {
            const violations = rateLimiter.getViolations('violation-test');
            expect(violations).toEqual([]);
        });

        it('should return all violations across services', () => {
            rateLimiter.configure({
                serviceId: 'service-a',
                strategy: 'fixed-window',
                limit: 1,
                window: 60000,
                enabled: true
            });

            rateLimiter.configure({
                serviceId: 'service-b',
                strategy: 'fixed-window',
                limit: 1,
                window: 60000,
                enabled: true
            });

            // Trigger violations
            rateLimiter.recordRequest('service-a');
            rateLimiter.canMakeRequest('service-a');

            rateLimiter.recordRequest('service-b');
            rateLimiter.canMakeRequest('service-b');

            const allViolations = rateLimiter.getAllViolations();
            expect(allViolations.length).toBeGreaterThanOrEqual(2);
        });

        it('should limit violation history to 100 per service', () => {
            // Configure low limit to trigger many violations
            rateLimiter.configure({
                serviceId: 'high-violations',
                strategy: 'fixed-window',
                limit: 1,
                window: 60000,
                enabled: true
            });

            rateLimiter.recordRequest('high-violations');

            // Trigger 150 violations
            for (let i = 0; i < 150; i++) {
                rateLimiter.canMakeRequest('high-violations');
            }

            const violations = rateLimiter.getViolations('high-violations');
            expect(violations.length).toBeLessThanOrEqual(100);
        });
    });

    describe('Event Emission', () => {
        beforeEach(() => {
            rateLimiter.configure({
                serviceId: 'event-test',
                strategy: 'fixed-window',
                limit: 10,
                window: 60000,
                enabled: true
            });
        });

        it('should emit rate-limit-warning when approaching limit', (done) => {
            rateLimiter.on('rate-limit-warning', (serviceId, remaining) => {
                expect(serviceId).toBe('event-test');
                expect(remaining).toBeLessThanOrEqual(5);
                done();
            });

            // Use up to warning threshold (5 remaining)
            for (let i = 0; i < 5; i++) {
                rateLimiter.recordRequest('event-test');
            }

            // This should trigger warning
            rateLimiter.recordRequest('event-test');
        });

        it('should not emit events when rate limiting disabled', () => {
            let eventEmitted = false;

            rateLimiter.on('rate-limit-exceeded', () => {
                eventEmitted = true;
            });

            rateLimiter.configure({
                serviceId: 'disabled-events',
                strategy: 'fixed-window',
                limit: 1,
                window: 60000,
                enabled: false
            });

            rateLimiter.recordRequest('disabled-events');
            rateLimiter.canMakeRequest('disabled-events');

            expect(eventEmitted).toBe(false);
        });
    });

    describe('Strategy Selection', () => {
        it('should support token-bucket strategy', () => {
            rateLimiter.configure({
                serviceId: 'token-bucket-test',
                strategy: 'token-bucket',
                limit: 10,
                window: 60000,
                burst: 15,
                enabled: true
            });

            const status = rateLimiter.getStatus('token-bucket-test');
            expect(status.strategy).toBe('token-bucket');
        });

        it('should support sliding-window strategy', () => {
            rateLimiter.configure({
                serviceId: 'sliding-test',
                strategy: 'sliding-window',
                limit: 10,
                window: 60000,
                enabled: true
            });

            const status = rateLimiter.getStatus('sliding-test');
            expect(status.strategy).toBe('sliding-window');
        });

        it('should support fixed-window strategy', () => {
            rateLimiter.configure({
                serviceId: 'fixed-test',
                strategy: 'fixed-window',
                limit: 10,
                window: 60000,
                enabled: true
            });

            const status = rateLimiter.getStatus('fixed-test');
            expect(status.strategy).toBe('fixed-window');
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero limit configuration', () => {
            rateLimiter.configure({
                serviceId: 'zero-limit',
                strategy: 'fixed-window',
                limit: 0,
                window: 60000,
                enabled: true
            });

            expect(rateLimiter.canMakeRequest('zero-limit')).toBe(false);
        });

        it('should handle very short time windows', () => {
            rateLimiter.configure({
                serviceId: 'short-window',
                strategy: 'fixed-window',
                limit: 5,
                window: 100, // 100ms
                enabled: true
            });

            for (let i = 0; i < 5; i++) {
                rateLimiter.recordRequest('short-window');
            }

            expect(rateLimiter.canMakeRequest('short-window')).toBe(false);
        });

        it('should handle concurrent service configurations', () => {
            const services = ['s1', 's2', 's3', 's4', 's5'];

            services.forEach(serviceId => {
                rateLimiter.configure({
                    serviceId,
                    strategy: 'fixed-window',
                    limit: 10,
                    window: 60000,
                    enabled: true
                });
            });

            expect(rateLimiter.getAllStatus()).toHaveLength(5);
        });

        it('should handle reconfiguration of existing service', () => {
            rateLimiter.configure({
                serviceId: 'reconfig',
                strategy: 'fixed-window',
                limit: 5,
                window: 60000,
                enabled: true
            });

            // Use some requests
            rateLimiter.recordRequest('reconfig');
            rateLimiter.recordRequest('reconfig');

            // Reconfigure with different limits
            rateLimiter.configure({
                serviceId: 'reconfig',
                strategy: 'token-bucket',
                limit: 10,
                window: 30000,
                enabled: true
            });

            const status = rateLimiter.getStatus('reconfig');
            expect(status.strategy).toBe('token-bucket');
        });
    });
});
