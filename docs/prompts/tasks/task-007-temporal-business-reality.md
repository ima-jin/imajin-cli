---
# Task Metadata (YAML Frontmatter)  
task_id: "TASK-007"
title: "Temporal Business Reality - Naturally Solved by Plugin Architecture"
updated: "2025-06-29T12:00:00-00:00"
---
**Last Updated**: June 2025

# Temporal Business Reality - Naturally Solved by Plugin Architecture

## Context

The imajin-cli project's **plugin architecture pattern** already provides temporal business reality through service attachment/detachment history and raw data preservation. The sophisticated **"sys.Customer → service.stripe.customer"** pattern naturally creates temporal capabilities without complex event sourcing systems.

**Current Architecture Achievement:**
- ✅ **Plugin Architecture**: Services attach to universal entities with preserved raw data
- ✅ **Service Attachment History**: Natural temporal tracking through plugin lifecycle
- ✅ **Raw Data Preservation**: Entity data persists even when services are detached
- ✅ **Context Switching**: Business context changes create natural temporal boundaries (Task-006)

**The Elegant Realization:**
```typescript
// Plugin attachment IS temporal tracking
entityManager.attachServiceContext(entityId, 'stripe', customerData);  // Event 1
entityManager.attachServiceContext(entityId, 'contentful', fanData);   // Event 2  
entityManager.detachService(entityId, 'stripe');                       // Event 3
// Raw data for stripe still preserved in entity.rawData.stripe
```

**Natural Temporal Properties:**
- **Service Attachment History**: When plugins were added/removed
- **Raw Data Time Travel**: Access historical data even after service removal
- **Context Evolution**: Business context changes over time through profile switching
- **Reversible Operations**: Reattach services with preserved data

## Task Description

**Document and enhance the existing temporal capabilities** provided by the plugin architecture, rather than building complex event sourcing systems.

**Core Insight**: The plugin pattern inherently provides temporal business reality - we just need to make it more visible and accessible.

### Primary Objectives

1. **Document Temporal Pattern**: Show how plugin architecture provides temporal capabilities
2. **Service History Tracking**: Track attachment/detachment events  
3. **Raw Data Time Travel**: Access historical service data
4. **Temporal CLI Commands**: Expose temporal capabilities through CLI
5. **Demo Temporal Workflows**: Show real-world temporal business scenarios

## Acceptance Criteria

### 📋 **Phase 1: Document Existing Temporal Capabilities (Day 1)**

#### **Plugin Architecture Temporal Analysis**
- [ ] **Service Lifecycle Events**: Document how attachment/detachment creates temporal boundaries
- [ ] **Raw Data Preservation**: Show how entity.rawData provides time travel
- [ ] **Context Evolution**: Document business context changes over time (leverages Task-006)
- [ ] **Natural Reversibility**: Demonstrate plugin reattachment with preserved data

#### **Unified Temporal Entity Pattern**
```typescript
// Updated to align with Task-006 context system and upcoming schema transformers
interface TemporalEntity {
  id: string;
  
  // Core universal fields (compatible with Task-005 UniversalEntity)
  name: string;
  fields: UniversalField[];
  businessRules?: string[];
  relationships?: EntityRelationship[];
  
  // Active service contexts (current reality)
  serviceContexts: Map<string, ServiceContext>;
  
  // Historical raw data (temporal reality)
  rawData: Record<string, {
    data: any;
    attachedAt: Date;
    detachedAt?: Date;
    isActive: boolean;
  }>;
  
  // Service history (temporal events)
  serviceHistory: ServiceEvent[];
  
  // Context evolution (from Task-006 context switching)
  contextHistory: ContextEvent[];
}

// Natural temporal events
type ServiceEvent = 
  | { type: 'attached', service: string, timestamp: Date, data: any }
  | { type: 'detached', service: string, timestamp: Date }
  | { type: 'updated', service: string, timestamp: Date, changes: any };

// Context temporal events (from Task-006)
type ContextEvent =
  | { type: 'context-switched', from: string, to: string, timestamp: Date }
  | { type: 'context-created', context: string, timestamp: Date };
```

### 📊 **Phase 2: Enhanced Temporal Tracking (Day 1)**

