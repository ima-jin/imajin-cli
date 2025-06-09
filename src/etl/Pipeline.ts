/**
 * Pipeline - ETL pipeline orchestration and execution engine
 * 
 * @package     @imajin/cli
 * @subpackage  etl
 * @author      Claude
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Event system for progress tracking and communication
 * - Command pattern for CLI operations
 * - Error handling and recovery strategies
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import {
    ETLConfig,
    ETLContext,
    ETLEvents,
    ETLProgress,
    ETLResult,
    Extractor,
    Loader,
    PipelineDefinition,
    PipelineResult,
    PipelineStep,
    Transformer,
} from './core/interfaces.js';

/**
 * Pipeline execution options
 */
export interface PipelineExecutionOptions extends ETLConfig {
    readonly resumeFromStep?: string;
    readonly skipSteps?: string[];
    readonly dryRun?: boolean;
    readonly stopOnError?: boolean;
    readonly saveIntermediateResults?: boolean;
}

/**
 * Pipeline execution state
 */
export interface PipelineExecutionState {
    readonly pipelineId: string;
    currentStep: number;
    readonly totalSteps: number;
    readonly startTime: Date;
    data: any[];
    stepResults: ETLResult[];
    readonly metadata: Record<string, any>;
}

/**
 * ETL Pipeline orchestration engine
 */
export class Pipeline {
    private readonly events: EventEmitter;
    private executionStates: Map<string, PipelineExecutionState> = new Map();

    constructor() {
        this.events = new EventEmitter();
        this.setupDefaultEventHandlers();
    }

    /**
     * Register event listener
     */
    public on<K extends keyof ETLEvents>(event: K, listener: ETLEvents[K]): void {
        this.events.on(event, listener);
    }

    /**
     * Remove event listener
     */
    public off<K extends keyof ETLEvents>(event: K, listener: ETLEvents[K]): void {
        this.events.off(event, listener);
    }

    /**
     * Execute a pipeline definition
     */
    public async execute(
        definition: PipelineDefinition,
        options: PipelineExecutionOptions = {}
    ): Promise<PipelineResult> {
        const executionId = randomUUID();
        const startTime = new Date();

        // Create execution context
        const context: ETLContext = {
            id: executionId,
            pipelineId: definition.id,
            metadata: {
                definition,
                options,
                executionId,
            },
            startTime,
            events: this.events,
        };

        // Initialize execution state
        const state: PipelineExecutionState = {
            pipelineId: definition.id,
            currentStep: 0,
            totalSteps: definition.steps.length,
            startTime,
            data: [],
            stepResults: [],
            metadata: {},
        };

        this.executionStates.set(executionId, state);

        try {
            // Emit pipeline start event
            this.events.emit('pipeline:start', definition.id, context);

            // Validate pipeline
            await this.validatePipeline(definition);

            // Determine starting step
            let startStepIndex = 0;
            if (options.resumeFromStep) {
                startStepIndex = definition.steps.findIndex(s => s.name === options.resumeFromStep);
                if (startStepIndex === -1) {
                    throw new Error(`Resume step '${options.resumeFromStep}' not found in pipeline`);
                }
            }

            // Execute pipeline steps
            let currentData: any[] = [];
            const stepResults: ETLResult[] = [];

            for (let i = startStepIndex; i < definition.steps.length; i++) {
                const step = definition.steps[i];

                if (!step) {
                    continue;
                }

                // Check if step should be skipped
                if (options.skipSteps?.includes(step.name)) {
                    continue;
                }

                // Update execution state
                state.currentStep = i + 1;
                state.data = currentData;

                // Check step condition
                if (step.condition && !(await step.condition(context, currentData))) {
                    continue;
                }

                try {
                    // Execute step
                    const stepResult = await this.executeStep(step, currentData, context, options);
                    stepResults.push(stepResult);
                    state.stepResults = stepResults;

                    if (!stepResult.success) {
                        if (options.stopOnError !== false) {
                            throw new Error(`Step '${step.name}' failed: ${stepResult.error?.message}`);
                        }
                    } else {
                        // Update data for next step
                        if (stepResult.data) {
                            currentData = Array.isArray(stepResult.data) ? stepResult.data : [stepResult.data];
                        }
                    }

                    // Save intermediate results if requested
                    if (options.saveIntermediateResults) {
                        state.metadata[`step_${i}_result`] = stepResult;
                    }

                } catch (error) {
                    const stepError = error as Error;
                    const failedResult: ETLResult = {
                        success: false,
                        error: stepError,
                        processed: 0,
                        metadata: { step: step.name },
                        duration: 0,
                    };

                    stepResults.push(failedResult);
                    state.stepResults = stepResults;

                    if (options.stopOnError !== false) {
                        throw stepError;
                    }
                }
            }

            // Create final result
            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();
            const successfulSteps = stepResults.filter(r => r.success);
            const totalProcessed = stepResults.reduce((sum, r) => sum + r.processed, 0);

            const result: PipelineResult = {
                pipelineId: definition.id,
                success: successfulSteps.length === stepResults.length,
                startTime,
                endTime,
                duration,
                stepsExecuted: stepResults.length,
                totalProcessed,
                results: stepResults,
                metadata: {
                    ...state.metadata,
                    executionId,
                    finalDataCount: currentData.length,
                },
            };

            // Emit pipeline complete event
            this.events.emit('pipeline:complete', definition.id, result);

            return result;

        } catch (error) {
            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();

            const result: PipelineResult = {
                pipelineId: definition.id,
                success: false,
                startTime,
                endTime,
                duration,
                stepsExecuted: state.stepResults.length,
                totalProcessed: state.stepResults.reduce((sum, r) => sum + r.processed, 0),
                results: state.stepResults,
                error: error as Error,
                metadata: {
                    ...state.metadata,
                    executionId,
                    errorStep: state.currentStep,
                },
            };

            // Emit pipeline error event
            this.events.emit('pipeline:error', definition.id, error as Error, context);

            return result;
        } finally {
            // Clean up execution state
            this.executionStates.delete(executionId);
        }
    }

