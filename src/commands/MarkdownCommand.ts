/**
 * MarkdownCommand - Convert markdown files to PDF
 * 
 * @package     @imajin/cli
 * @subpackage  commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-01-26
 *
 * Integration Points:
 * - Markdown to PDF conversion using md-to-pdf
 * - Batch processing of multiple markdown files
 * - Custom styling and configuration support
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { mdToPdf } from 'md-to-pdf';
import type { LLMResponse } from '../types/LLM.js';

export interface MarkdownToPdfOptions {
    output?: string;
    css?: string;
    format?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal';
    margin?: string;
    json?: boolean;
    watch?: boolean;
    recursive?: boolean;
}

export class MarkdownCommand {
    
    public register(program: Command): void {
        const markdownCmd = program
            .command('markdown')
            .alias('md')
            .description('Markdown utilities and converters');

        // Convert markdown to PDF
        markdownCmd
            .command('to-pdf <input>')
            .description('Convert markdown files to PDF')
            .option('-o, --output <path>', 'Output directory or file path')
            .option('--css <path>', 'Custom CSS file for styling')
            .option('--format <format>', 'Paper format (A4, A3, A5, Letter, Legal)', 'A4')
            .option('--margin <margin>', 'Page margins (e.g., "1in" or "20mm")', '1in')
            .option('--json', 'Output results in JSON format')
            .option('-r, --recursive', 'Process files recursively')
            .action(async (input: string, options: MarkdownToPdfOptions) => {
                await this.convertToPdf(input, options);
            });

        // Watch mode for live conversion
        markdownCmd
            .command('watch <input>')
            .description('Watch markdown files and auto-convert to PDF on changes')
            .option('-o, --output <path>', 'Output directory')
            .option('--css <path>', 'Custom CSS file for styling')
            .option('--format <format>', 'Paper format (A4, A3, A5, Letter, Legal)', 'A4')
            .option('--margin <margin>', 'Page margins', '1in')
            .action(async (input: string, options: MarkdownToPdfOptions) => {
                await this.watchAndConvert(input, { ...options, watch: true });
            });
    }

    public async convertToPdf(input: string, options: MarkdownToPdfOptions): Promise<void> {
        const startTime = Date.now();
        
        try {
            // Resolve input pattern
            const files = await this.resolveInputFiles(input, options.recursive);
            
            if (files.length === 0) {
                throw new Error(`No markdown files found matching: ${input}`);
            }

            console.log(chalk.blue(`📄 Converting ${files.length} markdown file(s) to PDF...`));

            const results = [];
            let successCount = 0;
            let errorCount = 0;

            for (const file of files) {
                try {
                    const result = await this.convertSingleFile(file, options);
                    results.push(result);
                    successCount++;
                    
                    if (!options.json) {
                        console.log(chalk.green(`✅ ${file} → ${result.outputPath}`));
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    results.push({
                        inputPath: file,
                        success: false,
                        error: errorMessage
                    });
                    errorCount++;
                    
                    if (!options.json) {
                        console.log(chalk.red(`❌ ${file}: ${errorMessage}`));
                    }
                }
            }

            const executionTime = Date.now() - startTime;

            if (options.json) {
                const response: LLMResponse = {
                    success: errorCount === 0,
                    data: {
                        results,
                        summary: {
                            total: files.length,
                            successful: successCount,
                            failed: errorCount
                        }
                    },
                    timestamp: new Date(),
                    service: 'markdown',
                    command: 'to-pdf',
                    executionTime
                };
                console.log(JSON.stringify(response, null, 2));
            } else {
                console.log();
                console.log(chalk.bold(`📊 Conversion Summary:`));
                console.log(`Total files: ${files.length}`);
                console.log(chalk.green(`Successful: ${successCount}`));
                if (errorCount > 0) {
                    console.log(chalk.red(`Failed: ${errorCount}`));
                }
                console.log(chalk.gray(`Completed in ${executionTime}ms`));
            }

            if (errorCount > 0) {
                process.exit(1);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const executionTime = Date.now() - startTime;

            if (options.json) {
                const errorResponse: LLMResponse = {
                    success: false,
                    error: errorMessage,
                    timestamp: new Date(),
                    service: 'markdown',
                    command: 'to-pdf',
                    executionTime
                };
                console.log(JSON.stringify(errorResponse, null, 2));
            } else {
                console.error(chalk.red('❌ Conversion failed:'), errorMessage);
            }

            process.exit(1);
        }
    }

    public async watchAndConvert(input: string, options: MarkdownToPdfOptions): Promise<void> {
        console.log(chalk.blue(`👀 Watching ${input} for changes... (Press Ctrl+C to stop)`));
        
        const chokidar = await import('chokidar');
        const watcher = chokidar.watch(input, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        });

        watcher.on('change', async (filePath) => {
            if (path.extname(filePath).toLowerCase() === '.md') {
                console.log(chalk.yellow(`📝 File changed: ${filePath}`));
                try {
                    const result = await this.convertSingleFile(filePath, options);
                    console.log(chalk.green(`✅ Converted: ${result.outputPath}`));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.log(chalk.red(`❌ Failed to convert ${filePath}: ${errorMessage}`));
                }
            }
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\n👋 Stopping watch mode...'));
            watcher.close();
            process.exit(0);
        });
    }

    private async resolveInputFiles(input: string, recursive?: boolean): Promise<string[]> {
        const stats = await fs.stat(input).catch(() => null);
        
        if (stats?.isFile()) {
            return [input];
        } else if (stats?.isDirectory()) {
            const pattern = recursive ? `${input}/**/*.md` : `${input}/*.md`;
            return await glob(pattern);
        } else {
            // Treat as glob pattern
            return await glob(input);
        }
    }

    private async convertSingleFile(filePath: string, options: MarkdownToPdfOptions): Promise<any> {
        const outputPath = this.getOutputPath(filePath, options.output);
        
        // Ensure output directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Prepare conversion options
        const pdfOptions: any = {
            path: filePath,
            pdf_options: {
                format: options.format || 'A4',
                margin: options.margin || '1in'
            }
        };

        // Add custom CSS if specified
        if (options.css) {
            const cssContent = await fs.readFile(options.css, 'utf-8');
            pdfOptions.css = cssContent;
        }

        // Convert to PDF
        const result = await mdToPdf(pdfOptions);
        
        if (!result || !result.content) {
            throw new Error('Failed to generate PDF content');
        }

        // Write PDF content to disk
        await fs.writeFile(outputPath, result.content);

        return {
            inputPath: filePath,
            outputPath,
            success: true,
            fileSize: result.content.length
        };
    }

    private getOutputPath(inputPath: string, outputOption?: string): string {
        const inputDir = path.dirname(inputPath);
        const inputName = path.basename(inputPath, path.extname(inputPath));
        
        if (!outputOption) {
            // Default: same directory as input with .pdf extension
            return path.join(inputDir, `${inputName}.pdf`);
        }
        
        const outputStats = fs.stat(outputOption).catch(() => null);
        
        // If output is a directory, put file there
        if (outputStats && (outputStats as any).isDirectory?.()) {
            return path.join(outputOption, `${inputName}.pdf`);
        }
        
        // If output has .pdf extension, use as-is
        if (path.extname(outputOption).toLowerCase() === '.pdf') {
            return outputOption;
        }
        
        // Otherwise, treat as directory and create it
        return path.join(outputOption, `${inputName}.pdf`);
    }
} 