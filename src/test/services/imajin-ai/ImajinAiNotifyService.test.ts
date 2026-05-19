import { ImajinAiNotifyService } from '../../../services/imajin-ai/ImajinAiNotifyService.js';

describe('ImajinAiNotifyService', () => {
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

        const service = new ImajinAiNotifyService(mockSessionService as any, mockLogger as any);
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

    it('maps notify.send to POST /api/send payload', async () => {
        const { service, postMock, sessionService } = createService();
        postMock.mockResolvedValue({
            data: { notification_id: 'ntf_1', status: 'queued' }
        });

        const result = await service.send({
            to: 'did:imajin:bob',
            scope: 'chat',
            title: 'Greetings',
            body: 'Hello',
            data: { source: 'cli' }
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/send', {
            to: 'did:imajin:bob',
            scope: 'chat',
            title: 'Greetings',
            body: 'Hello',
            data: { source: 'cli' }
        });
        expect(result).toMatchObject({
            notification_id: 'ntf_1',
            status: 'queued'
        });
    });

    it('maps notify.inbox.list to GET /api/notifications with query params', async () => {
        const { service, getMock } = createService();
        getMock.mockResolvedValue({
            data: { items: [{ id: 'ntf_1' }], next_cursor: 'cur_2' }
        });

        const result = await service.listInbox({
            unreadOnly: true,
            scope: 'chat',
            limit: 20,
            cursor: 'cur_1'
        });

        expect(getMock).toHaveBeenCalledWith('/api/notifications?unread_only=true&scope=chat&limit=20&cursor=cur_1');
        expect(result).toMatchObject({
            items: [{ id: 'ntf_1' }],
            next_cursor: 'cur_2'
        });
    });
});
