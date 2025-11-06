// revert-imports.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function revertImportsInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            revertImportsInDir(fullPath);
        } else if (file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const originalContent = content;

            // Remove .js extensions from relative imports
            content = content.replace(/(from|export \{[^}]+\} from) '(\.[^']*?)\.js'/g, '$1 \'$2\'');
            content = content.replace(/(import [^\s]+ from) '(\.[^']*?)\.js'/g, '$1 \'$2\'');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log('Reverted:', fullPath);
            }
        }
    }
}

// Start reverting from the 'src' directory
revertImportsInDir(path.join(__dirname, '../src'));