#### **Service History Enhancement**
- [ ] **Event Logging**: Log service attachment/detachment events
- [ ] **Timestamp Tracking**: Track when service contexts change
- [ ] **Change Detection**: Identify what changed when services update
- [ ] **History Storage**: Persist service events in entity history
- [ ] **Context Change Tracking**: Integrate with Task-006 context switching events

#### **Enhanced EntityManager**
```typescript
// Extend existing entity management with temporal tracking
// Compatible with Task-000 BaseService architecture
class EntityManager extends BaseService {
  async attachServiceContext(
    entityId: string,
    serviceName: string,
    contextData: any
  ): Promise<void> {
    const entity = this.getOrCreateEntity(entityId);
    
    // Create service context (current reality)
    const serviceContext = {
      serviceName,
      fields: contextData,
      attachedAt: new Date(),
      isActive: true
    };
    
    entity.serviceContexts.set(serviceName, serviceContext);
    
    // Preserve raw data (temporal reality)
    entity.rawData[serviceName] = {
      data: { ...contextData },
      attachedAt: new Date(),
      isActive: true
    };
    
    // Log temporal event
    entity.serviceHistory.push({
      type: 'attached',
      service: serviceName,
      timestamp: new Date(),
      data: contextData
    });
    
    await this.saveEntity(entity);
    
    // Emit temporal event (compatible with Task-000 BaseService)
    this.emit('entity:service-attached', {
      entityId,
      serviceName,
      timestamp: new Date()
    });
  }
  
  // Time travel: Get entity state at specific time
  getEntityAtTime(entityId: string, timestamp: Date): TemporalEntity {
    const entity = this.getEntity(entityId);
    
    // Replay service events up to timestamp
    const relevantEvents = entity.serviceHistory
      .filter(event => event.timestamp <= timestamp)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return this.replayEvents(entity, relevantEvents);
  }
  
  // Context-aware temporal query (integrates with Task-006)
  getEntityInContext(entityId: string, contextId: string, timestamp?: Date): TemporalEntity {
    const entity = timestamp 
      ? this.getEntityAtTime(entityId, timestamp)
      : this.getEntity(entityId);
      
    // Filter entity data based on context (from Task-006 context system)
    return this.filterEntityForContext(entity, contextId);
  }
}
```

### 📈 **Phase 3: Temporal CLI Commands (Day 1)**

#### **Time Travel Commands**
```bash
# Show service history for entity
imajin entity history customer_123
imajin entity history --service stripe customer_123

# Time travel to specific date
imajin entity show customer_123 --at 2024-01-01
imajin entity show customer_123 --service stripe --at 2024-06-01

# Show what changed over time
imajin entity diff customer_123 --from 2024-01-01 --to 2024-06-01
imajin entity diff customer_123 --service stripe --since 30-days-ago

# Context-aware temporal queries (leverages Task-006)
imajin entity show customer_123 --context imajin-lighting --at 2024-01-01
imajin entity history customer_123 --context community-platform

# Restore historical service data
imajin entity restore customer_123 --service stripe --from 2024-01-01
```

