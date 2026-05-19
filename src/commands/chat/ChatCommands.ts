import chalk from 'chalk';
import { Command } from 'commander';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiChatService } from '../../services/imajin-ai/ImajinAiChatService.js';

export class ChatCommands {
    constructor(
        private readonly chatService: ImajinAiChatService,
        private readonly logger: Logger
    ) {}

    public registerCommands(program: Command): void {
        const chatCommand = program
            .command('chat')
            .description('Chat operations backed by imajin-ai');

        const conversationsCommand = chatCommand
            .command('conversations')
            .description('Conversation operations');

        conversationsCommand
            .command('list')
            .option('--participant-did <did>', 'Optional participant DID filter')
            .option('--unread-only', 'Only include conversations with unread messages')
            .option('--limit <n>', 'Optional result limit')
            .option('--cursor <token>', 'Optional cursor token')
            .option('--json', 'Output as JSON')
            .description('List conversations')
            .action((options, command) => this.handleConversationsList(this.getCommandOptions(options, command)));

        const messagesCommand = chatCommand
            .command('messages')
            .description('Message listing operations');

        messagesCommand
            .command('list')
            .requiredOption('--conversation <did|id>', 'Conversation DID or id')
            .option('--limit <n>', 'Optional result limit')
            .option('--cursor <token>', 'Optional cursor token')
            .option('--json', 'Output as JSON')
            .description('List messages for conversation')
            .action((options, command) => this.handleMessagesList(this.getCommandOptions(options, command)));

        const messageCommand = chatCommand
            .command('message')
            .description('Message operations');

        messageCommand
            .command('send')
            .requiredOption('--conversation <did|id>', 'Conversation DID or id')
            .requiredOption('--content <text>', 'Message content')
            .option('--content-type <text|markdown|json>', 'Message content type')
            .option('--reply-to <msg-id>', 'Optional reply target message id')
            .option('--json', 'Output as JSON')
            .description('Send message to conversation')
            .action((options, command) => this.handleMessageSend(this.getCommandOptions(options, command)));

        const conversationCommand = chatCommand
            .command('conversation')
            .description('Single conversation operations');

        conversationCommand
            .command('read')
            .requiredOption('--conversation <did|id>', 'Conversation DID or id')
            .option('--json', 'Output as JSON')
            .description('Mark conversation as read')
            .action((options, command) => this.handleConversationRead(this.getCommandOptions(options, command)));

        const inviteCommand = chatCommand
            .command('invite')
            .description('Conversation invite operations');

        inviteCommand
            .command('create')
            .requiredOption('--conversation <did|id>', 'Conversation DID or id')
            .requiredOption('--member-did <did>', 'Member DID to invite')
            .option('--role <text>', 'Optional invite role')
            .option('--json', 'Output as JSON')
            .description('Create conversation invite')
            .action((options, command) => this.handleInviteCreate(this.getCommandOptions(options, command)));
    }

    private async handleConversationsList(options: any): Promise<void> {
        await this.execute(
            'conversations.list',
            options,
            async () => this.chatService.listConversations({
                ...(options.participantDid ? { participantDid: String(options.participantDid).trim() } : {}),
                ...(options.unreadOnly !== undefined ? { unreadOnly: !!options.unreadOnly } : {}),
                ...(options.limit ? { limit: this.parsePositiveInt(options.limit, '--limit') } : {}),
                ...(options.cursor ? { cursor: String(options.cursor).trim() } : {})
            })
        );
    }

    private async handleMessagesList(options: any): Promise<void> {
        await this.execute(
            'messages.list',
            options,
            async () => this.chatService.listMessages({
                conversation: this.requiredString(options.conversation, '--conversation'),
                ...(options.limit ? { limit: this.parsePositiveInt(options.limit, '--limit') } : {}),
                ...(options.cursor ? { cursor: String(options.cursor).trim() } : {})
            })
        );
    }

    private async handleMessageSend(options: any): Promise<void> {
        await this.execute(
            'message.send',
            options,
            async () => this.chatService.sendMessage({
                conversation: this.requiredString(options.conversation, '--conversation'),
                content: this.requiredString(options.content, '--content'),
                ...(options.contentType ? { contentType: String(options.contentType).trim() } : {}),
                ...(options.replyTo ? { replyTo: String(options.replyTo).trim() } : {})
            })
        );
    }

    private async handleConversationRead(options: any): Promise<void> {
        await this.execute(
            'conversation.read',
            options,
            async () => this.chatService.markConversationRead({
                conversation: this.requiredString(options.conversation, '--conversation')
            })
        );
    }

    private async handleInviteCreate(options: any): Promise<void> {
        await this.execute(
            'invite.create',
            options,
            async () => this.chatService.createInvite({
                conversation: this.requiredString(options.conversation, '--conversation'),
                memberDid: this.requiredString(options.memberDid, '--member-did'),
                ...(options.role ? { role: String(options.role).trim() } : {})
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
                    service: 'chat',
                    command,
                    data
                }, null, 2));
                return;
            }

            console.log(chalk.green(`✅ chat.${command} succeeded`));
            console.log(JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Chat command failed', error as Error, { command, options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    service: 'chat',
                    command,
                    error: String(error)
                }, null, 2));
                process.exit(1);
            }

            console.error(chalk.red(`❌ chat.${command} failed: ${error}`));
            process.exit(1);
        }
    }
}
