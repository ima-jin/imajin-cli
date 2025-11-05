---
# Task Metadata (YAML Frontmatter)
task_id: "TASK-011"
title: "Task-as-Context Architecture: Tasks as Managed Business Entities"
updated: "2025-08-03T14:50:00Z"
priority: "CRITICAL"
type: "ARCHITECTURAL_SHIFT"
---
**Last Updated**: August 2025

**Status**: Ready for Implementation  
**Priority**: CRITICAL (Architectural Transformation - Foundation for Task Management)  
**Estimated Effort**: 5 hours  
**Dependencies**: Context system understanding, BusinessContextManager patterns  

## 🎯 **Objective**

Transform task management from static markdown files in the codebase to managed business entities using the same CLI patterns users learn for their business contexts. Tasks become first-class entities managed through the imajin-cli context system.

**⚠️ CRITICAL INSIGHT**: Tasks shouldn't live IN the codebase, they should BE the business context that the CLI manages. This is "eating your own dogfood" - using imajin-cli to manage imajin-cli development.

## 🔍 **Current State vs Target State**

### **Current Problem**
```
Tasks live in: docs/prompts/tasks/*.md  (static files in codebase)
Context lives in: ~/.imajin/business-context.yaml  (managed data)
Task management: Manual markdown editing
Lifecycle: No automated validation, enhancement, or workflow
```

### **Target Architecture**
```
Tasks ARE contexts: ~/.imajin/contexts/project-management/tasks/
Business contexts: ~/.imajin/contexts/lighting-business/
CLI manages both: Same patterns, same commands, same UX
Task management: imajin show tasks, imajin create task, etc.
```

## 🛠️ **Implementation Plan**

### **Phase 1: Analyze Current Task Storage** ⏱️ *30 minutes*

#### **1.1 Task Architecture Discovery**
```bash
# Discover current task architecture patterns
imajin analyze tasks --current-storage
imajin analyze contexts --patterns --compare-to=tasks

# Expected Output:
📊 Current Task Architecture:
- 22 tasks in docs/prompts/tasks/
- YAML frontmatter + Markdown content
- Git-versioned, static files
- No lifecycle management
- Manual dependency tracking

🎯 Target: Tasks as managed contexts
- Task entities (like member, product entities)  
- Business workflows for task management
- Same CLI patterns users already know
- Automated validation and enhancement
```

#### **1.2 Pattern Analysis**
```typescript
// Analyze existing patterns
interface CurrentTaskPattern {
  location: 'docs/prompts/tasks/*.md';
  format: 'YAML frontmatter + Markdown';
  management: 'manual';
  validation: 'none';
  relationships: 'implicit';
}

interface TargetTaskPattern {
  location: '~/.imajin/contexts/project-management/';
  format: 'BusinessEntity with YAML storage';
  management: 'CLI commands';
  validation: 'automated against codebase';
  relationships: 'explicit dependency graph';
}
```

### **Phase 2: Design Task-Context Integration** ⏱️ *45 minutes*

