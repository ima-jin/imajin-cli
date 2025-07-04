/**
 * WorkflowOrchestrator - Cross-service workflow orchestration and coordination
 * 
 * @package     @imajin/cli
 * @subpackage  orchestration
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-25
 *
 * @see         docs/orchestration.md
 * 
 * Integration Points:
 * - Event-driven service coordination
 * - Real-time workflow progress tracking
 * - Cross-service data flow management
 * - LLM-friendly workflow introspection
 */

import { EventEmitter } from 'events';
import { Logger } from '../logging/Logger.js';

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
    version: string;
}

export interface WorkflowStep {
    id: string;
    name: string;
    type: string;
    config: any;
    timeout?: number;
    onFailure?: 'stop' | 'continue' | 'retry';
    maxRetries?: number;
    outputKey?: string;
}

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    input: any;
    context: WorkflowContext;
    steps: StepExecution[];
    result?: any;
    error?: string;
    startedAt: Date;
    completedAt?: Date;
    options: {
        timeout: number;
        retries: number;
    };
}

export interface StepExecution {
    stepId: string;
    name: string;
    type: string;
    status: 'running' | 'completed' | 'failed';
    result?: StepResult;
    error?: string;
    startedAt: Date;
    completedAt?: Date;
    retries?: number;
}

export interface WorkflowContext {
    data: any;
    variables: Record<string, any>;
}

export interface StepResult {
    success: boolean;
    output?: any;
    metadata?: any;
}

