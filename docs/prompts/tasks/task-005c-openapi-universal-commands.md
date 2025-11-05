---
# Task Metadata (YAML Frontmatter)
task_id: "TASK-005c"
title: "OpenAPI Transformer & Universal Schema Commands"
updated: "2025-07-03T19:15:36-07:00"
---
**Last Updated**: July 2025

# OpenAPI Transformer & Universal Schema Commands

## Context

Completing the transformer foundation from Task-005a and Task-005b, this task adds **OpenAPI schema generation and universal CLI commands** for comprehensive multi-backend entity deployment.

**Foundation from Previous Tasks:**
- ✅ **ServiceTransformer Interface**: From Task-005a
- ✅ **ContentfulTransformer**: From Task-005a  
- ✅ **PostgreSQLTransformer**: From Task-005b
- ✅ **TransformerRegistry**: Plugin management system

**Target Completion:**
```bash
# Universal entity deployment to all backends
imajin schema create product --service contentful --recipe imajin-lighting
imajin schema create product --service postgres --recipe imajin-lighting  
imajin schema create product --service openapi --recipe imajin-lighting

# Universal schema operations
imajin schema deploy --recipe imajin-lighting --services contentful,postgres,openapi
imajin schema diff product --service-a contentful --service-b postgres
imajin schema migrate product --from contentful --to postgres
```

## Task Description

**Add OpenAPI transformer and universal schema CLI commands** to complete the multi-backend universal entity deployment system.

### Primary Objectives

1. **OpenAPITransformer**: Generate OpenAPI 3.0 schemas from universal entities
2. **Universal Schema Commands**: CLI interface for all transformer operations
3. **Multi-Service Operations**: Deploy, compare, migrate across all services
4. **Schema Documentation**: Automatic API documentation generation
5. **System Integration**: Complete the transformer architecture

## Acceptance Criteria

### 📋 **Phase 1: OpenAPI Transformer (Day 1)**

#### **OpenAPI Schema Generation**
- [ ] **OpenAPITransformer Class**: Implement ServiceTransformer interface
- [ ] **Schema Object Generation**: OpenAPI 3.0 schema definitions
- [ ] **Reference Handling**: Proper $ref relationships between entities
- [ ] **Validation Rules**: JSON Schema validation from universal fields

#### **OpenAPITransformer Implementation**
```typescript
// src/services/transformers/OpenAPITransformer.ts
export class OpenAPITransformer implements ServiceTransformer<UniversalEntity, OpenAPISchema> {
  serviceName = 'openapi';
  
  transform(entity: UniversalEntity): OpenAPISchema {
    return {
      type: 'object',
      title: this.capitalize(entity.name),
      description: `${entity.name} entity schema`,
      properties: this.transformFields(entity.fields),
      required: entity.fields.filter(f => f.required).map(f => f.name),
      additionalProperties: false
    };
  }
  
  private transformFields(fields: UniversalField[]): Record<string, OpenAPIProperty> {
    const properties: Record<string, OpenAPIProperty> = {};
    
    for (const field of fields) {
      properties[field.name] = this.transformField(field);
    }
    
    return properties;
  }
  
  private transformField(field: UniversalField): OpenAPIProperty {
    const baseSchema = this.mapFieldType(field.type);
    
    return {
      ...baseSchema,
      description: field.description,
      example: field.example,
      ...(field.default && { default: field.default })
    };
  }
  
  private mapFieldType(universalType: string): OpenAPIProperty {
    const typeMap = {
      'string': { type: 'string' },
      'text': { type: 'string', format: 'text' },
      'number': { type: 'integer' },
      'decimal': { type: 'number', format: 'float' },
      'boolean': { type: 'boolean' },
      'date': { type: 'string', format: 'date' },
      'datetime': { type: 'string', format: 'date-time' },
      'array': { type: 'array', items: { type: 'string' } },
      'json': { type: 'object' },
      'reference': { $ref: '#/components/schemas/Reference' },
      'enum': { type: 'string', enum: [] }
    };
    
    return typeMap[universalType] || { type: 'string' };
  }
}
```

### 📊 **Phase 2: Universal Schema Commands (Day 1)**

#### **Comprehensive CLI Interface**
- [ ] **Universal Deploy Command**: Deploy entities to multiple services
- [ ] **Schema Diff Command**: Compare schemas across services
- [ ] **Migration Command**: Move entities between services
- [ ] **Multi-Service Status**: Show entity deployment status

