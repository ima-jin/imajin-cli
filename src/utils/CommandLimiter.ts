/**
 * CommandLimiter - Git command filtering utility
 * 
 * @package     @imajin/cli
 * @subpackage  utils
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-01
 * @updated      2025-07-03
 *
 * Security Features:
 * - Git command filtering based on .ai.gitallowed file
 * - Pattern matching for command validation
 * - Detailed logging of blocked commands
 * - Graceful error handling
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Logger } from '../logging/Logger.js';

export interface CommandValidationResult {
    allowed: boolean;
    reason?: string;
    matchedPattern?: string;
}

export class CommandLimiter {
    private allowedPatterns: string[] = [];
    private logger: Logger | undefined;
    private allowedFilePath: string;
    private lastLoadTime: number = 0;
    private cacheTimeMs: number = 5000; // 5 seconds cache

    constructor(logger?: Logger) {
        this.logger = logger;
        this.allowedFilePath = path.join(process.cwd(), '.ai.gitallowed');
    }

    /**
     * Load allowed patterns from .ai.gitallowed file
     */
    private async loadAllowedPatterns(): Promise<void> {
        const now = Date.now();
        
        // Use cache if recently loaded
        if (now - this.lastLoadTime < this.cacheTimeMs) {
            return;
        }

        try {
            const content = await fs.readFile(this.allowedFilePath, 'utf-8');
            this.allowedPatterns = content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))
                .map(line => line.toLowerCase());
            
            this.lastLoadTime = now;
            
            this.logger?.debug('Loaded git command patterns from .ai.gitallowed', {
                patterns: this.allowedPatterns,
                count: this.allowedPatterns.length
            });
        } catch (error) {
            // If file doesn't exist, allow no git commands
            this.allowedPatterns = [];
            this.lastLoadTime = now;
            
            this.logger?.warn('Failed to load .ai.gitallowed file, blocking all git commands', {
                error: error instanceof Error ? error.message : 'Unknown error',
                path: this.allowedFilePath
            });
        }
    }

    /**
     * Check if a command is a git command
     */
    private isGitCommand(command: string): boolean {
        const normalizedCommand = command.trim().toLowerCase();
        return normalizedCommand.startsWith('git ') || normalizedCommand === 'git';
    }

    /**
     * Check if a git command matches any allowed pattern
     */
    private matchesAllowedPattern(command: string): { matches: boolean; pattern?: string } {
        const normalizedCommand = command.trim().toLowerCase();
        
        for (const pattern of this.allowedPatterns) {
            if (this.patternMatches(normalizedCommand, pattern)) {
                return { matches: true, pattern };
            }
        }
        
        return { matches: false };
    }

    /**
     * Simple pattern matching with wildcards
     */
    private patternMatches(command: string, pattern: string): boolean {
        // Convert pattern to regex
        // Replace * with .* for wildcard matching
        const regexPattern = pattern
            .replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
            .replaceAll(/\\\*/g, '.*'); // Convert \* back to .*
        
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(command);
    }

    /**
     * Validate if a command is allowed to be executed
     */
    async validateCommand(command: string): Promise<CommandValidationResult> {
        // Always allow non-git commands
        if (!this.isGitCommand(command)) {
            return { allowed: true };
        }

        // Load allowed patterns
        await this.loadAllowedPatterns();

        // Check if git command is allowed
        const { matches, pattern } = this.matchesAllowedPattern(command);
        
        if (matches) {
            this.logger?.debug('Git command allowed', {
                command,
                matchedPattern: pattern
            });
            
            const result: CommandValidationResult = { 
                allowed: true
            };
            if (pattern) {
                result.matchedPattern = pattern;
            }
            return result;
        } else {
            this.logger?.warn('Git command blocked', {
                command,
                reason: 'Not in allowed patterns',
                allowedPatterns: this.allowedPatterns
            });
            
            return { 
                allowed: false,
                reason: `Git command not allowed. Check .ai.gitallowed file for allowed patterns.`
            };
        }
    }

    /**
     * Validate and throw error if command is not allowed
     */
    async validateCommandOrThrow(command: string): Promise<void> {
        const result = await this.validateCommand(command);
        
        if (!result.allowed) {
            throw new Error(result.reason || 'Command not allowed');
        }
    }

    /**
     * Get current allowed patterns
     */
    async getAllowedPatterns(): Promise<string[]> {
        await this.loadAllowedPatterns();
        return [...this.allowedPatterns];
    }

    /**
     * Check if .ai.gitallowed file exists
     */
    async hasAllowedFile(): Promise<boolean> {
        try {
            await fs.access(this.allowedFilePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create default .ai.gitallowed file if it doesn't exist
     */
    async createDefaultAllowedFile(): Promise<void> {
        if (await this.hasAllowedFile()) {
            return;
        }

        const defaultContent = `# Allowed git commands for AI to run
# Use * for wildcards
# Examples:
# git status *
# git log --oneline
# git branch -a

git status *
`;

        await fs.writeFile(this.allowedFilePath, defaultContent, 'utf-8');
        
        this.logger?.info('Created default .ai.gitallowed file', {
            path: this.allowedFilePath
        });
    }
}

// Singleton instance for global use
let globalCommandLimiter: CommandLimiter | null = null;

/**
 * Get global command limiter instance
 */
export function getCommandLimiter(logger?: Logger): CommandLimiter {
    globalCommandLimiter ??= new CommandLimiter(logger);
    return globalCommandLimiter;
}

/**
 * Validate command using global limiter
 */
export async function validateCommand(command: string, logger?: Logger): Promise<CommandValidationResult> {
    const limiter = getCommandLimiter(logger);
    return limiter.validateCommand(command);
}

/**
 * Validate command and throw if not allowed
 */
export async function validateCommandOrThrow(command: string, logger?: Logger): Promise<void> {
    const limiter = getCommandLimiter(logger);
    return limiter.validateCommandOrThrow(command);
} 