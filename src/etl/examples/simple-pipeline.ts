/**
 * Simple Pipeline Example - Demonstrates ETL system usage
 * 
 * @package     @imajin/cli
 * @subpackage  etl/examples
 * @author      Claude
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-01-27
 *
 * Integration Points:
 * - ETL Pipeline demonstration
 * - Example extractor, transformer, and loader
 * - Event handling and progress tracking
 */

import { z } from 'zod';
import {
    BaseExtractor,
    BaseExtractorConfig,
    BaseLoader,
    BaseLoaderConfig,
    BaseTransformer,
    BaseTransformerConfig,
    ETLContext,
    LoadOperation,
    Pipeline
} from '../index.js';

// Example data schemas
const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    created_at: z.string(),
});

const ProcessedUserSchema = z.object({
    userId: z.number(),
    fullName: z.string(),
    emailAddress: z.string(),
    createdDate: z.date(),
});

type User = z.infer<typeof UserSchema>;
type ProcessedUser = z.infer<typeof ProcessedUserSchema>;

/**
 * Example data extractor that simulates fetching users from an API
 */
class MockUserExtractor extends BaseExtractor<User> {
    public readonly name = 'mock_user_extractor';
    public readonly description = 'Mock extractor for demonstration';
    public readonly outputSchema = UserSchema;

    protected async performExtraction(
        context: ETLContext,
        config: BaseExtractorConfig
    ): Promise<User[]> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Return mock data
        return [
            {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                created_at: '2024-01-15T10:30:00Z',
            },
            {
                id: 2,
                name: 'Jane Smith',
                email: 'jane@example.com',
                created_at: '2024-01-16T14:20:00Z',
            },
            {
                id: 3,
                name: 'Bob Johnson',
                email: 'bob@example.com',
                created_at: '2024-01-17T09:15:00Z',
            },
        ];
    }
}

/**
 * Example transformer that processes user data
 */
class UserTransformer extends BaseTransformer<User, ProcessedUser> {
    public readonly name = 'user_transformer';
    public readonly description = 'Transform user data format';
    public readonly inputSchema = UserSchema;
    public readonly outputSchema = ProcessedUserSchema;

    protected async performTransformation(
        item: User,
        context: ETLContext,
        config: BaseTransformerConfig
    ): Promise<ProcessedUser> {
        return {
            userId: item.id,
            fullName: item.name,
            emailAddress: item.email.toLowerCase(),
            createdDate: new Date(item.created_at),
        };
    }
}

/**
 * Example loader that simulates saving data to a database
 */
class MockDatabaseLoader extends BaseLoader<ProcessedUser> {
    public readonly name = 'mock_database_loader';
    public readonly description = 'Mock loader for demonstration';
    public readonly inputSchema = ProcessedUserSchema;

    protected async performLoad(
        item: ProcessedUser,
        context: ETLContext,
        config: BaseLoaderConfig
    ): Promise<LoadOperation> {
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
            success: true,
            id: `user_${item.userId}`,
            item,
            metadata: {
                timestamp: new Date().toISOString(),
            },
        };
    }

    protected async testConnection(config: BaseLoaderConfig): Promise<void> {
        // Mock connection test
        console.log('Testing database connection...');
    }
}

/**
 * Example function demonstrating the ETL pipeline
 */
export async function runSimplePipeline(): Promise<void> {
    console.log('🚀 Starting Simple ETL Pipeline Example\n');

    // Create pipeline components
    const extractor = new MockUserExtractor();
    const transformer = new UserTransformer();
    const loader = new MockDatabaseLoader();

    // Create pipeline definition
    const pipeline = Pipeline.create(
        'user_processing_pipeline',
        'User Data Processing Pipeline',
        extractor,
        transformer,
        loader,
        {
            batchSize: 2,
            validateInput: true,
            validateOutput: true,
        }
    );

    // Create pipeline executor
    const pipelineExecutor = new Pipeline();

    // Set up event listeners for monitoring
    pipelineExecutor.on('progress', (progress) => {
        console.log(`📊 [${progress.stage.toUpperCase()}] ${progress.step}: ${progress.message}`);
        if (progress.percentage) {
            console.log(`   Progress: ${progress.percentage}%`);
        }
    });

    pipelineExecutor.on('data:extracted', (count) => {
        console.log(`📥 Extracted ${count} items`);
    });

    pipelineExecutor.on('data:transformed', (count) => {
        console.log(`🔄 Transformed ${count} items`);
    });

    pipelineExecutor.on('data:loaded', (count) => {
        console.log(`💾 Loaded ${count} items`);
    });

    try {
        // Execute the pipeline
        console.log('⏳ Executing pipeline...\n');
        const result = await pipelineExecutor.execute(pipeline, {
            stopOnError: true,
            saveIntermediateResults: true,
        });

        // Display results
        console.log('\n📋 Pipeline Results:');
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        console.log(`   Duration: ${result.duration}ms`);
        console.log(`   Steps Executed: ${result.stepsExecuted}`);
        console.log(`   Total Processed: ${result.totalProcessed} items`);

        if (result.error) {
            console.error(`   Error: ${result.error.message}`);
        }

        // Display step details
        console.log('\n📝 Step Details:');
        result.results.forEach((stepResult, index) => {
            const status = stepResult.success ? '✅' : '❌';
            console.log(`   ${index + 1}. ${status} Processed ${stepResult.processed} items in ${stepResult.duration}ms`);
            if (stepResult.error) {
                console.log(`      Error: ${stepResult.error.message}`);
            }
        });

    } catch (error) {
        console.error('\n❌ Pipeline execution failed:', error);
    }

    console.log('\n🏁 Pipeline example completed');
}

/**
 * Example of a simple extract-only pipeline
 */
export async function runExtractOnlyPipeline(): Promise<void> {
    console.log('🔍 Running Extract-Only Pipeline\n');

    const extractor = new MockUserExtractor();
    const extractPipeline = Pipeline.extract(
        'extract_users',
        'Extract Users Only',
        extractor
    );

    const executor = new Pipeline();
    const result = await executor.execute(extractPipeline);

    console.log(`Extracted ${result.totalProcessed} users:`);
    if (result.results[0]?.data) {
        console.log(JSON.stringify(result.results[0].data, null, 2));
    }
}

// Export functions for use in other modules
export { MockDatabaseLoader, MockUserExtractor, UserTransformer };

