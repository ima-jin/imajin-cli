/**
 * TaskValidationWorkflow - Validate tasks against current codebase
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
 * - Validate task assumptions against current codebase
 * - Detect architectural drift and outdated requirements
 * - Generate enhancement suggestions for tasks
 * - Integrate with task lifecycle management
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import type { TaskEntity } from '../commands/TaskMigrationCommand.js';

export interface TaskValidationResult {
  taskId: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: EnhancementSuggestion[];
}

export interface ValidationError {
  type: 'dependency' | 'assumption' | 'schema' | 'business_rule';
  field?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  type: 'outdated' | 'missing' | 'recommendation';
  field?: string;
  message: string;
  suggestion?: string;
}

export interface EnhancementSuggestion {
  type: 'optimization' | 'enhancement' | 'integration' | 'architecture';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface CodebaseAnalysis {
  files: string[];
  patterns: Record<string, string[]>;
  architecture: {
    services: string[];
    contexts: string[];
    patterns: string[];
  };
}

export class TaskValidationWorkflow {
  private codebaseAnalysis?: CodebaseAnalysis;

  constructor(private readonly projectRoot: string = process.cwd()) {}

  async validateTask(task: TaskEntity): Promise<TaskValidationResult> {
    const result: TaskValidationResult = {
      taskId: task.id,
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Ensure we have codebase analysis
    if (!this.codebaseAnalysis) {
      this.codebaseAnalysis = await this.analyzeCodebase();
    }

    // Validate dependencies
    await this.validateDependencies(task, result);

    // Validate assumptions against codebase
    await this.validateAssumptions(task, result);

    // Check business rules
    await this.validateBusinessRules(task, result);

    // Generate suggestions
    await this.generateSuggestions(task, result);

    // Determine overall validity
    result.valid = result.errors.filter(e => e.severity === 'error').length === 0;

    return result;
  }

  async validateAllTasks(tasks: TaskEntity[]): Promise<Record<string, TaskValidationResult>> {
    const results: Record<string, TaskValidationResult> = {};

    for (const task of tasks) {
      results[task.id] = await this.validateTask(task);
    }

    return results;
  }

  async enhanceTask(task: TaskEntity, options: EnhancementOptions = {}): Promise<TaskEntity> {
    const validation = await this.validateTask(task);
    
    if (!options.autoUpdate) {
      return task;
    }

    const enhanced = { ...task };

    // Apply dependency updates
    if (validation.suggestions.some(s => s.type === 'enhancement')) {
      enhanced.dependencies = await this.updateDependencies(task.dependencies);
    }

    // Update validation status
    enhanced.validationStatus = validation.valid ? 'valid' : 'outdated';
    enhanced.lastValidated = new Date();
    enhanced.enhancementSuggestions = validation.suggestions.map(s => s.description);

    return enhanced;
  }

  private async validateDependencies(task: TaskEntity, result: TaskValidationResult): Promise<void> {
    for (const depId of task.dependencies) {
      // Check if dependency exists
      const dependencyExists = await this.checkDependencyExists(depId);
      if (!dependencyExists) {
        result.errors.push({
          type: 'dependency',
          field: 'dependencies',
          message: `Dependency not found: ${depId}`,
          severity: 'error'
        });
      }

      // Check for circular dependencies
      const isCircular = await this.checkCircularDependency(task.id, depId);
      if (isCircular) {
        result.errors.push({
          type: 'dependency',
          field: 'dependencies',
          message: `Circular dependency detected: ${task.id} <-> ${depId}`,
          severity: 'error' 
        });
      }
    }
  }

  private async validateAssumptions(task: TaskEntity, result: TaskValidationResult): Promise<void> {
    const assumptions = this.extractAssumptions(task.description);
    
    for (const assumption of assumptions) {
      const isValid = await this.validateAssumption(assumption);
      if (!isValid) {
        result.warnings.push({
          type: 'outdated',
          message: `Outdated assumption: ${assumption}`,
          suggestion: `Consider updating task to reflect current ${assumption} implementation`
        });
      }
    }
  }

  private async validateBusinessRules(task: TaskEntity, result: TaskValidationResult): Promise<void> {
    // Critical priority tasks must have estimated effort
    if (task.priority === 'critical' && !task.estimatedEffort) {
      result.errors.push({
        type: 'business_rule',
        field: 'estimatedEffort',
        message: 'Critical priority tasks must have estimated effort',
        severity: 'warning'
      });
    }

    // In-progress tasks must have assignee
    if (task.status === 'in_progress' && !task.assignee) {
      result.errors.push({
        type: 'business_rule',
        field: 'assignee',
        message: 'In-progress tasks must have assignee',
        severity: 'warning'
      });
    }

    // Completed tasks must have completion date
    if (task.status === 'completed' && !task.completedAt) {
      result.errors.push({
        type: 'business_rule', 
        field: 'completedAt',
        message: 'Completed tasks must have completion timestamp',
        severity: 'error'
      });
    }

    // Blocked tasks should have blockedBy field
    if (task.status === 'blocked' && (!task.blockedBy || task.blockedBy.length === 0)) {
      result.warnings.push({
        type: 'recommendation',
        field: 'blockedBy',
        message: 'Blocked tasks should specify what is blocking them',
        suggestion: 'Add blockedBy field with blocking task IDs or external factors'
      });
    }
  }

  private async generateSuggestions(task: TaskEntity, result: TaskValidationResult): Promise<void> {
    // Suggest architecture documentation if missing
    if (task.type === 'architecture' && !task.architectureImpact) {
      result.suggestions.push({
        type: 'enhancement',
        description: 'Add architecture impact documentation for architecture tasks',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Suggest breaking down large tasks
    if (task.description.length > 2000) {
      result.suggestions.push({
        type: 'optimization',
        description: 'Consider breaking this large task into smaller, manageable subtasks',
        impact: 'high',
        effort: 'medium'
      });
    }

    // Suggest adding tags for better organization
    if (!task.tags || task.tags.length === 0) {
      result.suggestions.push({
        type: 'enhancement',
        description: 'Add tags for better task categorization and filtering',
        impact: 'low',
        effort: 'low'
      });
    }

    // Suggest milestone association for important tasks
    if (task.priority === 'high' || task.priority === 'critical') {
      result.suggestions.push({
        type: 'integration',
        description: 'Consider associating high-priority tasks with project milestones',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Suggest updating outdated tasks
    const daysSinceUpdate = Math.floor((Date.now() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate > 30 && task.status !== 'completed') {
      result.suggestions.push({
        type: 'optimization',
        description: `Task hasn't been updated in ${daysSinceUpdate} days - consider reviewing status and requirements`,
        impact: 'medium',
        effort: 'low'
      });
    }
  }

  private async analyzeCodebase(): Promise<CodebaseAnalysis> {
    const srcFiles = await this.findFiles(join(this.projectRoot, 'src'), '.ts');
    const patterns = await this.extractPatterns(srcFiles);
    
    return {
      files: srcFiles,
      patterns,
      architecture: {
        services: await this.findServices(),
        contexts: await this.findContexts(),
        patterns: await this.findArchitecturalPatterns()
      }
    };
  }

  private async findFiles(dir: string, extension: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...await this.findFiles(fullPath, extension));
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }

      return files;
    } catch {
      return [];
    }
  }

  private async extractPatterns(files: string[]): Promise<Record<string, string[]>> {
    const patterns: Record<string, string[]> = {
      services: [],
      contexts: [],
      commands: [],
      workflows: []
    };

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        
        // Extract service patterns
        if (content.includes('extends BaseService')) {
          patterns.services?.push(file);
        }

        // Extract context patterns
        if (content.includes('BusinessContext') || content.includes('Context')) {
          patterns.contexts?.push(file);
        }

        // Extract command patterns
        if (content.includes('extends BaseCommand') || content.includes('Command')) {
          patterns.commands?.push(file);
        }

        // Extract workflow patterns
        if (content.includes('Workflow')) {
          patterns.workflows?.push(file);
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return patterns;
  }

  private async findServices(): Promise<string[]> {
    const servicesDir = join(this.projectRoot, 'src', 'services');
    try {
      const entries = await readdir(servicesDir, { withFileTypes: true });
      return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    } catch {
      return [];
    }
  }

  private async findContexts(): Promise<string[]> {
    const contextDir = join(this.projectRoot, 'src', 'context');
    try {
      const files = await readdir(contextDir);
      return files.filter(file => file.endsWith('.ts')).map(file => file.replace('.ts', ''));
    } catch {
      return [];
    }
  }

  private async findArchitecturalPatterns(): Promise<string[]> {
    // Detect common architectural patterns in use
    const patterns: string[] = [];
    
    if (this.codebaseAnalysis?.patterns.services?.length) {
      patterns.push('service-provider-pattern');
    }
    
    if (this.codebaseAnalysis?.patterns.contexts?.length) {
      patterns.push('context-management');
    }
    
    if (this.codebaseAnalysis?.patterns.workflows?.length) {
      patterns.push('workflow-orchestration');
    }

    return patterns;
  }

  private extractAssumptions(description: string): string[] {
    const assumptions: string[] = [];
    
    const assumptionPatterns = [
      /assumes?\s+([^.]+)/gi,
      /expects?\s+([^.]+)/gi,
      /requires?\s+([^.]+)/gi,
      /depends on\s+([^.]+)/gi
    ];

    for (const pattern of assumptionPatterns) {
      const matches = description.match(pattern);
      if (matches) {
        assumptions.push(...matches.map(match => match.trim()));
      }
    }

    return assumptions;
  }

  private async validateAssumption(assumption: string): Promise<boolean> {
    // Basic assumption validation - could be enhanced with AI
    const lowerAssumption = assumption.toLowerCase();
    
    // Check if assumption mentions obsolete patterns
    const obsoletePatterns = [
      'single businesscontextmanager',
      'hardcoded in contentfulcommands',
      'manual markdown editing'
    ];

    return !obsoletePatterns.some(pattern => lowerAssumption.includes(pattern));
  }

  private async checkDependencyExists(depId: string): Promise<boolean> {
    // In a real implementation, this would check the actual task storage
    // For now, return true for known task patterns
    return depId.match(/^task-\d+[a-z]*$/) !== null;
  }

  private async checkCircularDependency(taskId: string, depId: string): Promise<boolean> {
    // Basic circular dependency check - could be enhanced with graph traversal
    return taskId === depId;
  }

  private async updateDependencies(dependencies: string[]): Promise<string[]> {
    // In a real implementation, this would resolve dependency changes
    return dependencies;
  }
}

export interface EnhancementOptions {
  autoUpdate?: boolean;
  updateDependencies?: boolean;
  generateSuggestions?: boolean;
}