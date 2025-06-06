/**
 * index - Main entry point for Imajin CLI
 * 
 * @package     @imajin/cli
 * @module      index
 * @author      VETEZE
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
import { Application } from './core/Application';

// Load environment variables
config();

// Bootstrap and run the application
async function main(): Promise<void> {
  try {
    const app = new Application();
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