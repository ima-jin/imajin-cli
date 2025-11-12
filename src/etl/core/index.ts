import { EventEmitter } from 'node:events';

// Core ETL Types
export interface ETLContext {
    source: string;
    target: string;
    options?: Record<string, any>;
    metadata?: Record<string, any>;
    data?: any;
}

export interface ETLResult<T = any> {
    data: T;
    metadata: {
        timestamp: Date;
        duration: number;
        source: string;
        target: string;
        stats: {
            processed: number;
            succeeded: number;
            failed: number;
        };
    };
}

// Base ETL Component Interface
export interface ETLComponent {
    id: string;
    version: string;
    validate(context: ETLContext): Promise<boolean>;
    execute(context: ETLContext): Promise<ETLResult>;
}

// Event Types
export interface ETLEvents {
    'etl:start': (context: ETLContext) => void;
    'etl:progress': (progress: number) => void;
    'etl:complete': (result: ETLResult) => void;
    'etl:error': (error: Error) => void;
}

// Base ETL Component Class
export abstract class BaseETLComponent extends EventEmitter implements ETLComponent {
    constructor(
        public readonly id: string,
        public readonly version: string
    ) {
        super();
    }

    abstract validate(context: ETLContext): Promise<boolean>;
    abstract execute(context: ETLContext): Promise<ETLResult>;

    protected emitProgress(progress: number): void {
        this.emit('etl:progress', progress);
    }

    protected emitError(error: Error): void {
        this.emit('etl:error', error);
    }

    protected emitComplete(result: ETLResult): void {
        this.emit('etl:complete', result);
    }
}

// ETL Pipeline Interface
export interface ETLPipeline {
    addComponent(component: ETLComponent): void;
    removeComponent(componentId: string): void;
    execute(context: ETLContext): Promise<ETLResult>;
}

// ETL Pipeline Class
export class Pipeline implements ETLPipeline {
    private components: ETLComponent[] = [];

    constructor(private readonly id: string) {}

    addComponent(component: ETLComponent): void {
        this.components.push(component);
    }

    removeComponent(componentId: string): void {
        this.components = this.components.filter(c => c.id !== componentId);
    }

    async execute(context: ETLContext): Promise<ETLResult> {
        const startTime = Date.now();
        let currentData: any = null;
        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        try {
            for (const component of this.components) {
                // Validate component
                const isValid = await component.validate(context);
                if (!isValid) {
                    throw new Error(`Component ${component.id} validation failed`);
                }

                // Execute component
                const result = await component.execute({
                    ...context,
                    data: currentData
                });

                currentData = result.data;
                processed += result.metadata.stats.processed;
                succeeded += result.metadata.stats.succeeded;
                failed += result.metadata.stats.failed;
            }

            return {
                data: currentData,
                metadata: {
                    timestamp: new Date(),
                    duration: Date.now() - startTime,
                    source: context.source,
                    target: context.target,
                    stats: {
                        processed,
                        succeeded,
                        failed
                    }
                }
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Pipeline execution failed: ${errorMessage}`);
        }
    }
} 