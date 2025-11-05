---
# Task Metadata (YAML Frontmatter)
task_id: "TASK-006"
title: "Context Switching & Semantic Command Interface"  
updated: "2025-07-03T19:15:36-07:00"
---
**Last Updated**: July 2025

# Context Switching & Semantic Command Interface

## Context

The imajin-cli project has sophisticated business context management through BusinessContextManager and recipe systems, but lacks both **simple business context switching** capabilities and **natural language command interface**. This task merges both needs into a cohesive enhancement.

**Current Architecture Achievement:**
- ✅ **Mature BusinessContextManager**: 27KB of business context functionality
- ✅ **Recipe System**: Complete with display metadata (sub-codes, emojis, colors)
- ✅ **Plugin Architecture**: Services attach to universal entities
- ✅ **Context Abstraction**: Services get filtered context appropriate for their needs

**Current Gap:**
```bash
# Currently operations happen in single context with traditional syntax
imajin contentful content list
imajin schema create track --recipe imajin-lighting

# Missing: Multi-context + semantic interface
imajin my imajin-lighting        # Switch to context + show status
imajin show products             # Context-aware semantic commands
imajin create product "LED Controller v2"  # Natural language
```

**Target Enhancement:**
Business context profiles with semantic command interface that transforms CLI from traditional syntax to natural language within contextual environments.

## Task Description

Add **multi-context switching with semantic command interface** to the existing BusinessContextManager, enabling users to maintain multiple business contexts and interact with them using natural language.

**Core Vision**: Transform from single business context with traditional CLI to **multi-context switching with semantic interface** that leverages existing recipe and entity management systems.

### Primary Objectives

1. **Context Profile Management**: Create, switch, and manage business context profiles
2. **Semantic Command Interface**: Natural language commands that adapt to active context
3. **Context-Aware CLI Display**: Visual indicators with sub-codes and status
4. **Context Discovery Workflow**: Interactive creation of unknown contexts
5. **Unified Recipe Enhancement**: Single recipe structure for both features

## Acceptance Criteria

### 📋 **Phase 1: Context Profile System (Day 1)**

#### **Context Management**
- [ ] **BusinessContextProfile Interface**: Business context profile structure with display metadata
- [ ] **ContextProfileManager**: Create, list, switch, and delete context profiles
- [ ] **Context Storage**: Simple file-based context profile storage
- [ ] **Active Context Tracking**: Track which context is currently active

#### **Unified Context Profile Structure**
```typescript
interface BusinessContextProfile {
  id: string;                    // 'imajin-lighting', 'community-platform'
  name: string;                  // 'Imajin Lighting Business'
  businessType: string;          // From recipe system
  recipe: string;                // 'imajin-lighting', 'community-platform'
  
  // Display configuration (from recipe display metadata)
  display: {
    subCode: string;             // 'IMAJ', 'CMTY' (from recipe)
    emoji: string;               // '💡', '🌐' (from recipe)
    color: string;               // 'yellow', 'blue' (from recipe)
    promptFormat: string;        // '[{subCode}] {name}$ ' (from recipe)
  };
  
  // Context metadata (from recipe context metadata)
  context: {
    primaryEntities: string[];   // ['product', 'project'] (from recipe)
    keyMetrics: string[];        // ['products_in_stock'] (from recipe)  
    quickActions: string[];      // ['show products'] (from recipe)
  };
  
  credentials: EncryptedCredentials;
  lastActive: Date;
  preferences: ContextPreferences;
  entities: EntityConfiguration[];
}
```

#### **Context Commands**
```bash
# Context management
imajin context create imajin-lighting --name "Imajin Lighting" --recipe imajin-lighting
imajin context create community-platform --name "Community Platform" --recipe community-platform
imajin context list
imajin context use imajin-lighting
imajin context delete old-context

# Active context info
imajin context current
imajin context config --show
```

### 📊 **Phase 2: Semantic Command Interface (Day 1)**

#### **Natural Language Command Parsing**
- [ ] **Command Pattern Matching**: Recognize semantic patterns in user input
- [ ] **Context Switching**: `imajin my <context>` switches to business context
- [ ] **Context Discovery Workflow**: Handle unknown contexts with suggestions and auto-generation
- [ ] **Entity Operations**: `imajin show <entities>`, `imajin create <entity> <name>`
- [ ] **Service Integration**: `imajin connect <service>`, `imajin sync <service>`

