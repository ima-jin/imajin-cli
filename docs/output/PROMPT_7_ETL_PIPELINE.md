# ETL Pipeline System

## Overview

The ETL (Extract, Transform, Load) Pipeline System is a modern TypeScript architecture for data processing workflows in imajin-cli. It enables composable data pipelines that can extract data from various sources, transform it according to business rules, and load it into different destinations.

## Architecture

### Core Components

1. **ETL Interfaces** (`src/etl/core/interfaces.ts`)
   - `Extractor<TOutput>` - Data extraction interface
   - `Transformer<TInput, TOutput>` - Data transformation interface  
   - `Loader<TInput>` - Data loading interface
   - `ETLContext` - Execution context with events and metadata
   - `ETLResult<T>` - Standard result format for all operations

2. **Base Classes**
   - `BaseExtractor` - HTTP API extraction with pagination, auth, rate limiting
   - `BaseTransformer` - Data transformation with field mapping and validation
   - `BaseLoader` - Data loading with conflict resolution and transactions

3. **Pipeline Orchestration** (`src/etl/Pipeline.ts`)
   - `Pipeline` - Main orchestration engine
   - Event-driven execution with progress tracking
   - Error handling and recovery strategies
   - Step composition and conditional execution

## Key Features

### 🔌 **Composable Architecture**
- Mix and match extractors, transformers, and loaders
- Type-safe pipeline composition
- Conditional step execution
- Resume from specific steps

### 🚀 **Enterprise Patterns**
- **Rate Limiting**: Respect API limits with intelligent throttling
- **Authentication**: Bearer, Basic, API Key support
- **Pagination**: Page, offset, and cursor-based pagination
- **Transaction Management**: Batch operations with rollback
- **Conflict Resolution**: Skip, overwrite, merge, or error strategies

### 📊 **Progress Tracking**
- Real-time progress events via EventEmitter
- Step-by-step execution monitoring
- Data flow tracking (extracted, transformed, loaded counts)
- Comprehensive error reporting

### 🛡️ **Type Safety**
- Zod schema validation for input/output
- TypeScript generics for type safety
- Compile-time validation of pipeline composition
- Runtime data validation

## Usage Examples

### Basic Pipeline

```typescript
import { Pipeline, BaseExtractor, BaseTransformer, BaseLoader } from '../etl';

// Create components
const extractor = new MyApiExtractor(config);
const transformer = new DataTransformer(config);
const loader = new DatabaseLoader(config);

// Create pipeline
const pipeline = Pipeline.create(
  'data_sync_pipeline',
  'Sync data from API to database',
  extractor,
  transformer,
  loader
);

// Execute
const executor = new Pipeline();
const result = await executor.execute(pipeline, {
  batchSize: 100,
  stopOnError: true,
  validateInput: true,
  validateOutput: true,
});

console.log(`Processed ${result.totalProcessed} items in ${result.duration}ms`);
```

### Extract-Only Pipeline

```typescript
const extractPipeline = Pipeline.extract(
  'api_extraction',
  'Extract data from API',
  extractor
);

const result = await executor.execute(extractPipeline);
const data = result.results[0]?.data; // Extracted data
```

### Custom Components

```typescript
// Custom Extractor
class CustomExtractor extends BaseExtractor<MyDataType> {
  public readonly name = 'custom_extractor';
  public readonly outputSchema = MyDataSchema;

  protected async performExtraction(
    context: ETLContext,
    config: BaseExtractorConfig
  ): Promise<MyDataType[]> {
    // Your extraction logic
    return await fetchFromApi();
  }
}

// Custom Transformer
class CustomTransformer extends BaseTransformer<InputType, OutputType> {
  public readonly name = 'custom_transformer';
  public readonly inputSchema = InputSchema;
  public readonly outputSchema = OutputSchema;

  protected async performTransformation(
    item: InputType,
    context: ETLContext,
    config: BaseTransformerConfig
  ): Promise<OutputType> {
    // Your transformation logic
    return transformData(item);
  }
}
```

