/**
 * TaskManagementCommands - CLI commands for task management
 * 
 * @package     @imajin/cli
 * @subpackage  commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-08-03
 *
 * Integration Points:
 * - Task lifecycle management and validation
 * - Business context integration
 * - CLI command interface for task operations
 * - Integration with workflows and validation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import * as yaml from 'js-yaml';
import { TaskLifecycleWorkflow } from '../workflows/TaskLifecycleWorkflow.js';
import { TaskValidationWorkflow } from '../workflows/TaskValidationWorkflow.js';
import type { TaskEntity } from './TaskMigrationCommand.js';
import type { Logger } from '../logging/Logger.js';
import { Container } from '../container/Container.js';
import { CommonOptions } from '../utils/commonOptions.js';
import { generateTaskId } from '../utils/secureRandom.js';

export class TaskManagementCommands {
  private readonly contextsDir: string;
  private readonly lifecycleWorkflow: TaskLifecycleWorkflow;
  private readonly validationWorkflow: TaskValidationWorkflow;
  private readonly logger: Logger;

  constructor() {
    this.contextsDir = join(homedir(), '.imajin', 'contexts');
    this.lifecycleWorkflow = new TaskLifecycleWorkflow();
    this.validationWorkflow = new TaskValidationWorkflow();

    // Inject logger from container
    const container = (globalThis as any).imajinApp?.container || new Container();
    this.logger = container.resolve('logger') as Logger;
  }

  public register(program: Command): void {
    const taskCommand = program
      .command('task')
      .description('Task management and lifecycle commands');

    // Task creation
    taskCommand
      .command('create')
      .description('Create a new task')
      .option('-t, --title <title>', 'Task title')
      .option('-d, --description <description>', 'Task description')
      .option('-p, --priority <priority>', 'Task priority (low, medium, high, critical)', 'medium')
      .option('--type <type>', 'Task type (feature, bug, refactor, architecture, documentation, testing)')
      .option('--assignee <assignee>', 'Task assignee')
      .option('--deps <deps>', 'Comma-separated list of dependency task IDs')
      .option('--context <context>', 'Context name', 'project-management')
      .action(async (options) => {
        await this.createTask(options);
      });

    // Task listing
    taskCommand
      .command('list')
      .alias('ls')
      .description('List tasks')
      .option('-s, --status <status>', 'Filter by status')
      .option('-p, --priority <priority>', 'Filter by priority')
      .option('-a, --assignee <assignee>', 'Filter by assignee')
      .option('--context <context>', 'Context name', 'project-management')
      .addOption(CommonOptions.format())
      .action(async (options) => {
        await this.listTasks(options);
      });

    // Task status update
    taskCommand
      .command('status')
      .description('Update task status')
      .argument('<taskId>', 'Task ID')
      .argument('<status>', 'New status (planned, in_progress, completed, deferred, blocked)')
      .option('--context <context>', 'Context name', 'project-management')
      .action(async (taskId, status, options) => {
        await this.updateTaskStatus(taskId, status, options);
      });

    // Task validation
    taskCommand
      .command('validate')
      .description('Validate task against current codebase')
      .argument('<taskId>', 'Task ID to validate')
      .option('--context <context>', 'Context name', 'project-management')
      .option('--enhance', 'Apply enhancement suggestions', false)
      .action(async (taskId, options) => {
        await this.validateTask(taskId, options);
      });

    // Task enhancement
    taskCommand
      .command('enhance')
      .description('Enhance task with suggestions')
      .argument('<taskId>', 'Task ID to enhance')
      .option('--context <context>', 'Context name', 'project-management')
      .option('--auto-update', 'Automatically apply safe updates', false)
      .action(async (taskId, options) => {
        await this.enhanceTask(taskId, options);
      });

    // Task details
    taskCommand
      .command('show')
      .description('Show task details')
      .argument('<taskId>', 'Task ID')
      .option('--context <context>', 'Context name', 'project-management')
      .addOption(CommonOptions.format())
      .action(async (taskId, options) => {
        await this.showTask(taskId, options);
      });

    // Task update
    taskCommand
      .command('update')
      .description('Update task properties')
      .argument('<taskId>', 'Task ID')
      .option('-t, --title <title>', 'Update title')
      .option('-d, --description <description>', 'Update description')
      .option('-p, --priority <priority>', 'Update priority')
      .option('--assignee <assignee>', 'Update assignee')
      .option('--add-deps <deps>', 'Add dependencies (comma-separated)')
      .option('--remove-deps <deps>', 'Remove dependencies (comma-separated)')
      .option('--context <context>', 'Context name', 'project-management')
      .action(async (taskId, options) => {
        await this.updateTask(taskId, options);
      });

    // Bulk validation
    taskCommand
      .command('validate-all')
      .description('Validate all tasks in context')
      .option('--context <context>', 'Context name', 'project-management')
      .addOption(CommonOptions.format())
      .action(async (options) => {
        await this.validateAllTasks(options);
      });
  }

  private async createTask(options: {
    title?: string;
    description?: string;
    priority: string;
    type?: string;
    assignee?: string;
    deps?: string;
    context: string;
  }): Promise<void> {
    try {
      if (!options.title) {
        this.logger.warn('Task creation failed: missing title', { context: options.context });
        console.error(chalk.red('❌ Task title is required'));
        process.exit(1);
      }

      if (!options.description) {
        this.logger.warn('Task creation failed: missing description', { context: options.context });
        console.error(chalk.red('❌ Task description is required'));
        process.exit(1);
      }

      const taskId = this.generateTaskId();
      const dependencies = options.deps ? options.deps.split(',').map(d => d.trim()) : [];

      const task: TaskEntity = {
        id: taskId,
        title: options.title,
        status: 'planned',
        priority: options.priority as TaskEntity['priority'],
        type: (options.type as TaskEntity['type']) || 'feature',
        description: options.description,
        dependencies,
        architectureImpact: '',
        assignee: options.assignee || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        validationStatus: 'not_validated'
      };

      this.logger.info('Creating task', { taskId, title: task.title, priority: task.priority, type: task.type });

      // Run creation workflow
      const result = await this.lifecycleWorkflow.execute({
        taskId: task.id,
        action: 'create',
        parameters: { task },
        user: 'cli-user',
        timestamp: new Date()
      });

      if (!result.success) {
        this.logger.error('Task creation workflow failed', undefined, { taskId, errors: result.errors });
        console.error(chalk.red('❌ Task creation failed:'));
        for (const error of result.errors ?? []) {
          console.error(chalk.red(`  • ${error}`));
        }
        process.exit(1);
      }

      // Save task
      await this.saveTask(options.context, task);

      this.logger.info('Task created successfully', { taskId, title: task.title, context: options.context });
      console.log(chalk.green(`✅ Task created: ${task.id}`));
      console.log(chalk.gray(`Title: ${task.title}`));
      console.log(chalk.gray(`Priority: ${task.priority}`));
      if (task.assignee) {
console.log(chalk.gray(`Assignee: ${task.assignee}`));
}

    } catch (error) {
      this.logger.error('Failed to create task', error instanceof Error ? error : undefined, { context: options.context });
      console.error(chalk.red('❌ Failed to create task:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async listTasks(options: {
    status?: string;
    priority?: string;
    assignee?: string;
    context: string;
    format: string;
  }): Promise<void> {
    try {
      this.logger?.debug('Listing tasks', { context: options.context, filters: { status: options.status, priority: options.priority, assignee: options.assignee } });
      const tasks = await this.loadTasks(options.context);

      // Apply filters
      let filteredTasks = tasks;
      if (options.status) {
        filteredTasks = filteredTasks.filter(t => t.status === options.status);
      }
      if (options.priority) {
        filteredTasks = filteredTasks.filter(t => t.priority === options.priority);
      }
      if (options.assignee) {
        filteredTasks = filteredTasks.filter(t => t.assignee === options.assignee);
      }

      if (filteredTasks.length === 0) {
        this.logger?.info('No tasks found matching criteria', { context: options.context, filters: { status: options.status, priority: options.priority, assignee: options.assignee } });
        console.log(chalk.yellow('No tasks found matching criteria'));
        return;
      }

      this.logger?.info('Tasks listed successfully', { context: options.context, totalTasks: tasks.length, filteredTasks: filteredTasks.length, format: options.format });

      if (options.format === 'json') {
        console.log(JSON.stringify(filteredTasks, null, 2));
      } else if (options.format === 'yaml') {
        console.log(yaml.dump(filteredTasks, { indent: 2 }));
      } else {
        // Table format
        console.log(chalk.blue(`\n📋 Tasks (${filteredTasks.length} found):`));
        console.log('');

        for (const task of filteredTasks) {
          const statusColor = this.getStatusColor(task.status);
          const priorityColor = this.getPriorityColor(task.priority);

          console.log(`${statusColor(task.status.padEnd(12))} ${priorityColor(task.priority.padEnd(8))} ${task.id.padEnd(15)} ${task.title}`);
          if (task.assignee) {
            console.log(`${' '.padEnd(12)} ${' '.padEnd(8)} ${' '.padEnd(15)} → ${chalk.gray('Assignee:')} ${task.assignee}`);
          }
        }
      }

    } catch (error) {
      this.logger?.error('Failed to list tasks', error instanceof Error ? error : undefined, { context: options.context });
      console.error(chalk.red('❌ Failed to list tasks:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async updateTaskStatus(taskId: string, status: string, options: { context: string }): Promise<void> {
    try {
      this.logger?.debug('Updating task status', { taskId, status, context: options.context });
      const tasks = await this.loadTasks(options.context);
      const task = tasks.find(t => t.id === taskId);

      if (!task) {
        this.logger?.warn('Task not found for status update', { taskId, context: options.context });
        console.error(chalk.red(`❌ Task not found: ${taskId}`));
        process.exit(1);
      }

      const oldStatus = task.status;
      const newStatus = status as TaskEntity['status'];

      // Run transition workflow
      const result = await this.lifecycleWorkflow.execute({
        taskId,
        action: 'transition',
        parameters: { taskId, fromStatus: oldStatus, toStatus: newStatus, task },
        user: 'cli-user',
        timestamp: new Date()
      });

      if (!result.success) {
        this.logger?.error('Status transition workflow failed', undefined, { taskId, oldStatus, newStatus, errors: result.errors });
        console.error(chalk.red('❌ Status transition failed:'));
        for (const error of result.errors ?? []) {
          console.error(chalk.red(`  • ${error}`));
        }
        process.exit(1);
      }

      // Update task
      task.status = newStatus;
      task.updatedAt = new Date();
      if (newStatus === 'completed') {
        task.completedAt = new Date();
      }

      await this.saveTask(options.context, task);

      this.logger?.info('Task status updated successfully', { taskId, oldStatus, newStatus, context: options.context });
      console.log(chalk.green(`✅ Task ${taskId} status updated: ${oldStatus} → ${newStatus}`));

    } catch (error) {
      this.logger?.error('Failed to update task status', error instanceof Error ? error : undefined, { taskId, status, context: options.context });
      console.error(chalk.red('❌ Failed to update task status:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async validateTask(taskId: string, options: { context: string; enhance: boolean }): Promise<void> {
    try {
      this.logger?.debug('Validating task', { taskId, context: options.context, enhance: options.enhance });
      const tasks = await this.loadTasks(options.context);
      const task = tasks.find(t => t.id === taskId);

      if (!task) {
        this.logger?.warn('Task not found for validation', { taskId, context: options.context });
        console.error(chalk.red(`❌ Task not found: ${taskId}`));
        process.exit(1);
      }

      console.log(chalk.blue(`🔍 Validating task: ${taskId}`));

      const validation = await this.validationWorkflow.validateTask(task);
      this.logger?.info('Task validation completed', { taskId, valid: validation.valid, errorCount: validation.errors.length, warningCount: validation.warnings.length, suggestionCount: validation.suggestions.length });

      console.log(`\n${validation.valid ? chalk.green('✅') : chalk.red('❌')} Validation Result:`);
      console.log(chalk.gray(`Task: ${task.title}`));
      console.log(chalk.gray(`Valid: ${validation.valid}`));

      if (validation.errors.length > 0) {
        console.log(chalk.red('\n❌ Errors:'));
        for (const error of validation.errors) {
          console.log(chalk.red(`  • [${error.severity}] ${error.message}`));
        }
      }

      if (validation.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        for (const warning of validation.warnings) {
          console.log(chalk.yellow(`  • ${warning.message}`));
          if (warning.suggestion) {
            console.log(chalk.gray(`    Suggestion: ${warning.suggestion}`));
          }
        }
      }

      if (validation.suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Enhancement Suggestions:'));
        for (const suggestion of validation.suggestions) {
          console.log(chalk.blue(`  • [${suggestion.type}] ${suggestion.description}`));
          console.log(chalk.gray(`    Impact: ${suggestion.impact}, Effort: ${suggestion.effort}`));
        }
      }

      // Update validation status
      task.validationStatus = validation.valid ? 'valid' : 'outdated';
      task.lastValidated = new Date();
      task.enhancementSuggestions = validation.suggestions.map(s => s.description);

      await this.saveTask(options.context, task);

      if (options.enhance && validation.suggestions.length > 0) {
        this.logger?.debug('Applying enhancement suggestions', { taskId, suggestionCount: validation.suggestions.length });
        console.log(chalk.blue('\n🔧 Applying enhancement suggestions...'));
        await this.enhanceTask(taskId, { context: options.context, autoUpdate: true });
      }

    } catch (error) {
      this.logger?.error('Failed to validate task', error instanceof Error ? error : undefined, { taskId, context: options.context });
      console.error(chalk.red('❌ Failed to validate task:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async enhanceTask(taskId: string, options: { context: string; autoUpdate?: boolean }): Promise<void> {
    try {
      this.logger?.debug('Enhancing task', { taskId, context: options.context, autoUpdate: options.autoUpdate });
      const tasks = await this.loadTasks(options.context);
      const task = tasks.find(t => t.id === taskId);

      if (!task) {
        this.logger?.warn('Task not found for enhancement', { taskId, context: options.context });
        console.error(chalk.red(`❌ Task not found: ${taskId}`));
        process.exit(1);
      }

      const enhanced = await this.validationWorkflow.enhanceTask(task, {
        autoUpdate: options.autoUpdate || false
      });

      await this.saveTask(options.context, enhanced);

      this.logger?.info('Task enhanced successfully', { taskId, context: options.context, suggestionCount: enhanced.enhancementSuggestions?.length || 0 });
      console.log(chalk.green(`✅ Task ${taskId} enhanced successfully`));
      
      if (enhanced.enhancementSuggestions && enhanced.enhancementSuggestions.length > 0) {
        console.log(chalk.blue('\n💡 Applied enhancements:'));
        for (const suggestion of enhanced.enhancementSuggestions) {
          console.log(chalk.blue(`  • ${suggestion}`));
        }
      }

    } catch (error) {
      this.logger?.error('Failed to enhance task', error instanceof Error ? error : undefined, { taskId, context: options.context });
      console.error(chalk.red('❌ Failed to enhance task:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async showTask(taskId: string, options: { context: string; format: string }): Promise<void> {
    try {
      this.logger?.debug('Showing task details', { taskId, context: options.context, format: options.format });
      const tasks = await this.loadTasks(options.context);
      const task = tasks.find(t => t.id === taskId);

      if (!task) {
        this.logger?.warn('Task not found for display', { taskId, context: options.context });
        console.error(chalk.red(`❌ Task not found: ${taskId}`));
        process.exit(1);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(task, null, 2));
      } else {
        console.log(yaml.dump(task, { indent: 2 }));
      }

      this.logger?.info('Task details displayed', { taskId, context: options.context, format: options.format });

    } catch (error) {
      this.logger?.error('Failed to show task', error instanceof Error ? error : undefined, { taskId, context: options.context });
      console.error(chalk.red('❌ Failed to show task:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async updateTask(taskId: string, options: {
    title?: string;
    description?: string;
    priority?: string;
    assignee?: string;
    addDeps?: string;
    removeDeps?: string;
    context: string;
  }): Promise<void> {
    try {
      this.logger?.debug('Updating task', { taskId, context: options.context, updates: { title: options.title, priority: options.priority, assignee: options.assignee } });
      const tasks = await this.loadTasks(options.context);
      const task = tasks.find(t => t.id === taskId);

      if (!task) {
        this.logger?.warn('Task not found for update', { taskId, context: options.context });
        console.error(chalk.red(`❌ Task not found: ${taskId}`));
        process.exit(1);
      }

      const updates: Partial<TaskEntity> = {};

      if (options.title) {
updates.title = options.title;
}
      if (options.description) {
updates.description = options.description;
}
      if (options.priority) {
updates.priority = options.priority as TaskEntity['priority'];
}
      if (options.assignee) {
updates.assignee = options.assignee;
}

      // Handle dependencies
      if (options.addDeps) {
        const newDeps = options.addDeps.split(',').map(d => d.trim());
        updates.dependencies = [...new Set([...task.dependencies, ...newDeps])];
      }
      if (options.removeDeps) {
        const removeDeps = new Set(options.removeDeps.split(',').map(d => d.trim()));
        updates.dependencies = task.dependencies.filter(d => !removeDeps.has(d));
      }

      // Run update workflow
      const result = await this.lifecycleWorkflow.execute({
        taskId,
        action: 'update',
        parameters: { taskId, updates, currentTask: task },
        user: 'cli-user',
        timestamp: new Date()
      });

      if (!result.success) {
        this.logger?.error('Task update workflow failed', undefined, { taskId, errors: result.errors });
        console.error(chalk.red('❌ Task update failed:'));
        for (const error of result.errors ?? []) {
          console.error(chalk.red(`  • ${error}`));
        }
        process.exit(1);
      }

      const updatedTask = result.data as TaskEntity;
      await this.saveTask(options.context, updatedTask);

      this.logger?.info('Task updated successfully', { taskId, context: options.context, updates });
      console.log(chalk.green(`✅ Task ${taskId} updated successfully`));

    } catch (error) {
      this.logger?.error('Failed to update task', error instanceof Error ? error : undefined, { taskId, context: options.context });
      console.error(chalk.red('❌ Failed to update task:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async validateAllTasks(options: { context: string; format: string }): Promise<void> {
    try {
      this.logger?.debug('Validating all tasks', { context: options.context, format: options.format });
      const tasks = await this.loadTasks(options.context);

      if (tasks.length === 0) {
        this.logger?.info('No tasks found to validate', { context: options.context });
        console.log(chalk.yellow('No tasks found to validate'));
        return;
      }

      console.log(chalk.blue(`🔍 Validating ${tasks.length} tasks...`));

      const results = await this.validationWorkflow.validateAllTasks(tasks);
      const validCount = Object.values(results).filter(r => r.valid).length;
      const invalidCount = Object.values(results).length - validCount;

      this.logger?.info('All tasks validated', { context: options.context, totalTasks: tasks.length, validCount, invalidCount });
      console.log(chalk.green(`\n✅ Validation completed: ${validCount} valid, ${invalidCount} invalid`));

      if (options.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        // Table format
        console.log('\n📊 Validation Summary:');
        for (const [taskId, result] of Object.entries(results)) {
          const statusIcon = result.valid ? chalk.green('✅') : chalk.red('❌');
          const task = tasks.find(t => t.id === taskId);
          console.log(`${statusIcon} ${taskId.padEnd(15)} ${task?.title || 'Unknown'}`);

          if (!result.valid && result.errors.length > 0) {
            for (const error of result.errors.slice(0, 2)) {
              console.log(`   ${chalk.red('↳')} ${error.message}`);
            }
          }
        }
      }

    } catch (error) {
      this.logger?.error('Failed to validate all tasks', error instanceof Error ? error : undefined, { context: options.context });
      console.error(chalk.red('❌ Failed to validate tasks:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private generateTaskId(): string {
    // Use cryptographically secure random generation (SonarCloud security requirement)
    return generateTaskId();
  }

  private getStatusColor(status: TaskEntity['status']): (text: string) => string {
    const colors = {
      planned: chalk.blue,
      in_progress: chalk.yellow,
      completed: chalk.green,
      deferred: chalk.gray,
      blocked: chalk.red
    };
    return colors[status] || chalk.white;
  }

  private getPriorityColor(priority: TaskEntity['priority']): (text: string) => string {
    const colors = {
      low: chalk.gray,
      medium: chalk.blue,
      high: chalk.yellow,
      critical: chalk.red
    };
    return colors[priority] || chalk.white;
  }

  private getTaskEntitiesPath(contextName: string): string {
    return join(this.contextsDir, contextName, 'entities', 'tasks');
  }

  private async loadTasks(contextName: string): Promise<TaskEntity[]> {
    const taskPath = this.getTaskEntitiesPath(contextName);

    let taskFiles: string[] = [];
    try {
      taskFiles = await readdir(taskPath);
    } catch {
      return [];
    }

    const tasks: TaskEntity[] = [];

    for (const file of taskFiles) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) {
        continue;
      }

      const fullPath = join(taskPath, file);
      try {
        const content = await readFile(fullPath, 'utf-8');
        const parsed = yaml.load(content);
        if (parsed && typeof parsed === 'object') {
          tasks.push(this.normalizeTaskEntity(parsed as Record<string, any>));
        }
      } catch (error) {
        this.logger?.warn('Skipping unreadable task file', {
          file: fullPath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return tasks;
  }

  private async saveTask(contextName: string, task: TaskEntity): Promise<void> {
    const taskPath = this.getTaskEntitiesPath(contextName);
    await mkdir(taskPath, { recursive: true });

    const serializedTask = {
      ...task,
      createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
      updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
      completedAt: task.completedAt instanceof Date ? task.completedAt.toISOString() : task.completedAt,
      lastValidated: task.lastValidated instanceof Date ? task.lastValidated.toISOString() : task.lastValidated
    };

    const filePath = join(taskPath, `${task.id}.yaml`);
    await writeFile(filePath, yaml.dump(serializedTask, { indent: 2 }), 'utf-8');
  }

  private normalizeTaskEntity(task: Record<string, any>): TaskEntity {
    const normalized: TaskEntity = {
      id: String(task.id || ''),
      title: String(task.title || ''),
      status: (task.status as TaskEntity['status']) || 'planned',
      priority: (task.priority as TaskEntity['priority']) || 'medium',
      type: (task.type as TaskEntity['type']) || 'feature',
      description: String(task.description || ''),
      dependencies: Array.isArray(task.dependencies) ? task.dependencies.map(dep => String(dep)) : [],
      architectureImpact: String(task.architectureImpact || ''),
      assignee: String(task.assignee || ''),
      createdAt: this.toDate(task.createdAt),
      updatedAt: this.toDate(task.updatedAt),
      validationStatus: (task.validationStatus as TaskEntity['validationStatus']) || 'not_validated',
    };

    if (Array.isArray(task.blockedBy)) {
      normalized.blockedBy = task.blockedBy.map(dep => String(dep));
    }
    if (task.estimatedEffort) {
      normalized.estimatedEffort = String(task.estimatedEffort);
    }
    if (task.actualEffort) {
      normalized.actualEffort = String(task.actualEffort);
    }
    if (Array.isArray(task.tags)) {
      normalized.tags = task.tags.map(tag => String(tag));
    }
    if (task.completedAt) {
      normalized.completedAt = this.toDate(task.completedAt);
    }
    if (task.lastValidated) {
      normalized.lastValidated = this.toDate(task.lastValidated);
    }
    if (Array.isArray(task.enhancementSuggestions)) {
      normalized.enhancementSuggestions = task.enhancementSuggestions.map(s => String(s));
    }

    return normalized;
  }

  private toDate(value: unknown): Date {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
  }
}