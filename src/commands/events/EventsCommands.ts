import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiEventsService } from '../../services/imajin-ai/ImajinAiEventsService.js';

export class EventsCommands {
    constructor(
        private readonly eventsService: ImajinAiEventsService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const eventsCommand = program
            .command('events')
            .description('Event operations backed by imajin-ai');
        eventsCommand
            .command('list')
            .option('--status <status>', 'Filter by event status')
            .option('--limit <n>', 'Optional result limit')
            .option('--course-slug <slug>', 'Filter by course slug')
            .option('--upcoming', 'Only include upcoming events')
            .option('--json', 'Output as JSON')
            .description('List events')
            .action((options, command) => this.handleList(this.getCommandOptions(options, command)));

        eventsCommand
            .command('create')
            .requiredOption('--title <text>', 'Event title')
            .requiredOption('--start <iso8601>', 'Event start time')
            .option('--end <iso8601>', 'Event end time')
            .option('--venue <text>', 'Event venue')
            .option('--price <decimal>', 'Event price')
            .option('--currency <code>', 'Currency code (e.g., USD)')
            .option('--json', 'Output as JSON')
            .description('Create event')
            .action((options, command) => this.handleCreate(this.getCommandOptions(options, command)));

        const ticketCommand = eventsCommand
            .command('ticket')
            .description('Event ticket operations');

        ticketCommand
            .command('buy')
            .requiredOption('--event-id <id>', 'Event id')
            .requiredOption('--ticket-type-id <id>', 'Ticket type id')
            .option('--quantity <n>', 'Optional ticket quantity')
            .option('--email <email>', 'Optional buyer email')
            .option('--invite <token>', 'Optional invite token')
            .option('--json', 'Output as JSON')
            .description('Buy event ticket')
            .action((options, command) => this.handleTicketBuy(this.getCommandOptions(options, command)));

        eventsCommand
            .command('rsvp')
            .requiredOption('--event-id <id>', 'Event id')
            .requiredOption('--ticket-type-id <id>', 'Free ticket type id')
            .option('--email <email>', 'Optional attendee email')
            .option('--name <text>', 'Optional attendee name')
            .option('--invite <token>', 'Optional invite token')
            .option('--json', 'Output as JSON')
            .description('RSVP to a free event')
            .action((options, command) => this.handleRsvp(this.getCommandOptions(options, command)));
    }

    private async handleList(options: any): Promise<void> {
        await this.execute(
            'list',
            options,
            async () => this.eventsService.listEvents({
                ...(options.status ? { status: String(options.status).trim() } : {}),
                ...(options.limit ? { limit: this.parsePositiveInt(options.limit, '--limit') } : {}),
                ...(options.courseSlug ? { courseSlug: String(options.courseSlug).trim() } : {}),
                ...(options.upcoming !== undefined ? { upcoming: !!options.upcoming } : {})
            })
        );
    }
    private async handleCreate(options: any): Promise<void> {
        await this.execute(
            'create',
            options,
            async () => this.eventsService.createEvent({
                title: this.requiredString(options.title, '--title'),
                start: this.requiredString(options.start, '--start'),
                ...(options.end ? { end: String(options.end).trim() } : {}),
                ...(options.venue ? { venue: String(options.venue).trim() } : {}),
                ...(options.price ? { price: this.requiredString(options.price, '--price') } : {}),
                ...(options.currency ? { currency: String(options.currency).trim() } : {})
            })
        );
    }
    private async handleTicketBuy(options: any): Promise<void> {
        await this.execute(
            'ticket.buy',
            options,
            async () => this.eventsService.buyTicket({
                eventId: this.requiredString(options.eventId, '--event-id'),
                ticketTypeId: this.requiredString(options.ticketTypeId, '--ticket-type-id'),
                ...(options.quantity ? { quantity: this.parsePositiveInt(options.quantity, '--quantity') } : {}),
                ...(options.email ? { email: String(options.email).trim() } : {}),
                ...(options.invite ? { invite: String(options.invite).trim() } : {})
            })
        );
    }

    private async handleRsvp(options: any): Promise<void> {
        await this.execute(
            'rsvp',
            options,
            async () => this.eventsService.rsvp({
                eventId: this.requiredString(options.eventId, '--event-id'),
                ticketTypeId: this.requiredString(options.ticketTypeId, '--ticket-type-id'),
                ...(options.email ? { email: String(options.email).trim() } : {}),
                ...(options.name ? { name: String(options.name).trim() } : {}),
                ...(options.invite ? { invite: String(options.invite).trim() } : {})
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
                    service: 'events',
                    command,
                    data
                }, null, 2));
                return;
            }

            console.log(chalk.green(`✅ events.${command} succeeded`));
            console.log(JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Events command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'events',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ events.${command} failed: ${error}`));
            process.exit(1);
        }
    }
}
