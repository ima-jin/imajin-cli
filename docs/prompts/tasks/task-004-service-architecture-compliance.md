---
# Task Metadata (YAML Frontmatter)
task_id: "TASK-004"
title: "Service Architecture Compliance & Media Service Integration"
updated: "2025-06-29T12:00:00-00:00"
priority: "CRITICAL"
---
**Last Updated**: June 2025

**Status**: Ready for Implementation  
**Priority**: CRITICAL (Foundation Infrastructure - MUST BE FIRST)  
**Estimated Effort**: 4-6 hours  
**Dependencies**: None (Foundation task)  

## 🎯 **Objective**

Standardize service implementations to comply with the established `BaseService` pattern and integrate media providers into the service architecture for the services actually being used: **Contentful**, **Stripe**, **Cloudinary**, and **Local File Service**.

**⚠️ CRITICAL**: This task MUST be completed before Tasks 005, 006, 007 as they all depend on proper service architecture.

## 🔍 **Current State Analysis**

### **Service Compliance Matrix**

| Service | BaseService | IService | Health Checks | Metrics | Commands | Status |
|---------|-------------|----------|---------------|---------|----------|---------|
| **ContentfulService** | ✅ | ✅ | ✅ | ✅ | ✅ | **COMPLIANT** |
| **StripeService** | ❌ | ❌ | ❌ | ❌ | ✅ | **NON-COMPLIANT** |
| **CloudinaryProvider** | ❌ | ❌ | ❌ | ❌ | ✅ | **LEGACY PATTERN** |
| **LocalMediaProvider** | ❌ | ❌ | ❌ | ❌ | ✅ | **LEGACY PATTERN** |

### **Critical Issues Identified**

#### **1. Architecture Violations**
- **StripeService**: Extends `EventEmitter` instead of `BaseService`

#### **2. Legacy MediaProvider Pattern**
- **CloudinaryProvider** and **LocalMediaProvider** use an older `MediaProvider` interface pattern
- Should be converted to proper **CloudinaryService** and **LocalFileService** that extend `BaseService`
- The `MediaProvider` interface is architectural debt from earlier iterations

#### **3. Service Architecture Inconsistency**
Current inconsistent pattern:
```typescript
// Modern pattern (ContentfulService)
ContentfulService extends BaseService

// Legacy patterns that need upgrading
StripeService extends EventEmitter        // Should extend BaseService
CloudinaryProvider implements MediaProvider  // Should be CloudinaryService extends BaseService
LocalMediaProvider implements MediaProvider  // Should be LocalFileService extends BaseService
```

## 🛠️ **Implementation Plan**

### **Phase 1: StripeService Compliance (Priority 1)**

#### **1.1 Refactor StripeService Architecture**
```typescript
// BEFORE: src/services/stripe/StripeService.ts
export class StripeService extends EventEmitter {
    private stripe: Stripe;
    private logger: Logger;
    // ... existing implementation
}

// AFTER: Extend BaseService
export class StripeService extends BaseService {
    private stripe: Stripe;
    private businessContext?: BusinessDomainModel;

    constructor(
        container: Container,
        config: StripeConfig & ServiceConfig,
        eventEmitter?: EventEmitter
    ) {
        super(container, config, eventEmitter);
        this.initializeStripe();
    }

    public getName(): string {
        return 'stripe';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    protected async onInitialize(): Promise<void> {
        // Move existing initialization logic here
        await this.validateApiKey();
        this.emit('service:ready', { service: 'stripe' });
    }

    protected async onShutdown(): Promise<void> {
        // Clean up resources if needed
        this.emit('service:shutdown', { service: 'stripe' });
    }

    protected async onHealthCheck(): Promise<HealthCheckResult[]> {
        const checks: HealthCheckResult[] = [];
        
        try {
            // Test Stripe API connectivity
            await this.stripe.accounts.retrieve();
            checks.push({
                name: 'stripe-api',
                healthy: true,
                message: 'Connected to Stripe API'
            });
        } catch (error) {
            checks.push({
                name: 'stripe-api',
                healthy: false,
                message: `Stripe API error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }

        return checks;
    }

    // ... rest of existing methods using this.execute() wrapper
}
```

### **Phase 2: Convert MediaProviders to Services (Priority 2)**

#### **2.1 Convert CloudinaryProvider → CloudinaryService**
```typescript
// BEFORE: src/media/providers/CloudinaryProvider.ts
export class CloudinaryProvider implements MediaProvider {
    public readonly name = 'cloudinary';
    // ... implementation
}

// AFTER: src/services/cloudinary/CloudinaryService.ts
export class CloudinaryService extends BaseService {
    private cloudinary: any; // Cloudinary SDK instance

