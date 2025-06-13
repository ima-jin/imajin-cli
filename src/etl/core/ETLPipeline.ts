import { EventEmitter } from 'events';
import { ETLContext, ETLResult, PipelineDefinition, PipelineResult, PipelineStep } from './interfaces.js';

export class ETLPipeline {
    private readonly definition: PipelineDefinition;
    private readonly events: EventEmitter;

    constructor(definition: PipelineDefinition) {
        this.definition = definition;
        this.events = new EventEmitter();
    }

    async execute(context: ETLContext): Promise<PipelineResult> {
        const startTime = new Date();
        const results: ETLResult[] = [];
        let totalProcessed = 0;
        let stepsExecuted = 0;

        try {
            this.events.emit('pipeline:start', this.definition.id, context);

            for (const step of this.definition.steps) {
                this.events.emit('step:start', step.name, context);

                try {
                    const result = await this.executeStep(step, context);
                    results.push(result);
                    totalProcessed += result.processed;
                    stepsExecuted++;

                    this.events.emit('step:complete', step.name, result, context);
                } catch (error) {
                    this.events.emit('step:error', step.name, error as Error, context);
                    throw error;
                }
            }

            const endTime = new Date();
            const result: PipelineResult = {
                pipelineId: this.definition.id,
                success: true,
                startTime,
                endTime,
                duration: endTime.getTime() - startTime.getTime(),
                stepsExecuted,
                totalProcessed,
                results,
                metadata: context.metadata
            };

            this.events.emit('pipeline:complete', this.definition.id, result, context);
            return result;
        } catch (error) {
            const endTime = new Date();
            const result: PipelineResult = {
                pipelineId: this.definition.id,
                success: false,
                startTime,
                endTime,
                duration: endTime.getTime() - startTime.getTime(),
                stepsExecuted,
                totalProcessed,
                results,
                error: error as Error,
                metadata: context.metadata
            };

            this.events.emit('pipeline:error', this.definition.id, error as Error, context);
            return result;
        }
    }

    private async executeStep(step: PipelineStep, context: ETLContext): Promise<ETLResult> {
        if (step.condition && !(await step.condition(context, []))) {
            return {
                success: true,
                processed: 0,
                metadata: {},
                duration: 0
            };
        }

        switch (step.type) {
            case 'extract':
                return await (step.component as any).extract(context, step.config);
            case 'transform':
                return await (step.component as any).transform([], context, step.config);
            case 'load':
                return await (step.component as any).load([], context, step.config);
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }
    }

    on(event: string, listener: (...args: any[]) => void): void {
        this.events.on(event, listener);
    }

    off(event: string, listener: (...args: any[]) => void): void {
        this.events.off(event, listener);
    }
} 