import { ImajinAiChatService } from '../../../services/imajin-ai/ImajinAiChatService.js';

describe('ImajinAiChatService', () => {
    const createService = () => {
        const mockSessionService = {
            getAuthHeadersForRequest: jest.fn().mockResolvedValue({ Authorization: 'Bearer test' }),
            getBaseUrl: jest.fn().mockReturnValue('https://example.test')
        };

        const mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        const service = new ImajinAiChatService(mockSessionService as any, mockLogger as any);
        const getMock = jest.fn();
        const postMock = jest.fn();
        (service as any).createClient = jest.fn().mockReturnValue({
            get: getMock,
            post: postMock
        });

        return {
            service,
            sessionService: mockSessionService,
            getMock,
            postMock
        };
    };

    it('maps chat.conversations.list to GET /api/conversations with query params', async () => {
        const { service, getMock, sessionService } = createService();
        getMock.mockResolvedValue({
            data: { items: [{ id: 'conv_1' }], next_cursor: 'cur_2' }
        });

        const result = await service.listConversations({
            participantDid: 'did:imajin:alice',
            unreadOnly: true,
            limit: 25,
            cursor: 'cur_1'
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(getMock).toHaveBeenCalledWith('/api/conversations?participant_did=did%3Aimajin%3Aalice&unread_only=true&limit=25&cursor=cur_1');
        expect(result).toMatchObject({
            items: [{ id: 'conv_1' }],
            next_cursor: 'cur_2'
        });
    });

    it('maps chat.messages.list to GET /api/conversations/{id}/messages', async () => {
        const { service, getMock } = createService();
        getMock.mockResolvedValue({
            data: { items: [{ id: 'msg_1' }] }
        });

        const result = await service.listMessages({
            conversation: 'did:imajin:room',
            limit: 50,
            cursor: 'cursor_1'
        });

        expect(getMock).toHaveBeenCalledWith('/api/conversations/did%3Aimajin%3Aroom/messages?limit=50&cursor=cursor_1');
        expect(result).toMatchObject({
            items: [{ id: 'msg_1' }]
        });
    });

    it('maps chat.message.send to POST /api/conversations/{id}/messages payload', async () => {
        const { service, postMock } = createService();
        postMock.mockResolvedValue({
            data: { id: 'msg_2', status: 'sent' }
        });

        const result = await service.sendMessage({
            conversation: 'conv_1',
            content: 'hello world',
            contentType: 'text',
            replyTo: 'msg_0'
        });

        expect(postMock).toHaveBeenCalledWith('/api/conversations/conv_1/messages', {
            content: 'hello world',
            content_type: 'text',
            reply_to: 'msg_0'
        });
        expect(result).toMatchObject({
            id: 'msg_2',
            status: 'sent'
        });
    });

    it('maps chat.conversation.read to POST /api/conversations/{id}/read', async () => {
        const { service, postMock } = createService();
        postMock.mockResolvedValue({
            data: { conversation_id: 'conv_1', read: true }
        });

        const result = await service.markConversationRead({ conversation: 'conv_1' });

        expect(postMock).toHaveBeenCalledWith('/api/conversations/conv_1/read', {});
        expect(result).toMatchObject({
            conversation_id: 'conv_1',
            read: true
        });
    });

    it('maps chat.invite.create to POST /api/invites payload', async () => {
        const { service, postMock } = createService();
        postMock.mockResolvedValue({
            data: { invite_id: 'inv_1', status: 'created' }
        });

        const result = await service.createInvite({
            conversation: 'conv_1',
            memberDid: 'did:imajin:bob',
            role: 'member'
        });

        expect(postMock).toHaveBeenCalledWith('/api/invites', {
            conversation_id: 'conv_1',
            member_did: 'did:imajin:bob',
            role: 'member'
        });
        expect(result).toMatchObject({
            invite_id: 'inv_1',
            status: 'created'
        });
    });
});
