/**
 * TaskMigrationCommand - Migrate tasks from markdown files to context entities
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
 * - Parse existing task markdown files
 * - Convert to TaskEntity format
 * - Preserve relationships and dependencies
 * - Integrate with context management system
 */

import { Command } from 'commander';
import { readFile, readdir, writeFile, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { homedir } from 'os';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import type { Logger } from '../logging/Logger.js';

export interface TaskEntity {
  id: string;
  title: string;
  status: 'planned' | 'in_progress' | 'completed' | 'deferred' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'feature' | 'bug' | 'refactor' | 'architecture' | 'documentation' | 'testing';
  description: string;
  dependencies: string[];
  blockedBy?: string[];
  architectureImpact: string;
  estimatedEffort?: string;
  actualEffort?: string;
  assignee: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  validationStatus: 'valid' | 'outdated' | 'invalid' | 'not_validated';
  lastValidated?: Date;
  enhancementSuggestions?: string[];
}

export interface TaskMigrationResult {
  taskId: string;
  status: 'success' | 'failed' | 'error';
  errors?: string[];
  warnings?: string[];
  error?: string;
}

export interface MigrationResult {
  totalTasks: number;
  successful: number;
  failed: number;
  results: TaskMigrationResult[];
}

export class TaskMigrationCommand {
  private readonly contextDir: string;
  private readonly projectManagementDir: string;
  private logger: Logger | null = null;

  constructor() {
    this.contextDir = join(homedir(), '.imajin', 'contexts');
    this.projectManagementDir = join(this.contextDir, 'project-management');

    // Get logger from container
    try {
      const container = (globalThis as any).imajinApp?.container;
      if (container) {
        this.logger = container.resolve('logger') as Logger;
      }
    } catch (error) {
      // Logger not available yet
    }
  }

  public register(program: Command): void {
    const taskCommand = program
      .command('task-migrate')
      .description('Task migration commands');

    taskCommand
      .command('migrate')
      .alias('run')
      .description('Migrate tasks from markdown files to context entities')
      .option('--from <path>', 'Source directory containing task markdown files', 'docs/prompts/tasks')
      .option('--to <context>', 'Target context name', 'project-management')
      .option('--validate', 'Validate tasks during migration', false)
      .option('--dry-run', 'Show what would be migrated without actually doing it', false)
      .action(async (options) => {
        await this.executeMigration(options);
      });

    taskCommand
      .command('import')
      .description('Import tasks from filesystem')
      .option('--source <type>', 'Source type', 'filesystem')
      .option('--path <path>', 'Source path', 'docs/prompts/tasks')
      .option('--validate', 'Validate during import', true)
      .action(async (options) => {
        await this.executeImport(options);
      });

    // Status management commands
    taskCommand
      .command('status')
      .description('Show task status summary')
      .option('--path <path>', 'Task directory path', 'docs/prompts/tasks')
      .option('--format <format>', 'Output format (table|json|summary)', 'summary')
      .option('--filter <status>', 'Filter by status')
      .action(async (options) => {
        await this.executeStatusCommand(options);
      });

    taskCommand
      .command('update <taskId>')
      .description('Update task status and metadata')
      .option('--path <path>', 'Task directory path', 'docs/prompts/tasks')
      .option('--status <status>', 'New status (planned|in_progress|completed|blocked|deferred)')
      .option('--priority <priority>', 'New priority (low|medium|high|critical)')
      .option('--assignee <assignee>', 'Assign task to someone')
      .option('--notes <notes>', 'Add update notes')
      .action(async (taskId, options) => {
        await this.executeUpdateCommand(taskId, options);
      });

    taskCommand
      .command('complete <taskId>')
      .description('Mark task as completed')
      .option('--path <path>', 'Task directory path', 'docs/prompts/tasks')
      .option('--notes <notes>', 'Completion notes')
      .action(async (taskId, options) => {
        await this.executeCompleteCommand(taskId, options);
      });

    taskCommand
      .command('standardize')
      .description('Standardize frontmatter across all tasks')
      .option('--path <path>', 'Task directory path', 'docs/prompts/tasks')
      .option('--dry-run', 'Show what would be changed without making changes', false)
      .action(async (options) => {
        await this.executeStandardizeCommand(options);
      });
  }

  public async executeMigration(options: {
    from: string;
    to: string;
    validate: boolean;
    dryRun: boolean;
  }): Promise<void> {
    try {
      this.logger?.info('Starting task migration', { from: options.from, to: options.to, validate: options.validate, dryRun: options.dryRun });
      console.log(chalk.blue('🔄 Starting task migration...'));
      console.log(chalk.gray(`From: ${options.from}`));
      console.log(chalk.gray(`To: ${options.to} context`));

      if (options.dryRun) {
        console.log(chalk.yellow('⚠️  DRY RUN - No changes will be made'));
      }

      const result = await this.migrateTasksFromFilesystem(options.from, options.to, {
        validate: options.validate,
        dryRun: options.dryRun
      });

      this.displayMigrationResults(result);

      if (!options.dryRun) {
        this.logger?.info('Migration completed', { totalTasks: result.totalTasks, successful: result.successful, failed: result.failed });
        console.log(chalk.green(`✅ Migration completed: ${result.successful}/${result.totalTasks} tasks migrated successfully`));
      } else {
        this.logger?.debug('Dry run completed', { totalTasks: result.totalTasks, successful: result.successful, failed: result.failed });
      }

    } catch (error) {
      this.logger?.error('Migration failed', error instanceof Error ? error : undefined, { from: options.from, to: options.to });
      console.error(chalk.red('❌ Migration failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  public async executeImport(options: {
    source: string;
    path: string;
    validate: boolean;
  }): Promise<void> {
    try {
      this.logger?.info('Importing tasks', { source: options.source, path: options.path, validate: options.validate });
      console.log(chalk.blue('📥 Importing tasks...'));

      if (options.source === 'filesystem') {
        await this.executeMigration({
          from: options.path,
          to: 'project-management',
          validate: options.validate,
          dryRun: false
        });
      } else {
        throw new Error(`Unsupported source type: ${options.source}`);
      }

    } catch (error) {
      this.logger?.error('Import failed', error instanceof Error ? error : undefined, { source: options.source, path: options.path });
      console.error(chalk.red('❌ Import failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async migrateTasksFromFilesystem(
    sourcePath: string,
    targetContext: string,
    options: { validate: boolean; dryRun: boolean }
  ): Promise<MigrationResult> {
    this.logger?.debug('Migrating tasks from filesystem', { sourcePath, targetContext, validate: options.validate, dryRun: options.dryRun });
    const taskFiles = await this.findTaskFiles(sourcePath);
    const migrationResults: TaskMigrationResult[] = [];

    this.logger?.info('Found task files to process', { fileCount: taskFiles.length, sourcePath });
    console.log(chalk.gray(`Found ${taskFiles.length} task files to process`));

    // Ensure target directory exists (unless dry run)
    if (!options.dryRun) {
      await this.ensureContextDirectory(targetContext);
    }

    for (const taskFile of taskFiles) {
      try {
        this.logger?.debug('Processing task file', { taskFile: basename(taskFile) });
        console.log(chalk.gray(`Processing: ${basename(taskFile)}`));

        // Parse existing task
        const content = await readFile(taskFile, 'utf-8');
        const { frontmatter, body } = this.parseMarkdown(content);

        // Convert to task entity
        const taskEntity = await this.convertToTaskEntity(frontmatter, body, taskFile);

        // Validate if requested
        if (options.validate) {
          const validation = await this.validateTask(taskEntity);
          if (!validation.valid) {
            this.logger?.warn('Task validation failed', { taskId: taskEntity.id, errors: validation.errors, warnings: validation.warnings });
            migrationResults.push({
              taskId: taskEntity.id,
              status: 'failed',
              errors: validation.errors,
              warnings: validation.warnings
            });
            continue;
          }
        }

        // Save (unless dry run)
        if (!options.dryRun) {
          await this.saveTaskEntity(targetContext, taskEntity);
        }

        this.logger?.debug('Task migrated successfully', { taskId: taskEntity.id, dryRun: options.dryRun });
        migrationResults.push({
          taskId: taskEntity.id,
          status: 'success'
        });

      } catch (error) {
        const taskId = this.extractIdFromFilename(taskFile);
        this.logger?.error('Task migration failed', error instanceof Error ? error : undefined, { taskId, taskFile: basename(taskFile) });
        migrationResults.push({
          taskId,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      totalTasks: taskFiles.length,
      successful: migrationResults.filter(r => r.status === 'success').length,
      failed: migrationResults.filter(r => r.status !== 'success').length,
      results: migrationResults
    };
  }

  private async findTaskFiles(sourcePath: string): Promise<string[]> {
    try {
      const files = await readdir(sourcePath);
      return files
        .filter(file => file.endsWith('.md') && file.startsWith('task-'))
        .map(file => join(sourcePath, file));
    } catch (error) {
      throw new Error(`Cannot read source directory ${sourcePath}: ${error instanceof Error ? error.message : error}`);
    }
  }

  private parseMarkdown(content: string): { frontmatter: any; body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return {
        frontmatter: {},
        body: content
      };
    }

    try {
      const frontmatter = yaml.load(match[1] || '') || {};
      const body = match[2] || '';
      return { frontmatter, body };
    } catch (error) {
      throw new Error(`Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async convertToTaskEntity(frontmatter: any, body: string, filePath: string): Promise<TaskEntity> {
    const taskId = frontmatter.task_id || this.extractIdFromFilename(filePath);
    const title = frontmatter.title || 'Untitled Task';
    
    // Extract dependencies from various sources
    const dependencies = this.extractDependencies(frontmatter, body);
    
    // Map status and priority
    const status = this.mapStatus(frontmatter.status);
    const priority = this.mapPriority(frontmatter.priority);
    
    // Extract metadata
    const architectureImpact = this.extractArchitectureImpact(body);
    const estimatedEffort = frontmatter.estimated_effort || this.extractEstimatedEffort(body);
    const taskType = this.detectTaskType(title, body);

    const taskEntity: TaskEntity = {
      id: taskId,
      title,
      status,
      priority,
      type: taskType,
      description: body,
      dependencies,
      architectureImpact: architectureImpact || '',
      estimatedEffort,
      assignee: frontmatter.assignee || '',
      createdAt: frontmatter.updated ? new Date(frontmatter.updated) : new Date(),
      updatedAt: frontmatter.updated ? new Date(frontmatter.updated) : new Date(),
      validationStatus: 'not_validated',
      tags: this.extractTags(frontmatter, body)
    };

    // Set completion date if task is completed
    if (status === 'completed') {
      taskEntity.completedAt = frontmatter.completed_at ? new Date(frontmatter.completed_at) : new Date();
    }

    return taskEntity;
  }

  private extractDependencies(frontmatter: any, body: string): string[] {
    const dependencies: string[] = [];

    // Extract from frontmatter
    if (frontmatter.dependencies) {
      if (Array.isArray(frontmatter.dependencies)) {
        dependencies.push(...frontmatter.dependencies);
      } else {
        dependencies.push(frontmatter.dependencies);
      }
    }

    // Extract from body content (Task-004, Task-005a, etc.)
    const dependencyPatterns = [
      /Task-(\d+[a-z]*)/gi,
      /task-(\d+[a-z]*)/gi,
      /depends on.*?task[- ](\d+[a-z]*)/gi,
      /prerequisite.*?task[- ](\d+[a-z]*)/gi
    ];

    for (const pattern of dependencyPatterns) {
      const matches = body.match(pattern);
      if (matches) {
        dependencies.push(...matches.map(match => {
          const taskId = match.match(/(\d+[a-z]*)/i)?.[1];
          return taskId ? `task-${taskId.toLowerCase()}` : match;
        }));
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  private mapStatus(status?: string): TaskEntity['status'] {
    if (!status) return 'planned';
    
    const statusMap: Record<string, TaskEntity['status']> = {
      'ready for implementation': 'planned',
      'ready': 'planned',
      'planned': 'planned',
      'in progress': 'in_progress',
      'in_progress': 'in_progress',
      'active': 'in_progress',
      'complete': 'completed',
      'completed': 'completed',
      'done': 'completed',
      'deferred': 'deferred',
      'blocked': 'blocked'
    };

    return statusMap[status.toLowerCase()] || 'planned';
  }

  private mapPriority(priority?: string): TaskEntity['priority'] {
    if (!priority) return 'medium';
    
    const priorityMap: Record<string, TaskEntity['priority']> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical'
    };

    return priorityMap[priority.toLowerCase()] || 'medium';
  }

  private extractArchitectureImpact(body: string): string | undefined {
    const architecturePatterns = [
      /## Architecture[^#]*\n([\s\S]*?)(?=\n## |\n# |\Z)/i,
      /## Implementation[^#]*\n([\s\S]*?)(?=\n## |\n# |\Z)/i,
      /## Technical Requirements[^#]*\n([\s\S]*?)(?=\n## |\n# |\Z)/i
    ];

    for (const pattern of architecturePatterns) {
      const match = body.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 500); // Limit length
      }
    }

    return undefined;
  }

  private extractEstimatedEffort(body: string): string | undefined {
    const effortPatterns = [
      /estimated effort[:\s]*([^.\n]+)/i,
      /effort[:\s]*([^.\n]+)/i,
      /(\d+(?:\.\d+)?\s*(?:hours?|days?|weeks?))/i
    ];

    for (const pattern of effortPatterns) {
      const match = body.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private detectTaskType(title: string, body: string): TaskEntity['type'] {
    const typePatterns: Record<TaskEntity['type'], RegExp[]> = {
      'architecture': [/architecture/i, /refactor/i, /design/i],
      'feature': [/implement/i, /add/i, /create/i, /feature/i],
      'bug': [/fix/i, /bug/i, /issue/i, /error/i],
      'refactor': [/refactor/i, /cleanup/i, /optimize/i],
      'documentation': [/document/i, /docs/i, /readme/i],
      'testing': [/test/i, /testing/i, /spec/i]
    };

    const text = `${title} ${body}`.toLowerCase();

    for (const [type, patterns] of Object.entries(typePatterns)) {
      if (patterns.some(pattern => pattern.test(text))) {
        return type as TaskEntity['type'];
      }
    }

    return 'feature';
  }

  private extractTags(frontmatter: any, body: string): string[] {
    const tags: string[] = [];

    // Extract from frontmatter
    if (frontmatter.tags) {
      tags.push(...Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags]);
    }

    // Extract from task type
    if (frontmatter.type) {
      tags.push(frontmatter.type);
    }

    // Extract from content
    const tagPatterns = [
      /Phase \d+/gi,
      /Task-\d+[a-z]*/gi
    ];

    for (const pattern of tagPatterns) {
      const matches = body.match(pattern);
      if (matches) {
        tags.push(...matches);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private extractIdFromFilename(filePath: string): string {
    const filename = basename(filePath, extname(filePath));
    const match = filename.match(/task-(.+)/);
    return match ? `task-${match[1]}` : filename;
  }

  private async validateTask(task: TaskEntity): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!task.id) errors.push('Task ID is required');
    if (!task.title) errors.push('Task title is required');
    if (!task.description || task.description.trim().length < 10) {
      errors.push('Task description must be at least 10 characters');
    }

    // Dependency validation (basic - could be enhanced)
    for (const depId of task.dependencies) {
      if (!depId.match(/^task-\d+[a-z]*$/)) {
        warnings.push(`Dependency ID format may be invalid: ${depId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async ensureContextDirectory(contextName: string): Promise<void> {
    const contextPath = join(this.contextDir, contextName);
    const entitiesPath = join(contextPath, 'entities', 'tasks');
    
    await mkdir(entitiesPath, { recursive: true });
  }

  private async saveTaskEntity(contextName: string, task: TaskEntity): Promise<void> {
    const taskPath = join(this.contextDir, contextName, 'entities', 'tasks', `${task.id}.yaml`);
    const yamlContent = yaml.dump(task, {
      indent: 2,
      lineWidth: 120,
      quotingType: '"',
      forceQuotes: false
    });

    await writeFile(taskPath, yamlContent, 'utf-8');
  }

  private displayMigrationResults(result: MigrationResult): void {
    console.log(chalk.blue('\n📊 Migration Results:'));
    console.log(chalk.green(`  ✅ Successful: ${result.successful}`));
    console.log(chalk.red(`  ❌ Failed: ${result.failed}`));
    console.log(chalk.gray(`  📝 Total: ${result.totalTasks}`));

    // Show failed tasks
    const failed = result.results.filter(r => r.status !== 'success');
    if (failed.length > 0) {
      console.log(chalk.red('\n❌ Failed Tasks:'));
      failed.forEach(task => {
        console.log(chalk.red(`  • ${task.taskId}: ${task.error || task.errors?.join(', ')}`));
      });
    }

    // Show warnings
    const withWarnings = result.results.filter(r => r.warnings && r.warnings.length > 0);
    if (withWarnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      withWarnings.forEach(task => {
        console.log(chalk.yellow(`  • ${task.taskId}: ${task.warnings?.join(', ')}`));
      });
    }
  }

  // New status management command implementations
  public async executeStatusCommand(options: {
    path: string;
    format: string;
    filter?: string;
  }): Promise<void> {
    try {
      this.logger?.debug('Executing status command', { path: options.path, format: options.format, filter: options.filter });
      console.log(chalk.blue('📊 Task Status Summary'));

      const taskFiles = await this.findTaskFiles(options.path);
      const tasks: TaskEntity[] = [];
      
      for (const taskFile of taskFiles) {
        try {
          const content = await readFile(taskFile, 'utf-8');
          const { frontmatter, body } = this.parseMarkdown(content);
          const taskEntity = await this.convertToTaskEntity(frontmatter, body, taskFile);
          tasks.push(taskEntity);
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Could not parse ${basename(taskFile)}: ${error instanceof Error ? error.message : error}`));
        }
      }
      
      // Filter tasks if requested
      const filteredTasks = options.filter
        ? tasks.filter(task => task.status === options.filter)
        : tasks;

      this.logger?.info('Task status retrieved', { totalTasks: tasks.length, filteredTasks: filteredTasks.length, format: options.format });

      if (options.format === 'json') {
        console.log(JSON.stringify(filteredTasks, null, 2));
        return;
      }

      if (options.format === 'table') {
        this.displayTaskTable(filteredTasks);
        return;
      }

      // Default summary format
      this.displayTaskSummary(tasks, filteredTasks);

    } catch (error) {
      this.logger?.error('Status command failed', error instanceof Error ? error : undefined, { path: options.path });
      console.error(chalk.red('❌ Status command failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  public async executeUpdateCommand(taskId: string, options: {
    path: string;
    status?: string;
    priority?: string;
    assignee?: string;
    notes?: string;
  }): Promise<void> {
    try {
      this.logger?.debug('Executing update command', { taskId, path: options.path, updates: { status: options.status, priority: options.priority, assignee: options.assignee } });
      console.log(chalk.blue(`🔄 Updating task ${taskId}...`));

      const taskFile = await this.findTaskFile(options.path, taskId);
      if (!taskFile) {
        this.logger?.warn('Task file not found for update', { taskId, path: options.path });
        console.error(chalk.red(`❌ Task ${taskId} not found in ${options.path}`));
        return;
      }
      
      const content = await readFile(taskFile, 'utf-8');
      const updateData: {
        status?: string;
        priority?: string;
        assignee?: string;
        updated: string;
        updateNotes?: string;
      } = {
        updated: new Date().toISOString()
      };
      
      if (options.status) updateData.status = options.status;
      if (options.priority) updateData.priority = options.priority;
      if (options.assignee !== undefined) updateData.assignee = options.assignee;
      if (options.notes) updateData.updateNotes = options.notes;
      
      const updatedContent = await this.updateTaskFrontmatter(content, updateData);

      await writeFile(taskFile, updatedContent, 'utf-8');
      this.logger?.info('Task updated successfully', { taskId, updates: updateData });
      console.log(chalk.green(`✅ Task ${taskId} updated successfully`));

      if (options.notes) {
        console.log(chalk.gray(`📝 Notes: ${options.notes}`));
      }

    } catch (error) {
      this.logger?.error('Update command failed', error instanceof Error ? error : undefined, { taskId, path: options.path });
      console.error(chalk.red('❌ Update command failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  public async executeCompleteCommand(taskId: string, options: {
    path: string;
    notes?: string;
  }): Promise<void> {
    try {
      this.logger?.debug('Executing complete command', { taskId, path: options.path });
      console.log(chalk.blue(`✅ Completing task ${taskId}...`));

      await this.executeUpdateCommand(taskId, {
        path: options.path,
        status: 'completed',
        ...(options.notes ? { notes: options.notes } : {})
      });

      this.logger?.info('Task marked as completed', { taskId });
      console.log(chalk.green(`🎉 Task ${taskId} marked as completed!`));

    } catch (error) {
      this.logger?.error('Complete command failed', error instanceof Error ? error : undefined, { taskId, path: options.path });
      console.error(chalk.red('❌ Complete command failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  public async executeStandardizeCommand(options: {
    path: string;
    dryRun: boolean;
  }): Promise<void> {
    try {
      this.logger?.info('Starting task standardization', { path: options.path, dryRun: options.dryRun });
      console.log(chalk.blue('🔄 Standardizing task frontmatter...'));

      if (options.dryRun) {
        console.log(chalk.yellow('⚠️  DRY RUN - No changes will be made'));
      }

      const taskFiles = await this.findTaskFiles(options.path);
      let standardizedCount = 0;
      
      for (const taskFile of taskFiles) {
        try {
          const content = await readFile(taskFile, 'utf-8');
          const { frontmatter, body } = this.parseMarkdown(content);
          
          // Check if standardization is needed
          const needsStandardization = this.needsStandardization(frontmatter);
          
          if (needsStandardization) {
            console.log(chalk.gray(`📝 Standardizing: ${basename(taskFile)}`));
            
            if (!options.dryRun) {
              const standardizedContent = await this.standardizeTaskFrontmatter(content, frontmatter, body);
              await writeFile(taskFile, standardizedContent, 'utf-8');
            }
            
            standardizedCount++;
          }
          
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Could not standardize ${basename(taskFile)}: ${error instanceof Error ? error.message : error}`));
        }
      }
      
      if (options.dryRun) {
        this.logger?.info('Standardization dry run completed', { totalFiles: taskFiles.length, wouldStandardize: standardizedCount });
        console.log(chalk.yellow(`📊 Would standardize ${standardizedCount}/${taskFiles.length} tasks`));
      } else {
        this.logger?.info('Standardization completed', { totalFiles: taskFiles.length, standardized: standardizedCount });
        console.log(chalk.green(`✅ Standardized ${standardizedCount}/${taskFiles.length} tasks`));
      }

    } catch (error) {
      this.logger?.error('Standardize command failed', error instanceof Error ? error : undefined, { path: options.path });
      console.error(chalk.red('❌ Standardize command failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private displayTaskSummary(allTasks: TaskEntity[], filteredTasks: TaskEntity[]): void {
    const statusCounts = allTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(chalk.blue(`\n📊 Task Status Summary (${allTasks.length} tasks)`));
    console.log('┌─────────────┬───────┬────────────────────────────────────┐');
    console.log('│ Status      │ Count │ Tasks                              │');
    console.log('├─────────────┼───────┼────────────────────────────────────┤');
    
    const statusEmojis = {
      'completed': '✅',
      'in_progress': '🔄',
      'planned': '📋',
      'blocked': '🚫',
      'deferred': '⏸️'
    };
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = statusEmojis[status as keyof typeof statusEmojis] || '❓';
      const taskList = allTasks
        .filter(task => task.status === status)
        .slice(0, 3)
        .map(task => task.id.toUpperCase())
        .join(', ');
      const truncated = count > 3 ? '...' : '';
      
      console.log(`│ ${emoji} ${status.padEnd(10)} │ ${count.toString().padEnd(5)} │ ${(taskList + truncated).padEnd(34)} │`);
    });
    
    console.log('└─────────────┴───────┴────────────────────────────────────┘');
    
    // Next actions
    const inProgress = allTasks.filter(task => task.status === 'in_progress');
    const readyToStart = allTasks.filter(task => task.status === 'planned');
    
    console.log(chalk.blue('\n🎯 Next Actions:'));
    if (inProgress.length > 0) {
      console.log(`- Continue work on ${inProgress.map(t => t.id.toUpperCase()).join(', ')}`);
    }
    if (readyToStart.length > 0) {
      const next = readyToStart[0];
      if (next) {
        console.log(`- Start ${next.id.toUpperCase()} (${next.title})`);
      }
    }
  }

  private displayTaskTable(tasks: TaskEntity[]): void {
    console.log('\nTask ID'.padEnd(15) + 'Status'.padEnd(12) + 'Priority'.padEnd(10) + 'Title');
    console.log('─'.repeat(80));
    
    tasks.forEach(task => {
      const statusEmoji = {
        'completed': '✅',
        'in_progress': '🔄',
        'planned': '📋',
        'blocked': '🚫',
        'deferred': '⏸️'
      }[task.status] || '❓';
      
      console.log(
        task.id.toUpperCase().padEnd(15) + 
        `${statusEmoji} ${task.status}`.padEnd(12) + 
        task.priority.padEnd(10) + 
        task.title.substring(0, 40)
      );
    });
  }

  private async findTaskFile(sourcePath: string, taskId: string): Promise<string | null> {
    const taskFiles = await this.findTaskFiles(sourcePath);
    
    // Try exact match first
    let match = taskFiles.find(file => {
      const filename = basename(file, '.md');
      return filename === taskId.toLowerCase() || filename.includes(taskId.toLowerCase());
    });
    
    if (!match) {
      // Try partial match
      const normalizedTaskId = taskId.toLowerCase().replace(/^task-/, '');
      match = taskFiles.find(file => {
        const filename = basename(file, '.md');
        return filename.includes(normalizedTaskId);
      });
    }
    
    return match || null;
  }

  private async updateTaskFrontmatter(content: string, updates: {
    status?: string;
    priority?: string;
    assignee?: string;
    updated: string;
    updateNotes?: string;
  }): Promise<string> {
    const { frontmatter, body } = this.parseMarkdown(content);
    
    // Update frontmatter fields
    if (updates.status) frontmatter.status = updates.status;
    if (updates.priority) frontmatter.priority = updates.priority;
    if (updates.assignee !== undefined) frontmatter.assignee = updates.assignee;
    frontmatter.updated = updates.updated;
    
    // Add update notes to body if provided
    let updatedBody = body;
    if (updates.updateNotes) {
      const notesSection = `\n\n## Update Notes\n\n**${new Date().toLocaleDateString()}**: ${updates.updateNotes}`;
      updatedBody = body + notesSection;
    }
    
    // Reconstruct markdown with updated frontmatter
    const frontmatterYaml = yaml.dump(frontmatter, { indent: 2 });
    return `---\n${frontmatterYaml}---\n${updatedBody}`;
  }

  private needsStandardization(frontmatter: any): boolean {
    const requiredFields = ['task_id', 'title', 'status', 'priority', 'type', 'updated'];
    
    return requiredFields.some(field => !(field in frontmatter)) ||
           !frontmatter.status ||
           !frontmatter.priority ||
           !frontmatter.type;
  }

  private async standardizeTaskFrontmatter(content: string, frontmatter: any, body: string): Promise<string> {
    const taskId = frontmatter.task_id || this.extractIdFromFilename(content);
    
    // Create standardized frontmatter
    const standardized: any = {
      // Required metadata comment
      '# Task Metadata (YAML Frontmatter)': null,
      task_id: taskId,
      title: frontmatter.title || 'Untitled Task',
      status: this.mapStatus(frontmatter.status),
      priority: this.mapPriority(frontmatter.priority),
      type: frontmatter.type || this.detectTaskType(frontmatter.title || '', body),
      assignee: frontmatter.assignee || '',
      estimated_effort: frontmatter.estimated_effort || '',
      created: frontmatter.created || new Date().toISOString().split('T')[0],
      updated: new Date().toISOString(),
      dependencies: frontmatter.dependencies || [],
      tags: frontmatter.tags || []
    };
    
    // Add completed_at if task is completed
    if (standardized.status === 'completed') {
      standardized.completed_at = frontmatter.completed_at || new Date().toISOString();
    }
    
    // Reconstruct markdown
    const frontmatterYaml = yaml.dump(standardized, { indent: 2 });
    return `---\n${frontmatterYaml}---\n${body}`;
  }
}