#### **2.1 Create Task Management Recipe**
```yaml
# ~/.imajin/recipes/project-management.json
{
  "name": "Project Management",
  "description": "Task and project management for software development",
  "businessType": "project-management",
  
  "display": {
    "subCode": "PROJ",
    "emoji": "📋",
    "color": "blue",
    "promptFormat": "[{subCode}] {name}$ "
  },
  
  "context": {
    "primaryEntities": ["task", "milestone", "dependency"],
    "keyMetrics": ["tasks_completed", "tasks_in_progress", "blocked_tasks"],
    "quickActions": ["show tasks", "create task", "validate tasks"]
  },
  
  "entities": {
    "task": {
      "fields": [
        { "name": "id", "type": "string", "required": true },
        { "name": "title", "type": "string", "required": true },
        { "name": "status", "type": "enum", "values": ["planned", "in_progress", "completed", "deferred"], "required": true },
        { "name": "priority", "type": "enum", "values": ["low", "medium", "high", "critical"], "required": true },
        { "name": "description", "type": "text", "required": true },
        { "name": "dependencies", "type": "array", "items": "string" },
        { "name": "architecture_impact", "type": "text" },
        { "name": "estimated_effort", "type": "string" },
        { "name": "actual_effort", "type": "string" },
        { "name": "assignee", "type": "string" },
        { "name": "created_at", "type": "datetime" },
        { "name": "updated_at", "type": "datetime" },
        { "name": "completed_at", "type": "datetime" }
      ],
      "businessRules": [
        "Tasks cannot be completed if dependencies are not completed",
        "Critical priority tasks must have estimated effort",
        "In-progress tasks must have assignee"
      ]
    },
    
    "milestone": {
      "fields": [
        { "name": "id", "type": "string", "required": true },
        { "name": "name", "type": "string", "required": true },
        { "name": "description", "type": "text" },
        { "name": "target_date", "type": "date" },
        { "name": "tasks", "type": "array", "items": "string" },
        { "name": "status", "type": "enum", "values": ["planned", "active", "completed", "deferred"] }
      ]
    }
  },
  
  "workflows": [
    {
      "name": "task-lifecycle",
      "description": "Manage task from creation to completion",
      "steps": [
        { "name": "validate_task", "action": "validate against current codebase" },
        { "name": "check_dependencies", "action": "verify prerequisite tasks" },
        { "name": "update_status", "action": "track progress and metrics" },
        { "name": "validate_completion", "action": "ensure task deliverables met" }
      ]
    },
    
    {
      "name": "task-enhancement",
      "description": "Keep tasks synchronized with codebase evolution",
      "steps": [
        { "name": "analyze_codebase", "action": "compare task assumptions to current architecture" },
        { "name": "identify_drift", "action": "find outdated requirements or missing dependencies" },
        { "name": "generate_enhancements", "action": "suggest task updates" },
        { "name": "apply_updates", "action": "update task documentation" }
      ]
    }
  ]
}
```

#### **2.2 Design Unified Entity Interface**
```typescript
// Tasks use same entity patterns as business entities
interface TaskEntity extends BusinessEntity {
  // Standard entity fields
  id: string;
  name: string; // maps to title
  
  // Task-specific fields
  status: 'planned' | 'in_progress' | 'completed' | 'deferred';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  dependencies: string[];
  
  // Lifecycle tracking
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Integration metadata
  architectureImpact?: string;
  estimatedEffort?: string;
  actualEffort?: string;
  
  // Validation state
  lastValidated?: Date;
  validationStatus?: 'valid' | 'outdated' | 'invalid';
  enhancementSuggestions?: string[];
}
```

### **Phase 3: Create Task Migration Strategy** ⏱️ *30 minutes*

#### **3.1 Migration Command Design**
```bash
# Create project management context
imajin context create project-management --recipe=project-management

# Switch to task management context
imajin my project-management

# Migrate existing tasks
imajin import tasks --source=filesystem --path=docs/prompts/tasks/

# Interactive migration with validation
imajin migrate tasks --from=docs/prompts/tasks --to=contexts/project-management --validate
```