    constructor(
        container: Container,
        config: CloudinaryConfig & ServiceConfig,
        eventEmitter?: EventEmitter
    ) {
        super(container, config, eventEmitter);
        this.initializeCloudinary();
    }

    public getName(): string {
        return 'cloudinary';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    private initializeCloudinary(): void {
        const { v2: cloudinary } = require('cloudinary');
        
        cloudinary.config({
            cloud_name: this.config.cloudName,
            api_key: this.config.apiKey,
            api_secret: this.config.apiSecret,
            secure: this.config.secure
        });
        
        this.cloudinary = cloudinary;
    }

    protected async onInitialize(): Promise<void> {
        this.emit('service:ready', { service: 'cloudinary' });
    }

    protected async onHealthCheck(): Promise<HealthCheckResult[]> {
        try {
            // Test Cloudinary connectivity
            await this.cloudinary.api.resources({ max_results: 1 });
            return [{
                name: 'cloudinary-api',
                healthy: true,
                message: 'Cloudinary API accessible'
            }];
        } catch (error) {
            return [{
                name: 'cloudinary-api',
                healthy: false,
                message: `Cloudinary API error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }];
        }
    }

    // Media operations using this.execute() wrapper
    async upload(file: Buffer, options: UploadOptions): Promise<MediaAsset> {
        return this.execute(async () => {
            const dataUri = `data:application/octet-stream;base64,${file.toString('base64')}`;
            
            const uploadOptions: any = {
                public_id: options.fileName ? this.generatePublicId(options.fileName) : undefined,
                folder: options.folder,
                overwrite: options.overwrite,
                tags: options.tags,
            };

            const result = await this.cloudinary.uploader.upload(dataUri, uploadOptions);

            const asset: MediaAsset = {
                id: result.public_id,
                originalName: options.fileName || 'unknown',
                fileName: result.public_id,
                mimeType: result.resource_type === 'image' ? `image/${result.format}` : `video/${result.format}`,
                size: result.bytes,
                url: result.secure_url,
                provider: this.getName(),
                uploadedAt: new Date(result.created_at),
                metadata: this.extractMetadata(result),
                transformations: []
            };

            this.incrementMetric('uploads.completed');
            return asset;
        }, 'upload');
    }

    async transform(asset: MediaAsset, transformations: Transformation[]): Promise<MediaAsset> {
        return this.execute(async () => {
            // Implementation from current CloudinaryProvider
            // ... transformation logic
            this.incrementMetric('transformations.completed');
            return transformedAsset;
        }, 'transform');
    }

    async delete(assetId: string): Promise<void> {
        return this.execute(async () => {
            await this.cloudinary.uploader.destroy(assetId);
            this.incrementMetric('deletions.completed');
        }, 'delete');
    }

    // ... other methods from current CloudinaryProvider
}
```

#### **2.2 Convert LocalMediaProvider → LocalFileService**
```typescript
// BEFORE: src/media/providers/LocalMediaProvider.ts
export class LocalMediaProvider implements MediaProvider {
    public readonly name = 'local';
    // ... implementation
}

// AFTER: src/services/localfile/LocalFileService.ts
export class LocalFileService extends BaseService {
    private storagePath: string;
    private publicPath: string;
    private baseUrl: string;
    private maxFileSize: number;

    constructor(
        container: Container,
        config: LocalFileConfig & ServiceConfig,
        eventEmitter?: EventEmitter
    ) {
        super(container, config, eventEmitter);
        this.storagePath = config.storagePath;
        this.publicPath = config.publicPath;
        this.baseUrl = config.baseUrl;
        this.maxFileSize = config.maxFileSize;
    }

    public getName(): string {
        return 'localfile';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    protected async onInitialize(): Promise<void> {
        // Ensure storage directories exist
        await fs.mkdir(this.storagePath, { recursive: true });
        await fs.mkdir(this.publicPath, { recursive: true });
        this.emit('service:ready', { service: 'localfile' });
    }

    protected async onHealthCheck(): Promise<HealthCheckResult[]> {
        try {
            // Test filesystem access
            const testPath = path.join(this.storagePath, '.health-check');
            await fs.writeFile(testPath, 'ok');
            await fs.unlink(testPath);
            
            return [{
                name: 'local-filesystem',
                healthy: true,
                message: 'Local filesystem accessible'
            }];
        } catch (error) {
            return [{
                name: 'local-filesystem',
                healthy: false,
                message: `Filesystem error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }];
        }
    }

    // Media operations using this.execute() wrapper
    async upload(file: Buffer, options: UploadOptions): Promise<MediaAsset> {
        return this.execute(async () => {
            // Implementation from current LocalMediaProvider
            // ... upload logic with unique naming, directory management, etc.
            
            this.incrementMetric('uploads.completed');
            return asset;
        }, 'upload');
    }

    // ... other methods from current LocalMediaProvider
}
```

### **Phase 3: Update Service Provider Registration**

#### **3.1 Clean Service Provider Registration**
```typescript
// src/services/stripe/StripeServiceProvider.ts - Updated
async register(config?: StripeConfig): Promise<void> {
    const serviceConfig: StripeConfig & ServiceConfig = {
        name: 'stripe',
        enabled: true,
        apiKey: config?.apiKey ?? process.env.STRIPE_API_KEY!,
        apiVersion: config?.apiVersion ?? '2024-06-20',
        timeout: config?.timeout ?? 60000,
    };

    this.stripeService = new StripeService(
        this.container,
        serviceConfig,
        this.container.resolve('eventEmitter')
    );
}

// src/services/cloudinary/CloudinaryServiceProvider.ts - NEW
export class CloudinaryServiceProvider extends ServiceProvider {
    private cloudinaryService: CloudinaryService;

