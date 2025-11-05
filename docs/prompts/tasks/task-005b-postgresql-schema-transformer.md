---
# Task Metadata (YAML Frontmatter)
task_id: "TASK-005b"
title: "PostgreSQL Schema Transformer - Database Backend Support"
updated: "2025-07-03T19:15:36-07:00"
---
**Last Updated**: July 2025

# PostgreSQL Schema Transformer - Database Backend Support

## Context

Building on the transformer foundation from Task-005a, this task adds **PostgreSQL database backend support** to the universal entity deployment system. Users will be able to deploy the same business entities to both Contentful and PostgreSQL databases.

**Foundation from Task-005a:**
- ✅ **ServiceTransformer Interface**: Plugin contract established
- ✅ **UniversalEntity Interface**: Compatible with Task-006/007 
- ✅ **ContentfulTransformer**: Working transformer pattern
- ✅ **TransformerRegistry**: Plugin management system

**Current State:**
```bash
# Only Contentful deployment available
imajin schema create product --service contentful --recipe imajin-lighting
```

**Target State:**
```bash
# Universal entity deployment to multiple backends
imajin schema create product --service contentful --recipe imajin-lighting
imajin schema create product --service postgres --recipe imajin-lighting
imajin schema diff product --service-a contentful --service-b postgres
```

## Task Description

**Add PostgreSQL transformer to enable universal entity deployment to PostgreSQL databases** using the transformer pattern established in Task-005a.

**Core Vision**: Extend from Contentful-only schema management to **multi-backend universal deployment** where the same business entity generates appropriate database schemas.

### Primary Objectives

1. **PostgreSQLTransformer**: Deploy entities to PostgreSQL databases
2. **Database Schema Generation**: CREATE TABLE statements from universal entities
3. **Type Mapping System**: Universal types → PostgreSQL column types
4. **Migration Support**: ALTER TABLE for schema changes
5. **Cross-Service Operations**: Compare and migrate schemas between services

## Acceptance Criteria

### 📋 **Phase 1: PostgreSQL Transformer (Day 1)**

#### **Database Schema Generation**
- [ ] **PostgreSQLTransformer Class**: Implement ServiceTransformer interface
- [ ] **Type Mapping**: Universal field types → PostgreSQL column types
- [ ] **Index Generation**: Automatic indexes for common field patterns
- [ ] **Constraint Generation**: Primary keys, foreign keys, unique constraints

#### **PostgreSQL Type Mapping**
```typescript
// Universal → PostgreSQL type mapping
const TYPE_MAPPINGS = {
  'string': 'VARCHAR(255)',
  'text': 'TEXT',
  'number': 'INTEGER',
  'decimal': 'DECIMAL(10,2)',
  'boolean': 'BOOLEAN',
  'date': 'DATE',
  'datetime': 'TIMESTAMP',
  'array': 'JSONB',
  'json': 'JSONB',
  'reference': 'INTEGER', // Foreign key
  'enum': 'VARCHAR(50)'   // With CHECK constraint
};
```

