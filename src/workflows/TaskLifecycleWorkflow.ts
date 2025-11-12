/**
 * TaskLifecycleWorkflow - Manage task state transitions and lifecycle
 * 
 * @package     @imajin/cli
 * @subpackage  workflows
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-08-03
 *
 * Integration Points:
 * - Task state transition management
 * - Business rule enforcement during lifecycle
 * - Integration with validation workflow
 * - Event emission for lifecycle tracking
 */

import { EventEmitter } from 'node:events';
import type { TaskEntity } from '../commands/TaskMigrationCommand.js';
import { TaskValidationWorkflow } from './TaskValidationWorkflow.js';

export interface WorkflowContext {
  taskId: string;
  action: string;
  parameters: Record<string, any>;
  user: string;
  timestamp: Date;
}

export interface WorkflowResult {
  success: boolean;
  message?: string;
  errors?: string[];
  warnings?: string[];
  data?: any;
}

export interface TaskStateTransition {
  from: TaskEntity['status'];
  to: TaskEntity['status'];
  allowed: boolean;
  conditions?: string[];
  actions?: string[];
}

export interface TaskLifecycleEvent {
  taskId: string;
  eventType: 'created' | 'updated' | 'status_changed' | 'completed' | 'blocked' | 'validated';
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  user: string;
  metadata?: Record<string, any>;
}

export class TaskLifecycleWorkflow extends EventEmitter {
  private readonly validationWorkflow: TaskValidationWorkflow;
  private readonly transitions: TaskStateTransition[];

  constructor(projectRoot?: string) {
    super();
    this.validationWorkflow = new TaskValidationWorkflow(projectRoot);
    this.transitions = this.defineTransitions();
  }

  /**
   * Execute task lifecycle workflow
   */
  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    try {
      switch (context.action) {
        case 'create':
          return await this.handleTaskCreation(context);
        case 'update':
          return await this.handleTaskUpdate(context);
        case 'transition':
          return await this.handleStatusTransition(context);
        case 'complete':
          return await this.handleTaskCompletion(context);
        case 'validate':
          return await this.handleTaskValidation(context);
        default:
          return {
            success: false,
            errors: [`Unknown action: ${context.action}`]
          };
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Handle task creation workflow
   */
  private async handleTaskCreation(context: WorkflowContext): Promise<WorkflowResult> {
    const { task } = context.parameters as { task: TaskEntity };

    // Step 1: Validate new task
    const validation = await this.validationWorkflow.validateTask(task);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors.map(e => e.message),
        warnings: validation.warnings.map(w => w.message)
      };
    }

    // Step 2: Check dependencies are valid
    const dependencyCheck = await this.checkDependencies(task);
    if (!dependencyCheck.allSatisfied) {
      return {
        success: false,
        errors: [`Dependencies not satisfied: ${dependencyCheck.missing.join(', ')}`]
      };
    }

    // Step 3: Apply business rules
    const businessRuleResult = await this.applyBusinessRules(task, 'create');
    if (!businessRuleResult.success) {
      return businessRuleResult;
    }

    // Step 4: Emit creation event
    this.emitLifecycleEvent({
      taskId: task.id,
      eventType: 'created',
      newValue: task,
      timestamp: new Date(),
      user: context.user
    });

    return {
      success: true,
      message: `Task ${task.id} created successfully`,
      data: task
    };
  }

