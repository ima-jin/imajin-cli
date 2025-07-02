---
# Task Metadata (YAML Frontmatter)
task_id: "TASK-005a"
title: "Extract Contentful Schema Transformer - Plugin Architecture Foundation"
updated: "2025-06-29T12:00:00-00:00"
---
**Last Updated**: June 2025

# Extract Contentful Schema Transformer - Plugin Architecture Foundation

## Context

The imajin-cli project has mature recipe-driven schema management working with Contentful, but it's embedded in service-specific code. This task **extracts the Contentful transformer into a plugin architecture** as the foundation for universal entity deployment across multiple backends.

**Current Architecture Achievement:**
- ✅ **Recipe System**: Imajin lighting and other business templates
- ✅ **Contentful Integration**: Recipe → Contentful content type creation
- ✅ **Universal Entity Definitions**: Business entities defined service-agnostically
- ✅ **BaseService Architecture**: From Task-004 - proper service foundation

**Current Implementation:**
```typescript
// Hardcoded in ContentfulCommands.ts
convertRecipeToContentfulTypes(recipe: Recipe): Promise<ContentfulContentType[]>
```

**Target Plugin Pattern:**
```typescript
// Pluggable transformer (foundation for Task-005b, 005c)
class ContentfulTransformer implements ServiceTransformer<UniversalEntity, ContentfulContentType>
```

## Task Description

**Extract schema transformation logic into a pluggable ContentfulTransformer** as the foundation pattern for universal entity deployment to multiple service backends.

**Core Vision**: Transform from Contentful-specific schema management to **plugin-based schema transformation foundation** where the same business entity can be deployed to multiple backends.

**Scope**: This task focuses ONLY on extracting the ContentfulTransformer. Additional transformers (PostgreSQL, OpenAPI) will be handled in Task-005b and Task-005c.

### Primary Objectives

1. **Extract ContentfulTransformer**: Move existing logic into pluggable transformer
2. **Create ServiceTransformer Interface**: Contract for all service transformers
3. **Unified UniversalEntity Interface**: Compatible with Task-006/007 requirements
4. **Validation System**: Ensure transformations are valid
5. **Backward Compatibility**: Existing Contentful functionality continues working

## Acceptance Criteria

### 📋 **Phase 1: Transformer Interface Design (Day 1)**

#### **Unified Universal Entity Interface**
- [ ] **UniversalEntity Interface**: Standardize entity definitions (compatible with Task-006/007)
- [ ] **ServiceTransformer Interface**: Contract for all service transformers
- [ ] **Validation Framework**: Ensure transformations are valid
- [ ] **Error Handling**: Graceful transformation error management

#### **Unified Entity Architecture**
```typescript
// Compatible with Task-006 (context) and Task-007 (temporal)
interface UniversalEntity {
  // Core entity definition
  id: string;
  name: string;
  fields: UniversalField[];
  businessRules?: string[];
  relationships?: EntityRelationship[];
  
  // Context metadata (Task-006 compatibility)
  contextId?: string;
  
  // Service contexts (Task-007 temporal compatibility)
  serviceContexts?: Map<string, ServiceContext>;
  rawData?: Record<string, any>;
  
  // Recipe metadata
  recipeId?: string;
  metadata?: Record<string, any>;
}

interface ServiceTransformer<TSource, TTarget> {
  serviceName: string;
  transform(source: TSource): TTarget;
  reverse(target: TTarget): TSource;
  validateTransformation(source: TSource): ValidationResult;
  
  // Task-000 BaseService integration
  getHealth(): Promise<TransformerHealth>;
  getMetrics(): TransformerMetrics;
}
```

### 📊 **Phase 2: ContentfulTransformer Extraction (Day 1)**

#### **Extract Existing Logic**
- [ ] **ContentfulTransformer Class**: Extract from ContentfulCommands.ts
- [ ] **Field Type Mapping**: Universal types → Contentful field types
- [ ] **Relationship Handling**: Entity relationships → Contentful references
- [ ] **Validation Rules**: Universal validation → Contentful validation

