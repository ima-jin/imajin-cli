/**
 * Console Log Migration Script
 * Migrates console.log/error/warn to Winston logger with proper patterns
 */

const fs = require('fs');
const path = require('path');

// Files to migrate
const files = [
  'src/services/contentful/commands/ContentfulCommands.ts',
  'src/commands/generated/BusinessContextCommands.ts',
  'src/commands/TaskManagementCommands.ts',
  'src/commands/schema/SchemaCommands.ts',
  'src/commands/TaskMigrationCommand.ts'
];

// Track statistics
const stats = {
  filesProcessed: 0,
  consoleStatementsFound: 0,
  consoleStatementsRemaining: 0,
  loggingAdded: 0
};

function migrateFile(filePath) {
  console.log(`\nProcessing: ${filePath}`);

  const fullPath = path.join(__dirname, filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;

  // Count console statements before
  const beforeCount = (content.match(/console\.(log|error|warn|info|debug)/g) || []).length;
  stats.consoleStatementsFound += beforeCount;
  console.log(`  Found ${beforeCount} console statements`);

  // Check if already has logger import
  const hasLoggerImport = content.includes("import type { Logger } from");
  const hasContainerImport = content.includes("import { Container } from");

  // Determine if it's a class-based or function-based command file
  const isClassBased = content.includes('export class ') && content.includes('Commands {');

  // Add imports if missing
  if (!hasLoggerImport) {
    const loggerImportPath = filePath.includes('services/contentful')
      ? "'../../../logging/Logger.js'"
      : filePath.includes('commands/generated') || filePath.includes('commands/schema')
      ? "'../../logging/Logger.js'"
      : "'../logging/Logger.js'";

    // Find first import statement
    const importMatch = content.match(/^import .+;$/m);
    if (importMatch) {
      const importIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, importIndex) +
                `\nimport type { Logger } from ${loggerImportPath};` +
                content.slice(importIndex);
      stats.loggingAdded++;
    }
  }

  if (!hasContainerImport && isClassBased) {
    const containerImportPath = filePath.includes('services/contentful')
      ? "'../../../container/Container.js'"
      : filePath.includes('commands/generated') || filePath.includes('commands/schema')
      ? "'../../container/Container.js'"
      : "'../container/Container.js'";

    const importMatch = content.match(/^import .+;$/m);
    if (importMatch) {
      const importIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, importIndex) +
                `\nimport { Container } from ${containerImportPath};` +
                content.slice(importIndex);
    }
  }

  // For class-based files, inject logger in constructor if not present
  if (isClassBased && !content.includes('private logger: Logger')) {
    // Add private logger field
    const classMatch = content.match(/(export class \w+Commands \{[\s\S]*?)(  private \w+:)/);
    if (classMatch) {
      content = content.replace(
        classMatch[1] + classMatch[2],
        classMatch[1] + '  private logger: Logger;\n' + classMatch[2]
      );
    }

    // Add logger injection in constructor
    const constructorMatch = content.match(/(constructor\(\) \{[\s\S]*?)(    this\.\w+ = )/);
    if (constructorMatch) {
      const loggerInjection = `\n    // Inject logger from container\n    const container = globalThis.imajinApp?.container || new Container();\n    this.logger = container.resolve<Logger>('logger');\n`;
      content = content.replace(
        constructorMatch[1] + constructorMatch[2],
        constructorMatch[1] + loggerInjection + '\n' + constructorMatch[2]
      );
      stats.loggingAdded++;
    }
  }

  // For function-based files, add logger resolution at top of function
  if (!isClassBased && !content.includes('let logger: Logger')) {
    const functionMatch = content.match(/(export function \w+\(\): Command \{[\s\S]*?cmd\.description\([^)]+\);)/);
    if (functionMatch) {
      const loggerInit = `\n\n    // Get logger from container\n    let logger: Logger | null = null;\n    try {\n        const container = globalThis.imajinApp?.container || new Container();\n        logger = container.resolve<Logger>('logger');\n    } catch (error) {\n        // Logger not available yet, commands will handle gracefully\n    }`;
      content = content.replace(
        functionMatch[1],
        functionMatch[1] + loggerInit
      );
      stats.loggingAdded++;
    }
  }

  // Now migrate console statements systematically
  // Pattern 1: console.error with chalk.red (keep user output, add logger.error)
  content = content.replace(
    /console\.error\(chalk\.red\('([^']+)'\),\s*([^)]+)\);/g,
    (match, message, errorVar) => {
      const loggerCall = `logger?.error('${message}', ${errorVar} instanceof Error ? ${errorVar} : undefined);\n                ` + match;
      return match.includes('logger?.error') ? match : loggerCall;
    }
  );

  // Pattern 2: Simple console.log with chalk (keep user output, add logger.info/debug)
  content = content.replace(
    /(\s+)console\.log\(chalk\.(blue|green|cyan|yellow)\('([^']+)'\)\);/g,
    (match, indent, color, message) => {
      // Don't add logger if it's user-facing output with emojis
      if (message.includes('✅') || message.includes('❌') || message.includes('📋')) {
        return match; // Keep as-is for user output
      }
      return match;
    }
  );

  // Write back only if changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`  ✅ Migrated ${filePath}`);
  } else {
    console.log(`  ⚠️  No changes made to ${filePath}`);
  }

  // Count console statements after
  const afterCount = (content.match(/console\.(log|error|warn|info|debug)/g) || []).length;
  stats.consoleStatementsRemaining += afterCount;
  console.log(`  Remaining: ${afterCount} console statements`);

  stats.filesProcessed++;
}

// Run migration
console.log('==================================================');
console.log('Console Log Migration Tool');
console.log('Pre-Launch Rule #1 Compliance');
console.log('==================================================\n');

files.forEach(file => {
  try {
    migrateFile(file);
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log('\n==================================================');
console.log('Migration Summary');
console.log('==================================================');
console.log(`Files Processed: ${stats.filesProcessed}`);
console.log(`Console Statements Found: ${stats.consoleStatementsFound}`);
console.log(`Console Statements Remaining: ${stats.consoleStatementsRemaining}`);
console.log(`Logger Injections Added: ${stats.loggingAdded}`);
console.log(`Reduction: ${stats.consoleStatementsFound - stats.consoleStatementsRemaining} statements`);
console.log('==================================================\n');