#### **PostgreSQLTransformer Implementation**
```typescript
// src/services/transformers/PostgreSQLTransformer.ts
export class PostgreSQLTransformer implements ServiceTransformer<UniversalEntity, PostgreSQLTable> {
  serviceName = 'postgresql';
  
  transform(entity: UniversalEntity): PostgreSQLTable {
    return {
      tableName: entity.id,
      columns: [
        { name: 'id', type: 'SERIAL PRIMARY KEY' },
        ...entity.fields.map(field => this.transformField(field)),
        { name: 'created_at', type: 'TIMESTAMP DEFAULT NOW()' },
        { name: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()' }
      ],
      indexes: this.generateIndexes(entity),
      constraints: this.generateConstraints(entity),
      triggers: this.generateTriggers(entity)
    };
  }
  
  reverse(table: PostgreSQLTable): UniversalEntity {
    return {
      id: table.tableName,
      name: table.tableName,
      fields: table.columns
        .filter(col => !['id', 'created_at', 'updated_at'].includes(col.name))
        .map(col => this.reverseTransformColumn(col))
    };
  }
  
  validateTransformation(entity: UniversalEntity): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Check for PostgreSQL reserved words
    if (this.isReservedWord(entity.id)) {
      errors.push({
        field: 'id',
        message: `Table name '${entity.id}' is a PostgreSQL reserved word`,
        severity: 'error'
      });
    }
    
    // Validate field types
    for (const field of entity.fields) {
      if (!this.isFieldTypeSupported(field.type)) {
        errors.push({
          field: field.name,
          message: `Field type '${field.type}' not supported by PostgreSQL transformer`,
          severity: 'error'
        });
      }
      
      // Check field name length (PostgreSQL limit: 63 characters)
      if (field.name.length > 63) {
        errors.push({
          field: field.name,
          message: `Field name '${field.name}' exceeds PostgreSQL limit of 63 characters`,
          severity: 'error'
        });
      }
    }
    
    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings: errors.filter(e => e.severity === 'warning')
    };
  }
  
  generateSQL(table: PostgreSQLTable): string {
    const columns = table.columns.map(col => 
      `  ${col.name} ${col.type}${col.nullable === false ? ' NOT NULL' : ''}`
    ).join(',\n');
    
    let sql = `CREATE TABLE ${table.tableName} (\n${columns}\n);`;
    
    // Add indexes
    for (const index of table.indexes) {
      sql += `\n\nCREATE INDEX ${index.name} ON ${table.tableName} (${index.columns.join(', ')});`;
    }
    
    // Add constraints
    for (const constraint of table.constraints) {
      sql += `\n\nALTER TABLE ${table.tableName} ADD CONSTRAINT ${constraint.name} ${constraint.definition};`;
    }
    
    return sql;
  }
  
  private transformField(field: UniversalField): PostgreSQLColumn {
    const baseType = this.mapFieldType(field.type);
    
    return {
      name: field.name,
      type: this.applyFieldModifiers(baseType, field),
      nullable: !field.required,
      defaultValue: field.default,
      comment: field.description
    };
  }
  
  private mapFieldType(universalType: string): string {
    const typeMap = {
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'number': 'INTEGER',
      'decimal': 'DECIMAL(10,2)',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'TIMESTAMP',
      'array': 'JSONB',
      'json': 'JSONB',
      'reference': 'INTEGER',
      'enum': 'VARCHAR(50)'
    };
    
    return typeMap[universalType] || 'TEXT';
  }
  
  private generateIndexes(entity: UniversalEntity): PostgreSQLIndex[] {
    const indexes: PostgreSQLIndex[] = [];
    
    // Create indexes for commonly queried fields
    const indexableTypes = ['string', 'number', 'date', 'datetime', 'enum'];
    
    for (const field of entity.fields) {
      if (indexableTypes.includes(field.type) && field.required) {
        indexes.push({
          name: `idx_${entity.id}_${field.name}`,
          columns: [field.name],
          type: 'btree'
        });
      }
    }
    
    // Create indexes for foreign key relationships
    for (const relationship of entity.relationships || []) {
      if (relationship.type === 'belongsTo') {
        indexes.push({
          name: `idx_${entity.id}_${relationship.foreignKey || relationship.entity + '_id'}`,
          columns: [relationship.foreignKey || relationship.entity + '_id'],
          type: 'btree'
        });
      }
    }
    
    return indexes;
  }
}
```

### 📊 **Phase 2: Database Service Integration (Day 1)**

#### **PostgreSQL Service**
- [ ] **PostgreSQLService**: Extend BaseService for database operations
- [ ] **Connection Management**: Database connection pooling
- [ ] **Schema Operations**: CREATE, ALTER, DROP operations
- [ ] **Migration Support**: Track and apply schema changes

