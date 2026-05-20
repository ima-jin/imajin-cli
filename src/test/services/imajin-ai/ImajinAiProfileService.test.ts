import { ImajinAiProfileService } from '../../../services/imajin-ai/ImajinAiProfileService.js';

describe('ImajinAiProfileService', () => {
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

        const service = new ImajinAiProfileService(mockSessionService as any, mockLogger as any);
        const getMock = jest.fn();
        const postMock = jest.fn();
        const putMock = jest.fn();
        const deleteMock = jest.fn();
        (service as any).createClient = jest.fn().mockReturnValue({
            get: getMock,
            post: postMock,
            put: putMock,
            delete: deleteMock
        });

        return {
            service,
            sessionService: mockSessionService,
            getMock,
            postMock,
            putMock,
            deleteMock
        };
    };

    it('maps profile.get to GET /api/profile/{id}', async () => {
        const { service, getMock } = createService();
        getMock.mockResolvedValue({ data: { did: 'did:imajin:alice' } });

        const result = await service.getProfile({ id: 'did:imajin:alice' });

        expect(getMock).toHaveBeenCalledWith('/api/profile/did%3Aimajin%3Aalice');
        expect(result).toMatchObject({ did: 'did:imajin:alice' });
    });

    it('maps profile.create to POST /api/profile payload', async () => {
        const { service, postMock, sessionService } = createService();
        postMock.mockResolvedValue({ data: { did: 'did:imajin:alice', handle: 'alice' } });

        const result = await service.createProfile({
            handle: 'alice',
            displayName: 'Alice',
            displayType: 'human',
            bio: 'bio',
            metadata: { locale: 'en' }
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/profile', {
            handle: 'alice',
            displayName: 'Alice',
            displayType: 'human',
            bio: 'bio',
            metadata: { locale: 'en' }
        });
        expect(result).toMatchObject({ handle: 'alice' });
    });

    it('maps profile.update to PUT /api/profile/{id} payload', async () => {
        const { service, putMock, sessionService } = createService();
        putMock.mockResolvedValue({ data: { did: 'did:imajin:alice', bio: 'updated' } });

        const result = await service.updateProfile({
            id: 'did:imajin:alice',
            bio: 'updated'
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(putMock).toHaveBeenCalledWith('/api/profile/did%3Aimajin%3Aalice', {
            bio: 'updated'
        });
        expect(result).toMatchObject({ bio: 'updated' });
    });

    it('maps profile.delete to DELETE /api/profile/{id}', async () => {
        const { service, deleteMock, sessionService } = createService();
        deleteMock.mockResolvedValue({ data: { success: true } });

        const result = await service.deleteProfile({ id: 'did:imajin:alice' });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(deleteMock).toHaveBeenCalledWith('/api/profile/did%3Aimajin%3Aalice');
        expect(result).toMatchObject({ success: true });
    });

    it('maps profile.search to GET /api/profile/search with query params', async () => {
        const { service, getMock } = createService();
        getMock.mockResolvedValue({ data: { profiles: [] } });

        await service.searchProfiles({
            query: 'alice',
            type: 'human',
            limit: 10,
            cursor: '20'
        });

        expect(getMock).toHaveBeenCalledWith('/api/profile/search?q=alice&type=human&limit=10&offset=20');
    });

    it('maps profile.counts.get to GET /api/profile/{id}/counts', async () => {
        const { service, getMock } = createService();
        getMock.mockResolvedValue({ data: { followers: 1, following: 2, connections: 3 } });

        const result = await service.getProfileCounts({ id: 'alice' });

        expect(getMock).toHaveBeenCalledWith('/api/profile/alice/counts');
        expect(result).toMatchObject({ followers: 1, following: 2, connections: 3 });
    });

    it('maps profile.handle.claim to POST /api/profile/claim-handle', async () => {
        const { service, postMock, sessionService } = createService();
        postMock.mockResolvedValue({ data: { success: true, handle: 'alice' } });

        const result = await service.claimHandle({ handle: 'alice' });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/profile/claim-handle', { handle: 'alice' });
        expect(result).toMatchObject({ success: true, handle: 'alice' });
    });

    it('maps profile.handle.check to GET /api/handle-check', async () => {
        const { service, getMock } = createService();
        getMock.mockResolvedValue({ data: { available: true } });

        const result = await service.checkHandleAvailability({ handle: 'alice' });

        expect(getMock).toHaveBeenCalledWith('/api/handle-check?handle=alice');
        expect(result).toMatchObject({ available: true });
    });

    it('maps profile.inference.toggle to POST /api/profile/inference', async () => {
        const { service, postMock, sessionService } = createService();
        postMock.mockResolvedValue({ data: { inferenceEnabled: true } });

        const result = await service.toggleInference({ enabled: true });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/profile/inference', { enabled: true });
        expect(result).toMatchObject({ inferenceEnabled: true });
    });

    it('maps profile.query to POST /api/profile/{id}/query with merged context', async () => {
        const { service, postMock, sessionService } = createService();
        postMock.mockResolvedValue({ data: { response: 'hello' } });

        const result = await service.queryProfile({
            id: 'alice',
            query: 'hello',
            context: { conversationId: 'c1' }
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/profile/alice/query', {
            conversationId: 'c1',
            message: 'hello'
        });
        expect(result).toMatchObject({ response: 'hello' });
    });

    it('maps profile.stream to POST /api/profile/{id}/stream with merged context', async () => {
        const { service, postMock, sessionService } = createService();
        postMock.mockResolvedValue({ data: 'stream-data' });

        const result = await service.streamProfile({
            id: 'alice',
            query: 'hello',
            context: { messages: [{ role: 'user', content: 'hello' }] }
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/profile/alice/stream', {
            messages: [{ role: 'user', content: 'hello' }],
            message: 'hello'
        });
        expect(result).toBe('stream-data');
    });
});
