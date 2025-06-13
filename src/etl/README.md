# Enhanced ETL Pipeline System

A modern TypeScript ETL (Extract, Transform, Load) architecture that enables traditional data processing workflows and graph-to-graph translations.

## Features

- **Traditional ETL**: Process data through extract, transform, and load operations
- **Graph Translation**: Convert between different graph models
- **Context Normalization**: Translate external graphs to your chosen model
- **Universal Communication**: Standard models for node communication
- **AI-Composable**: Clear CLI interfaces for AI-driven operations
- **Human-Readable**: YAML/JSON configuration and output formats

## Architecture

### Core Components

1. **ETL Core**
   - Base interfaces and types
   - Pipeline management
   - Event system
   - Component lifecycle

2. **Bridge System**
   - Bridge registry
   - Transformation rules
   - Model compatibility
   - Version management

3. **Graph System**
   - Standard models
   - Translation rules
   - Compatibility matrices
   - Context normalization

### Directory Structure

```
src/etl/
├── core/           # Core ETL abstractions
├── bridges/        # Bridge system
├── graphs/         # Graph models
├── extractors/     # Data extraction
├── transformers/   # Data transformation
└── loaders/        # Data loading
```

## CLI Commands

### Bridge Management

```bash
# List available bridges
imajin bridge list

# Show bridge details
imajin bridge show <bridge-id>

# Create new bridge
imajin bridge create -i <id> -v <version> -s <source> -t <target> -m <mappings> -tr <transformations>

# Validate bridge
imajin bridge validate <bridge-id>

# Test bridge
imajin bridge test <bridge-id> -d <data>
```

### Graph Translation

```bash
# Translate between models
imajin graph translate <source> <target> -i <input> -o <output>

# Normalize to standard model
imajin graph normalize <source> <model> -i <input> -o <output>

# Find compatible models
imajin graph discover -m <model>
```

### ETL Operations

```bash
# Extract data
imajin etl extract <source> -o <output>

# Transform data
imajin etl transform <transformer> -i <input> -o <output>

# Load data
imajin etl load <target> -i <input>

# Pipeline management
imajin etl pipeline
imajin etl add-component <pipeline-id> <component-id>
imajin etl remove-component <pipeline-id> <component-id>
imajin etl execute <pipeline-id> -i <input> -o <output>
```

## Configuration

### Bridge Configuration

```yaml
id: social-commerce-to-creative-portfolio
version: 1.0.0
source: social-commerce
target: creative-portfolio
mappings:
  catalog.products: portfolio.artworks
  catalog.services: professional.commissions
  catalog.events: portfolio.exhibitions
transformations:
  products-to-artworks:
    source: catalog.products
    target: portfolio.artworks
    rules:
      - name: title
        from: name
      - name: description
        from: description
      - name: medium
        from: category
        transform: "value => value.toLowerCase()"
metadata:
  efficiency: 0.85
  confidence: 0.95
  lastUpdated: "2025-06-12T00:00:00Z"
```

## Development

### Adding New Bridges

1. Create a new bridge configuration file
2. Define mappings and transformations
3. Register the bridge using the CLI
4. Test the bridge with sample data

### Creating Custom Components

1. Implement the `ETLComponent` interface
2. Define validation and execution logic
3. Register the component with the pipeline
4. Test the component in isolation

## Best Practices

1. **Configuration Over Code**
   - Define transformations in YAML/JSON
   - Use clear naming conventions
   - Document all mappings

2. **Type Safety**
   - Use TypeScript interfaces
   - Validate at runtime
   - Handle errors gracefully

3. **Event-Driven Design**
   - Emit progress events
   - Track operation status
   - Enable monitoring

4. **Testing**
   - Unit test components
   - Integration test pipelines
   - Validate transformations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes
4. Add tests
5. Submit a pull request

## License

MIT License 