#### **Semantic Command Patterns**
```typescript
interface SemanticPattern {
  pattern: RegExp;
  handler: string;
  description: string;
  examples: string[];
}

const SEMANTIC_PATTERNS: SemanticPattern[] = [
  {
    pattern: /^imajin my (\w+(?:-\w+)*)$/,
    handler: 'switchToContext',
    description: 'Switch to business context',
    examples: ['imajin my community-platform', 'imajin my imajin-lighting']
  },
  {
    pattern: /^imajin show (\w+)$/,
    handler: 'showEntities', 
    description: 'Display entities of type',
    examples: ['imajin show members', 'imajin show products']
  },
  {
    pattern: /^imajin create (\w+) "([^"]+)"$/,
    handler: 'createEntity',
    description: 'Create new entity with name',
    examples: ['imajin create member "Sarah Chen"', 'imajin create project "Food Drive"']
  },
  {
    pattern: /^imajin connect (\w+)$/,
    handler: 'connectService',
    description: 'Initialize service integration',
    examples: ['imajin connect contentful', 'imajin connect stripe']
  }
];
```

#### **Context Discovery Workflow**
```bash
$ imajin my food-delivery-business

❌ Context 'food-delivery-business' not found.

🔍 Did you mean one of these?
  1. community-platform (similarity: 23%)
  2. imajin-lighting (similarity: 15%)

✨ Or create a new context?
  3. Create 'food-delivery-business' automatically
  4. Describe business and create custom context
  5. Cancel

Choice [1-5]: 3

🚀 Auto-generating 'food-delivery-business' context...
💡 Detected business type: food-delivery
📋 Generated entities: restaurant, order, driver, customer
🎯 Created context with 12 fields and 3 workflows

✅ Switched to context: Food Delivery Business
[FOOD] food-delivery-business$ 
```

### 📈 **Phase 3: Contextual CLI Display (Day 2)**

#### **Dynamic CLI Display System**
- [ ] **Context Sub-Code System**: Read 4-letter codes from recipe display metadata
- [ ] **Recipe Metadata Integration**: Use existing sub-codes, colors, and display preferences
- [ ] **Dynamic Prompt**: Show context info in CLI prompt  
- [ ] **Status Display**: Context-aware status and entity counts

#### **Enhanced CLI Experience**
```bash
# Context indicator in commands
[IMAJ] imajin-lighting$ imajin show products
💡 Imajin Lighting | Recipe: imajin-lighting | Products: 2 PCBs in stock
  • Product: "LED Strip Controller PCB"
  • Product: "WiFi Dimmer Module"

[CMTY] community-platform$ imajin show members  
🌐 Community Platform | Recipe: community-platform | Members: 24 active
  • Member: "Sarah Chen" (organizer)
  • Member: "Alex Rivera" (contributor)
  • Member: "Jamie Walsh" (community)

# Quick context switching with semantic interface
$ imajin my imajin-lighting
✅ Switched to context: Imajin Lighting
💡 Quick actions: show products, create project, add showcase

$ imajin my community-platform
✅ Switched to context: Community Platform
🌐 Quick actions: show members, create event, connect contentful
```

#### **Context-Aware Commands**
```bash
# Commands adapt based on active context
[IMAJ] imajin-lighting$ imajin show
Available entities: products, projects, showcases

[IMAJ] imajin-lighting$ imajin create product "LED Matrix Controller v2"
✅ Created product: LED Matrix Controller v2
💡 Imajin Lighting now has 3 products available

[CMTY] community-platform$ imajin show
Available entities: members, events, resources, projects, connections, discussions

[CMTY] community-platform$ imajin create member "Alex Rivera"
✅ Created member: Alex Rivera
👥 Community Platform now has 25 active members
```

## Implementation Strategy

### Phase 1: Context Profile Management (Day 1)

#### **Create Context Profile System**
```typescript
// src/context/ContextProfileManager.ts
export class ContextProfileManager {
  private contextsDir: string;
  private activeContextFile: string;
  
  constructor() {
    this.contextsDir = join(homedir(), '.imajin', 'contexts');
    this.activeContextFile = join(homedir(), '.imajin', 'active-context.json');
  }
  
  async createContext(config: CreateContextConfig): Promise<BusinessContextProfile> {
    // Load recipe to get display and context metadata
    const recipeManager = new RecipeManager();
    const recipe = await recipeManager.getRecipe(config.recipe);
    
    const context: BusinessContextProfile = {
      id: config.id,
      name: config.name,
      businessType: recipe.businessType,
      recipe: config.recipe,
      
      // Extract display metadata from recipe
      display: recipe.display || this.generateDefaultDisplay(config.id),
      
      // Extract context metadata from recipe
      context: recipe.context || this.generateDefaultContext(recipe),
      
      credentials: {},
      lastActive: new Date(),
      preferences: {},
      entities: recipe.entities || {}
    };
    
    await this.saveContext(context);
    return context;
  }
  
  async switchContext(contextId: string): Promise<void> {
    const context = await this.getContext(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }
    
    // Update active context
    await this.setActiveContext(context);
    
    // Update BusinessContextManager
    const businessManager = new BusinessContextManager();
    await businessManager.setActiveContext(context);
    
    console.log(`✅ Switched to context: ${context.name}`);
    this.displayContextInfo(context);
  }
  
  private displayContextInfo(context: BusinessContextProfile): void {
    console.log(`${context.display.emoji} Quick actions: ${context.context.quickActions.join(', ')}`);
  }
}
```