#### **ContentfulTransformer Implementation**
```typescript
// src/services/transformers/ContentfulTransformer.ts
export class ContentfulTransformer implements ServiceTransformer<UniversalEntity, ContentfulContentType> {
  serviceName = 'contentful';
  
  transform(entity: UniversalEntity): ContentfulContentType {
    return {
      id: entity.id,
      name: this.capitalize(entity.name),
      description: `${entity.name} content type`,
      fields: entity.fields.map(field => this.transformField(field)),
      metadata: this.transformMetadata(entity.metadata)
    };
  }
  
  reverse(contentType: ContentfulContentType): UniversalEntity {
    return {
      id: contentType.id,
      name: contentType.name.toLowerCase(),
      fields: contentType.fields.map(field => this.reverseTransformField(field)),
      metadata: this.reverseTransformMetadata(contentType.metadata)
    };
  }
  
  validateTransformation(entity: UniversalEntity): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Validate field types are supported
    for (const field of entity.fields) {
      if (!this.isFieldTypeSupported(field.type)) {
        errors.push({
          field: field.name,
          message: `Field type '${field.type}' not supported by Contentful`,
          severity: 'error'
        });
      }
    }
    
    // Validate entity relationships
    for (const relationship of entity.relationships || []) {
      if (!this.isRelationshipSupported(relationship)) {
        errors.push({
          field: relationship.entity,
          message: `Relationship type '${relationship.type}' not supported`,
          severity: 'warning'
        });
      }
    }
    
    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings: errors.filter(e => e.severity === 'warning')
    };
  }
  
  private transformField(field: UniversalField): ContentfulField {
    return {
      id: field.name,
      name: this.capitalize(field.name),
      type: this.mapFieldType(field.type),
      required: field.required || false,
      ...this.handleSpecialTypes(field)
    };
  }
  
  private mapFieldType(universalType: string): string {
    const typeMap = {
      'string': 'Symbol',
      'text': 'Text',
      'number': 'Integer',
      'boolean': 'Boolean',
      'date': 'Date',
      'array': 'Array',
      'reference': 'Link',
      'enum': 'Symbol'
    };
    
    return typeMap[universalType] || 'Symbol';
  }
  
  // Task-000 BaseService integration
  async getHealth(): Promise<TransformerHealth> {
    return {
      serviceName: this.serviceName,
      healthy: true,
      message: 'ContentfulTransformer operational',
      lastChecked: new Date()
    };
  }
  
  getMetrics(): TransformerMetrics {
    return {
      transformationsPerformed: this.transformationCount,
      errorsEncountered: this.errorCount,
      avgTransformationTime: this.avgTime
    };
  }
}
```

### 📈 **Phase 3: Integration & Testing (Day 1)**

#### **Service Integration**
- [ ] **TransformerRegistry**: Register and manage transformers
- [ ] **ContentfulService Integration**: Use transformer in existing service
- [ ] **Command Updates**: Update existing commands to use transformer
- [ ] **Backward Compatibility**: Ensure existing functionality works

#### **Enhanced ContentfulService**
```typescript
// Update existing src/services/contentful/ContentfulService.ts
export class ContentfulService extends BaseService {
  private transformer: ContentfulTransformer;
  
  constructor(container: Container, config: ContentfulConfig & ServiceConfig) {
    super(container, config);
    this.transformer = new ContentfulTransformer();
  }
  
  async createContentType(entity: UniversalEntity): Promise<ContentfulContentType> {
    // Validate transformation
    const validation = this.transformer.validateTransformation(entity);
    if (!validation.valid) {
      throw new Error(`Invalid entity for Contentful: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    // Transform to Contentful schema
    const contentType = this.transformer.transform(entity);
    
    // Create in Contentful
    const result = await this.contentfulManagement.contentType.create(contentType);
    
    // Track metrics (Task-000 BaseService)
    this.incrementMetric('contentTypes.created');
    
    return result;
  }
  
  async getUniversalEntity(contentTypeId: string): Promise<UniversalEntity> {
    const contentType = await this.contentfulManagement.contentType.get(contentTypeId);
    return this.transformer.reverse(contentType);
  }
}
```

#### **Transformer Registry**
```typescript
// src/services/transformers/TransformerRegistry.ts
export class TransformerRegistry {
  private transformers: Map<string, ServiceTransformer<any, any>> = new Map();
  