#### **3.2 Migration Implementation**
```typescript
// src/commands/TaskMigrationCommand.ts
export class TaskMigrationCommand {
  async migrateTasksFromFilesystem(sourcePath: string, targetContext: string): Promise<MigrationResult> {
    const taskFiles = await this.findTaskFiles(sourcePath);
    const migrationResults: TaskMigrationResult[] = [];
    
    for (const taskFile of taskFiles) {
      try {
        // Parse existing task
        const content = await fs.readFile(taskFile, 'utf-8');
        const { frontmatter, body } = this.parseMarkdown(content);
        
        // Convert to task entity
        const taskEntity: TaskEntity = {
          id: frontmatter.task_id || this.extractIdFromFilename(taskFile),
          name: frontmatter.title,
          status: this.mapStatus(frontmatter.status),
          priority: this.mapPriority(frontmatter.priority),
          description: body,
          dependencies: this.extractDependencies(frontmatter, body),
          createdAt: new Date(frontmatter.updated || Date.now()),
          updatedAt: new Date(frontmatter.updated || Date.now()),
          architectureImpact: this.extractArchitectureImpact(body),
          estimatedEffort: frontmatter.estimated_effort
        };
        
        // Validate and save
        const validation = await this.validateTask(taskEntity);
        if (validation.valid) {
          await this.saveTaskEntity(targetContext, taskEntity);
          migrationResults.push({ taskId: taskEntity.id, status: 'success' });
        } else {
          migrationResults.push({ 
            taskId: taskEntity.id, 
            status: 'failed', 
            errors: validation.errors 
          });
        }
        
      } catch (error) {
        migrationResults.push({ 
          taskId: path.basename(taskFile), 
          status: 'error', 
          error: error.message 
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
  
  private extractDependencies(frontmatter: any, body: string): string[] {
    const dependencies: string[] = [];
    
    // Extract from frontmatter
    if (frontmatter.dependencies) {
      dependencies.push(...frontmatter.dependencies);
    }
    
    // Extract from body (Task-004, Task-005a, etc.)
    const dependencyPattern = /Task-(\d+[a-z]?)/gi;
    const matches = body.match(dependencyPattern);
    if (matches) {
      dependencies.push(...matches.map(m => m.toLowerCase()));
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }
}
```

### **Phase 4: Implement Task-Context Commands** ⏱️ *60 minutes*

#### **4.1 Unified Entity Commands**
```bash
# Same CLI patterns for tasks as business entities
imajin my project-management

# Task management commands
[PROJ] project-management$ imajin show tasks
[PROJ] project-management$ imajin show tasks --status=in_progress
[PROJ] project-management$ imajin create task "Implement context switching" --priority=high
[PROJ] project-management$ imajin update task-006 --status=in_progress --assignee=claude-code
[PROJ] project-management$ imajin get task-006
[PROJ] project-management$ imajin delete task-old-feature

# Task-specific commands
[PROJ] project-management$ imajin task validate 006 --against-codebase
[PROJ] project-management$ imajin task enhance 006 --auto-update
[PROJ] project-management$ imajin task dependencies 006 --show-graph
[PROJ] project-management$ imajin task complete 004d --with-notes="Performance testing completed"
```

#### **4.2 Task Validation Commands**
```bash
# Validate tasks against current codebase
[PROJ] project-management$ imajin task validate 006
📋 Task-006: Context Switching & Semantic Commands
✅ Dependencies: Task-004 (Service Architecture) - COMPLETE
❌ Assumptions: Single BusinessContextManager - OUTDATED  
⚠️  Missing: Context isolation architecture requirements
🔄 Status: NEEDS_ENHANCEMENT

# Auto-enhance tasks
[PROJ] project-management$ imajin task enhance 006 --auto-update
🤖 AI-Enhanced Analysis:
  - Context switching requires repository namespacing
  - Service isolation needs credential scoping
  - Data migration strategy missing

✅ Task-006 enhanced with current architecture requirements
```

#### **4.3 Task Workflow Commands**
```bash
# Run task workflows
[PROJ] project-management$ imajin workflow run task-lifecycle --entity=task-006
[PROJ] project-management$ imajin workflow run task-enhancement --entity=all

# Task reporting
[PROJ] project-management$ imajin tasks report --format=table
[PROJ] project-management$ imajin tasks metrics --show-velocity
```

### **Phase 5: Task Lifecycle Integration** ⏱️ *45 minutes*