#### **Enhanced BusinessContextManager Integration**
```typescript
// Extend existing src/context/BusinessContextManager.ts
export class BusinessContextManager {
  private contextProfileManager: ContextProfileManager;
  private activeContext: BusinessContextProfile | null = null;
  
  constructor(configDirectory?: string) {
    // ... existing constructor code ...
    this.contextProfileManager = new ContextProfileManager();
  }
  
  async setActiveContext(context: BusinessContextProfile): Promise<void> {
    this.activeContext = context;
    
    // Load context's business configuration
    await this.loadConfiguration(context.recipe);
    
    // Update service credentials
    await this.updateServiceCredentials(context.credentials);
    
    // Load context entities
    await this.loadEntityConfiguration(context.entities);
  }
  
  async getCurrentConfiguration(): Promise<BusinessConfiguration> {
    if (!this.activeContext) {
      // Fallback to existing single-context behavior
      return await this.loadConfiguration();
    }
    
    // Return context-specific configuration
    return this.getContextConfiguration(this.activeContext);
  }
}
```

### Phase 2: Semantic Command Handler (Day 1)

#### **Create Semantic Command System**
```typescript
// src/commands/SemanticCommandHandler.ts
export class SemanticCommandHandler {
  private patterns: SemanticPattern[];
  private contextManager: ContextProfileManager;
  private contextDiscovery: ContextDiscoveryWorkflow;
  
  constructor() {
    this.patterns = SEMANTIC_PATTERNS;
    this.contextManager = new ContextProfileManager();
    this.contextDiscovery = new ContextDiscoveryWorkflow();
  }
  
  async parseCommand(input: string): Promise<SemanticCommandResult | null> {
    for (const pattern of this.patterns) {
      const match = input.match(pattern.pattern);
      if (match) {
        return {
          handler: pattern.handler,
          matches: match.slice(1),
          description: pattern.description
        };
      }
    }
    return null;
  }
  
  async handleSemanticCommand(result: SemanticCommandResult): Promise<void> {
    switch (result.handler) {
      case 'switchToContext':
        await this.handleContextSwitch(result.matches[0]);
        break;
      case 'showEntities':
        await this.showEntities(result.matches[0]);
        break;
      case 'createEntity':
        await this.createEntity(result.matches[0], result.matches[1]);
        break;
      case 'connectService':
        await this.connectService(result.matches[0]);
        break;
    }
  }
  
  async handleContextSwitch(contextName: string): Promise<void> {
    // Check if context exists
    const existingContexts = await this.contextManager.listContexts();
    const exactMatch = existingContexts.find(c => c.id === contextName);
    
    if (exactMatch) {
      await this.contextManager.switchContext(contextName);
      return;
    }
    
    // Context not found - start discovery workflow
    await this.contextDiscovery.handleUnknownContext(contextName);
  }
}
```

#### **Integrate with Application.ts**
```typescript
// Enhance existing src/core/Application.ts
export class Application {
  private semanticHandler: SemanticCommandHandler;
  
  constructor(config?: Partial<ImajinConfig>) {
    // ... existing constructor code ...
    this.semanticHandler = new SemanticCommandHandler();
  }
  
  async run(): Promise<void> {
    try {
      if (process.argv.length <= 2) {
        await this.startInteractiveMode();
      } else {
        const commandString = process.argv.slice(2).join(' ');
        
        // Try semantic parsing first
        const semanticResult = await this.semanticHandler.parseCommand(commandString);
        if (semanticResult) {
          await this.semanticHandler.handleSemanticCommand(semanticResult);
          return;
        }
        
        // Validate business context before traditional command execution
        const isValidContext = await this.businessValidator.validateBusinessContext(commandString);
        if (!isValidContext) {
          process.exit(1);
        }
        
        // Fall back to traditional command parsing
        await this.program.parseAsync(process.argv);
        process.exit(0);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  }
}
```

### Phase 3: Context Discovery & Auto-Generation (Day 2)