    /**
     * Create a simple pipeline from components
     */
    public static create(
        id: string,
        name: string,
        extractor: Extractor,
        transformer?: Transformer,
        loader?: Loader,
        config?: ETLConfig
    ): PipelineDefinition {
        const defaultConfig: ETLConfig = config || {};
        const steps: PipelineStep[] = [
            {
                name: `extract_${extractor.name}`,
                type: 'extract',
                component: extractor,
                config: defaultConfig,
            },
        ];

        if (transformer) {
            steps.push({
                name: `transform_${transformer.name}`,
                type: 'transform',
                component: transformer,
                config: defaultConfig,
            });
        }

        if (loader) {
            steps.push({
                name: `load_${loader.name}`,
                type: 'load',
                component: loader,
                config: defaultConfig,
            });
        }

        return {
            id,
            name,
            steps,
            config: defaultConfig,
        };
    }

    /**
     * Create an extract-only pipeline
     */
    public static extract(
        id: string,
        name: string,
        extractor: Extractor,
        config?: ETLConfig
    ): PipelineDefinition {
        return Pipeline.create(id, name, extractor, undefined, undefined, config);
    }

    /**
     * Create a transform-only pipeline
     */
    public static transform(
        id: string,
        name: string,
        transformer: Transformer,
        config?: ETLConfig
    ): PipelineDefinition {
        const defaultConfig: ETLConfig = config || {};
        return {
            id,
            name,
            steps: [
                {
                    name: `transform_${transformer.name}`,
                    type: 'transform',
                    component: transformer,
                    config: defaultConfig,
                },
            ],
            config: defaultConfig,
        };
    }

    /**
     * Get current execution state for a pipeline
     */
    public getExecutionState(executionId: string): PipelineExecutionState | undefined {
        return this.executionStates.get(executionId);
    }

    /**
     * Get all active executions
     */
    public getActiveExecutions(): PipelineExecutionState[] {
        return Array.from(this.executionStates.values());
    }

    /**
     * Cancel a running pipeline execution
     */
    public async cancel(executionId: string): Promise<boolean> {
        const state = this.executionStates.get(executionId);
        if (!state) {
            return false;
        }

        // Remove from active executions
        this.executionStates.delete(executionId);

        // Emit cancellation event
        this.events.emit('pipeline:error', state.pipelineId, new Error('Pipeline cancelled'), {
            id: executionId,
            pipelineId: state.pipelineId,
            metadata: {},
            startTime: state.startTime,
            events: this.events,
        });

        return true;
    }

