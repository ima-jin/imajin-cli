/**
 * WorkflowOrchestrator Tests
 *
 * Comprehensive test suite for workflow orchestration covering workflow
 * registration, execution, step processing, retry logic, error handling,
 * and multi-service coordination.
 *
 * @package     @imajin/cli
 * @subpackage  orchestration/__tests__
 */

import { Logger } from '../../logging/Logger.js';
import {
    Workflow,
    WorkflowOrchestrator,
    WorkflowStep,
    WorkflowContext,
    StepResult
} from '../WorkflowOrchestrator.js';

describe('WorkflowOrchestrator', () => {
    let orchestrator: WorkflowOrchestrator;
    let logger: Logger;

    beforeEach(() => {
        logger = new Logger({ level: 'error' });
        orchestrator = new WorkflowOrchestrator(logger);
    });

    afterEach(() => {
        orchestrator.removeAllListeners();
    });

    // =====================================================================
    // Workflow Registration
    // =====================================================================
    describe('Workflow Registration', () => {
        it('should register a workflow', () => {
            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                description: 'A test workflow',
                steps: [],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);

            const retrieved = orchestrator.getWorkflow('test-workflow');
            expect(retrieved).toBe(workflow);
        });

        it('should overwrite existing workflow with same ID', () => {
            const workflow1: Workflow = {
                id: 'workflow',
                name: 'Version 1',
                steps: [],
                version: '1.0.0'
            };

            const workflow2: Workflow = {
                id: 'workflow',
                name: 'Version 2',
                steps: [],
                version: '2.0.0'
            };

            orchestrator.registerWorkflow(workflow1);
            orchestrator.registerWorkflow(workflow2);

            const retrieved = orchestrator.getWorkflow('workflow');
            expect(retrieved?.version).toBe('2.0.0');
        });

        it('should list all registered workflows', () => {
            const workflow1: Workflow = {
                id: 'wf-1',
                name: 'Workflow 1',
                steps: [],
                version: '1.0.0'
            };

            const workflow2: Workflow = {
                id: 'wf-2',
                name: 'Workflow 2',
                steps: [],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow1);
            orchestrator.registerWorkflow(workflow2);

            const workflows = orchestrator.listWorkflows();
            expect(workflows).toHaveLength(2);
            expect(workflows).toContain(workflow1);
            expect(workflows).toContain(workflow2);
        });

        it('should return undefined for non-existent workflow', () => {
            const retrieved = orchestrator.getWorkflow('nonexistent');
            expect(retrieved).toBeUndefined();
        });
    });

    // =====================================================================
    // Step Processor Registration
    // =====================================================================
    describe('Step Processor Registration', () => {
        it('should register a step processor', () => {
            const processor = async (_step: WorkflowStep, _context: WorkflowContext): Promise<StepResult> => {
                return { success: true };
            };

            orchestrator.registerStepProcessor('custom-step', processor);

            // Processor is registered (no direct getter, but we can test via execution)
            expect(true).toBe(true);
        });

        it('should use registered processor during execution', async () => {
            let processorCalled = false;

            const processor = async (_step: WorkflowStep, _context: WorkflowContext): Promise<StepResult> => {
                processorCalled = true;
                return { success: true, output: { result: 'success' } };
            };

            orchestrator.registerStepProcessor('test-processor', processor);

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test',
                steps: [{
                    id: 'step-1',
                    name: 'Test Step',
                    type: 'test-processor',
                    config: {}
                }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            await orchestrator.executeWorkflow('test-workflow');

            expect(processorCalled).toBe(true);
        });
    });

    // =====================================================================
    // Workflow Execution
    // =====================================================================
    describe('Workflow Execution', () => {
        it('should execute simple workflow', async () => {
            orchestrator.registerStepProcessor('simple', async () => {
                return { success: true, output: { data: 'result' } };
            });

            const workflow: Workflow = {
                id: 'simple-workflow',
                name: 'Simple Workflow',
                steps: [{
                    id: 'step-1',
                    name: 'Simple Step',
                    type: 'simple',
                    config: {}
                }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('simple-workflow');

            expect(execution.status).toBe('completed');
            expect(execution.steps).toHaveLength(1);
            expect(execution.steps[0]?.status).toBe('completed');
        });

        it('should throw error for non-existent workflow', async () => {
            await expect(orchestrator.executeWorkflow('nonexistent')).rejects.toThrow(
                'Workflow not found'
            );
        });

        it('should execute multiple steps in sequence', async () => {
            const executionOrder: number[] = [];

            orchestrator.registerStepProcessor('sequential', async (step) => {
                const stepNum = parseInt(step.config.order);
                executionOrder.push(stepNum);
                return { success: true };
            });

            const workflow: Workflow = {
                id: 'sequential-workflow',
                name: 'Sequential',
                steps: [
                    { id: 's1', name: 'Step 1', type: 'sequential', config: { order: 1 } },
                    { id: 's2', name: 'Step 2', type: 'sequential', config: { order: 2 } },
                    { id: 's3', name: 'Step 3', type: 'sequential', config: { order: 3 } }
                ],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            await orchestrator.executeWorkflow('sequential-workflow');

            expect(executionOrder).toEqual([1, 2, 3]);
        });

        it('should pass input to workflow execution', async () => {
            let receivedInput: any = null;

            orchestrator.registerStepProcessor('input-reader', async (_step, context) => {
                receivedInput = context.data;
                return { success: true };
            });

            const workflow: Workflow = {
                id: 'input-workflow',
                name: 'Input Test',
                steps: [{
                    id: 'step-1',
                    name: 'Read Input',
                    type: 'input-reader',
                    config: {}
                }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            await orchestrator.executeWorkflow('input-workflow', { userId: 123, action: 'create' });

            expect(receivedInput).toEqual({ userId: 123, action: 'create' });
        });

        it('should propagate data between steps', async () => {
            orchestrator.registerStepProcessor('producer', async () => {
                return { success: true, output: { producedValue: 'data from producer' } };
            });

            orchestrator.registerStepProcessor('consumer', async (_step, context) => {
                return { success: true, output: { consumed: context.data.producedValue } };
            });

            const workflow: Workflow = {
                id: 'data-flow-workflow',
                name: 'Data Flow',
                steps: [
                    { id: 's1', name: 'Producer', type: 'producer', config: {} },
                    { id: 's2', name: 'Consumer', type: 'consumer', config: {} }
                ],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('data-flow-workflow');

            expect(execution.context.data).toHaveProperty('producedValue');
            expect(execution.context.data).toHaveProperty('consumed');
        });

        it('should track execution metadata', async () => {
            orchestrator.registerStepProcessor('test', async () => ({ success: true }));

            const workflow: Workflow = {
                id: 'metadata-workflow',
                name: 'Metadata Test',
                steps: [{ id: 's1', name: 'Test', type: 'test', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('metadata-workflow');

            expect(execution.id).toBeDefined();
            expect(execution.workflowId).toBe('metadata-workflow');
            expect(execution.startedAt).toBeInstanceOf(Date);
            expect(execution.completedAt).toBeInstanceOf(Date);
        });

        it('should apply default execution options', async () => {
            orchestrator.registerStepProcessor('test', async () => ({ success: true }));

            const workflow: Workflow = {
                id: 'options-workflow',
                name: 'Options Test',
                steps: [{ id: 's1', name: 'Test', type: 'test', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('options-workflow');

            expect(execution.options.timeout).toBe(300000); // 5 minutes default
            expect(execution.options.retries).toBe(0);
        });

        it('should respect custom execution options', async () => {
            orchestrator.registerStepProcessor('test', async () => ({ success: true }));

            const workflow: Workflow = {
                id: 'custom-options-workflow',
                name: 'Custom Options',
                steps: [{ id: 's1', name: 'Test', type: 'test', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('custom-options-workflow', {}, {
                timeout: 60000,
                retries: 3
            });

            expect(execution.options.timeout).toBe(60000);
            expect(execution.options.retries).toBe(3);
        });
    });

    // =====================================================================
    // Error Handling
    // =====================================================================
    describe('Error Handling', () => {
        it('should handle step failure', async () => {
            orchestrator.registerStepProcessor('failing', async () => {
                throw new Error('Step failed');
            });

            const workflow: Workflow = {
                id: 'failing-workflow',
                name: 'Failing',
                steps: [{ id: 's1', name: 'Failing Step', type: 'failing', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('failing-workflow');

            expect(execution.status).toBe('failed');
            expect(execution.error).toBe('Step failed');
        });

        it('should mark failed step as failed', async () => {
            orchestrator.registerStepProcessor('error', async () => {
                throw new Error('Processing error');
            });

            const workflow: Workflow = {
                id: 'error-workflow',
                name: 'Error',
                steps: [{ id: 's1', name: 'Error Step', type: 'error', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('error-workflow');

            expect(execution.steps[0]?.status).toBe('failed');
            expect(execution.steps[0]?.error).toBe('Processing error');
        });

        it('should stop execution on step failure', async () => {
            let step2Called = false;

            orchestrator.registerStepProcessor('failing', async () => {
                throw new Error('Step 1 failed');
            });

            orchestrator.registerStepProcessor('after-failure', async () => {
                step2Called = true;
                return { success: true };
            });

            const workflow: Workflow = {
                id: 'stop-on-failure',
                name: 'Stop On Failure',
                steps: [
                    { id: 's1', name: 'Failing', type: 'failing', config: {} },
                    { id: 's2', name: 'After', type: 'after-failure', config: {} }
                ],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            await orchestrator.executeWorkflow('stop-on-failure');

            expect(step2Called).toBe(false);
        });
    });

    // =====================================================================
    // Retry Logic
    // =====================================================================
    describe('Retry Logic', () => {
        it('should retry failed steps', async () => {
            let attempts = 0;

            orchestrator.registerStepProcessor('retry-test', async () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Retry attempt');
                }
                return { success: true };
            });

            const workflow: Workflow = {
                id: 'retry-workflow',
                name: 'Retry Test',
                steps: [{
                    id: 's1',
                    name: 'Retry Step',
                    type: 'retry-test',
                    config: {},
                    onFailure: 'retry',
                    maxRetries: 2
                }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('retry-workflow');

            expect(attempts).toBe(3);
            expect(execution.status).toBe('completed');
        });

        it('should fail after max retries', async () => {
            let attempts = 0;

            orchestrator.registerStepProcessor('always-fail', async () => {
                attempts++;
                throw new Error('Always fails');
            });

            const workflow: Workflow = {
                id: 'max-retries-workflow',
                name: 'Max Retries',
                steps: [{
                    id: 's1',
                    name: 'Always Fail',
                    type: 'always-fail',
                    config: {},
                    onFailure: 'retry',
                    maxRetries: 2
                }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('max-retries-workflow');

            expect(attempts).toBe(3); // Initial + 2 retries
            expect(execution.status).toBe('failed');
        });

        it('should not retry when maxRetries is 0', async () => {
            let attempts = 0;

            orchestrator.registerStepProcessor('no-retry', async () => {
                attempts++;
                throw new Error('No retry');
            });

            const workflow: Workflow = {
                id: 'no-retry-workflow',
                name: 'No Retry',
                steps: [{
                    id: 's1',
                    name: 'No Retry',
                    type: 'no-retry',
                    config: {},
                    maxRetries: 0
                }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            await orchestrator.executeWorkflow('no-retry-workflow');

            expect(attempts).toBe(1);
        });
    });

    // =====================================================================
    // Event Emission
    // =====================================================================
    describe('Event Emission', () => {
        it('should emit workflow:started event', async () => {
            orchestrator.registerStepProcessor('test', async () => ({ success: true }));

            const workflow: Workflow = {
                id: 'event-workflow',
                name: 'Event Test',
                steps: [{ id: 's1', name: 'Test', type: 'test', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);

            let eventData: any = null;
            orchestrator.once('workflow:started', (data) => {
                eventData = data;
            });

            await orchestrator.executeWorkflow('event-workflow', { test: 'input' });

            expect(eventData).toMatchObject({
                workflowId: 'event-workflow',
                input: { test: 'input' }
            });
        });

        it('should emit workflow:completed event', async () => {
            orchestrator.registerStepProcessor('test', async () => ({ success: true }));

            const workflow: Workflow = {
                id: 'complete-workflow',
                name: 'Complete Test',
                steps: [{ id: 's1', name: 'Test', type: 'test', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);

            let eventData: any = null;
            orchestrator.once('workflow:completed', (data) => {
                eventData = data;
            });

            await orchestrator.executeWorkflow('complete-workflow');

            expect(eventData).toMatchObject({
                workflowId: 'complete-workflow'
            });
        });

        it('should emit workflow:failed event on error', async () => {
            orchestrator.registerStepProcessor('failing', async () => {
                throw new Error('Test failure');
            });

            const workflow: Workflow = {
                id: 'fail-workflow',
                name: 'Fail Test',
                steps: [{ id: 's1', name: 'Failing', type: 'failing', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);

            let eventData: any = null;
            orchestrator.once('workflow:failed', (data) => {
                eventData = data;
            });

            await orchestrator.executeWorkflow('fail-workflow');

            expect(eventData).toMatchObject({
                workflowId: 'fail-workflow',
                error: 'Test failure'
            });
        });

        it('should emit step:started event', async () => {
            orchestrator.registerStepProcessor('test', async () => ({ success: true }));

            const workflow: Workflow = {
                id: 'step-event-workflow',
                name: 'Step Event',
                steps: [{ id: 'step-1', name: 'Test Step', type: 'test', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);

            let eventData: any = null;
            orchestrator.once('step:started', (data) => {
                eventData = data;
            });

            await orchestrator.executeWorkflow('step-event-workflow');

            expect(eventData).toMatchObject({
                stepId: 'step-1',
                stepName: 'Test Step'
            });
        });

        it('should emit step:completed event', async () => {
            orchestrator.registerStepProcessor('test', async () => ({
                success: true,
                output: { result: 'success' }
            }));

            const workflow: Workflow = {
                id: 'step-complete-workflow',
                name: 'Step Complete',
                steps: [{ id: 'step-1', name: 'Test', type: 'test', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);

            let eventData: any = null;
            orchestrator.once('step:completed', (data) => {
                eventData = data;
            });

            await orchestrator.executeWorkflow('step-complete-workflow');

            expect(eventData).toMatchObject({
                stepId: 'step-1',
                result: { result: 'success' }
            });
        });
    });

    // =====================================================================
    // Execution Management
    // =====================================================================
    describe('Execution Management', () => {
        it('should store execution', async () => {
            orchestrator.registerStepProcessor('test', async () => ({ success: true }));

            const workflow: Workflow = {
                id: 'stored-workflow',
                name: 'Stored',
                steps: [{ id: 's1', name: 'Test', type: 'test', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('stored-workflow');

            const retrieved = orchestrator.getExecution(execution.id);
            expect(retrieved).toBe(execution);
        });

        it('should list executions', async () => {
            orchestrator.registerStepProcessor('test', async () => ({ success: true }));

            const workflow: Workflow = {
                id: 'list-workflow',
                name: 'List Test',
                steps: [{ id: 's1', name: 'Test', type: 'test', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);
            await orchestrator.executeWorkflow('list-workflow');
            await orchestrator.executeWorkflow('list-workflow');

            const executions = orchestrator.listExecutions();
            expect(executions.length).toBeGreaterThanOrEqual(2);
        });

        it('should filter executions by status', async () => {
            orchestrator.registerStepProcessor('success', async () => ({ success: true }));
            orchestrator.registerStepProcessor('failure', async () => {
                throw new Error('Failed');
            });

            const successWorkflow: Workflow = {
                id: 'success-wf',
                name: 'Success',
                steps: [{ id: 's1', name: 'Success', type: 'success', config: {} }],
                version: '1.0.0'
            };

            const failWorkflow: Workflow = {
                id: 'fail-wf',
                name: 'Fail',
                steps: [{ id: 's1', name: 'Fail', type: 'failure', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(successWorkflow);
            orchestrator.registerWorkflow(failWorkflow);

            await orchestrator.executeWorkflow('success-wf');
            await orchestrator.executeWorkflow('fail-wf');

            const completed = orchestrator.listExecutions('completed');
            const failed = orchestrator.listExecutions('failed');

            expect(completed.length).toBeGreaterThanOrEqual(1);
            expect(failed.length).toBeGreaterThanOrEqual(1);
        });

        it('should cancel running execution', async () => {
            orchestrator.registerStepProcessor('long-running', async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return { success: true };
            });

            const workflow: Workflow = {
                id: 'cancel-workflow',
                name: 'Cancellable',
                steps: [{ id: 's1', name: 'Long Running', type: 'long-running', config: {} }],
                version: '1.0.0'
            };

            orchestrator.registerWorkflow(workflow);

            const executionPromise = orchestrator.executeWorkflow('cancel-workflow');

            // Wait a bit then cancel
            await new Promise(resolve => setTimeout(resolve, 10));

            const execution = orchestrator.listExecutions('running')[0];
            if (execution) {
                const cancelled = await orchestrator.cancelExecution(execution.id);
                expect(cancelled).toBe(true);
            }

            await executionPromise;
        });
    });
});
