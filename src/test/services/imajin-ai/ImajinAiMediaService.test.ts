import { ImajinAiMediaService } from '../../../services/imajin-ai/ImajinAiMediaService.js';

describe('ImajinAiMediaService', () => {
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

        const service = new ImajinAiMediaService(mockSessionService as any, mockLogger as any);
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

    it('maps media.upload to POST /api/assets payload', async () => {
        const { service, sessionService, postMock } = createService();
        postMock.mockResolvedValue({
            data: { asset_id: 'ast_1', status: 'uploaded' }
        });

        const result = await service.uploadAsset({
            fileName: 'photo.jpg',
            contentBase64: 'ZmFrZQ==',
            folderId: 'folder_1',
            access: 'public',
            fair: 'FAIR-CONTENT'
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/assets', {
            file_name: 'photo.jpg',
            content_base64: 'ZmFrZQ==',
            folder_id: 'folder_1',
            access: 'public',
            fair: 'FAIR-CONTENT'
        });
        expect(result).toMatchObject({
            asset_id: 'ast_1',
            status: 'uploaded'
        });
    });

    it('maps media.get to GET /api/assets/{id} with include query', async () => {
        const { service, sessionService, getMock } = createService();
        getMock.mockResolvedValue({
            data: { asset_id: 'ast_1', content_type: 'image/jpeg' }
        });

        const result = await service.getAsset({
            id: 'asset_1',
            include: ['fair', 'content']
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(getMock).toHaveBeenCalledWith('/api/assets/asset_1?include=fair%2Ccontent');
        expect(result).toMatchObject({
            asset_id: 'ast_1',
            content_type: 'image/jpeg'
        });
    });
});