    /**
     * Execute a single pipeline step
     */
    private async executeStep(
        step: PipelineStep,
        data: any[],
        context: ETLContext,
        options: PipelineExecutionOptions
    ): Promise<ETLResult> {
        const mergedConfig = { ...step.config, ...options };

        // Emit step start event
        this.events.emit('step:start', step.name, context);

        try {
            let result: ETLResult;

            switch (step.type) {
                case 'extract':
                    const extractor = step.component as Extractor;
                    result = await extractor.extract(context, mergedConfig);
                    break;

                case 'transform':
                    const transformer = step.component as Transformer;
                    result = await transformer.transform(data, context, mergedConfig);
                    break;

                case 'load':
                    const loader = step.component as Loader;
                    result = await loader.load(data, context, mergedConfig);
                    break;

                default:
                    throw new Error(`Unknown step type: ${step.type}`);
            }

            // Emit step complete event
            this.events.emit('step:complete', step.name, result, context);

            return result;
        } catch (error) {
            // Emit step error event
            this.events.emit('step:error', step.name, error as Error, context);
            throw error;
        }
    }

    /**
     * Validate pipeline definition
     */
    private async validatePipeline(definition: PipelineDefinition): Promise<void> {
        if (!definition.id || !definition.name) {
            throw new Error('Pipeline must have an ID and name');
        }

        if (!definition.steps || definition.steps.length === 0) {
            throw new Error('Pipeline must have at least one step');
        }

        // Validate step sequence
        let hasExtract = false;
        let hasTransform = false;
        const hasLoad = false;

        for (const step of definition.steps) {
            if (!step.name || !step.type || !step.component) {
                throw new Error(`Invalid step definition: ${JSON.stringify(step)}`);
            }

            switch (step.type) {
                case 'extract':
                    hasExtract = true;
                    break;
                case 'transform':
                    hasTransform = true;
                    if (!hasExtract) {
                        console.warn('Transform step without preceding extract step');
                    }
                    break;
                case 'load':
                    // hasLoad = true; // TODO: Fix constant assignment
                    if (!hasExtract && !hasTransform) {
                        console.warn('Load step without preceding extract or transform steps');
                    }
                    break;
            }

            // Validate component
            if (step.component.validate) {
                const isValid = await step.component.validate(step.config);
                if (!isValid) {
                    throw new Error(`Component validation failed for step: ${step.name}`);
                }
            }
        }
    }

    /**
     * Setup default event handlers for logging and monitoring
     */
    private setupDefaultEventHandlers(): void {
        // Progress tracking
        this.events.on('progress', (progress: ETLProgress) => {
            console.log(`[${progress.stage.toUpperCase()}] ${progress.step}: ${progress.message || 'Processing...'}`);
            if (progress.percentage !== undefined) {
                console.log(`Progress: ${progress.percentage}% (${progress.processed}/${progress.total || '?'})`);
            }
        });

        // Step tracking
        this.events.on('step:start', (step: string, context: ETLContext) => {
            console.log(`Starting step: ${step} (Pipeline: ${context.pipelineId})`);
        });

        this.events.on('step:complete', (step: string, result: ETLResult, context: ETLContext) => {
            console.log(`Completed step: ${step} - Processed: ${result.processed} items in ${result.duration}ms`);
        });

        this.events.on('step:error', (step: string, error: Error, context: ETLContext) => {
            console.error(`Error in step: ${step} - ${error.message}`);
        });

        // Pipeline tracking
        this.events.on('pipeline:start', (pipelineId: string, context: ETLContext) => {
            console.log(`Starting pipeline: ${pipelineId} (Execution: ${context.id})`);
        });

        this.events.on('pipeline:complete', (pipelineId: string, result: PipelineResult) => {
            const status = result.success ? 'SUCCESS' : 'FAILED';
            console.log(`Pipeline ${pipelineId} completed: ${status} - ${result.totalProcessed} items processed in ${result.duration}ms`);
        });

        this.events.on('pipeline:error', (pipelineId: string, error: Error, context: ETLContext) => {
            console.error(`Pipeline ${pipelineId} failed: ${error.message}`);
        });

        // Data flow tracking
        this.events.on('data:extracted', (count: number, context: ETLContext) => {
            console.log(`Extracted ${count} items`);
        });

        this.events.on('data:transformed', (count: number, context: ETLContext) => {
            console.log(`Transformed ${count} items`);
        });

        this.events.on('data:loaded', (count: number, context: ETLContext) => {
            console.log(`Loaded ${count} items`);
        });
    }
} 