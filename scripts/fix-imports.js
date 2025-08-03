// post-build.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix ES module imports in TypeScript source files
function fixImportsInDir(dir) {
    // Get all TS files in the directory
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            fixImportsInDir(fullPath);  // Recursively fix imports in subdirectories
        } else if (file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const originalContent = content;

            // Fix import/export statements with relative paths
            // Match both import and export statements with relative paths that don't end with .js
            content = content.replace(/(from|export \{[^}]+\} from) '\.(.*?)(?:\.js)?'/g, (match, prefix, path) => {
                // Skip if it already ends with .js
                if (path.endsWith('.js')) {
                    return match;
                }
                return `${prefix} '.${path}.js'`;
            });
            
            // Also fix standalone import statements
            content = content.replace(/(import [^\s]+ from) '\.(.*?)(?:\.js)?'/g, (match, prefix, path) => {
                if (path.endsWith('.js')) {
                    return match;
                }
                return `${prefix} '.${path}.js'`;
            });
            if (content !== originalContent) {  // Only write back if changes were made
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

// Start fixing from the 'src' directory
fixImportsInDir(path.join(__dirname, '../src'));

