/**
 * index - Main entry point for Imajin CLI
 * 
 * @package     @imajin/cli
 * @module      index
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-06
 * @updated      2025-07-03
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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'node:path';

// Load environment variables
config();

/**
 * Detect if we're running in development mode (npm link)
 * This checks if we're running from a symlinked node_modules location
 */
function isNpmLinkMode(): boolean {
  try {
    // Get the current module's directory (ES module equivalent of __dirname)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Get the real path of the current module
    const currentPath = __dirname;
    const realPath = fs.realpathSync(currentPath);
    
    // If real path differs from current path, we're likely in a symlink (npm link)
    const isSymlinked = currentPath !== realPath;
    
    // Also check if package.json exists in parent directory (development)
    const packageJsonPath = path.join(currentPath, '..', 'package.json');
    const hasPackageJson = fs.existsSync(packageJsonPath);
    
    // Check if we're in a node_modules/.bin path but the real path is elsewhere
    const isInNodeModulesBin = currentPath.includes('node_modules') && currentPath.includes('.bin');
    
    return isSymlinked || (hasPackageJson && isInNodeModulesBin);
  } catch (error) {
    // If we can't determine, default to false
    return false;
  }
}

/**
 * Determine debug mode - auto-enable for npm link development
 */
function shouldEnableDebugMode(): boolean {
  // Explicit debug flag takes precedence
  if (process.env.DEBUG === 'true') {
return true;
}
  if (process.env.DEBUG === 'false') {
return false;
}
  
  // Check for debug command line flag
  if (process.argv.includes('--debug')) {
return true;
}
  
  // Auto-enable for npm link development
  if (isNpmLinkMode()) {
    console.log('🔧 Development mode detected (npm link) - enabling debug logging');
    return true;
  }
  
  return false;
}

// Bootstrap and run the application
async function main(): Promise<void> {
  let app: Application | undefined;

  try {
    const debugMode = shouldEnableDebugMode();
    
    app = new Application({
      debug: debugMode,
      logLevel: debugMode ? 'debug' : ((process.env.LOG_LEVEL as any) ?? 'info'),
      outputFormat: 'text',
      colorOutput: !process.argv.includes('--no-color'),
    });

    // Register service providers
    const { CredentialServiceProvider } = await import('./core/credentials/CredentialServiceProvider.js');
    const { ServiceLayerProvider } = await import('./providers/ServiceLayerProvider.js');
    const { PluginGeneratorServiceProvider } = await import('./providers/PluginGeneratorServiceProvider.js');
    const { MediaServiceProvider } = await import('./providers/MediaServiceProvider.js');
    const { MonitoringServiceProvider } = await import('./providers/MonitoringServiceProvider.js');
    const { StripeServiceProvider } = await import('./services/stripe/StripeServiceProvider.js');
    const { ContentfulServiceProvider } = await import('./services/contentful/ContentfulServiceProvider.js');

    app.createProvider(CredentialServiceProvider);
    app.createProvider(ServiceLayerProvider);
    app.createProvider(PluginGeneratorServiceProvider);
    app.createProvider(MediaServiceProvider);
    app.createProvider(MonitoringServiceProvider);
    app.createProvider(StripeServiceProvider);
    app.createProvider(ContentfulServiceProvider);

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