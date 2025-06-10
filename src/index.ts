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
import { ExceptionUtils, SystemError } from './exceptions/index.js';

// Load environment variables
config();

// Bootstrap and run the application
async function main(): Promise<void> {
  let app: Application | undefined;

  try {
    app = new Application({
      debug: process.env.DEBUG === 'true',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      outputFormat: 'text',
      colorOutput: !process.argv.includes('--no-color'),
    });

    // Register service providers
    const { StripeServiceProvider } = await import('./providers/StripeServiceProvider.js');
    const { CredentialServiceProvider } = await import('./core/credentials/CredentialServiceProvider.js');
    const { ServiceLayerProvider } = await import('./providers/ServiceLayerProvider.js');
    const { PluginGeneratorServiceProvider } = await import('./providers/PluginGeneratorServiceProvider.js');
    const { MediaServiceProvider } = await import('./providers/MediaServiceProvider.js');

    app.createProvider(CredentialServiceProvider);
    app.createProvider(ServiceLayerProvider);
    app.createProvider(StripeServiceProvider);
    app.createProvider(PluginGeneratorServiceProvider);
    app.createProvider(MediaServiceProvider);

    // Boot the application (register and initialize services)
    await app.boot();

    // Run the CLI
    await app.run();
  } catch (error) {
    // If we have an app instance, use its error handler
    if (app && (app as any).errorHandler) {
      const normalizedError = ExceptionUtils.normalize(error, {
        source: 'main',
        phase: 'bootstrap'
      });

      await (app as any).errorHandler.handleError(normalizedError);
    } else {
      // Fallback to basic error handling if app isn't initialized
      const systemError = SystemError.processError(
        process.pid,
        1,
        { originalError: error, source: 'main', phase: 'bootstrap' }
      );

      console.error(systemError.getFormattedError());
      process.exit(1);
    }
  }
}

// Note: Global error handlers are now set up in Application.ts
// This provides better integration with the error handling system

// Start the application
main(); 