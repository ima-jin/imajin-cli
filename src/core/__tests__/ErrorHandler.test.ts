/**
 * Tests for ErrorHandler - Global error handling system
 * Critical component for application reliability
 */

import { EventEmitter } from 'node:events';
import { ErrorHandler, ErrorHandlerOptions, ErrorReport } from '../ErrorHandler.js';
import { BaseException } from '../../exceptions/BaseException.js';
import { SystemError } from '../../exceptions/SystemError.js';
import { ValidationError } from '../../exceptions/ValidationError.js';

describe('ErrorHandler', () => {
    let errorHandler: ErrorHandler;

    beforeEach(() => {
        // Create fresh error handler for each test
        errorHandler = new ErrorHandler({
            enableConsoleOutput: false, // Disable for cleaner test output
            enableLogging: false,
            enableEventEmission: true,
            exitOnCritical: false, // Don't exit during tests
            jsonOutput: false,
            verbose: false
        });
    });

    afterEach(() => {
        // Clean up event listeners
        errorHandler.removeAllListeners();
    });

    describe('constructor', () => {
        it('should create error handler with default options', () => {
            const handler = new ErrorHandler();
            expect(handler).toBeInstanceOf(ErrorHandler);
            expect(handler).toBeInstanceOf(EventEmitter);
        });

        it('should merge provided options with defaults', () => {
            const handler = new ErrorHandler({
                exitOnCritical: false,
                jsonOutput: true
            });
            expect(handler).toBeInstanceOf(ErrorHandler);
        });

        it('should initialize with empty error history', () => {
            const history = errorHandler.getErrorHistory();
            expect(history).toHaveLength(0);
        });
    });

    describe('handleError', () => {
        it('should handle standard Error objects', async () => {
            const error = new Error('Test error');
            const report = await errorHandler.handleError(error);

            expect(report).toBeDefined();
            expect(report.error).toBeInstanceOf(BaseException);
            expect(report.handled).toBe(true);
            expect(report.timestamp).toBeInstanceOf(Date);
        });

        it('should handle BaseException objects', async () => {
            const exception = new ValidationError('Invalid input', [{ field: 'email', value: 'bad@' }]);
            const report = await errorHandler.handleError(exception);

            expect(report.error).toBe(exception);
            expect(report.handled).toBe(true);
        });

        it('should include context in error report', async () => {
            const error = new Error('Test error');
            const context = { operation: 'test', userId: '123' };
            const report = await errorHandler.handleError(error, context);

            expect(report.context).toEqual(context);
        });

        it('should add error to history', async () => {
            const error = new Error('Test error');
            await errorHandler.handleError(error);

            const history = errorHandler.getErrorHistory();
            expect(history).toHaveLength(1);
            expect(history[0]?.error.message).toBe('Test error');
        });

        it('should emit error event', async () => {
            const error = new Error('Test error');
            const eventPromise = new Promise<ErrorReport>(resolve => {
                errorHandler.once('error', (report: ErrorReport) => resolve(report));
            });

            await errorHandler.handleError(error);
            const emittedReport = await eventPromise;

            expect(emittedReport.error.message).toBe('Test error');
        });

        it('should limit error history size', async () => {
            // Create 150 errors (exceeds maxHistorySize of 100)
            for (let i = 0; i < 150; i++) {
                await errorHandler.handleError(new Error(`Error ${i}`));
            }

            const history = errorHandler.getErrorHistory();
            expect(history.length).toBeLessThanOrEqual(100);
        });
    });

    describe('normalizeError', () => {
        it('should convert Error to SystemError', async () => {
            const error = new Error('Standard error');
            const report = await errorHandler.handleError(error);

            expect(report.error).toBeInstanceOf(SystemError);
            expect(report.error.message).toBe('Standard error');
        });

        it('should preserve BaseException types', async () => {
            const validationError = new ValidationError('Invalid data', [{ field: 'name', value: '' }]);
            const report = await errorHandler.handleError(validationError);

            expect(report.error).toBeInstanceOf(ValidationError);
            expect(report.error).toBe(validationError);
        });

        it('should handle errors with no message', async () => {
            const error = new Error();
            const report = await errorHandler.handleError(error);

            expect(report.error.message).toBeDefined();
            expect(typeof report.error.message).toBe('string');
        });
    });

    describe('error recovery', () => {
        it('should mark recovery as attempted when applicable', async () => {
            const error = new ValidationError('Recoverable error', [{ field: 'data', value: null }]);
            const report = await errorHandler.handleError(error);

            // Recovery behavior depends on error type
            expect(typeof report.recoveryAttempted).toBe('boolean');
        });

        it('should handle multiple errors in sequence', async () => {
            const errors = [
                new Error('Error 1'),
                new ValidationError('Error 2', [{ field: 'test', value: 'bad' }]),
                new SystemError('Error 3', { type: 'process_error' })
            ];

            const reports: ErrorReport[] = [];
            for (const error of errors) {
                reports.push(await errorHandler.handleError(error));
            }

            expect(reports).toHaveLength(3);
            expect(reports.every(r => r.handled)).toBe(true);
        });
    });

    describe('getErrorHistory', () => {
        it('should return empty array initially', () => {
            const history = errorHandler.getErrorHistory();
            expect(history).toEqual([]);
        });

        it('should return handled errors in chronological order', async () => {
            await errorHandler.handleError(new Error('First'));
            await errorHandler.handleError(new Error('Second'));
            await errorHandler.handleError(new Error('Third'));

            const history = errorHandler.getErrorHistory();
            expect(history).toHaveLength(3);
            expect(history[0]?.error.message).toBe('First');
            expect(history[1]?.error.message).toBe('Second');
            expect(history[2]?.error.message).toBe('Third');
        });

        it('should return copy of history not original array', async () => {
            await errorHandler.handleError(new Error('Test'));
            const history1 = errorHandler.getErrorHistory();
            const history2 = errorHandler.getErrorHistory();

            expect(history1).toEqual(history2);
            expect(history1).not.toBe(history2); // Different array instances
        });
    });

    describe('clearHistory', () => {
        it('should clear all error history', async () => {
            await errorHandler.handleError(new Error('Error 1'));
            await errorHandler.handleError(new Error('Error 2'));
            await errorHandler.handleError(new Error('Error 3'));

            errorHandler.clearHistory();
            const history = errorHandler.getErrorHistory();

            expect(history).toHaveLength(0);
        });

        it('should work when history is already empty', () => {
            errorHandler.clearHistory();
            const history = errorHandler.getErrorHistory();

            expect(history).toHaveLength(0);
        });
    });

    describe('error categorization', () => {
        it('should handle different error types appropriately', async () => {
            const errors = [
                new ValidationError('Validation failed', [{ field: 'test', value: 123 }]),
                new SystemError('System failure', { type: 'file_not_found', path: '/test/file.txt' }),
                new Error('Generic error')
            ];

            const reports: ErrorReport[] = [];
            for (const error of errors) {
                reports.push(await errorHandler.handleError(error));
            }

            expect(reports).toHaveLength(3);
            expect(reports[0]?.error).toBeInstanceOf(ValidationError);
            expect(reports[1]?.error).toBeInstanceOf(SystemError);
            expect(reports[2]?.error).toBeInstanceOf(SystemError); // Converted
        });
    });

    describe('event emission', () => {
        it('should emit error event when enabled', async () => {
            const handler = new ErrorHandler({ enableEventEmission: true });
            const emittedEvents: ErrorReport[] = [];

            handler.on('error', (report: ErrorReport) => {
                emittedEvents.push(report);
            });

            await handler.handleError(new Error('Test 1'));
            await handler.handleError(new Error('Test 2'));

            expect(emittedEvents).toHaveLength(2);
        });

        it('should not emit events when disabled', async () => {
            const handler = new ErrorHandler({ enableEventEmission: false });
            let eventCount = 0;

            handler.on('error', () => {
                eventCount++;
            });

            await handler.handleError(new Error('Test'));

            expect(eventCount).toBe(0);
        });
    });

    describe('error timestamps', () => {
        it('should include timestamp in error reports', async () => {
            const before = new Date();
            const report = await errorHandler.handleError(new Error('Test'));
            const after = new Date();

            expect(report.timestamp).toBeInstanceOf(Date);
            expect(report.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(report.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should have unique timestamps for sequential errors', async () => {
            const report1 = await errorHandler.handleError(new Error('Test 1'));
            const report2 = await errorHandler.handleError(new Error('Test 2'));

            expect(report2.timestamp.getTime()).toBeGreaterThanOrEqual(report1.timestamp.getTime());
        });
    });

    describe('error context preservation', () => {
        it('should preserve complex context objects', async () => {
            const context = {
                user: { id: '123', name: 'Test User' },
                operation: 'create',
                metadata: { attempts: 3, timeout: 5000 }
            };

            const report = await errorHandler.handleError(new Error('Test'), context);

            expect(report.context).toEqual(context);
            expect(report.context.user.id).toBe('123');
            expect(report.context.metadata.attempts).toBe(3);
        });

        it('should handle empty context', async () => {
            const report = await errorHandler.handleError(new Error('Test'));

            expect(report.context).toBeDefined();
        });
    });
});