export type WorkflowStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export class WorkflowOrchestrator extends EventEmitter {
    private workflows: Map<string, Workflow> = new Map();
    private executions: Map<string, WorkflowExecution> = new Map();
    private logger: Logger;
    private stepProcessors: Map<string, (step: WorkflowStep, context: WorkflowContext) => Promise<StepResult>> = new Map();

    constructor(logger: Logger) {
        super();
        this.logger = logger;
        this.registerBuiltInProcessors();
    }

    /**
     * Register a workflow definition
     */
    public registerWorkflow(workflow: Workflow): void {
        this.workflows.set(workflow.id, workflow);
        this.logger.info(`Registered workflow: ${workflow.name}`, { workflowId: workflow.id });
    }

    /**
     * Register a step processor
     */
    public registerStepProcessor(
        stepType: string,
        processor: (step: WorkflowStep, context: WorkflowContext) => Promise<StepResult>
    ): void {
        this.stepProcessors.set(stepType, processor);
        this.logger.info(`Registered step processor: ${stepType}`);
    }

    /**
     * Execute a workflow
     */
    public async executeWorkflow(
        workflowId: string,
        input: any = {},
        options: { timeout?: number; retries?: number } = {}
    ): Promise<WorkflowExecution> {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        const executionId = this.generateExecutionId();
        const execution: WorkflowExecution = {
            id: executionId,
            workflowId,
            status: 'running',
            input,
            context: { data: input, variables: {} },
            steps: [],
            startedAt: new Date(),
            options: {
                timeout: options.timeout || 300000, // 5 minutes default
                retries: options.retries || 0,
            },
        };

        this.executions.set(executionId, execution);
        this.logger.info(`Starting workflow execution`, { workflowId, executionId });

        // Emit workflow started event
        this.emit('workflow:started', { executionId, workflowId, input });

        try {
            // Execute workflow steps
            await this.executeSteps(workflow, execution);

            execution.status = 'completed';
            execution.completedAt = new Date();

            this.logger.info(`Workflow completed successfully`, { workflowId, executionId });
            this.emit('workflow:completed', { executionId, workflowId, result: execution.result });

        } catch (error) {
            execution.status = 'failed';
            execution.error = error instanceof Error ? error.message : String(error);
            execution.completedAt = new Date();

            this.logger.error(`Workflow failed`, error instanceof Error ? error : new Error(String(error)), {
                workflowId,
                executionId
            });
            this.emit('workflow:failed', { executionId, workflowId, error: execution.error });
        }

        return execution;
    }

    /**
     * Get workflow execution status
     */
    public getExecution(executionId: string): WorkflowExecution | undefined {
        return this.executions.get(executionId);
    }

    /**
     * List all workflow executions
     */
    public listExecutions(status?: WorkflowStatus): WorkflowExecution[] {
        const executions = Array.from(this.executions.values());
        return status ? executions.filter(e => e.status === status) : executions;
    }

    /**
     * Cancel a running workflow execution
     */
    public async cancelExecution(executionId: string): Promise<boolean> {
        const execution = this.executions.get(executionId);
        if (!execution || execution.status !== 'running') {
            return false;
        }

        execution.status = 'cancelled';
        execution.completedAt = new Date();

        this.logger.info(`Workflow cancelled`, { executionId });
        this.emit('workflow:cancelled', { executionId });

        return true;
    }

    /**
     * Get workflow definition
     */
    public getWorkflow(workflowId: string): Workflow | undefined {
        return this.workflows.get(workflowId);
    }

    /**
     * List all registered workflows
     */
    public listWorkflows(): Workflow[] {
        return Array.from(this.workflows.values());
    }

    /**
     * Execute workflow steps sequentially
     */
    private async executeSteps(workflow: Workflow, execution: WorkflowExecution): Promise<void> {
        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];

            // Ensure step exists
            if (!step) {
                throw new Error(`Step at index ${i} is undefined`);
            }

            // Check if execution was cancelled
            if (execution.status === 'cancelled') {
                throw new Error('Workflow execution was cancelled');
            }

            this.logger.info(`Executing step: ${step.name}`, {
                workflowId: workflow.id,
                executionId: execution.id,
                stepIndex: i
            });

            const stepExecution: StepExecution = {
                stepId: step.id,
                name: step.name,
                type: step.type,
                status: 'running',
                startedAt: new Date(),
            };

            execution.steps.push(stepExecution);

            // Emit step started event
            this.emit('step:started', {
                executionId: execution.id,
                stepId: step.id,
                stepName: step.name
            });

            try {
                // Execute the step
                const result = await this.executeStep(step, execution.context);

                stepExecution.status = 'completed';
                stepExecution.result = result;
                stepExecution.completedAt = new Date();

                // Update workflow context with step result
                if (result.output) {
                    execution.context.data = { ...execution.context.data, ...result.output };
                }

                this.logger.info(`Step completed: ${step.name}`, {
                    workflowId: workflow.id,
                    executionId: execution.id,
                    stepIndex: i
                });

                this.emit('step:completed', {
                    executionId: execution.id,
                    stepId: step.id,
                    result: result.output
                });

            } catch (error) {
                stepExecution.status = 'failed';
                stepExecution.error = error instanceof Error ? error.message : String(error);
                stepExecution.completedAt = new Date();

                this.logger.error(`Step failed: ${step.name}`, error instanceof Error ? error : new Error(String(error)), {
                    workflowId: workflow.id,
                    executionId: execution.id,
                    stepIndex: i
                });

                this.emit('step:failed', {
                    executionId: execution.id,
                    stepId: step.id,
                    error: stepExecution.error
                });

                // Handle step failure based on step configuration
                if (step.onFailure === 'stop') {
                    throw error;
                } else if (step.onFailure === 'continue') {
                    this.logger.warn(`Continuing workflow despite step failure: ${step.name}`);
                    continue;
                } else if (step.onFailure === 'retry' && (stepExecution.retries || 0) < (step.maxRetries || 0)) {
                    stepExecution.retries = (stepExecution.retries || 0) + 1;
                    this.logger.info(`Retrying step: ${step.name}`, {
                        attempt: stepExecution.retries,
                        maxRetries: step.maxRetries
                    });
                    i--; // Retry the same step
                    continue;
                } else {
                    throw error;
                }
            }
        }

        // Set final workflow result
        execution.result = execution.context.data;
    }

    /**
     * Execute a single workflow step
     */
    private async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
        const processor = this.stepProcessors.get(step.type);
        if (!processor) {
            throw new Error(`No processor registered for step type: ${step.type}`);
        }

        // Apply step timeout if specified
        const timeout = step.timeout || 60000; // 1 minute default

        return Promise.race([
            processor(step, context),
            new Promise<StepResult>((_, reject) =>
                setTimeout(() => reject(new Error(`Step timeout: ${step.name}`)), timeout)
            )
        ]);
    }

    /**
     * Register built-in step processors
     */
    private registerBuiltInProcessors(): void {
        // HTTP Request step processor
        this.registerStepProcessor('http', async (step, context) => {
            const { method = 'GET', url, headers = {}, body } = step.config;

            // Replace variables in URL and body
            const processedUrl = this.replaceVariables(url, context);
            const processedBody = body ? this.replaceVariables(JSON.stringify(body), context) : undefined;

            const fetchOptions: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                }
            };

            if (processedBody) {
                fetchOptions.body = processedBody;
            }

            const response = await fetch(processedUrl, fetchOptions);

            if (!response.ok) {
                throw new Error(`HTTP request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                output: { [step.outputKey || 'response']: data },
                metadata: {
                    statusCode: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                },
            };
        });

        // Delay step processor
        this.registerStepProcessor('delay', async (step, _context) => {
            const delay = step.config.duration || 1000;
            await new Promise(resolve => setTimeout(resolve, delay));

            return {
                success: true,
                output: { delayed: delay },
            };
        });

        // Transform data step processor
        this.registerStepProcessor('transform', async (step, context) => {
            const { source, target, transformation } = step.config;
            const sourceData = this.getNestedValue(context.data, source);

            let transformedData = sourceData;

            // Apply transformation based on type
            switch (transformation.type) {
                case 'map':
                    if (Array.isArray(sourceData)) {
                        transformedData = sourceData.map(item =>
                            this.applyMapping(item, transformation.mapping)
                        );
                    } else {
                        transformedData = this.applyMapping(sourceData, transformation.mapping);
                    }
                    break;

                case 'filter':
                    if (Array.isArray(sourceData)) {
                        transformedData = sourceData.filter(item =>
                            this.evaluateCondition(item, transformation.condition)
                        );
                    }
                    break;

                case 'aggregate':
                    if (Array.isArray(sourceData)) {
                        transformedData = this.aggregateData(sourceData, transformation.operation);
                    }
                    break;
            }

            return {
                success: true,
                output: { [target]: transformedData },
            };
        });

        // Conditional step processor
        this.registerStepProcessor('condition', async (step, context) => {
            const { condition, trueValue, falseValue } = step.config;
            const result = this.evaluateCondition(context.data, condition);

            return {
                success: true,
                output: {
                    conditionResult: result,
                    value: result ? trueValue : falseValue
                },
            };
        });
    }

    /**
     * Replace variables in a string with context values
     */
    private replaceVariables(template: string, context: WorkflowContext): string {
        return template.replace(/{{([^}]+)}}/g, (match, path) => {
            const value = this.getNestedValue(context.data, path.trim());
            return value !== undefined ? String(value) : match;
        });
    }

    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Apply mapping transformation to data
     */
    private applyMapping(data: any, mapping: Record<string, string>): any {
        const result: any = {};

        for (const [targetKey, sourcePath] of Object.entries(mapping)) {
            result[targetKey] = this.getNestedValue(data, sourcePath);
        }

        return result;
    }

    /**
     * Evaluate a condition against data
     */
    private evaluateCondition(data: any, condition: any): boolean {
        const { field, operator, value } = condition;
        const fieldValue = this.getNestedValue(data, field);

        switch (operator) {
            case 'eq': return fieldValue === value;
            case 'ne': return fieldValue !== value;
            case 'gt': return fieldValue > value;
            case 'gte': return fieldValue >= value;
            case 'lt': return fieldValue < value;
            case 'lte': return fieldValue <= value;
            case 'contains': return String(fieldValue).includes(value);
            case 'exists': return fieldValue !== undefined && fieldValue !== null;
            default: return false;
        }
    }

    /**
     * Aggregate array data
     */
    private aggregateData(data: any[], operation: any): any {
        const { type, field } = operation;

        switch (type) {
            case 'count':
                return data.length;
            case 'sum':
                return data.reduce((sum, item) => sum + (this.getNestedValue(item, field) || 0), 0);
            case 'avg': {
                const sum = data.reduce((sum, item) => sum + (this.getNestedValue(item, field) || 0), 0);
                return data.length > 0 ? sum / data.length : 0;
            }
            case 'min':
                return Math.min(...data.map(item => this.getNestedValue(item, field) || 0));
            case 'max':
                return Math.max(...data.map(item => this.getNestedValue(item, field) || 0));
            default:
                return data;
        }
    }

    /**
     * Generate unique execution ID
     */
    private generateExecutionId(): string {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up completed executions
     */
    public cleanupExecutions(maxAge: number = 24 * 60 * 60 * 1000): void {
        const cutoff = new Date(Date.now() - maxAge);

        for (const [id, execution] of this.executions) {
            if (execution.completedAt && execution.completedAt < cutoff) {
                this.executions.delete(id);
            }
        }

        this.logger.info('Cleaned up old workflow executions');
    }
} 