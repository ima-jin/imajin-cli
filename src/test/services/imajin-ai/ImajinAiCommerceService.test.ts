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

    it('maps commerce.charge.create to POST /api/charge payload', async () => {
        const { service, postMock } = createService();
        postMock.mockResolvedValue({
            data: { charge_id: 'chg_123', status: 'authorized' }
        });

        const result = await service.createCharge({
            paymentMethod: 'pm_123',
            amount: '15.25',
            currency: 'usd',
            customerDid: 'did:imajin:bob'
        });

        expect(postMock).toHaveBeenCalledWith('/api/charge', {
            payment_method: 'pm_123',
            amount: '15.25',
            currency: 'USD',
            customer_did: 'did:imajin:bob'
        });
        expect(result).toMatchObject({
            charge_id: 'chg_123',
            status: 'authorized'
        });
    });

    it('maps commerce.refund.create to POST /api/refund payload', async () => {
        const { service, postMock } = createService();
        postMock.mockResolvedValue({
            data: { refund_id: 'rfd_123', status: 'pending' }
        });

        const result = await service.createRefund({
            transactionId: 'txn_123',
            amount: '5.00',
            reason: 'customer_request'
        });

        expect(postMock).toHaveBeenCalledWith('/api/refund', {
            transaction_id: 'txn_123',
            amount: '5.00',
            reason: 'customer_request'
        });
        expect(result).toMatchObject({
            refund_id: 'rfd_123',
            status: 'pending'
        });
    });

    it('maps commerce.transfer.create to POST /api/balance/transfer payload', async () => {
        const { service, postMock } = createService();
        postMock.mockResolvedValue({
            data: { transfer_id: 'trf_123', status: 'completed' }
        });

        const result = await service.createTransfer({
            fromDid: 'did:imajin:alice',
            toDid: 'did:imajin:bob',
            amount: '9.99',
            currency: 'eur',
            memo: 'settlement'
        });

        expect(postMock).toHaveBeenCalledWith('/api/balance/transfer', {
            from_did: 'did:imajin:alice',
            to_did: 'did:imajin:bob',
            amount: '9.99',
            currency: 'EUR',
            memo: 'settlement'
        });
        expect(result).toMatchObject({
            transfer_id: 'trf_123',
            status: 'completed'
        });
    });

    it('maps commerce.transactions.list to GET /api/transactions/{did} with query params', async () => {
        const { service, getMock } = createService();
        getMock.mockResolvedValue({
            data: { items: [{ transaction_id: 'txn_1' }], next_cursor: 'next_123' }
        });

        const result = await service.listTransactions({
            did: 'did:imajin:alice',
            limit: 25,
            cursor: 'cur_123',
            from: '2025-01-01T00:00:00Z',
            to: '2025-01-31T23:59:59Z'
        });

        expect(getMock).toHaveBeenCalledWith('/api/transactions/did%3Aimajin%3Aalice?limit=25&cursor=cur_123&from=2025-01-01T00%3A00%3A00Z&to=2025-01-31T23%3A59%3A59Z');
        expect(result).toMatchObject({
            items: [{ transaction_id: 'txn_1' }],
            next_cursor: 'next_123'
        });
    });
});