#### **5.1 Task Validation System**
```typescript
// src/workflows/TaskValidationWorkflow.ts
export class TaskValidationWorkflow {
  async validateTaskAgainstCodebase(taskId: string): Promise<TaskValidationResult> {
    const task = await this.loadTask(taskId);
    const codebase = await this.analyzeCodebase();
    
    const validation = {
      taskId,
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
    
    // Validate dependencies
    for (const depId of task.dependencies) {
      const dependency = await this.loadTask(depId);
      if (!dependency) {
        validation.errors.push(`Dependency not found: ${depId}`);
        validation.valid = false;
      } else if (dependency.status !== 'completed') {
        validation.warnings.push(`Dependency not completed: ${depId}`);
      }
    }
    
    // Validate assumptions against codebase
    const assumptions = this.extractAssumptions(task.description);
    for (const assumption of assumptions) {
      const isValid = await this.validateAssumption(assumption, codebase);
      if (!isValid) {
        validation.warnings.push(`Outdated assumption: ${assumption}`);
        validation.suggestions.push(`Consider updating task to reflect current ${assumption} implementation`);
      }
    }
    
    return validation;
  }
  
  async enhanceTask(taskId: string, options: EnhancementOptions): Promise<void> {
    const validation = await this.validateTaskAgainstCodebase(taskId);
    
    if (options.autoUpdate && validation.suggestions.length > 0) {
      const enhancements = await this.generateEnhancements(taskId, validation);
      await this.applyEnhancements(taskId, enhancements);
    }
  }
}
```

#### **5.2 Task Workflow Integration**
```typescript
// src/workflows/TaskLifecycleWorkflow.ts
export class TaskLifecycleWorkflow extends BaseWorkflow {
  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    const { taskId } = context.parameters;
    
    // Step 1: Validate task
    const validation = await this.taskValidator.validateTaskAgainstCodebase(taskId);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    
    // Step 2: Check dependencies
    const dependencyCheck = await this.checkDependencies(taskId);
    if (!dependencyCheck.allSatisfied) {
      return { 
        success: false, 
        message: `Dependencies not met: ${dependencyCheck.missing.join(', ')}` 
      };
    }
    
    // Step 3: Update status and metrics
    await this.updateTaskMetrics(taskId);
    
    return { success: true, message: 'Task lifecycle validation completed' };
  }
}
```

## 📋 **Implementation Commands**

### **Quick Start Sequence**
```bash
# 1. Create project management context
imajin context create project-management --recipe=project-management

# 2. Switch to task management
imajin my project-management

# 3. Import existing tasks
imajin import tasks --source=docs/prompts/tasks/ --validate

# 4. Start using task management
imajin show tasks --status=planned
imajin create task "Test task management system" --priority=medium
imajin task validate --all
```

### **Daily Task Management**
```bash
# Switch to project context
imajin my project-management

# Check current tasks
imajin show tasks --status=in_progress --assignee=me

# Update task progress
imajin update task-011 --status=in_progress --notes="Implementation started"

# Validate tasks against codebase
imajin task validate --all --auto-enhance

# Create new task
imajin create task "Add task completion workflow" --priority=high --depends-on=task-011
```

## 📊 **Success Metrics**

### **Architecture Consistency**
- [ ] Tasks use same CLI patterns as business entities
- [ ] Task management commands follow imajin-cli conventions
- [ ] Context switching works seamlessly for project management
- [ ] Task validation integrates with codebase analysis

### **Workflow Integration**
- [ ] Task lifecycle automation working
- [ ] Dependency tracking functional
- [ ] Task enhancement workflow operational
- [ ] Validation against codebase accurate

### **Developer Experience**
- [ ] Task management feels natural and consistent
- [ ] Migration from markdown completed successfully
- [ ] Task workflows reduce manual maintenance overhead
- [ ] Enhanced task documents stay synchronized with codebase

## 🔗 **Dependencies & Impact**

**Prerequisites**: 
- Context system understanding
- BusinessContextManager patterns
- Recipe system functionality

**Enables**:
- Systematic task document lifecycle management
- Automated task validation and enhancement
- Consistent project management experience
- Self-hosted task management using imajin-cli patterns

**Architectural Impact**:
- Tasks become first-class business entities
- Same UX patterns for project and business management
- Local-first task storage with optional sync
- Automated task maintenance and validation

---

## 🚀 **Implementation Timeline**

**Phase 1**: 30 minutes - Analysis and discovery
**Phase 2**: 45 minutes - Recipe and entity design
**Phase 3**: 30 minutes - Migration strategy
**Phase 4**: 60 minutes - Command implementation
**Phase 5**: 45 minutes - Workflow integration

**Total Estimated Effort**: 3.5-4 hours for complete transformation

**Priority**: CRITICAL - This architectural shift enables systematic task management and creates consistency between project management and business entity management patterns.