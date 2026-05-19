import { ImajinAiCommerceService } from '../../../services/imajin-ai/ImajinAiCommerceService.js';

describe('ImajinAiCommerceService', () => {
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

        const service = new ImajinAiCommerceService(mockSessionService as any, mockLogger as any);
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

    it('maps commerce.balance.get to GET /api/balance/{did}', async () => {
        const { service, getMock, sessionService } = createService();
        getMock.mockResolvedValue({
            data: { did: 'did:imajin:alice', balance: '42.00' }
        });

        const result = await service.getBalance({ did: 'did:imajin:alice' });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(getMock).toHaveBeenCalledWith('/api/balance/did%3Aimajin%3Aalice');
        expect(result).toMatchObject({
            did: 'did:imajin:alice',
            balance: '42.00'
        });
    });

    it('maps commerce.checkout.create to POST /api/checkout payload', async () => {
        const { service, postMock } = createService();
        postMock.mockResolvedValue({
            data: { checkout_id: 'chk_123', status: 'created' }
        });

        const result = await service.createCheckout({
            amount: '12.50',
            currency: 'usd',
            recipientDid: 'did:imajin:bob',
            fair: 'FAIR-CONTENT',
            metadata: { source: 'cli' }
        });

        expect(postMock).toHaveBeenCalledWith('/api/checkout', {
            amount: '12.50',
            currency: 'USD',
            recipient_did: 'did:imajin:bob',
            fair: 'FAIR-CONTENT',
            metadata: { source: 'cli' }
        });
        expect(result).toMatchObject({
            checkout_id: 'chk_123',
            status: 'created'
        });
    });

    it('maps commerce.settle.create to POST /api/settle payload', async () => {
        const { service, postMock } = createService();
        postMock.mockResolvedValue({
            data: { settlement_id: 'set_123', status: 'submitted' }
        });

        const result = await service.createSettle({
            amount: '10.00',
            currency: 'eur',
            fromDid: 'did:imajin:alice',
            fair: 'FAIR-CONTENT',
            reference: 'invoice-123'
        });

        expect(postMock).toHaveBeenCalledWith('/api/settle', {
            amount: '10.00',
            currency: 'EUR',
            from_did: 'did:imajin:alice',
            fair: 'FAIR-CONTENT',
            reference: 'invoice-123'
        });
        expect(result).toMatchObject({
            settlement_id: 'set_123',
            status: 'submitted'
        });
    });
});