### Event Monitoring

```typescript
const pipeline = new Pipeline();

// Monitor progress
pipeline.on('progress', (progress) => {
  console.log(`${progress.stage}: ${progress.percentage}%`);
});

// Track data flow
pipeline.on('data:extracted', (count) => {
  console.log(`Extracted ${count} items`);
});

pipeline.on('data:transformed', (count) => {
  console.log(`Transformed ${count} items`);
});

pipeline.on('data:loaded', (count) => {
  console.log(`Loaded ${count} items`);
});

// Handle errors
pipeline.on('pipeline:error', (pipelineId, error) => {
  console.error(`Pipeline ${pipelineId} failed:`, error.message);
});
```

## Configuration Options

### Extractor Configuration

```typescript
interface BaseExtractorConfig extends ETLConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'basic' | 'api-key';
    token?: string;
    // ... other auth options
  };
  pagination?: {
    type: 'page' | 'offset' | 'cursor';
    pageSize?: number;
    maxPages?: number;
    // ... pagination params
  };
  rateLimit?: {
    requestsPerSecond: number;
    burstSize?: number;
  };
}
```

### Transformer Configuration

```typescript
interface BaseTransformerConfig extends ETLConfig {
  fieldMappings?: Record<string, string>;
  defaultValues?: Record<string, any>;
  skipInvalidItems?: boolean;
  transformRules?: TransformRule[];
}
```

### Loader Configuration

```typescript
interface BaseLoaderConfig extends ETLConfig {
  conflictResolution?: 'skip' | 'overwrite' | 'merge' | 'error';
  transactionMode?: 'batch' | 'individual' | 'auto';
  retryOnConflict?: boolean;
  upsertSupported?: boolean;
}
```

## Integration Points

### Command Pattern Integration
The ETL system integrates with imajin-cli's command pattern:

```typescript
// In a CLI command
class DataSyncCommand implements Command {
  async execute(args: any[], options: any): Promise<CommandResult> {
    const pipeline = Pipeline.create(/* ... */);
    const executor = new Pipeline();
    
    const result = await executor.execute(pipeline);
    
    return {
      success: result.success,
      data: result.results,
      metadata: { processed: result.totalProcessed },
    };
  }
}
```

### Event System Integration
All ETL operations emit events that integrate with the existing event system:

- `progress` - Real-time progress updates
- `step:start` / `step:complete` / `step:error` - Step lifecycle
- `pipeline:start` / `pipeline:complete` / `pipeline:error` - Pipeline lifecycle
- `data:extracted` / `data:transformed` / `data:loaded` - Data flow

### Service Provider Integration
ETL components can be registered as services:

```typescript
// In a service provider
container.register('UserSyncPipeline', {
  useFactory: () => Pipeline.create(
    'user_sync',
    'User synchronization pipeline',
    container.resolve('UserExtractor'),
    container.resolve('UserTransformer'),
    container.resolve('UserLoader')
  )
});
```

## Example Use Cases

1. **API Data Synchronization**
   - Extract from REST APIs with pagination
   - Transform to internal data models
   - Load to database with conflict resolution

2. **Data Migration**
   - Extract from legacy systems
   - Transform data formats and schemas
   - Load to new systems with validation

3. **Real-time Data Processing**
   - Extract from message queues
   - Transform with business rules
   - Load to multiple destinations

4. **Report Generation**
   - Extract from multiple data sources
   - Transform and aggregate data
   - Load to reporting systems

## Next Steps

The ETL Pipeline System provides the foundation for:

1. **Service-Specific Pipelines** - Stripe, Notion, GitHub connectors
2. **Generated Pipelines** - Auto-generate from OpenAPI specifications  
3. **Real-time Processing** - Stream processing capabilities
4. **Monitoring Dashboard** - Visual pipeline monitoring and management

This system enables imajin-cli to provide powerful, enterprise-grade data processing capabilities while maintaining type safety and professional developer experience. 