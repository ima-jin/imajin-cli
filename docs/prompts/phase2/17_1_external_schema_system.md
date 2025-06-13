# 🗂️ IMPLEMENT: External Schema System

**Status:** ⏳ **PENDING**  
**Phase:** 2 - Infrastructure Components  
**Estimated Time:** 8-10 hours  
**Dependencies:** Prompt 17 (Stripe Connector), Universal Element System  

---

## CONTEXT
Implement an external schema definition system that moves hardcoded Universal types to external YAML/JSON files, enabling community-driven schema evolution, industry-specific entity definitions, and dynamic schema loading without code changes.

## ARCHITECTURAL VISION
Transform the current 5 hardcoded Universal schemas into a flexible, external schema system that:
- Enables community collaboration on business entity standards
- Supports industry-specific schema extensions
- Provides runtime schema validation and type generation
- Maintains backward compatibility with existing Universal types
- Establishes foundation for schema marketplace and versioning

## 🧹 **MIGRATION PHASE - CURRENT STATE ANALYSIS**

**CRITICAL: Audit existing Universal schema inconsistencies:**

### **Current Hardcoded Schemas (5 total):**
1. **UniversalElement** (interface) - Base entity interface
2. **UniversalCustomer** (Zod) - Core customer entity  
3. **UniversalPayment** (Zod) - Financial transaction entity
4. **UniversalContact** (Zod) - Communication/relationship entity
5. **UniversalSubscription** (Zod) - Recurring service entity

### **Schema Inconsistencies to Fix:**
1. **Date fields**: `createdAt` vs `created` naming inconsistency
2. **Source fields**: `sourceService` vs `source` naming inconsistency  
3. **Customer vs Contact**: Overlapping entities with different structures
4. **Metadata patterns**: Optional vs required, different structures

### **Prepare Foundation:**
1. Analyze field usage across all services
2. Design unified field naming conventions
3. Plan backward compatibility strategy
4. Establish schema versioning approach

**SUCCESS CRITERIA:** Clean, consistent external schema definitions ready for community evolution.

---

## DELIVERABLES
1. `schemas/universal/` - External schema definition directory
2. `src/schemas/SchemaRegistry.ts` - Dynamic schema loading system
3. `src/schemas/SchemaValidator.ts` - Runtime validation engine
4. `src/schemas/TypeGenerator.ts` - TypeScript type generation
5. `src/schemas/SchemaLoader.ts` - YAML/JSON schema parser
6. Migration scripts and backward compatibility layer

## IMPLEMENTATION REQUIREMENTS

### 1. External Schema File Structure
```yaml
# schemas/universal/core.yaml
version: "1.0.0"
namespace: "universal"
description: "Core business entities for cross-service compatibility"

entities:
  Element:
    description: "Base interface for all universal entities"
    type: "interface"
    fields:
      id: { type: "string", required: true, description: "Unique identifier" }
      createdAt: { type: "datetime", required: true, description: "Creation timestamp" }
      updatedAt: { type: "datetime", required: true, description: "Last update timestamp" }
      metadata: { type: "object", required: false, description: "Additional metadata" }
      serviceData: { type: "object", required: false, description: "Service-specific data" }
      sourceService: { type: "string", required: true, description: "Originating service" }

  Customer:
    description: "Universal customer/user entity"
    extends: "Element"
    fields:
      email: { type: "email", required: true, description: "Customer email address" }
      name: { type: "string", required: false, description: "Customer full name" }
      phone: { type: "string", required: false, description: "Customer phone number" }
      
  Payment:
    description: "Universal payment transaction entity"
    extends: "Element"
    fields:
      amount: { type: "number", required: true, min: 0, description: "Payment amount" }
      currency: { type: "string", required: true, pattern: "^[A-Z]{3}$", description: "ISO currency code" }
      status: { type: "enum", required: true, values: ["pending", "completed", "failed", "cancelled"] }
      customerId: { type: "string", required: false, description: "Associated customer ID" }
      description: { type: "string", required: false, description: "Payment description" }
```

### 2. Schema Registry System
```typescript
interface SchemaRegistry {
  // Load schemas from external files
  loadSchemas(schemaDir: string): Promise<void>;
  
  // Get schema definition
  getSchema(entityName: string): SchemaDefinition | undefined;
  
  // Get all available schemas
  getAllSchemas(): Map<string, SchemaDefinition>;
  
  // Validate entity against schema
  validate(entityName: string, data: unknown): ValidationResult;
  
  // Generate TypeScript types
  generateTypes(): Promise<string>;
  
  // Check schema compatibility
  checkCompatibility(oldVersion: string, newVersion: string): CompatibilityResult;
}
```

### 3. Dynamic Type Generation
```typescript
interface TypeGenerator {
  // Generate TypeScript interfaces from schemas
  generateInterface(schema: SchemaDefinition): string;
  
  // Generate Zod schemas from external definitions
  generateZodSchema(schema: SchemaDefinition): string;
  
  // Generate complete types file
  generateTypesFile(schemas: Map<string, SchemaDefinition>): string;
  
  // Generate service adapter templates
  generateAdapterTemplate(schema: SchemaDefinition, serviceName: string): string;
}
```

