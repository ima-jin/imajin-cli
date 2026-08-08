#!/usr/bin/env node

import { spawn } from 'child_process';
import { execSync } from 'child_process';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Starting TypeScript watch mode with import fixing...');

// Start TypeScript compiler in watch mode
const tscProcess = spawn('npx', ['tsc', '--watch'], {
  stdio: 'pipe',
  shell: true,
  cwd: projectRoot
});

let isBuilding = false;
let buildQueue = false;

// Function to fix imports
function fixImports() {
  if (isBuilding) {
    buildQueue = true;
    return;
  }
  
  isBuilding = true;
  try {
    console.log('🔄 Fixing imports...');
    execSync('pnpm run fix-imports', { 
      stdio: 'inherit',
      cwd: projectRoot 
    });
    console.log('✅ Imports fixed!');
  } catch (error) {
    console.error('❌ Error fixing imports:', error.message);
  } finally {
    isBuilding = false;
    
    // If another build was queued, run it
    if (buildQueue) {
      buildQueue = false;
      setTimeout(fixImports, 100);
    }
  }
}

// Listen for TypeScript compilation messages
tscProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Check if compilation finished successfully
  if (output.includes('Found 0 errors. Watching for file changes.')) {
    fixImports();
  }
});

tscProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping watch mode...');
  tscProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  tscProcess.kill();
  process.exit(0);
});

tscProcess.on('close', (code) => {
  console.log(`\n📦 TypeScript watch process exited with code ${code}`);
  process.exit(code);
});