#### **PostgreSQLService Implementation**
```typescript
// src/services/postgresql/PostgreSQLService.ts
export class PostgreSQLService extends BaseService {
  private pool: Pool;
  private transformer: PostgreSQLTransformer;
  
  constructor(container: Container, config: PostgreSQLConfig & ServiceConfig) {
    super(container, config);
    this.transformer = new PostgreSQLTransformer();
    this.initializePool();
  }
  
  async createSchema(entity: UniversalEntity): Promise<PostgreSQLTable> {
    // Validate transformation
    const validation = this.transformer.validateTransformation(entity);
    if (!validation.valid) {
      throw new Error(`Invalid entity for PostgreSQL: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    // Transform to PostgreSQL schema
    const table = this.transformer.transform(entity);
    
    // Generate and execute SQL
    const sql = this.transformer.generateSQL(table);
    await this.executeSQL(sql);
    
    // Track metrics (Task-000 BaseService)
    this.incrementMetric('tables.created');
    
    return table;
  }
  
  async getSchema(tableName: string): Promise<UniversalEntity> {
    const tableInfo = await this.getTableInfo(tableName);
    return this.transformer.reverse(tableInfo);
  }
  
  async schemaExists(tableName: string): Promise<boolean> {
    const result = await this.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    
    return result.rows[0].exists;
  }
  
  async dropSchema(tableName: string): Promise<void> {
    await this.executeSQL(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
    this.incrementMetric('tables.dropped');
  }
  
  protected async onHealthCheck(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];
    
    try {
      // Test database connectivity
      await this.pool.query('SELECT 1');
      checks.push({
        name: 'postgresql-connection',
        healthy: true,
        message: 'Database connection successful'
      });
    } catch (error) {
      checks.push({
        name: 'postgresql-connection',
        healthy: false,
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    return checks;
  }
}
```

### 📈 **Phase 3: Cross-Service Operations (Day 1)**

#### **Schema Comparison & Migration**
- [ ] **Schema Diff**: Compare entity schemas between different services
- [ ] **Migration Commands**: Move entities between service backends
- [ ] **Validation**: Ensure cross-service compatibility
- [ ] **Data Migration**: Optional data transfer between services

#### **UniversalSchemaService**
```typescript
// src/services/schema/UniversalSchemaService.ts
export class UniversalSchemaService extends BaseService {
  private transformerRegistry: TransformerRegistry;
  
  async deployEntity(
    entityId: string,
    serviceName: string,
    recipeId: string
  ): Promise<void> {
    // Load entity from recipe
    const entity = await this.loadEntityFromRecipe(entityId, recipeId);
    
    // Get service and deploy
    const service = this.container.resolve(`${serviceName}Service`);
    await service.createSchema(entity);
    
    console.log(`✅ Deployed ${entityId} to ${serviceName}`);
  }
  
  async compareSchemas(
    entityId: string,
    serviceA: string,
    serviceB: string
  ): Promise<SchemaComparison> {
    // Get schemas from both services
    const serviceAInstance = this.container.resolve(`${serviceA}Service`);
    const serviceBInstance = this.container.resolve(`${serviceB}Service`);
    
    const schemaA = await serviceAInstance.getSchema(entityId);
    const schemaB = await serviceBInstance.getSchema(entityId);
    
    // Compare universal entities
    return this.diffEntities(schemaA, schemaB);
  }
  
  async migrateEntity(
    entityId: string,
    fromService: string,
    toService: string,
    includeData: boolean = false
  ): Promise<void> {
    // Get current schema from source
    const sourceService = this.container.resolve(`${fromService}Service`);
    const currentSchema = await sourceService.getSchema(entityId);
    
    // Deploy to target service
    const targetService = this.container.resolve(`${toService}Service`);
    await targetService.createSchema(currentSchema);
    
    if (includeData) {
      await this.migrateData(entityId, fromService, toService);
    }
    
    console.log(`✅ Migrated ${entityId} from ${fromService} to ${toService}`);
  }
}
```

#### **Schema Management Commands**
```bash
# Universal entity deployment
imajin schema create product --service postgres --recipe imajin-lighting
imajin schema create member --service postgres --recipe community-platform

# Cross-service operations
imajin schema migrate product --from contentful --to postgres
imajin schema diff product --service-a contentful --service-b postgres

# Multi-service deployment
imajin schema deploy --recipe imajin-lighting --services contentful,postgres
```

## Implementation Strategy

### Phase 1: PostgreSQL Transformer (Day 1)

#### **Create PostgreSQL Transformer**
```typescript
// Build on ServiceTransformer interface from Task-005a
// Implement transform(), reverse(), validateTransformation()
// Add PostgreSQL-specific methods for SQL generation
```

#### **Type System Integration**
```typescript
// Map universal field types to PostgreSQL types
// Handle special cases (enums, arrays, references)
// Generate appropriate constraints and indexes
```

### Phase 2: Service Integration (Day 1)

#### **Create PostgreSQLService**
```typescript
// Extend BaseService (Task-000 compliance)
// Use PostgreSQLTransformer for schema operations
// Implement health checks and metrics
```

#### **Database Operations**
```typescript
// Connection pooling with pg package
// Schema introspection for reverse transformation
// Migration support for schema changes
```

### Phase 3: Universal Commands (Day 1)

#### **Schema Management CLI**
```typescript
// Add universal schema commands
// Cross-service diff and migration
// Multi-service deployment
```

## Technical Requirements

### **Database Configuration**
```typescript
// src/types/PostgreSQL.ts
export interface PostgreSQLConfig extends ServiceConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
}
```

### **Recipe Integration**
```typescript
// Use same recipe system as Task-005a
// Universal entities work with both Contentful and PostgreSQL
// No changes to existing recipe files needed
```

### **Service Provider Registration**
```typescript
// src/services/postgresql/PostgreSQLServiceProvider.ts
export class PostgreSQLServiceProvider extends ServiceProvider {
  async register(): Promise<void> {
    // Register PostgreSQL service
    this.postgresService = new PostgreSQLService(this.container, config);
    
    // Register transformer
    const transformerRegistry = this.container.resolve('transformerRegistry');
    transformerRegistry.register(new PostgreSQLTransformer());
  }
}
```

## Success Metrics

### **Multi-Backend Support**
- [ ] PostgreSQL transformer creates valid database schemas
- [ ] Same entity deployed to both Contentful and PostgreSQL successfully
- [ ] Schema comparison shows meaningful differences between services
- [ ] Cross-service migration works without data loss

### **Database Operations**
- [ ] CREATE TABLE statements generated correctly
- [ ] Indexes and constraints applied appropriately
- [ ] Schema introspection recreates universal entities accurately
- [ ] Connection pooling and health checks working

### **Developer Experience**
- [ ] Clear validation errors for PostgreSQL-specific limitations
- [ ] SQL generation produces readable, optimized schemas
- [ ] Cross-service operations have intuitive CLI interface
- [ ] Universal entity definitions work seamlessly with both services

---

**Expected Delivery**: 1 working day  
**Priority**: Medium (builds on Task-005a foundation)  
**Dependencies**: Task-005a (ContentfulTransformer foundation), Task-004 (BaseService)  
**Success Criteria**: PostgreSQL transformer working with universal entity deployment and cross-service operations

**Next Steps**: Task-005c (OpenAPI Transformer + Universal Commands) 