/**
 * index - Main entry point for Imajin CLI
 * 
 * @package     @imajin/cli
 * @module      index
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-04
 *
 * @see         docs/architecture.md
 * 
 * Integration Points:
 * - Application bootstrapping and lifecycle management
 * - Environment configuration loading
 * - Global error handling and process management
 */

import { config } from 'dotenv';
import 'reflect-metadata';
import { Application } from './core/Application.js';

// Load environment variables
config();

// Bootstrap and run the application
async function main(): Promise<void> {
  try {
    const app = new Application({
      debug: process.env.DEBUG === 'true',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      outputFormat: 'text',
      colorOutput: !process.argv.includes('--no-color'),
    });

    // Register service providers
    const { StripeServiceProvider } = await import('./providers/StripeServiceProvider.js');
    const { CredentialServiceProvider } = await import('./core/credentials/CredentialServiceProvider.js');
    const { PluginGeneratorServiceProvider } = await import('./providers/PluginGeneratorServiceProvider.js');

    app.createProvider(CredentialServiceProvider);
    app.createProvider(StripeServiceProvider);
    app.createProvider(PluginGeneratorServiceProvider);

    // Boot the application (register and initialize services)
    await app.boot();

    // Run the CLI
    await app.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
main(); 