#### **Context Discovery Workflow**
```typescript
// src/workflows/ContextDiscoveryWorkflow.ts
export class ContextDiscoveryWorkflow {
  async handleUnknownContext(contextName: string): Promise<void> {
    // 1. Check if context exists
    const existingContexts = await this.contextManager.listContexts();
    
    // 2. Find similar contexts (fuzzy matching)
    const suggestions = this.findSimilarContexts(contextName, existingContexts);
    
    // 3. Present interactive options
    if (suggestions.length > 0) {
      const choice = await this.promptUserChoice(contextName, suggestions);
      
      switch (choice.action) {
        case 'use-suggestion':
          await this.contextManager.switchContext(choice.contextId);
          break;
        case 'create-new':
          await this.autoGenerateContext(contextName);
          break;
        case 'cancel':
          console.log('Context switching cancelled');
          break;
      }
    } else {
      // 4. No suggestions - offer to create new
      await this.offerContextCreation(contextName);
    }
  }
  
  async autoGenerateContext(contextName: string): Promise<BusinessContextProfile> {
    console.log(`🚀 Auto-generating '${contextName}' context...`);
    
    // 1. Detect business type from context name
    const businessType = await this.detectBusinessType(contextName);
    console.log(`💡 Detected business type: ${businessType}`);
    
    // 2. Generate display metadata
    const display = this.generateDisplayMetadata(contextName, businessType);
    
    // 3. Create context with intelligent defaults
    const context = await this.contextManager.createContext({
      id: contextName,
      name: this.formatContextName(contextName),
      recipe: businessType,
      businessType
    });
    
    // 4. Switch to new context
    await this.contextManager.switchContext(contextName);
    
    return context;
  }
  
  private generateDisplayMetadata(contextName: string, businessType: string) {
    // Auto-generate sub-code from context name
    const subCode = contextName
      .split('-')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 4);
    
    const businessEmojis = {
      'food-delivery': '🍕',
      'healthcare': '🏥',
      'education': '📚',
      'retail': '🛍️',
      'consulting': '💼',
      'nonprofit': '❤️'
    };
    
    return {
      subCode,
      emoji: businessEmojis[businessType] || '⚡',
      color: 'cyan',
      promptFormat: '[{subCode}] {name}$ '
    };
  }
}
```

## Technical Requirements

### **Unified Recipe Structure**
```typescript
// Enhanced recipe structure supports both features
interface EnhancedRecipe {
  // Existing recipe fields
  name: string;
  description: string;
  businessType: string;
  entities: EntityConfig;
  workflows: WorkflowConfig[];
  
  // Display metadata (for semantic interface)
  display: {
    subCode: string;        // 4-letter identifier: "CMTY", "IMAJ"
    emoji: string;          // Context emoji: "🌐", "💡"
    color: string;          // CLI color theme: "blue", "yellow"
    promptFormat: string;   // Custom prompt template
  };
  
  // Context-specific metadata (for context switching)
  context: {
    primaryEntities: string[];     // Main entities to highlight
    keyMetrics: string[];          // Important metrics to display
    quickActions: string[];        // Common commands for this context
  };
}
```

### **Storage Pattern**
```typescript
// Use existing .imajin directory structure
// ~/.imajin/
//   ├── business-context.yaml     (existing single-context)
//   ├── contexts/
//   │   ├── imajin-lighting.json
//   │   ├── community-platform.json
//   │   └── food-delivery-business.json  
//   └── active-context.json       (new)
```

### **Backward Compatibility**
```typescript
// Ensure existing functionality continues working
class BackwardCompatibility {
  // If no contexts exist, use existing single-context behavior
  async fallbackToSingleContext(): Promise<void> {
    const contexts = await this.contextProfileManager.listContexts();
    if (contexts.length === 0) {
      // Use existing BusinessContextManager behavior
      return this.businessContextManager.loadConfiguration();
    }
  }
}
```

## Success Metrics

### **Context Management**
- [ ] User can maintain separate business contexts for different ventures
- [ ] Simple context switching with one command
- [ ] Context profiles persist between CLI sessions
- [ ] Recipe metadata properly integrated into contexts

### **Semantic Interface**
- [ ] Natural language commands work intuitively
- [ ] Context switching feels seamless with `imajin my <context>`
- [ ] Entity operations use natural language syntax
- [ ] Context discovery workflow guides users smoothly

### **System Integration**
- [ ] All existing CLI commands work within active context
- [ ] Traditional commands continue working unchanged
- [ ] Recipe system enhances both features simultaneously
- [ ] Visual indicators provide clear context awareness

---

**Expected Delivery**: 2 working days  
**Priority**: High (major UX enhancement combining two critical features)
**Dependencies**: Task-004 (Service Architecture), Recipe system
**Success Criteria**: Multi-context switching with semantic command interface working together seamlessly 