  /**
   * Handle task update workflow
   */
  private async handleTaskUpdate(context: WorkflowContext): Promise<WorkflowResult> {
    const { taskId, updates, currentTask } = context.parameters as {
      taskId: string;
      updates: Partial<TaskEntity>;
      currentTask: TaskEntity;
    };

    // Step 1: Validate updates
    const updatedTask = { ...currentTask, ...updates, updatedAt: new Date() };
    const validation = await this.validationWorkflow.validateTask(updatedTask);
    
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors.filter(e => e.severity === 'error').map(e => e.message),
        warnings: validation.warnings.map(w => w.message)
      };
    }

    // Step 2: Check if status transition is valid
    if (updates.status && updates.status !== currentTask.status) {
      const transitionResult = await this.validateStatusTransition(
        currentTask.status,
        updates.status,
        updatedTask
      );
      
      if (!transitionResult.success) {
        return transitionResult;
      }
    }

    // Step 3: Apply business rules
    const businessRuleResult = await this.applyBusinessRules(updatedTask, 'update');
    if (!businessRuleResult.success) {
      return businessRuleResult;
    }

    // Step 4: Emit update event
    this.emitLifecycleEvent({
      taskId,
      eventType: 'updated',
      oldValue: currentTask,
      newValue: updatedTask,
      timestamp: new Date(),
      user: context.user
    });

    // Step 5: Emit status change event if status changed
    if (updates.status && updates.status !== currentTask.status) {
      this.emitLifecycleEvent({
        taskId,
        eventType: 'status_changed',
        oldValue: currentTask.status,
        newValue: updates.status,
        timestamp: new Date(),
        user: context.user
      });
    }

    return {
      success: true,
      message: `Task ${taskId} updated successfully`,
      data: updatedTask
    };
  }

  /**
   * Handle status transition workflow
   */
  private async handleStatusTransition(context: WorkflowContext): Promise<WorkflowResult> {
    const { taskId: _taskId, fromStatus, toStatus, task } = context.parameters as {
      taskId: string;
      fromStatus: TaskEntity['status'];
      toStatus: TaskEntity['status'];
      task: TaskEntity;
    };

    return await this.validateStatusTransition(fromStatus, toStatus, task);
  }

  /**
   * Handle task completion workflow
   */
  private async handleTaskCompletion(context: WorkflowContext): Promise<WorkflowResult> {
    const { task } = context.parameters as { task: TaskEntity };

    // Step 1: Verify all dependencies are completed
    const dependencyCheck = await this.checkDependencies(task);
    if (!dependencyCheck.allSatisfied) {
      return {
        success: false,
        errors: [`Cannot complete task with unfinished dependencies: ${dependencyCheck.missing.join(', ')}`]
      };
    }

    // Step 2: Validate completion criteria
    const completionCheck = await this.validateCompletionCriteria(task);
    if (!completionCheck.success) {
      return completionCheck;
    }

    // Step 3: Update task with completion metadata
    const completedTask = {
      ...task,
      status: 'completed' as const,
      completedAt: new Date(),
      updatedAt: new Date()
    };

    // Step 4: Emit completion event
    this.emitLifecycleEvent({
      taskId: task.id,
      eventType: 'completed',
      oldValue: task.status,
      newValue: 'completed',
      timestamp: new Date(),
      user: context.user
    });

    return {
      success: true,
      message: `Task ${task.id} completed successfully`,
      data: completedTask
    };
  }

  /**
   * Handle task validation workflow
   */
  private async handleTaskValidation(context: WorkflowContext): Promise<WorkflowResult> {
    const { task } = context.parameters as { task: TaskEntity };

    const validation = await this.validationWorkflow.validateTask(task);

    // Emit validation event
    this.emitLifecycleEvent({
      taskId: task.id,
      eventType: 'validated',
      newValue: validation,
      timestamp: new Date(),
      user: context.user
    });

    return {
      success: true,
      message: `Task ${task.id} validation completed`,
      data: {
        validation,
        enhancementSuggestions: validation.suggestions
      },
      warnings: validation.warnings.map(w => w.message)
    };
  }

  /**
   * Validate status transition
   */
  private async validateStatusTransition(
    from: TaskEntity['status'],
    to: TaskEntity['status'],
    task: TaskEntity
  ): Promise<WorkflowResult> {
    const transition = this.transitions.find(t => t.from === from && t.to === to);
    
    if (!transition || !transition?.allowed) {
      return {
        success: false,
        errors: [`Invalid status transition from ${from} to ${to}`]
      };
    }

    // Check transition conditions
    if (transition.conditions) {
      for (const condition of transition.conditions) {
        const conditionMet = await this.checkTransitionCondition(condition, task);
        if (!conditionMet) {
          return {
            success: false,
            errors: [`Transition condition not met: ${condition}`]
          };
        }
      }
    }

    return { success: true };
  }

  /**
   * Check task dependencies
   */
  private async checkDependencies(task: TaskEntity): Promise<{
    allSatisfied: boolean;
    missing: string[];
    satisfied: string[];
  }> {
    const missing: string[] = [];
    const satisfied: string[] = [];

    for (const depId of task.dependencies) {
      // In a real implementation, this would check actual dependency status
      // For now, assume dependency exists if it follows the pattern
      const dependencyComplete = await this.isDependencyComplete(depId);
      
      if (dependencyComplete) {
        satisfied.push(depId);
      } else {
        missing.push(depId);
      }
    }

    return {
      allSatisfied: missing.length === 0,
      missing,
      satisfied
    };
  }

  /**
   * Apply business rules
   */
  private async applyBusinessRules(task: TaskEntity, _action: 'create' | 'update'): Promise<WorkflowResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule: Critical priority tasks must have estimated effort
    if (task.priority === 'critical' && !task.estimatedEffort) {
      warnings.push('Critical priority tasks should have estimated effort');
    }

    // Rule: In-progress tasks must have assignee
    if (task.status === 'in_progress' && !task.assignee) {
      warnings.push('In-progress tasks should have an assignee');
    }

    // Rule: Blocked tasks should have blockedBy information
    if (task.status === 'blocked' && (!task.blockedBy || task.blockedBy.length === 0)) {
      warnings.push('Blocked tasks should specify what is blocking them');
    }

    // Rule: Completed tasks must have completion date
    if (task.status === 'completed' && !task.completedAt) {
      errors.push('Completed tasks must have completion timestamp');
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : [],
      warnings: warnings.length > 0 ? warnings : []
    };
  }

  /**
   * Validate completion criteria
   */
  private async validateCompletionCriteria(task: TaskEntity): Promise<WorkflowResult> {
    const errors: string[] = [];

    // Check if task has acceptance criteria in description
    if (!this.hasAcceptanceCriteria(task.description)) {
      errors.push('Task must have clear acceptance criteria before completion');
    }

    // Check if architecture tasks have impact documentation
    if (task.type === 'architecture' && !task.architectureImpact) {
      errors.push('Architecture tasks must document their impact before completion');
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : []
    };
  }

  /**
   * Check transition condition
   */
  private async checkTransitionCondition(condition: string, task: TaskEntity): Promise<boolean> {
    switch (condition) {
      case 'has_assignee':
        return !!task.assignee;
      case 'dependencies_complete': {
        const depCheck = await this.checkDependencies(task);
        return depCheck.allSatisfied;
      }
      case 'has_completion_date':
        return !!task.completedAt;
      default:
        return true;
    }
  }

  /**
   * Check if dependency is complete
   */
  private async isDependencyComplete(depId: string): Promise<boolean> {
    // In a real implementation, this would query the actual task storage
    // For now, assume completed if it's a properly formatted task ID
    return /^task-\d+[a-z]*$/.exec(depId) !== null;
  }

  /**
   * Check if task has acceptance criteria
   */
  private hasAcceptanceCriteria(description: string): boolean {
    const criteriaPatterns = [
      /acceptance criteria/i,
      /success criteria/i,
      /deliverables/i,
      /requirements/i
    ];

    return criteriaPatterns.some(pattern => pattern.test(description));
  }

  /**
   * Emit lifecycle event
   */
  private emitLifecycleEvent(event: TaskLifecycleEvent): void {
    this.emit('task:lifecycle', event);
    this.emit(`task:${event.eventType}`, event);
  }

  /**
   * Define allowed status transitions
   */
  private defineTransitions(): TaskStateTransition[] {
    return [
      // From planned
      { from: 'planned', to: 'in_progress', allowed: true, conditions: ['has_assignee'] },
      { from: 'planned', to: 'blocked', allowed: true },
      { from: 'planned', to: 'deferred', allowed: true },
      
      // From in_progress
      { from: 'in_progress', to: 'completed', allowed: true, conditions: ['dependencies_complete', 'has_completion_date'] },
      { from: 'in_progress', to: 'blocked', allowed: true },
      { from: 'in_progress', to: 'planned', allowed: true },
      
      // From blocked
      { from: 'blocked', to: 'planned', allowed: true },
      { from: 'blocked', to: 'in_progress', allowed: true, conditions: ['has_assignee'] },
      { from: 'blocked', to: 'deferred', allowed: true },
      
      // From deferred
      { from: 'deferred', to: 'planned', allowed: true },
      { from: 'deferred', to: 'in_progress', allowed: true, conditions: ['has_assignee'] },
      
      // From completed (limited transitions)
      { from: 'completed', to: 'in_progress', allowed: true } // Reopening completed tasks
    ];
  }
}