#### **Temporal CLI Implementation**
```typescript
// src/commands/TemporalCommands.ts
export function createTemporalCommands(): Command {
  const cmd = new Command('entity');
  
  cmd.command('history')
    .argument('<entityId>', 'Entity to show history for')
    .option('-s, --service <service>', 'Show history for specific service')
    .option('-c, --context <context>', 'Filter by business context')
    .option('--json', 'Output in JSON format')
    .action(async (entityId, options) => {
      const entityManager = container.resolve('entityManager');
      const entity = entityManager.getEntity(entityId);
      
      if (!entity) {
        console.log(`❌ Entity not found: ${entityId}`);
        return;
      }
      
      let history = entity.serviceHistory;
      
      // Filter by service if specified
      if (options.service) {
        history = history.filter(e => e.service === options.service);
      }
      
      // Filter by context if specified (Task-006 integration)
      if (options.context) {
        const contextEvents = entity.contextHistory.filter(e => 
          e.type === 'context-switched' && e.to === options.context
        );
        
        // Show events only when entity was in this context
        history = this.filterEventsByContextPeriods(history, contextEvents);
      }
      
      if (options.json) {
        console.log(JSON.stringify(history, null, 2));
      } else {
        this.displayServiceHistory(history, entityId, options.context);
      }
    });
  
  cmd.command('show')
    .argument('<entityId>', 'Entity to display')
    .option('--at <timestamp>', 'Show entity state at specific time')
    .option('-s, --service <service>', 'Show specific service context')
    .option('-c, --context <context>', 'Show in specific business context')
    .action(async (entityId, options) => {
      const entityManager = container.resolve('entityManager');
      
      let entity;
      if (options.at && options.context) {
        // Combined temporal + context query
        entity = entityManager.getEntityInContext(entityId, options.context, new Date(options.at));
        console.log(`🕐 Entity state in ${options.context} context at ${options.at}:`);
      } else if (options.at) {
        const timestamp = new Date(options.at);
        entity = entityManager.getEntityAtTime(entityId, timestamp);
        console.log(`🕐 Entity state at ${timestamp.toISOString()}:`);
      } else if (options.context) {
        entity = entityManager.getEntityInContext(entityId, options.context);
        console.log(`🔧 Entity state in ${options.context} context:`);
      } else {
        entity = entityManager.getEntity(entityId);
        console.log(`📊 Current entity state:`);
      }
      
      if (options.service) {
        const serviceData = entity.serviceContexts.get(options.service) 
          || entity.rawData[options.service];
        console.log(JSON.stringify(serviceData, null, 2));
      } else {
        console.log(JSON.stringify(entity, null, 2));
      }
    });
  
  return cmd;
}
```

## Implementation Strategy

### Phase 1: Document Pattern (Day 1)

#### **Create Temporal Documentation**
```markdown
# Temporal Business Reality Through Plugin Architecture

## Core Insight
The plugin architecture naturally provides temporal capabilities:

1. **Service Attachment = Temporal Event**
   - When: service.stripe.customer attached to sys.Customer
   - Creates: Temporal boundary marking business state change

2. **Raw Data Preservation = Time Travel**
   - All service data preserved in entity.rawData
   - Accessible even after service detachment
   - Natural historical state reconstruction

3. **Context Switching = Temporal Boundaries** (Task-006 Integration)
   - Profile switches create natural temporal boundaries
   - Business context evolution tracked over time
   - Recipe changes create new temporal reality

## Real-World Example with Context Evolution
```typescript
// Day 1: Ryan is just a fan (in community-platform context)
entity.attachServiceContext('ryan_123', 'contentful', {
  type: 'fan',
  engagementLevel: 'casual',
  favoriteGenres: ['house']
});

// Day 15: Switch to imajin-lighting business context
contextManager.switchContext('imajin-lighting');

// Day 30: Ryan becomes a customer in lighting business
entity.attachServiceContext('ryan_123', 'stripe', {
  type: 'customer',
  totalSpent: 45,
  vipStatus: false
});

// Day 60: Ryan becomes VIP fan (back in community context)
contextManager.switchContext('community-platform');
entity.updateServiceContext('ryan_123', 'contentful', {
  type: 'fan', 
  engagementLevel: 'superfan',  // Evolution!
  attendedEvents: 3
});

// Time travel: What was Ryan's status on Day 35 in lighting context?
const ryan_day35 = entity.getEntityInContext('ryan_123', 'imajin-lighting', day35);
// Returns: fan + new customer context, before VIP upgrade
```
```

### Phase 2: Enhance Existing System (Day 1)