  register<T, U>(transformer: ServiceTransformer<T, U>): void {
    this.transformers.set(transformer.serviceName, transformer);
  }
  
  getTransformer<T, U>(serviceName: string): ServiceTransformer<T, U> | null {
    return this.transformers.get(serviceName) || null;
  }
  
  async validateAllTransformers(): Promise<Record<string, TransformerHealth>> {
    const health: Record<string, TransformerHealth> = {};
    
    for (const [name, transformer] of this.transformers) {
      if ('getHealth' in transformer) {
        health[name] = await transformer.getHealth();
      }
    }
    
    return health;
  }
}
```

## Implementation Strategy

### Phase 1: Extract Transformer Interface (Day 1)

#### **Create Base Interfaces**
```typescript
// src/services/transformers/ServiceTransformer.ts
export interface ServiceTransformer<TSource, TTarget> {
  serviceName: string;
  transform(source: TSource): TTarget;
  reverse(target: TTarget): TSource;
  validateTransformation(source: TSource): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}
```

### Phase 2: Extract ContentfulTransformer (Day 1)

#### **Move Logic from ContentfulCommands.ts**
1. **Identify transformation logic** in existing ContentfulCommands.ts
2. **Extract field mapping functions** into ContentfulTransformer
3. **Move validation logic** into validateTransformation method
4. **Create reverse transformation** for round-trip compatibility

### Phase 3: Update Integration Points (Day 1)

#### **Update ContentfulService**
```typescript
// Minimal changes to existing ContentfulService
// Add transformer property and use it for schema operations
// Maintain all existing functionality
```

#### **Update ContentfulCommands**
```typescript
// Update commands to use ContentfulService with transformer
// No breaking changes to CLI interface
// Add validation feedback for transformations
```

## Technical Requirements

### **Integration with Existing Architecture**
```typescript
// Register transformer in service provider
export class ContentfulServiceProvider extends ServiceProvider {
  async register(): Promise<void> {
    // Existing service registration
    this.contentfulService = new ContentfulService(this.container, config);
    
    // Register transformer
    const transformerRegistry = this.container.resolve('transformerRegistry');
    transformerRegistry.register(new ContentfulTransformer());
  }
}
```

### **Recipe Integration** 
```typescript
// Leverage existing recipe system
const recipeManager = container.resolve('recipeManager');
const imajinLighting = await recipeManager.getRecipe('imajin-lighting');

// Universal entities come from recipes (compatible with Task-006/007)
const productEntity: UniversalEntity = {
  id: 'product',
  name: 'product',
  fields: imajinLighting.entities.product.fields,
  businessRules: imajinLighting.businessRules,
  contextId: 'imajin-lighting', // Task-006 integration
  recipeId: 'imajin-lighting'
};
```

### **Backward Compatibility**
```typescript
// All existing Contentful functionality continues working
// Commands maintain same interface
// No breaking changes to ContentfulService public API
// Transformations happen internally, transparent to users
```

## Success Metrics

### **Plugin Architecture Foundation**
- [ ] ContentfulTransformer extracted and working independently
- [ ] ServiceTransformer interface ready for additional transformers (Task-005b, 005c)
- [ ] UniversalEntity interface compatible with Task-006/007 requirements
- [ ] Validation system provides clear transformation feedback

### **System Integration**
- [ ] Existing Contentful functionality continues working unchanged
- [ ] ContentfulService uses transformer internally
- [ ] Recipe system works with new UniversalEntity interface
- [ ] Task-000 BaseService architecture properly integrated

### **Developer Experience**
- [ ] Clear separation between universal entities and service-specific schemas
- [ ] Comprehensive validation errors when transformations fail
- [ ] Simple interface for adding new transformers in future tasks
- [ ] No breaking changes to existing CLI commands

---

**Expected Delivery**: 1 working day  
**Priority**: Medium (foundation for Task-005b, 005c)  
**Dependencies**: Task-004 (Service Architecture), Recipe system  
**Success Criteria**: ContentfulTransformer extracted into plugin architecture with UniversalEntity interface compatible with Task-006/007 requirements

**Next Steps**: Task-005b (PostgreSQL Transformer), Task-005c (OpenAPI Transformer + Universal Commands)