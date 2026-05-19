import { ImajinAiMarketService } from '../../../services/imajin-ai/ImajinAiMarketService.js';

describe('ImajinAiMarketService', () => {
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

        const service = new ImajinAiMarketService(mockSessionService as any, mockLogger as any);
        const getMock = jest.fn();
        (service as any).createClient = jest.fn().mockReturnValue({ get: getMock });

        return { service, sessionService: mockSessionService, getMock };
    };

    it('maps market.listings.list to GET /api/listings with query params', async () => {
        const { service, sessionService, getMock } = createService();
        getMock.mockResolvedValue({
            data: { items: [{ listing_id: 'lst_1' }], next_cursor: 'cur_2' }
        });

        const result = await service.listListings({
            sellerDid: 'did:imajin:alice',
            status: 'active',
            limit: 25,
            cursor: 'cur_1'
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(getMock).toHaveBeenCalledWith('/api/listings?seller_did=did%3Aimajin%3Aalice&status=active&limit=25&cursor=cur_1');
        expect(result).toMatchObject({
            items: [{ listing_id: 'lst_1' }],
            next_cursor: 'cur_2'
        });
    });
});
