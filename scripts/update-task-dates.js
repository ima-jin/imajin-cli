#!/usr/bin/env node

/**
 * Task Date Updater - Automatically update created/updated dates in task files
 * 
 * This script uses git history to find:
 * - created: First commit that added the file
 * - updated: Most recent commit that modified the file
 * 
 * Supports both:
 * - YAML frontmatter in markdown files (created/updated fields)
 * - JSDoc-style comments in code files (@since/@updated annotations)
 * 
 * Usage:
 *   node scripts/update-task-dates.js [file-pattern]
 *   node scripts/update-task-dates.js docs/prompts/tasks/*.md
 *   node scripts/update-task-dates.js docs/prompts/projects/*.md
 *   node scripts/update-task-dates.js "src/star-star/*.ts"
 *   node scripts/update-task-dates.js "src/star-star/*.js"
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { glob } from 'glob';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Get git creation date (first commit) for a file
 */
function getGitCreationDate(filePath) {
  try {
    const result = execSync(
      `git log --follow --format=%aI --diff-filter=A -- "${filePath}"`,
      { cwd: projectRoot, encoding: 'utf8' }
    );
    const dates = result.trim().split('\n').filter(Boolean);
    return dates[dates.length - 1] || null; // First commit is last in the list
  } catch (error) {
    console.warn(`Warning: Could not get git creation date for ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Get git last modified date (most recent commit) for a file
 */
function getGitLastModified(filePath) {
  try {
    const result = execSync(
      `git log -1 --format=%aI -- "${filePath}"`,
      { cwd: projectRoot, encoding: 'utf8' }
    );
    return result.trim() || null;
  } catch (error) {
    console.warn(`Warning: Could not get git last modified date for ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Get file system timestamps as fallback
 */
function getFileSystemDates(filePath) {
  try {
    const stats = statSync(filePath);
    return {
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString()
    };
  } catch (error) {
    console.warn(`Warning: Could not get file system dates for ${filePath}:`, error.message);
    return { created: null, modified: null };
  }
}

/**
 * Format date as YYYY-MM-DD for JSDoc annotations
 */
function formatDateForJSDoc(isoDate) {
  if (!isoDate) return null;
  return isoDate.split('T')[0];
}

/**
 * Format date as "Month YYYY" for human-readable dates
 */
function formatDateForHuman(isoDate) {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Parse YAML frontmatter from a markdown file
 */
function parseFrontmatter(content) {
  // More flexible regex that handles YAML comments and various line endings
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\n---\r?\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    return { frontmatter: null, body: content };
  }

  const [, frontmatterText, body] = frontmatterMatch;
  return { frontmatterText, body };
}

/**
 * Update YAML frontmatter with new dates
 */
function updateFrontmatterDates(frontmatterText, createdDate, updatedDate) {
  let updated = frontmatterText;

  // Update created date
  if (createdDate) {
    if (updated.includes('created:')) {
      updated = updated.replace(/created:\s*"[^"]*"/, `created: "${createdDate}"`);
    } else {
      // Add created date - try to add after task_id line first, otherwise at the end
      if (updated.includes('task_id:')) {
        updated = updated.replace(
          /(task_id:\s*"[^"]*"\n)/,
          `$1created: "${createdDate}"\n`
        );
      } else if (updated.includes('title:')) {
        updated = updated.replace(
          /(title:\s*"[^"]*"\n)/,
          `$1created: "${createdDate}"\n`
        );
      } else {
        // Add at the end of frontmatter
        updated = updated.trim() + `\ncreated: "${createdDate}"`;
      }
    }
  }

  // Update updated date
  if (updatedDate) {
    if (updated.includes('updated:')) {
      updated = updated.replace(/updated:\s*"[^"]*"/, `updated: "${updatedDate}"`);
    } else {
      // Add updated date after created line if it exists, otherwise at the end
      if (updated.includes('created:')) {
        updated = updated.replace(
          /(created:\s*"[^"]*"\n)/,
          `$1updated: "${updatedDate}"\n`
        );
      } else {
        // Add at the end of frontmatter
        updated = updated.trim() + `\nupdated: "${updatedDate}"`;
      }
    }
  }

  return updated;
}

/**
 * Create new YAML frontmatter with dates
 */
function createFrontmatter(filePath, createdDate, updatedDate) {
  const fileName = filePath.split(/[/\\]/).pop().replace('.md', '');
  const title = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  let frontmatter = `# Metadata\ntitle: "${title}"`;
  
  if (createdDate) {
    frontmatter += `\ncreated: "${createdDate}"`;
  }
  
  if (updatedDate && updatedDate !== createdDate) {
    frontmatter += `\nupdated: "${updatedDate}"`;
  }
  
  return frontmatter;
}

/**
 * Update "**Last Updated**: Month YYYY" style dates in markdown content
 */
function updateMarkdownLastUpdated(content, updatedDate) {
  if (!updatedDate) return content;
  
  const humanDate = formatDateForHuman(updatedDate);
  if (!humanDate) return content;
  
  const lastUpdatedPattern = /\*\*Last Updated\*\*:\s*[A-Za-z]+\s+\d{4}/g;
  
  if (content.match(lastUpdatedPattern)) {
    // Update existing "**Last Updated**:" line
    return content.replace(lastUpdatedPattern, `**Last Updated**: ${humanDate}`);
  } else {
    // Add "**Last Updated**:" after the first heading if it exists
    const headingMatch = content.match(/^(#{1,6}\s+.*\n)/m);
    if (headingMatch) {
      return content.replace(
        headingMatch[0],
        `${headingMatch[0]}\n**Last Updated**: ${humanDate}\n`
      );
    } else {
      // Add at the beginning of the document
      return `**Last Updated**: ${humanDate}\n\n${content}`;
    }
  }
}

/**
 * Update JSDoc-style @since and @updated annotations
 */
function updateJSDocDates(content, createdDate, updatedDate) {
  let updated = content;
  const createdDateFormatted = formatDateForJSDoc(createdDate);
  const updatedDateFormatted = formatDateForJSDoc(updatedDate);

  // Update @since date
  if (createdDateFormatted) {
    if (updated.includes('* @since')) {
      updated = updated.replace(
        /\* @since\s+\d{4}-\d{2}-\d{2}/,
        `* @since       ${createdDateFormatted}`
      );
    } else {
      // Find the end of the initial comment block and add @since
      const commentMatch = updated.match(/^(\/\*\*[\s\S]*?\*\s*\n)(\s*\*\/)/m);
      if (commentMatch) {
        updated = updated.replace(
          commentMatch[0],
          `${commentMatch[1]} * @since       ${createdDateFormatted}\n${commentMatch[2]}`
        );
      }
    }
  }

  // Update @updated date (only if file has been modified after creation)
  if (updatedDateFormatted && createdDateFormatted && updatedDateFormatted !== createdDateFormatted) {
    if (updated.includes('* @updated')) {
      updated = updated.replace(
        /\* @updated\s+\d{4}-\d{2}-\d{2}/,
        `* @updated      ${updatedDateFormatted}`
      );
    } else {
      // Add @updated after @since
      updated = updated.replace(
        /(\* @since\s+\d{4}-\d{2}-\d{2})/,
        `$1\n * @updated      ${updatedDateFormatted}`
      );
    }
  }

  return updated;
}

/**
 * Determine file type and processing strategy
 */
function getFileType(filePath) {
  const ext = extname(filePath).toLowerCase();
  
  if (ext === '.md') {
    return 'markdown';
  } else if (['.ts', '.js', '.jsx', '.tsx', '.php', '.java', '.cpp', '.c', '.cs'].includes(ext)) {
    return 'code';
  }
  
  return 'unknown';
}

/**
 * Process a single task/project file
 */
function processFile(filePath) {
  console.log(`\n📄 Processing: ${filePath}`);

  // Read file content
  const content = readFileSync(filePath, 'utf8');
  const fileType = getFileType(filePath);

  if (fileType === 'unknown') {
    console.log(`   ❌ Unknown file type, skipping`);
    return;
  }

  // Get dates from git
  const gitCreated = getGitCreationDate(filePath);
  const gitModified = getGitLastModified(filePath);

  // Get file system dates as fallback
  const fsdates = getFileSystemDates(filePath);

  // Use git dates if available, otherwise fall back to file system
  const createdDate = gitCreated || fsdates.created;
  const updatedDate = gitModified || fsdates.modified;

  console.log(`   📅 Created: ${createdDate || 'Unknown'}`);
  console.log(`   📅 Updated: ${updatedDate || 'Unknown'}`);
  console.log(`   🔍 Source: ${gitCreated ? 'Git' : 'File System'}`);
  console.log(`   📝 Type: ${fileType}`);

  if (!createdDate && !updatedDate) {
    console.log(`   ⚠️  No dates available, skipping`);
    return;
  }

  let updatedContent = content;
  let hasChanges = false;

  if (fileType === 'markdown') {
    // Handle YAML frontmatter
    const { frontmatterText, body } = parseFrontmatter(content);
    let frontmatterChanged = false;
    let bodyChanged = false;
    let newFrontmatter = frontmatterText;
    let newBody = body || content;

    if (!frontmatterText) {
      // Create new YAML frontmatter
      console.log(`   📝 Creating new YAML frontmatter`);
      newFrontmatter = createFrontmatter(filePath, createdDate, updatedDate);
      frontmatterChanged = true;
    } else {
      // Update existing frontmatter
      const updatedFrontmatter = updateFrontmatterDates(frontmatterText, createdDate, updatedDate);
      if (updatedFrontmatter !== frontmatterText) {
        newFrontmatter = updatedFrontmatter;
        frontmatterChanged = true;
        console.log(`   📝 Adding missing date fields to existing frontmatter`);
      }
    }

    // Update "**Last Updated**:" in markdown body
    const updatedBody = updateMarkdownLastUpdated(newBody, updatedDate);
    if (updatedBody !== newBody) {
      newBody = updatedBody;
      bodyChanged = true;
      console.log(`   📝 Updated "**Last Updated**:" in document body`);
    }

    // Reconstruct the file
    if (frontmatterChanged || bodyChanged) {
      if (frontmatterText || frontmatterChanged) {
        updatedContent = `---\n${newFrontmatter}\n---\n${newBody}`;
      } else {
        updatedContent = newBody;
      }
      hasChanges = true;
    }

  } else if (fileType === 'code') {
    // Handle JSDoc-style comments
    const originalContent = content;
    updatedContent = updateJSDocDates(content, createdDate, updatedDate);
    hasChanges = updatedContent !== originalContent;

    if (!hasChanges) {
      console.log(`   ❌ No JSDoc comment block found or no changes needed, skipping`);
      return;
    }
  }

  if (hasChanges) {
    // Write back to file
    writeFileSync(filePath, updatedContent);
    console.log(`   ✅ Updated dates in ${fileType === 'markdown' ? 'frontmatter' : 'JSDoc comments'}`);
  } else {
    console.log(`   ℹ️  No changes needed`);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  // Default patterns if no arguments provided
  const patterns = args.length > 0 ? args : [
    'docs/prompts/tasks/*.md',
    'docs/prompts/projects/*.md',
    'src/**/*.ts',
    'src/**/*.js'
  ];

  console.log('🔍 Task Date Updater');
  console.log('📂 Project root:', projectRoot);
  console.log('🎯 Patterns:', patterns.join(', '));

  let totalProcessed = 0;

  for (const pattern of patterns) {
    console.log(`\n🔎 Searching pattern: ${pattern}`);
    
    try {
      const files = glob.sync(pattern, { cwd: projectRoot });
      
      if (files.length === 0) {
        console.log(`   📭 No files found matching pattern`);
        continue;
      }

      console.log(`   📋 Found ${files.length} files`);

      for (const file of files) {
        const fullPath = join(projectRoot, file);
        processFile(fullPath);
        totalProcessed++;
      }
    } catch (error) {
      console.error(`❌ Error processing pattern ${pattern}:`, error.message);
    }
  }

  console.log(`\n🎉 Completed! Processed ${totalProcessed} files.`);
  
  if (totalProcessed > 0) {
    console.log('\n💡 Tips:');
    console.log('   • Run "git diff" to see what changed');
    console.log('   • Commit the updated dates: git add . && git commit -m "Update task dates from git history"');
    console.log('   • JSDoc @updated annotations are only added if file was modified after creation');
  }
}

// Run if called directly
if (import.meta.url.startsWith('file://') && process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  main();
}

export { processFile, getGitCreationDate, getGitLastModified, updateJSDocDates, formatDateForJSDoc, formatDateForHuman, updateMarkdownLastUpdated }; 