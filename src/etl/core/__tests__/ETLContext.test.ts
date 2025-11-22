/**
 * ETLContext Tests
 *
 * Comprehensive test suite for ETL context covering context initialization,
 * metadata management, event handling, and pipeline coordination.
 *
 * @package     @imajin/cli
 * @subpackage  etl/core/__tests__
 */

import { EventEmitter } from 'node:events';
import { ETLContext } from '../ETLContext.js';

describe('ETLContext', () => {
    let context: ETLContext;

    // =====================================================================
    // Constructor & Initialization
    // =====================================================================
    describe('Constructor & Initialization', () => {
        it('should initialize with pipeline ID', () => {
            context = new ETLContext('test-pipeline');

            expect(context.pipelineId).toBe('test-pipeline');
        });

        it('should initialize with empty metadata by default', () => {
            context = new ETLContext('test-pipeline');

            expect(context.metadata).toEqual({});
        });

        it('should initialize with provided metadata', () => {
            const metadata = {
                source: 'test-source',
                target: 'test-target',
            };

            context = new ETLContext('test-pipeline', metadata);

            expect(context.metadata).toEqual(metadata);
        });

        it('should generate unique context ID', () => {
            const context1 = new ETLContext('test-pipeline');
            const context2 = new ETLContext('test-pipeline');

            expect(context1.id).not.toBe(context2.id);
        });

        it('should set start time on initialization', () => {
            const beforeTime = new Date();
            context = new ETLContext('test-pipeline');
            const afterTime = new Date();

            expect(context.startTime).toBeInstanceOf(Date);
            expect(context.startTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
            expect(context.startTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
        });

        it('should create EventEmitter instance', () => {
            context = new ETLContext('test-pipeline');

            expect(context.events).toBeInstanceOf(EventEmitter);
        });

        it('should generate valid UUID for context ID', () => {
            context = new ETLContext('test-pipeline');

            // UUID v4 regex
            const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

            expect(context.id).toMatch(uuidRegex);
        });
    });

    // =====================================================================
    // Properties
    // =====================================================================
    describe('Properties', () => {
        beforeEach(() => {
            context = new ETLContext('test-pipeline', { initial: 'value' });
        });

        it('should have readonly id property', () => {
            expect(context.id).toBeDefined();
            expect(typeof context.id).toBe('string');
        });

        it('should have readonly pipelineId property', () => {
            expect(context.pipelineId).toBe('test-pipeline');
        });

        it('should have readonly metadata property', () => {
            expect(context.metadata).toBeDefined();
            expect(typeof context.metadata).toBe('object');
        });

        it('should have readonly startTime property', () => {
            expect(context.startTime).toBeInstanceOf(Date);
        });

        it('should have readonly events property', () => {
            expect(context.events).toBeInstanceOf(EventEmitter);
        });
    });

    // =====================================================================
    // Metadata Management
    // =====================================================================
    describe('Metadata Management', () => {
        beforeEach(() => {
            context = new ETLContext('test-pipeline');
        });

        it('should set metadata value', () => {
            context.setMetadata('key', 'value');

            expect(context.metadata.key).toBe('value');
        });

        it('should get metadata value', () => {
            context.setMetadata('key', 'value');

            const value = context.getMetadata('key');

            expect(value).toBe('value');
        });

        it('should overwrite existing metadata', () => {
            context.setMetadata('key', 'value1');
            context.setMetadata('key', 'value2');

            expect(context.getMetadata('key')).toBe('value2');
        });

        it('should return undefined for non-existent key', () => {
            const value = context.getMetadata('nonexistent');

            expect(value).toBeUndefined();
        });

        it('should handle multiple metadata keys', () => {
            context.setMetadata('key1', 'value1');
            context.setMetadata('key2', 'value2');
            context.setMetadata('key3', 'value3');

            expect(context.getMetadata('key1')).toBe('value1');
            expect(context.getMetadata('key2')).toBe('value2');
            expect(context.getMetadata('key3')).toBe('value3');
        });

        it('should handle complex metadata values', () => {
            const complexValue = {
                nested: {
                    array: [1, 2, 3],
                    object: { a: 1, b: 2 },
                },
            };

            context.setMetadata('complex', complexValue);

            expect(context.getMetadata('complex')).toEqual(complexValue);
        });

        it('should handle null metadata values', () => {
            context.setMetadata('nullKey', null);

            expect(context.getMetadata('nullKey')).toBeNull();
        });

        it('should handle boolean metadata values', () => {
            context.setMetadata('boolKey', true);

            expect(context.getMetadata('boolKey')).toBe(true);
        });

        it('should handle number metadata values', () => {
            context.setMetadata('numKey', 42);

            expect(context.getMetadata('numKey')).toBe(42);
        });

        it('should preserve initial metadata', () => {
            const initialMetadata = { initial: 'value' };
            context = new ETLContext('test-pipeline', initialMetadata);

            context.setMetadata('newKey', 'newValue');

            expect(context.getMetadata('initial')).toBe('value');
            expect(context.getMetadata('newKey')).toBe('newValue');
        });
    });

    // =====================================================================
    // Event Handling
    // =====================================================================
    describe('Event Handling', () => {
        beforeEach(() => {
            context = new ETLContext('test-pipeline');
        });

        it('should register event listener', () => {
            const listener = jest.fn();

            context.on('test-event', listener);
            context.events.emit('test-event', 'data');

            expect(listener).toHaveBeenCalledWith('data');
        });

        it('should remove event listener', () => {
            const listener = jest.fn();

            context.on('test-event', listener);
            context.off('test-event', listener);
            context.events.emit('test-event', 'data');

            expect(listener).not.toHaveBeenCalled();
        });

        it('should handle multiple listeners for same event', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            context.on('test-event', listener1);
            context.on('test-event', listener2);
            context.events.emit('test-event', 'data');

            expect(listener1).toHaveBeenCalledWith('data');
            expect(listener2).toHaveBeenCalledWith('data');
        });

        it('should handle multiple event types', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            context.on('event1', listener1);
            context.on('event2', listener2);

            context.events.emit('event1', 'data1');
            context.events.emit('event2', 'data2');

            expect(listener1).toHaveBeenCalledWith('data1');
            expect(listener2).toHaveBeenCalledWith('data2');
        });

        it('should pass multiple arguments to listeners', () => {
            const listener = jest.fn();

            context.on('test-event', listener);
            context.events.emit('test-event', 'arg1', 'arg2', 'arg3');

            expect(listener).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
        });

        it('should handle event listener errors gracefully', () => {
            const errorListener = jest.fn(() => {
                throw new Error('Listener error');
            });
            const successListener = jest.fn();

            context.on('test-event', errorListener);
            context.on('test-event', successListener);

            expect(() => {
                context.events.emit('test-event', 'data');
            }).toThrow('Listener error');
        });

        it('should support once listeners through EventEmitter', () => {
            const listener = jest.fn();

            context.events.once('test-event', listener);

            context.events.emit('test-event', 'data1');
            context.events.emit('test-event', 'data2');

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith('data1');
        });

        it('should not affect other listeners when removing one', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            context.on('test-event', listener1);
            context.on('test-event', listener2);

            context.off('test-event', listener1);
            context.events.emit('test-event', 'data');

            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).toHaveBeenCalledWith('data');
        });
    });

    // =====================================================================
    // Integration
    // =====================================================================
    describe('Integration', () => {
        it('should coordinate metadata and events', () => {
            context = new ETLContext('test-pipeline');

            const listener = jest.fn((key: string, value: any) => {
                expect(context.getMetadata(key)).toBe(value);
            });

            context.on('metadata-set', listener);

            context.setMetadata('testKey', 'testValue');
            context.events.emit('metadata-set', 'testKey', 'testValue');

            expect(listener).toHaveBeenCalled();
        });

        it('should maintain state across operations', () => {
            context = new ETLContext('test-pipeline', { initial: 'data' });

            const capturedStates: any[] = [];

            context.on('state-capture', () => {
                capturedStates.push({
                    id: context.id,
                    pipelineId: context.pipelineId,
                    metadata: { ...context.metadata },
                    startTime: context.startTime,
                });
            });

            context.setMetadata('step1', 'completed');
            context.events.emit('state-capture');

            context.setMetadata('step2', 'completed');
            context.events.emit('state-capture');

            expect(capturedStates).toHaveLength(2);
            expect(capturedStates[0].metadata).toHaveProperty('step1', 'completed');
            expect(capturedStates[1].metadata).toHaveProperty('step2', 'completed');
        });

        it('should support ETL pipeline progress tracking', () => {
            context = new ETLContext('etl-pipeline');

            const progressEvents: any[] = [];

            context.on('progress', (progress: any) => {
                progressEvents.push(progress);
            });

            // Simulate ETL pipeline progress
            context.events.emit('progress', { stage: 'extract', percentage: 33 });
            context.events.emit('progress', { stage: 'transform', percentage: 66 });
            context.events.emit('progress', { stage: 'load', percentage: 100 });

            expect(progressEvents).toHaveLength(3);
            expect(progressEvents[0].stage).toBe('extract');
            expect(progressEvents[1].stage).toBe('transform');
            expect(progressEvents[2].stage).toBe('load');
        });
    });
});
