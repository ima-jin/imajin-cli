/**
 * EventSystemExample - Example usage of the event-driven system
 * 
 * @package     @imajin/cli
 * @subpackage  core/events/examples
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * This example demonstrates:
 * - Event manager initialization
 * - Event listener registration
 * - Command execution with events
 * - Progress tracking
 * - Error handling
 */

import { BaseCommand } from '../../commands/BaseCommand.js';
import { EventManager, SystemEventType, type IEventListener } from '../index.js';

/**
 * Example command that demonstrates event emission
 */
class ExampleCommand extends BaseCommand {
    public readonly name = 'example';
    public readonly description = 'Example command with event tracking';

    public async execute(args: any[], options: any): Promise<any> {
        // Simulate a multi-step process with progress tracking
        const steps = ['Initializing', 'Processing', 'Validating', 'Completing'];

        for (let i = 0; i < steps.length; i++) {
            await this.emitProgress(steps[i]!, i + 1, steps.length, `Step ${i + 1} of ${steps.length}`);

            // Simulate work
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Simulate potential error
            if (options.simulateError && i === 2) {
                const error = new Error('Simulated error during validation');
                await this.emitError(error, { step: steps[i] }, 'medium');
                throw error;
            }
        }

        return { success: true, message: 'Command completed successfully' };
    }
}

/**
 * Example event listener for progress tracking
 */
class ProgressTracker implements IEventListener {
    public readonly name = 'ProgressTracker';
    public readonly eventType = SystemEventType.PROGRESS_UPDATED;

    public async handle(event: any): Promise<void> {
        const { step, percent, message } = event.payload;
        console.log(`📊 Progress: ${step} (${percent}%) - ${message || ''}`);
    }
}

/**
 * Example event listener for error handling
 */
class ErrorHandler implements IEventListener {
    public readonly name = 'ErrorHandler';
    public readonly eventType = SystemEventType.ERROR_OCCURRED;

    public async handle(event: any): Promise<void> {
        const { error, severity, context } = event.payload;
        console.error(`🚨 [${severity.toUpperCase()}] Error: ${error.message}`);
        if (context) {
            console.error('Context:', context);
        }
    }
}

/**
 * Example event listener for command lifecycle
 */
class CommandLifecycleLogger implements IEventListener {
    public readonly name = 'CommandLifecycleLogger';
    public readonly eventType = SystemEventType.COMMAND_STARTED;

    public async handle(event: any): Promise<void> {
        const { commandName } = event.payload;
        console.log(`🚀 Command started: ${commandName}`);
    }
}

/**
 * Run the event system example
 */
export async function runEventSystemExample(): Promise<void> {
    console.log('🎯 Event System Example\n');

    // 1. Create and initialize event manager
    const eventManager = new EventManager({
        enableMetrics: true,
        enableDeadLetterQueue: true,
        retryAttempts: 2
    });

    await eventManager.initialize();
    console.log('✅ Event manager initialized\n');

    // 2. Register event listeners
    const progressTracker = new ProgressTracker();
    const errorHandler = new ErrorHandler();
    const lifecycleLogger = new CommandLifecycleLogger();

    eventManager.registerListener(progressTracker);
    eventManager.registerListener(errorHandler);
    eventManager.registerListener(lifecycleLogger);

    // Also register for command completion
    eventManager.registerListener({
        name: 'CommandCompletedLogger',
        eventType: SystemEventType.COMMAND_COMPLETED,
        handle: async (event) => {
            const { commandName, duration } = event.payload;
            console.log(`✅ Command completed: ${commandName} (${duration}ms)\n`);
        }
    });

    eventManager.registerListener({
        name: 'CommandFailedLogger',
        eventType: SystemEventType.COMMAND_FAILED,
        handle: async (event) => {
            const { commandName, duration, error } = event.payload;
            console.log(`❌ Command failed: ${commandName} (${duration}ms) - ${error.message}\n`);
        }
    });

    console.log('✅ Event listeners registered\n');

    // 3. Create command with event manager
    const command = new ExampleCommand(undefined, eventManager);

    // 4. Execute command successfully
    console.log('--- Executing command successfully ---');
    try {
        const result = await command.executeWithEvents([], { simulateError: false });
        console.log('Result:', result);
    } catch (error) {
        console.error('Command execution failed:', error);
    }

    console.log('\n--- Executing command with error ---');
    // 5. Execute command with error
    try {
        await command.executeWithEvents([], { simulateError: true });
    } catch (error) {
        console.log('Expected error caught:', (error as Error).message);
    }

    // 6. Show metrics
    console.log('\n--- Event Metrics ---');
    const metrics = eventManager.getMetrics().getSummary();
    console.log('Total emissions:', metrics.totalEmissions);
    console.log('Average execution time:', `${metrics.averageExecutionTime.toFixed(2)}ms`);
    console.log('Success rate:', `${metrics.successRate.toFixed(1)}%`);
    console.log('Event types:', metrics.eventTypes);

    // 7. Show registrations
    console.log('\n--- Registered Listeners ---');
    const registrations = eventManager.getRegistrations();
    for (const reg of registrations) {
        console.log(`- ${reg.listener.name} (${reg.eventType})`);
    }

    // 8. Cleanup
    await eventManager.shutdown();
    console.log('\n✅ Event manager shutdown complete');
}

// Run example if this file is executed directly
// Note: This would work in ES2020+ modules
// if (import.meta.url === `file://${process.argv[1]}`) {
//     runEventSystemExample().catch(console.error);
// } 