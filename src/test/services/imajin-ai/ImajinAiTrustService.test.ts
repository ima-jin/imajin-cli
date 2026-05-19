import { ImajinAiTrustService } from '../../../services/imajin-ai/ImajinAiTrustService.js';

describe('ImajinAiTrustService', () => {
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

        const service = new ImajinAiTrustService(mockSessionService as any, mockLogger as any);
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

    it('maps trust.invite.create to POST /api/invites payload', async () => {
        const { service, postMock, sessionService } = createService();
        postMock.mockResolvedValue({
            data: { invite_id: 'inv_1', status: 'created' }
        });

        const result = await service.createInvite({
            delivery: 'email',
            email: 'friend@example.com',
            message: 'join my circle'
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/invites', {
            delivery: 'email',
            email: 'friend@example.com',
            message: 'join my circle'
        });
        expect(result).toMatchObject({
            invite_id: 'inv_1',
            status: 'created'
        });
    });

    it('maps trust.invite.accept to POST /api/invites/{code}/accept', async () => {
        const { service, postMock } = createService();
        postMock.mockResolvedValue({
            data: { accepted: true }
        });

        const result = await service.acceptInvite({ code: 'invite-123' });

        expect(postMock).toHaveBeenCalledWith('/api/invites/invite-123/accept', {});
        expect(result).toMatchObject({
            accepted: true
        });
    });

    it('maps trust.connections.list to GET /api/connections with query params', async () => {
        const { service, getMock } = createService();
        getMock.mockResolvedValue({
            data: { items: [{ did: 'did:imajin:bob' }], next_cursor: 'cur_2' }
        });

        const result = await service.listConnections({
            did: 'did:imajin:alice',
            scope: 'community',
            limit: 20,
            cursor: 'cur_1'
        });

        expect(getMock).toHaveBeenCalledWith('/api/connections?did=did%3Aimajin%3Aalice&scope=community&limit=20&cursor=cur_1');
        expect(result).toMatchObject({
            items: [{ did: 'did:imajin:bob' }],
            next_cursor: 'cur_2'
        });
    });

    it('maps trust.distance.get to GET /api/trust/distance with query params', async () => {
        const { service, getMock } = createService();
        getMock.mockResolvedValue({
            data: { distance: 2 }
        });

        const result = await service.getDistance({
            fromDid: 'did:imajin:alice',
            toDid: 'did:imajin:bob'
        });

        expect(getMock).toHaveBeenCalledWith('/api/trust/distance?from_did=did%3Aimajin%3Aalice&to_did=did%3Aimajin%3Abob');
        expect(result).toMatchObject({
            distance: 2
        });
    });
});
