import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiLearnService } from '../../services/imajin-ai/ImajinAiLearnService.js';

export class LearnCommands {
    constructor(
        private readonly learnService: ImajinAiLearnService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const learnCommand = program
            .command('learn')
            .description('Learning operations backed by imajin-ai');

        const coursesCommand = learnCommand
            .command('courses')
            .description('Course operations');

        coursesCommand
            .command('list')
            .option('--mine', 'Only include courses where requester is enrolled')
            .option('--teaching', 'Only include courses where requester is an instructor')
            .option('--limit <n>', 'Optional result limit')
            .option('--cursor <token>', 'Optional cursor token')
            .option('--json', 'Output as JSON')
            .description('List courses')
            .action((options, command) => this.handleList(this.getCommandOptions(options, command)));
    }

    private async handleList(options: any): Promise<void> {
        await this.execute(
            'courses.list',
            options,
            async () => this.learnService.listCourses({
                ...(options.mine !== undefined ? { mine: !!options.mine } : {}),
                ...(options.teaching !== undefined ? { teaching: !!options.teaching } : {}),
                ...(options.limit ? { limit: this.parsePositiveInt(options.limit, '--limit') } : {}),
                ...(options.cursor ? { cursor: String(options.cursor).trim() } : {})
            })
        );
    }

    private requiredString(value: unknown, optionName: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`${optionName} is required`);
        }
        return value.trim();
    }

    private parsePositiveInt(value: unknown, optionName: string): number {
        const parsed = Number.parseInt(this.requiredString(value, optionName), 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new Error(`${optionName} must be a positive integer`);
        }
        return parsed;
    }

    private getCommandOptions(optionsOrCommand: any, possibleCommand?: any): any {
        if (possibleCommand && typeof possibleCommand.optsWithGlobals === 'function') {
            return possibleCommand.optsWithGlobals();
        }
        if (possibleCommand && typeof possibleCommand.opts === 'function') {
            return possibleCommand.opts();
        }
        if (optionsOrCommand && typeof optionsOrCommand.optsWithGlobals === 'function') {
            return optionsOrCommand.optsWithGlobals();
        }
        if (optionsOrCommand && typeof optionsOrCommand.opts === 'function') {
            return optionsOrCommand.opts();
        }
        if (optionsOrCommand && typeof optionsOrCommand === 'object' && !Array.isArray(optionsOrCommand)) {
            return optionsOrCommand;
        }
        return {};
    }

    private async execute(command: string, options: any, operation: () => Promise<any>): Promise<void> {
        try {
            const data = await operation();
            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    service: 'learn',
                    command,
                    data
                }, null, 2));
                return;
            }

            console.log(chalk.green(`✅ learn.${command} succeeded`));
            console.log(JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Learn command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'learn',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ learn.${command} failed: ${error}`));
            process.exit(1);
        }
    }
}
