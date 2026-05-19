import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface ChatConversationsListInput {
    participantDid?: string;
    unreadOnly?: boolean;
    limit?: number;
    cursor?: string;
}

export interface ChatMessagesListInput {
    conversation: string;
    limit?: number;
    cursor?: string;
}

export interface ChatMessageSendInput {
    conversation: string;
    content: string;
    contentType?: string;
    replyTo?: string;
}

export interface ChatConversationReadInput {
    conversation: string;
}

export interface ChatInviteCreateInput {
    conversation: string;
    memberDid: string;
    role?: string;
}

export class ImajinAiChatService {
    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async listConversations(input: ChatConversationsListInput = {}): Promise<any> {
        const params = new URLSearchParams();
        if (input.participantDid) {
            params.set('participant_did', this.requiredString(input.participantDid, 'participantDid'));
        }
        if (input.unreadOnly !== undefined) {
            params.set('unread_only', String(input.unreadOnly));
        }
        if (input.limit !== undefined) {
            params.set('limit', String(input.limit));
        }
        if (input.cursor) {
            params.set('cursor', this.requiredString(input.cursor, 'cursor'));
        }

        const query = params.toString();
        const path = `/api/conversations${query ? `?${query}` : ''}`;
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.get(path);
        return response.data;
    }

    public async listMessages(input: ChatMessagesListInput): Promise<any> {
        const conversation = this.requiredString(input.conversation, 'conversation');
        const params = new URLSearchParams();
        if (input.limit !== undefined) {
            params.set('limit', String(input.limit));
        }
        if (input.cursor) {
            params.set('cursor', this.requiredString(input.cursor, 'cursor'));
        }

        const query = params.toString();
        const path = `/api/conversations/${encodeURIComponent(conversation)}/messages${query ? `?${query}` : ''}`;
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.get(path);
        return response.data;
    }

    public async sendMessage(input: ChatMessageSendInput): Promise<any> {
        const conversation = this.requiredString(input.conversation, 'conversation');
        const content = this.requiredString(input.content, 'content');

        const payload: Record<string, unknown> = { content };
        if (input.contentType) {
            payload.content_type = this.requiredString(input.contentType, 'contentType');
        }
        if (input.replyTo) {
            payload.reply_to = this.requiredString(input.replyTo, 'replyTo');
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post(`/api/conversations/${encodeURIComponent(conversation)}/messages`, payload);
        return response.data;
    }

    public async markConversationRead(input: ChatConversationReadInput): Promise<any> {
        const conversation = this.requiredString(input.conversation, 'conversation');
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post(`/api/conversations/${encodeURIComponent(conversation)}/read`, {});
        return response.data;
    }

    public async createInvite(input: ChatInviteCreateInput): Promise<any> {
        const conversation = this.requiredString(input.conversation, 'conversation');
        const memberDid = this.requiredString(input.memberDid, 'memberDid');

        const payload: Record<string, unknown> = {
            conversation_id: conversation,
            member_did: memberDid
        };
        if (input.role) {
            payload.role = this.requiredString(input.role, 'role');
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/invites', payload);
        return response.data;
    }

    private requiredString(value: string, name: string): string {
        if (!value || !value.trim()) {
            throw new Error(`${name} is required`);
        }
        return value.trim();
    }

    private createClient(headers: Record<string, string>): HttpClientSimple {
        return new HttpClientSimple(
            {
                baseURL: this.sessionService.getBaseUrl(),
                timeout: 30000,
                headers
            },
            this.logger
        );
    }
}
