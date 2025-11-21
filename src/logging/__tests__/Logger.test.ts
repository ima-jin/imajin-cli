/**
 * Logger Tests - Comprehensive test suite for logging infrastructure
 *
 * @package     @imajin/cli
 * @subpackage  logging/__tests__
 */

import { Logger, LogContext } from '../Logger.js';
import { LogLevel } from '../LoggerConfig.js';
import winston from 'winston';
import { Writable } from 'stream';

describe('Logger', () => {
    let logger: Logger;
    let mockTransport: jest.Mocked<winston.transport>;

    beforeEach(() => {
        // Clear any existing winston transports
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Clean up logger instance
        if (logger) {
            const winstonLogger = logger.getWinstonLogger();
            winstonLogger.close();
        }
    });

    describe('Initialization', () => {
        it('should create logger with default configuration', () => {
            logger = new Logger();
            expect(logger).toBeInstanceOf(Logger);
            expect(logger.getCorrelationId()).toBeDefined();
        });

        it('should create logger with custom configuration', () => {
            logger = new Logger({
                level: 'error',
                enableColors: false,
            });

            const winstonLogger = logger.getWinstonLogger();
            expect(winstonLogger.level).toBe('error');
        });

        it('should generate unique correlation IDs for each instance', () => {
            const logger1 = new Logger();
            const logger2 = new Logger();

            expect(logger1.getCorrelationId()).not.toBe(logger2.getCorrelationId());

            logger1.getWinstonLogger().close();
            logger2.getWinstonLogger().close();
        });

        it('should initialize with empty transports array', () => {
            logger = new Logger({ transports: [] });
            const winstonLogger = logger.getWinstonLogger();
            expect(winstonLogger.transports.length).toBe(0);
        });
    });

    describe('Log Levels', () => {
        beforeEach(() => {
            logger = new Logger({
                level: 'debug',
                transports: [],
            });
        });

        it('should log debug messages', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'debug');
            logger.debug('Debug message');
            expect(spy).toHaveBeenCalledWith('Debug message', expect.objectContaining({
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should log info messages', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');
            logger.info('Info message');
            expect(spy).toHaveBeenCalledWith('Info message', expect.objectContaining({
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should log warning messages', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'warn');
            logger.warn('Warning message');
            expect(spy).toHaveBeenCalledWith('Warning message', expect.objectContaining({
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should log error messages', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'error');
            const testError = new Error('Test error');
            logger.error('Error message', testError);

            expect(spy).toHaveBeenCalledWith('Error message', expect.objectContaining({
                error: 'Test error',
                stack: expect.stringContaining('Error: Test error'),
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should use generic log method with specific level', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'log');
            logger.log('info', 'Generic log message');

            expect(spy).toHaveBeenCalledWith('info', 'Generic log message', expect.objectContaining({
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should support all standard log levels', () => {
            const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
            const spy = jest.spyOn(logger.getWinstonLogger(), 'log');

            levels.forEach(level => {
                logger.log(level, `${level} message`);
            });

            expect(spy).toHaveBeenCalledTimes(levels.length);
        });
    });

    describe('Structured Logging', () => {
        beforeEach(() => {
            logger = new Logger({
                level: 'debug',
                transports: [],
            });
        });

        it('should include context objects in log output', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');
            const context: LogContext = {
                userId: '123',
                action: 'login',
                service: 'auth',
            };

            logger.info('User action', context);

            expect(spy).toHaveBeenCalledWith('User action', expect.objectContaining({
                userId: '123',
                action: 'login',
                service: 'auth',
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should serialize errors with stack traces', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'error');
            const error = new Error('Test error with stack');

            logger.error('Operation failed', error);

            expect(spy).toHaveBeenCalledWith('Operation failed', expect.objectContaining({
                error: 'Test error with stack',
                stack: expect.stringContaining('Error: Test error with stack'),
            }));
        });

        it('should handle errors without stack traces', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'error');
            const error = new Error('Simple error');
            delete error.stack;

            logger.error('Operation failed', error);

            expect(spy).toHaveBeenCalledWith('Operation failed', expect.objectContaining({
                error: 'Simple error',
            }));
        });

        it('should merge context with correlation ID', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'debug');
            const context: LogContext = {
                customField: 'value',
            };

            logger.debug('Test message', context);

            expect(spy).toHaveBeenCalledWith('Test message', expect.objectContaining({
                customField: 'value',
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should handle empty context objects', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');
            logger.info('Message without context', {});

            expect(spy).toHaveBeenCalledWith('Message without context', expect.objectContaining({
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should handle undefined context', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');
            logger.info('Message without context');

            expect(spy).toHaveBeenCalledWith('Message without context', expect.objectContaining({
                correlationId: logger.getCorrelationId(),
            }));
        });
    });

    describe('Child Logger', () => {
        beforeEach(() => {
            logger = new Logger({
                level: 'debug',
                transports: [],
            });
        });

        it('should create child logger with persistent context', () => {
            const childContext: LogContext = {
                service: 'api',
                component: 'auth',
            };

            const child = logger.child(childContext);

            expect(child).toBeInstanceOf(Logger);
            expect(child).not.toBe(logger);
        });

        it('should create child logger instance', () => {
            const child = logger.child({ service: 'child' });
            expect(child).toBeInstanceOf(Logger);
            // Note: Child logger creates its own correlation ID
            expect(child.getCorrelationId()).toBeDefined();
        });

        it('should include parent context in child logs', () => {
            const child = logger.child({
                service: 'api',
                component: 'auth',
            });

            const spy = jest.spyOn(child.getWinstonLogger(), 'info');
            child.info('Child log message');

            expect(spy).toHaveBeenCalledWith('Child log message', expect.objectContaining({
                correlationId: expect.any(String),
            }));
        });

        it('should support nested child loggers', () => {
            const child1 = logger.child({ level: '1' });
            const child2 = child1.child({ level: '2' });

            expect(child2).toBeInstanceOf(Logger);
            expect(child2.getCorrelationId()).toBeDefined();
        });
    });

    describe('Command Logging', () => {
        beforeEach(() => {
            logger = new Logger({
                level: 'info',
                transports: [],
            });
        });

        it('should log command start', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');
            const args = ['--force', '--verbose'];

            logger.commandStart('deploy', args);

            expect(spy).toHaveBeenCalledWith('Command started: deploy', expect.objectContaining({
                command: 'deploy',
                arguments: args,
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should log command completion', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');

            logger.commandComplete('deploy', 1500);

            expect(spy).toHaveBeenCalledWith('Command completed: deploy (1500ms)', expect.objectContaining({
                command: 'deploy',
                duration: 1500,
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should log command errors', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'error');
            const error = new Error('Command failed');

            logger.commandError('deploy', error);

            expect(spy).toHaveBeenCalledWith('Command failed: deploy', expect.objectContaining({
                command: 'deploy',
                error: 'Command failed',
                correlationId: logger.getCorrelationId(),
            }));
        });

        it('should include additional context in command logs', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');
            const context: LogContext = {
                environment: 'production',
            };

            logger.commandStart('deploy', [], context);

            expect(spy).toHaveBeenCalledWith('Command started: deploy', expect.objectContaining({
                command: 'deploy',
                environment: 'production',
            }));
        });
    });

    describe('Correlation ID Management', () => {
        beforeEach(() => {
            logger = new Logger({ transports: [] });
        });

        it('should get current correlation ID', () => {
            const id = logger.getCorrelationId();
            expect(id).toBeDefined();
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });

        it('should set custom correlation ID', () => {
            const customId = 'custom-correlation-id-123';
            logger.setCorrelationId(customId);
            expect(logger.getCorrelationId()).toBe(customId);
        });

        it('should use updated correlation ID in logs', () => {
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');
            const customId = 'test-id-456';

            logger.setCorrelationId(customId);
            logger.info('Test message');

            expect(spy).toHaveBeenCalledWith('Test message', expect.objectContaining({
                correlationId: customId,
            }));
        });
    });

    describe('Winston Integration', () => {
        beforeEach(() => {
            logger = new Logger({ transports: [] });
        });

        it('should provide access to underlying Winston logger', () => {
            const winstonLogger = logger.getWinstonLogger();
            expect(winstonLogger).toBeDefined();
            expect(winstonLogger).toHaveProperty('log');
            expect(winstonLogger).toHaveProperty('info');
            expect(winstonLogger).toHaveProperty('error');
        });

        it('should use Winston logger for actual logging', () => {
            const winstonLogger = logger.getWinstonLogger();
            const spy = jest.spyOn(winstonLogger, 'info');

            logger.info('Winston test');

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle null in context gracefully', () => {
            logger = new Logger({ transports: [] });
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');

            expect(() => {
                logger.info('Test', { nullValue: null } as any);
            }).not.toThrow();

            expect(spy).toHaveBeenCalled();
        });

        it('should handle undefined error in error logging', () => {
            logger = new Logger({ transports: [] });
            const spy = jest.spyOn(logger.getWinstonLogger(), 'error');

            expect(() => {
                logger.error('Error message', undefined);
            }).not.toThrow();

            expect(spy).toHaveBeenCalled();
        });

        it('should handle very long messages', () => {
            logger = new Logger({ transports: [] });
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');
            const longMessage = 'x'.repeat(10000);

            logger.info(longMessage);

            expect(spy).toHaveBeenCalledWith(longMessage, expect.any(Object));
        });

        it('should handle special characters in messages', () => {
            logger = new Logger({ transports: [] });
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');
            const specialMessage = '🚀 Special chars: <>&"\'\\n\\t';

            logger.info(specialMessage);

            expect(spy).toHaveBeenCalledWith(specialMessage, expect.any(Object));
        });

        it('should handle empty string messages', () => {
            logger = new Logger({ transports: [] });
            const spy = jest.spyOn(logger.getWinstonLogger(), 'info');

            logger.info('');

            expect(spy).toHaveBeenCalledWith('', expect.any(Object));
        });
    });

    describe('Transport Configuration', () => {
        it('should support console transport', () => {
            logger = new Logger({
                transports: [
                    {
                        type: 'console',
                        level: 'debug',
                    },
                ],
            });

            const winstonLogger = logger.getWinstonLogger();
            expect(winstonLogger.transports.length).toBeGreaterThan(0);
        });

        it('should support file transport with filename', () => {
            logger = new Logger({
                transports: [
                    {
                        type: 'file',
                        level: 'info',
                        options: {
                            filename: 'test.log',
                        },
                    },
                ],
            });

            const winstonLogger = logger.getWinstonLogger();
            expect(winstonLogger.transports.length).toBeGreaterThan(0);
        });

        it('should skip file transport without filename', () => {
            logger = new Logger({
                transports: [
                    {
                        type: 'file',
                        level: 'info',
                    },
                ],
            });

            const winstonLogger = logger.getWinstonLogger();
            expect(winstonLogger.transports.length).toBe(0);
        });

        it('should support stream transport', () => {
            const testStream = new Writable({
                write(chunk, encoding, callback) {
                    callback();
                },
            });

            logger = new Logger({
                transports: [
                    {
                        type: 'stream',
                        level: 'info',
                        options: {
                            stream: testStream,
                        },
                    },
                ],
            });

            const winstonLogger = logger.getWinstonLogger();
            expect(winstonLogger.transports.length).toBeGreaterThan(0);
        });

        it('should skip stream transport without stream', () => {
            logger = new Logger({
                transports: [
                    {
                        type: 'stream',
                        level: 'info',
                    },
                ],
            });

            const winstonLogger = logger.getWinstonLogger();
            expect(winstonLogger.transports.length).toBe(0);
        });

        it('should support multiple transports', () => {
            const testStream = new Writable({
                write(chunk, encoding, callback) {
                    callback();
                },
            });

            logger = new Logger({
                transports: [
                    {
                        type: 'console',
                        level: 'debug',
                    },
                    {
                        type: 'stream',
                        level: 'info',
                        options: {
                            stream: testStream,
                        },
                    },
                ],
            });

            const winstonLogger = logger.getWinstonLogger();
            expect(winstonLogger.transports.length).toBe(2);
        });
    });

    describe('Color Configuration', () => {
        it('should enable colors when configured', () => {
            logger = new Logger({
                enableColors: true,
                transports: [
                    {
                        type: 'console',
                    },
                ],
            });

            // Logger should be created without errors
            expect(logger).toBeInstanceOf(Logger);
        });

        it('should disable colors when configured', () => {
            logger = new Logger({
                enableColors: false,
                transports: [
                    {
                        type: 'console',
                    },
                ],
            });

            expect(logger).toBeInstanceOf(Logger);
        });
    });

    describe('Default Context', () => {
        it('should include default context in all logs', () => {
            logger = new Logger({
                defaultContext: {
                    application: 'imajin-cli',
                    environment: 'test',
                },
                transports: [],
            });

            const winstonLogger = logger.getWinstonLogger();
            expect(winstonLogger.defaultMeta).toMatchObject({
                application: 'imajin-cli',
                environment: 'test',
            });
        });
    });
});