### 4. Schema Validation Engine
```typescript
interface SchemaValidator {
  // Validate data against schema
  validate(schema: SchemaDefinition, data: unknown): ValidationResult;
  
  // Transform data according to schema rules
  transform(schema: SchemaDefinition, data: unknown): TransformResult;
  
  // Check required fields
  validateRequired(schema: SchemaDefinition, data: unknown): ValidationResult;
  
  // Validate field types and constraints
  validateFields(schema: SchemaDefinition, data: unknown): ValidationResult;
}
```

### 5. CLI Commands for Schema Management
```bash
# Schema management commands
imajin schema list                           # List all available schemas
imajin schema show <entityName>              # Show schema definition
imajin schema validate <entityName> <data>   # Validate data against schema
imajin schema generate-types                 # Generate TypeScript types
imajin schema check-compatibility            # Check schema compatibility
imajin schema migrate --from <v1> --to <v2> # Migrate data between versions
```

### 6. Backward Compatibility Layer
```typescript
// Maintain existing imports while transitioning
export type { UniversalCustomer, UniversalPayment } from './Generated';

// Legacy compatibility exports
export const UniversalCustomerSchema = generatedSchemas.Customer;
export const UniversalPaymentSchema = generatedSchemas.Payment;

// Migration helpers
export function migrateToExternalSchema<T>(legacyData: T): ExternalSchemaData {
  // Handle field name migrations, data transformations
}
```

## INTEGRATION POINTS

### 1. Service Integration
- **Stripe Service**: Update to use external schema validation
- **Universal Mapping**: Use schema-driven transformations
- **ETL Pipeline**: Schema-aware data processing
- **Type Safety**: Generated types maintain compile-time validation

### 2. Development Workflow
- **Build Process**: Generate types during compilation
- **Hot Reload**: Watch schema files for changes
- **Validation**: Runtime schema validation in development
- **Testing**: Schema-driven test data generation

### 3. Community Ecosystem
- **Schema Marketplace**: Community-contributed schemas
- **Version Management**: Semantic versioning for schemas
- **Industry Packs**: E-commerce, SaaS, Healthcare schema collections
- **Extension System**: Custom business entity definitions

## SUCCESS CRITERIA
- [ ] All 5 hardcoded schemas migrated to external YAML files
- [ ] Schema registry loads and validates external schemas
- [ ] TypeScript types generated dynamically from schemas
- [ ] Existing Stripe connector works without code changes
- [ ] CLI commands for schema management functional
- [ ] Backward compatibility maintained for existing code
- [ ] Schema versioning and migration system operational
- [ ] Foundation ready for community schema contributions

## TESTING REQUIREMENTS

### 1. Schema Loading Tests
```typescript
describe('SchemaRegistry', () => {
  it('should load schemas from YAML files');
  it('should validate schema syntax and structure');
  it('should handle schema inheritance correctly');
  it('should detect schema conflicts and duplicates');
});
```

### 2. Type Generation Tests
```typescript
describe('TypeGenerator', () => {
  it('should generate valid TypeScript interfaces');
  it('should generate working Zod schemas');
  it('should handle optional and required fields');
  it('should support schema inheritance');
});
```

### 3. Validation Tests
```typescript
describe('SchemaValidator', () => {
  it('should validate data against schema definitions');
  it('should catch required field violations');
  it('should validate field types and constraints');
  it('should provide helpful error messages');
});
```

### 4. Migration Tests
```typescript
describe('Schema Migration', () => {
  it('should maintain backward compatibility');
  it('should migrate existing Universal types');
  it('should handle field name changes');
  it('should preserve data integrity during migration');
});
```

## PERFORMANCE CONSIDERATIONS

### 1. Schema Loading
- **Lazy Loading**: Load schemas on demand
- **Caching**: Cache parsed schemas in memory
- **Watch Mode**: Efficient file watching for development
- **Validation**: Fast runtime validation with compiled schemas

### 2. Type Generation
- **Incremental**: Only regenerate changed schemas
- **Parallel**: Generate multiple schemas concurrently
- **Optimization**: Minimize generated code size
- **Build Integration**: Efficient build process integration

## FUTURE EXTENSIONS

### 1. Schema Marketplace
- **Community Hub**: Central repository for schemas
- **Rating System**: Community validation of schema quality
- **Discovery**: Search and browse available schemas
- **Installation**: One-command schema installation

### 2. Visual Schema Editor
- **GUI Editor**: Visual schema definition interface
- **Relationship Mapping**: Visual entity relationship design
- **Validation**: Real-time schema validation
- **Export**: Generate schema files from visual design

### 3. Advanced Features
- **Schema Analytics**: Usage tracking and optimization
- **Auto-Migration**: Intelligent data migration suggestions
- **Conflict Resolution**: Automatic schema conflict resolution
- **Performance Monitoring**: Schema validation performance tracking

---

## NEXT STEP
After completion, update `docs/prompts/README.md`:
- Move this task from "Pending" to "Completed"
- Set **Prompt 18: AI Context Analysis Engine** to "In Progress" (Begin Phase 3)

---

## 🔗 **RELATED FILES**
- `docs/prompts/README.md` - Track completion status
- `phase2/17_stripe_connector.md` - Previous task (dependency)
- `phase3/18_ai_context_analysis.md` - Next task (Phase 3 begins)
- `src/types/Core.ts` - Current hardcoded schemas to migrate
- `src/types/Universal.ts` - Additional schemas to migrate 