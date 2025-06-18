---
# Metadata
title: "03 Type Collision Prevention"
created: "2025-06-09T21:17:52Z"
---

# 🔧 IMPLEMENT: Type Collision Prevention System

**Status:** ⏳ **COMPLETE**  
**Phase:** 1 - Core Architecture Patterns  
**Estimated Time:** 8-10 hours  
**Dependencies:** Service Provider System (Prompt 1), Command Pattern (Prompt 2)

---

## CONTEXT

Create a comprehensive type management system that prevents type collisions between multiple services, enables cross-service data transformations, and provides universal entity schemas for seamless integration as the system scales to dozens of service connectors.

## ARCHITECTURAL VISION

As imajin-cli scales to integrate with many services (Stripe, Salesforce, HubSpot, Shopify, etc.), we need to prevent type name collisions and enable safe cross-service data flows:

- Universal entity schemas for common business objects
- Service adapter pattern for bi-directional transformations
- Type collision detection and namespace management
- Cross-service workflow type safety

## DELIVERABLES

1. `src/types/Core.ts` - Universal entity schemas and type management
2. `src/types/adapters/` - Service adapter interfaces and utilities
3. `src/services/[service]/adapters/` - Service-specific adapter implementations
4. Type collision detection and warning system
5. Integration with ETL Pipeline for automatic transformations

## IMPLEMENTATION REQUIREMENTS

### 1. Universal Entity Schemas

```typescript
// Create universal schemas that ALL services map to
export const UniversalCustomerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.any()).optional(),
  serviceData: z.record(z.any()).optional(), // Service-specific fields
  sourceService: z.string(),
});

export const UniversalPaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(["pending", "completed", "failed", "cancelled"]),
  customerId: z.string().optional(),
  // ... additional universal fields
});
```

### 2. Service Adapter Pattern

```typescript
export interface ServiceAdapter<TServiceEntity, TUniversalEntity> {
  toUniversal(serviceEntity: TServiceEntity): TUniversalEntity;
  fromUniversal(universalEntity: TUniversalEntity): TServiceEntity;
  validate(entity: unknown): entity is TServiceEntity;
  getNamespace(): ServiceNamespace;
}
```

### 3. Type Collision Detection

```typescript
export class TypeRegistry {
  static register(typeName: string, namespace: ServiceNamespace): void;
  static hasCollision(typeName: string): boolean;
  static getServices(typeName: string): ServiceNamespace[];
}
```

## SUCCESS CRITERIA

- [ ] Universal entity schemas work with multiple service types
- [ ] Service adapters enable bi-directional transformations
- [ ] Type collision system detects and warns about conflicts
- [ ] Ready for unlimited service connector scaling
- [ ] Integration with ETL Pipeline for automatic cross-service workflows
- [ ] Foundation prepared for plugin-generated service adapters

---

## NEXT STEP

After completion, update `docs/DEVELOPMENT_PROGRESS.md`:

- Move this task from "In Progress" to "Completed"
- Set **Prompt 4: Credential Management System** to "In Progress"

---

## 🔗 **RELATED FILES**

- `docs/DEVELOPMENT_PROGRESS.md` - Track completion status
- `phase1/02_command_pattern_framework.md` - Previous task (dependency)
- `phase1/04_credential_management.md` - Next task
