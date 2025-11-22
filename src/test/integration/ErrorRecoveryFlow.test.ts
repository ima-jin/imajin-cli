/**
 * Error Recovery Integration Tests
 *
 * End-to-end tests for error recovery mechanisms including retry logic,
 * fallback strategies, circuit breakers, and graceful degradation.
 *
 * @package     @imajin/cli
 * @subpackage  test/integration
 */

import { ErrorRecovery } from '../../core/ErrorRecovery.js';
import { sleep } from '../helpers/integrationHelpers.js';

describe('Error Recovery Integration', () => {
    let errorRecovery: ErrorRecovery;

    beforeEach(() => {
        errorRecovery = new ErrorRecovery();
    });

    // =====================================================================
    // Retry Logic
    // =====================================================================
    describe('Retry Logic', () => {
        it('should retry failed operations with default config', async () => {
            let attempts = 0;
            const flaky = jest.fn(async () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Temporary failure');
                }
                return 'success';
            });

            const result = await errorRecovery.executeWithRetry(flaky);

            expect(result).toBe('success');
            expect(attempts).toBe(3);
        });

        it('should retry with custom max attempts', async () => {
            let attempts = 0;
            const flaky = jest.fn(async () => {
                attempts++;
                if (attempts < 5) {
                    throw new Error('Temporary failure');
                }
                return 'success';
            });

            const result = await errorRecovery.executeWithRetry(flaky, {
                maxAttempts: 5,
                initialDelay: 10
            });

            expect(result).toBe('success');
            expect(attempts).toBe(5);
        });

        it('should fail after max retries exhausted', async () => {
            const alwaysFails = jest.fn(async () => {
                throw new Error('Always fails');
            });

            await expect(
                errorRecovery.executeWithRetry(alwaysFails, {
                    maxAttempts: 3,
                    initialDelay: 10
                })
            ).rejects.toThrow('Always fails');

            expect(alwaysFails).toHaveBeenCalledTimes(3);
        });

        it('should use exponential backoff', async () => {
            const timestamps: number[] = [];
            let attempts = 0;

            const flaky = jest.fn(async () => {
                timestamps.push(Date.now());
                attempts++;
                if (attempts < 3) {
                    throw new Error('Retry');
                }
                return 'success';
            });

            await errorRecovery.executeWithRetry(flaky, {
                maxAttempts: 3,
                initialDelay: 50,
                backoffMultiplier: 2
            });

            // Verify increasing delays (exponential)
            if (timestamps.length >= 3) {
                const delay1 = timestamps[1] - timestamps[0];
                const delay2 = timestamps[2] - timestamps[1];

                // Second delay should be roughly 2x the first (with some tolerance)
                expect(delay2).toBeGreaterThan(delay1 * 1.5);
            }
        });

        it('should use linear backoff', async () => {
            const timestamps: number[] = [];
            let attempts = 0;

            const flaky = jest.fn(async () => {
                timestamps.push(Date.now());
                attempts++;
                if (attempts < 3) {
                    throw new Error('Retry');
                }
                return 'success';
            });

            await errorRecovery.executeWithRetry(flaky, {
                maxAttempts: 3,
                initialDelay: 50,
                backoffMultiplier: 1
            });

            // Verify consistent delays (linear)
            if (timestamps.length >= 3) {
                const delay1 = timestamps[1] - timestamps[0];
                const delay2 = timestamps[2] - timestamps[1];

                // Delays should be roughly equal
                expect(Math.abs(delay2 - delay1)).toBeLessThan(30);
            }
        });
    });

    // =====================================================================
    // Fallback Strategies
    // =====================================================================
    describe('Fallback Strategies', () => {
        it('should use fallback on persistent failure', async () => {
            const primary = async () => {
                throw new Error('Primary failed');
            };
            const fallback = async () => 'fallback result';

            const result = await errorRecovery.withFallback(primary, fallback);

            expect(result).toBe('fallback result');
        });

        it('should prefer primary if it succeeds', async () => {
            const primary = async () => 'primary result';
            const fallback = async () => 'fallback result';

            const result = await errorRecovery.withFallback(primary, fallback);

            expect(result).toBe('primary result');
        });

        it('should support multiple fallback levels', async () => {
            const primary = async () => {
                throw new Error('Primary failed');
            };
            const fallback1 = async () => {
                throw new Error('Fallback 1 failed');
            };
            const fallback2 = async () => 'fallback 2 result';

            const result = await errorRecovery.withFallback(
                primary,
                async () => errorRecovery.withFallback(fallback1, fallback2)
            );

            expect(result).toBe('fallback 2 result');
        });

        it('should propagate error if all fallbacks fail', async () => {
            const primary = async () => {
                throw new Error('Primary failed');
            };
            const fallback = async () => {
                throw new Error('Fallback failed');
            };

            await expect(
                errorRecovery.withFallback(primary, fallback)
            ).rejects.toThrow('Fallback failed');
        });
    });

    // =====================================================================
    // Circuit Breaker Pattern
    // =====================================================================
    describe('Circuit Breaker Pattern', () => {
        it('should track consecutive failures', async () => {
            const failingOp = async () => {
                throw new Error('Operation failed');
            };

            // Trigger multiple failures
            for (let i = 0; i < 3; i++) {
                await errorRecovery.executeWithRetry(failingOp, {
                    maxAttempts: 1,
                    initialDelay: 1
                }).catch(() => {});
            }

            const metrics = errorRecovery.getMetrics();
            expect(metrics.consecutiveFailures).toBeGreaterThanOrEqual(3);
        });

        it('should reset failure count on success', async () => {
            const operation = jest.fn();
            let shouldFail = true;

            operation.mockImplementation(async () => {
                if (shouldFail) {
                    throw new Error('Failed');
                }
                return 'success';
            });

            // Cause failures
            await errorRecovery.executeWithRetry(operation, {
                maxAttempts: 1,
                initialDelay: 1
            }).catch(() => {});

            // Now succeed
            shouldFail = false;
            await errorRecovery.executeWithRetry(operation, {
                maxAttempts: 1
            });

            const metrics = errorRecovery.getMetrics();
            expect(metrics.consecutiveFailures).toBe(0);
        });
    });

    // =====================================================================
    // Error Context Preservation
    // =====================================================================
    describe('Error Context Preservation', () => {
        it('should preserve original error information', async () => {
            const originalError = new Error('Original error');
            (originalError as any).code = 'CUSTOM_ERROR';

            const operation = async () => {
                throw originalError;
            };

            try {
                await errorRecovery.executeWithRetry(operation, {
                    maxAttempts: 2,
                    initialDelay: 1
                });
            } catch (error: any) {
                expect(error.message).toBe('Original error');
                expect(error.code).toBe('CUSTOM_ERROR');
            }
        });

        it('should track retry attempts in error context', async () => {
            const operation = async () => {
                throw new Error('Failed');
            };

            try {
                await errorRecovery.executeWithRetry(operation, {
                    maxAttempts: 3,
                    initialDelay: 1
                });
            } catch (error) {
                const metrics = errorRecovery.getMetrics();
                expect(metrics.totalAttempts).toBeGreaterThanOrEqual(3);
            }
        });
    });

    // =====================================================================
    // Graceful Degradation
    // =====================================================================
    describe('Graceful Degradation', () => {
        it('should return partial results on failure', async () => {
            const operations = [
                async () => 'result1',
                async () => {
                    throw new Error('Failed');
                },
                async () => 'result3'
            ];

            const results = await Promise.allSettled(
                operations.map(op => errorRecovery.withFallback(op, async () => null))
            );

            expect(results[0].status).toBe('fulfilled');
            expect(results[1].status).toBe('fulfilled');
            expect(results[2].status).toBe('fulfilled');

            const values = results
                .filter(r => r.status === 'fulfilled')
                .map(r => (r as PromiseFulfilledResult<any>).value);

            expect(values).toContain('result1');
            expect(values).toContain('result3');
        });

        it('should degrade to cached results on service failure', async () => {
            let cache: string | null = 'cached data';

            const fetchFresh = async () => {
                throw new Error('Service unavailable');
            };

            const getWithCache = async () => {
                try {
                    return await fetchFresh();
                } catch {
                    if (cache) {
                        return cache;
                    }
                    throw new Error('No cached data available');
                }
            };

            const result = await getWithCache();
            expect(result).toBe('cached data');
        });
    });

    // =====================================================================
    // Timeout Protection
    // =====================================================================
    describe('Timeout Protection', () => {
        it('should timeout long-running operations', async () => {
            const slowOperation = async () => {
                await sleep(200);
                return 'slow result';
            };

            await expect(
                errorRecovery.executeWithTimeout(slowOperation, 50)
            ).rejects.toThrow('Operation timed out');
        });

        it('should return result if operation completes in time', async () => {
            const fastOperation = async () => {
                await sleep(10);
                return 'fast result';
            };

            const result = await errorRecovery.executeWithTimeout(fastOperation, 100);

            expect(result).toBe('fast result');
        });
    });
});