    async register(config?: CloudinaryConfig): Promise<void> {
        const serviceConfig: CloudinaryConfig & ServiceConfig = {
            name: 'cloudinary',
            enabled: true,
            cloudName: config?.cloudName ?? process.env.CLOUDINARY_CLOUD_NAME!,
            apiKey: config?.apiKey ?? process.env.CLOUDINARY_API_KEY!,
            apiSecret: config?.apiSecret ?? process.env.CLOUDINARY_API_SECRET!,
            secure: true
        };

        this.cloudinaryService = new CloudinaryService(this.container, serviceConfig);
        this.container.register('cloudinaryService', this.cloudinaryService);
    }
}

// src/services/localfile/LocalFileServiceProvider.ts - NEW
export class LocalFileServiceProvider extends ServiceProvider {
    private localFileService: LocalFileService;

    async register(config?: LocalFileConfig): Promise<void> {
        const serviceConfig: LocalFileConfig & ServiceConfig = {
            name: 'localfile',
            enabled: true,
            storagePath: config?.storagePath ?? './storage/media',
            publicPath: config?.publicPath ?? './public/media',
            baseUrl: config?.baseUrl ?? 'http://localhost:3000/media',
            maxFileSize: config?.maxFileSize ?? 10 * 1024 * 1024 // 10MB
        };

        this.localFileService = new LocalFileService(this.container, serviceConfig);
        this.container.register('localFileService', this.localFileService);
    }
}
```

### **Phase 4: Update Command Integration**

#### **4.1 Update Media Commands**
```typescript
// src/commands/media/MediaUploadCommand.ts - Updated to use services
export class MediaUploadCommand {
    async execute(filePath: string, options: MediaUploadOptions): Promise<void> {
        // BEFORE: Used MediaProvider interface
        // const provider = this.getMediaProvider(options.provider);

        // AFTER: Use proper services
        const serviceName = options.service || 'localfile'; // Default to localfile
        const service = this.container.resolve(`${serviceName}Service`);
        
        const file = await fs.readFile(filePath);
        const asset = await service.upload(file, {
            fileName: path.basename(filePath),
            folder: options.folder,
            overwrite: options.overwrite
        });

        console.log(`✅ Uploaded to ${serviceName}: ${asset.url}`);
    }
}
```

### **Phase 5: Remove Legacy MediaProvider Interface**

#### **5.1 Deprecate MediaProvider Pattern**
```typescript
// Mark as deprecated and plan for removal
// src/types/Media.ts
/**
 * @deprecated Use BaseService-based services instead (CloudinaryService, LocalFileService)
 * This interface will be removed in a future version
 */
export interface MediaProvider {
    // ... existing interface
}
```

## ✅ **Success Criteria**

### **Architecture Compliance**
- [ ] StripeService extends BaseService and implements IService interface
- [ ] All services have health check implementations
- [ ] All services track metrics consistently
- [ ] Media providers work through BaseService wrappers

### **Service Integration**
- [ ] All services use consistent error handling patterns
- [ ] All services integrate with container and dependency injection
- [ ] Health checks return proper status for all services
- [ ] Metrics collection works across all services

### **Media Architecture**
- [ ] CloudinaryService wrapper provides BaseService compliance
- [ ] LocalFileService wrapper provides BaseService compliance  
- [ ] Media providers continue working unchanged through delegation
- [ ] Media commands work with service wrappers

---

**Expected Delivery**: 0.5-1 working days  
**Priority**: CRITICAL (Must be completed first)  
**Dependencies**: None  
**Success Criteria**: All active services (Contentful, Stripe, Cloudinary, LocalFile) comply with BaseService architecture

**⚠️ BLOCKING**: Tasks 005, 006, 007 depend on this foundation being complete. 