#### **Universal Schema Commands**
```typescript
// src/commands/UniversalSchemaCommands.ts
export function createUniversalSchemaCommands(): Command {
  const cmd = new Command('schema');
  
  cmd.command('create')
    .argument('<entityId>', 'Entity to create schema for')
    .option('-s, --service <service>', 'Target service (contentful, postgres, openapi)')
    .option('-r, --recipe <recipe>', 'Recipe to load entity from')
    .option('--dry-run', 'Show what would be created without executing')
    .action(async (entityId, options) => {
      const schemaService = container.resolve('universalSchemaService');
      
      if (options.dryRun) {
        await schemaService.previewDeploy(entityId, options.service, options.recipe);
      } else {
        await schemaService.deployEntity(entityId, options.service, options.recipe);
      }
    });
  
  cmd.command('deploy')
    .option('-r, --recipe <recipe>', 'Recipe to deploy all entities from')
    .option('-s, --services <services>', 'Comma-separated list of services')
    .option('--parallel', 'Deploy to all services simultaneously')
    .action(async (options) => {
      const services = options.services.split(',');
      const schemaService = container.resolve('universalSchemaService');
      
      if (options.parallel) {
        await schemaService.deployRecipeParallel(options.recipe, services);
      } else {
        await schemaService.deployRecipeSequential(options.recipe, services);
      }
    });
  
  cmd.command('diff')
    .argument('<entityId>', 'Entity to compare')
    .option('-a, --service-a <service>', 'First service to compare')
    .option('-b, --service-b <service>', 'Second service to compare')
    .option('--format <format>', 'Output format (table, json, yaml)', 'table')
    .action(async (entityId, options) => {
      const schemaService = container.resolve('universalSchemaService');
      const comparison = await schemaService.compareSchemas(
        entityId, 
        options.serviceA, 
        options.serviceB
      );
      
      this.displayComparison(comparison, options.format);
    });
  
  return cmd;
}
```

### 📈 **Phase 3: Enhanced Universal Schema Service (Day 1)**

#### **Multi-Service Operations**
- [ ] **Parallel Deployment**: Deploy to multiple services simultaneously
- [ ] **Rollback Support**: Undo deployments if they fail
- [ ] **Status Tracking**: Track deployment status across services
- [ ] **Health Monitoring**: Monitor schema health across all services

#### **Enhanced UniversalSchemaService**
```typescript
// src/services/schema/UniversalSchemaService.ts (enhanced from Task-005b)
export class UniversalSchemaService extends BaseService {
  async deployRecipeParallel(recipeId: string, services: string[]): Promise<void> {
    const recipe = await this.loadRecipe(recipeId);
    const entities = Object.keys(recipe.entities);
    
    console.log(`🚀 Deploying ${entities.length} entities to ${services.length} services...`);
    
    // Deploy all entities to all services in parallel
    const deploymentPromises = [];
    
    for (const entityId of entities) {
      for (const serviceName of services) {
        deploymentPromises.push(
          this.deployEntityWithRetry(entityId, serviceName, recipeId)
        );
      }
    }
    
    try {
      await Promise.all(deploymentPromises);
      console.log(`✅ Successfully deployed to all services`);
    } catch (error) {
      console.error(`❌ Deployment failed:`, error);
      // Optionally implement rollback
      await this.rollbackFailedDeployments();
      throw error;
    }
  }
  
  async getDeploymentStatus(recipeId: string): Promise<DeploymentStatus> {
    const recipe = await this.loadRecipe(recipeId);
    const entities = Object.keys(recipe.entities);
    const services = ['contentful', 'postgres', 'openapi'];
    
    const status: DeploymentStatus = {
      recipeId,
      entities: {},
      summary: { total: 0, deployed: 0, failed: 0 }
    };
    
    for (const entityId of entities) {
      status.entities[entityId] = {};
      
      for (const serviceName of services) {
        try {
          const service = this.container.resolve(`${serviceName}Service`);
          const exists = await service.schemaExists(entityId);
          
          status.entities[entityId][serviceName] = {
            deployed: exists,
            lastUpdated: exists ? await service.getLastUpdated(entityId) : null,
            healthy: exists ? await service.isSchemaHealthy(entityId) : false
          };
          
          status.summary.total++;
          if (exists) status.summary.deployed++;
        } catch (error) {
          status.entities[entityId][serviceName] = {
            deployed: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            healthy: false
          };
          status.summary.failed++;
        }
      }
    }
    
    return status;
  }
}
```

## Implementation Strategy

### Phase 1: OpenAPI Transformer (Day 1)

#### **Create OpenAPI Transformer**
```typescript
// Build final transformer using established ServiceTransformer pattern
// Generate valid OpenAPI 3.0 schema objects
// Handle complex relationships and validation rules
```

### Phase 2: Universal CLI Commands (Day 1)

#### **Complete CLI Interface**
```typescript
// Add comprehensive schema management commands
// Support all three transformers (contentful, postgres, openapi)
// Enable multi-service operations and comparisons
```

### Phase 3: System Integration (Day 1)

#### **Complete Transformer Architecture**
```typescript
// Register all transformers in TransformerRegistry
// Ensure all services work together seamlessly
// Add comprehensive error handling and rollback
```

## Success Metrics

### **Complete Multi-Backend Support**
- [ ] OpenAPI transformer generates valid OpenAPI 3.0 schemas
- [ ] All three transformers work together seamlessly
- [ ] Universal commands work with all service combinations
- [ ] Multi-service deployment completes successfully

### **Developer Experience**
- [ ] Single CLI interface for all schema operations
- [ ] Clear comparison output between different services
- [ ] Parallel deployment speeds up multi-service operations
- [ ] Comprehensive status reporting across all services

### **System Reliability**
- [ ] Rollback support for failed deployments
- [ ] Health monitoring for all deployed schemas
- [ ] Graceful error handling across all transformers
- [ ] Consistent behavior regardless of service combination

---

**Expected Delivery**: 1 working day  
**Priority**: Medium (completes transformer architecture)  
**Dependencies**: Task-005a (Contentful), Task-005b (PostgreSQL), Task-004 (BaseService)  
**Success Criteria**: Complete universal entity deployment system working across all three backends with comprehensive CLI interface 