#### **Add History Tracking to EntityManager**
```typescript
// Minimal enhancement to existing EntityManager
// Compatible with Task-000 BaseService requirements
class EntityManager extends BaseService {
  private trackServiceEvent(
    entityId: string,
    eventType: 'attached' | 'detached' | 'updated',
    serviceName: string,
    data?: any
  ): void {
    const entity = this.getEntity(entityId);
    
    entity.serviceHistory.push({
      type: eventType,
      service: serviceName,
      timestamp: new Date(),
      data: eventType === 'detached' ? undefined : data
    });
  }
  
  private trackContextEvent(
    entityId: string,
    eventType: 'context-switched' | 'context-created',
    contextData: any
  ): void {
    const entity = this.getEntity(entityId);
    
    entity.contextHistory.push({
      type: eventType,
      timestamp: new Date(),
      ...contextData
    });
  }
  
  // Add to existing attachServiceContext method
  async attachServiceContext(entityId: string, serviceName: string, contextData: any): Promise<void> {
    // ... existing logic ...
    
    // Add temporal tracking
    this.trackServiceEvent(entityId, 'attached', serviceName, contextData);
    
    // Emit event for Task-000 BaseService compatibility
    this.emit('entity:service-attached', {
      entityId,
      serviceName,
      timestamp: new Date()
    });
  }
  
  // Integration with Task-006 context switching
  async onContextSwitch(fromContext: string, toContext: string): Promise<void> {
    // Track context change for all entities in this session
    const activeEntities = this.getActiveEntities();
    
    for (const entityId of activeEntities) {
      this.trackContextEvent(entityId, 'context-switched', {
        from: fromContext,
        to: toContext
      });
    }
  }
}
```

### Phase 3: CLI Integration (Day 1)

#### **Add Temporal Commands to Existing CLI**
```typescript
// Add to existing command structure
// src/commands/index.ts
export function registerCommands(program: Command): void {
  // ... existing commands ...
  
  // Add temporal capabilities
  program.addCommand(createTemporalCommands());
}

// Integration with Task-006 semantic commands
// Temporal commands can be used with semantic interface:
// "imajin show history customer_123" 
// "imajin show customer_123 at yesterday"
```

## Technical Requirements

### **Unified Entity Architecture**
```typescript
// Compatible with all task requirements
interface UnifiedEntity {
  // Task-005 UniversalEntity compatibility
  id: string;
  name: string;
  fields: UniversalField[];
  businessRules?: string[];
  relationships?: EntityRelationship[];
  
  // Task-006 Context awareness
  contextId?: string;
  contextHistory: ContextEvent[];
  
  // Task-007 Temporal capabilities
  serviceContexts: Map<string, ServiceContext>;
  rawData: Record<string, any>;
  serviceHistory: ServiceEvent[];
}
```

### **No Complex Dependencies**
```typescript
// No event sourcing frameworks needed
// No complex temporal databases required
// No git-like systems required
// Just enhanced logging in existing plugin system
// Leverages Task-000 BaseService events
// Integrates with Task-006 context switching
```

### **Backward Compatibility**
```typescript
// All existing functionality continues working
// Temporal features are purely additive
// No breaking changes to current architecture
// Works with updated Task-000 service architecture
```

## Success Metrics

### **Temporal Capabilities**
- [ ] Service attachment/detachment history tracked and viewable
- [ ] Raw data accessible even after service removal (time travel)
- [ ] Entity state reconstruction at any point in time
- [ ] Natural temporal boundaries through business context changes (Task-006 integration)

### **CLI Experience**
- [ ] Simple commands to view entity history
- [ ] Time travel queries for historical entity states
- [ ] Context-aware temporal queries (leverages Task-006)
- [ ] Clear visualization of entity evolution over time
- [ ] Ability to restore historical service data

### **System Integration**
- [ ] Temporal features work with existing plugin architecture
- [ ] Compatible with Task-000 BaseService architecture
- [ ] Integrates seamlessly with Task-006 context switching
- [ ] Prepared for Task-005 universal entity transformations
- [ ] No impact on current CLI functionality
- [ ] Minimal performance overhead

## Documentation Deliverables

### **Temporal Pattern Guide**
- [ ] **Plugin Architecture Temporal Analysis**: How plugins provide temporal capabilities
- [ ] **Real-World Scenarios**: DJ fan → customer → VIP evolution examples with context switching
- [ ] **CLI Usage Examples**: Common temporal operations
- [ ] **Time Travel Use Cases**: When and why to use temporal features
- [ ] **Context Evolution Patterns**: How business context changes create temporal boundaries

---

**Expected Delivery**: 1 working day (primarily documentation + minimal enhancements)  
**Priority**: Medium (temporal capabilities already exist, just need to be exposed)  
**Dependencies**: Task-004 (Service Architecture), Task-006 (Context Switching) - leverages these foundations  
**Success Criteria**: Clear documentation showing how plugin architecture provides temporal business reality + CLI access to temporal features with context awareness