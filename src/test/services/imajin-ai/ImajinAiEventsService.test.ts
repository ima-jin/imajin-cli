import { ImajinAiEventsService } from '../../../services/imajin-ai/ImajinAiEventsService.js';

describe('ImajinAiEventsService', () => {
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

        const service = new ImajinAiEventsService(mockSessionService as any, mockLogger as any);
        const getMock = jest.fn();
        const postMock = jest.fn();
        (service as any).createClient = jest.fn().mockReturnValue({
            get: getMock,
            post: postMock
        });

        return { service, sessionService: mockSessionService, getMock, postMock };
    };

    it('maps events.create to POST /api/events payload', async () => {
        const { service, sessionService, postMock } = createService();
        postMock.mockResolvedValue({
            data: { event_id: 'evt_1', status: 'created' }
        });

        const result = await service.createEvent({
            title: 'Community Meetup',
            start: '2026-01-01T18:00:00Z',
            end: '2026-01-01T20:00:00Z',
            venue: 'Town Hall',
            price: '10.00',
            currency: 'usd'
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/events', {
            title: 'Community Meetup',
            start: '2026-01-01T18:00:00Z',
            end: '2026-01-01T20:00:00Z',
            venue: 'Town Hall',
            price: '10.00',
            currency: 'USD'
        });
        expect(result).toMatchObject({
            event_id: 'evt_1',
            status: 'created'
        });
    });

    it('maps events.list to GET /api/events with query params', async () => {
        const { service, sessionService, getMock } = createService();
        getMock.mockResolvedValue({
            data: { events: [{ id: 'evt_1' }] }
        });

        const result = await service.listEvents({
            status: 'published',
            limit: 10,
            courseSlug: 'intro-to-ai',
            upcoming: true
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(getMock).toHaveBeenCalledWith('/api/events?status=published&limit=10&courseSlug=intro-to-ai&upcoming=true');
        expect(result).toMatchObject({
            events: [{ id: 'evt_1' }]
        });
    });

    it('maps events.ticket.buy to POST /api/checkout payload', async () => {
        const { service, sessionService, postMock } = createService();
        postMock.mockResolvedValue({
            data: { sessionId: 'sess_1', url: 'https://checkout.test' }
        });

        const result = await service.buyTicket({
            eventId: 'evt_1',
            ticketTypeId: 'tier_1',
            quantity: 2,
            email: 'buyer@example.com',
            invite: 'token_1'
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/checkout', {
            eventId: 'evt_1',
            ticketTypeId: 'tier_1',
            quantity: 2,
            email: 'buyer@example.com',
            invite: 'token_1'
        });
        expect(result).toMatchObject({
            sessionId: 'sess_1',
            url: 'https://checkout.test'
        });
    });

    it('maps events.rsvp to POST /api/checkout/free payload', async () => {
        const { service, sessionService, postMock } = createService();
        postMock.mockResolvedValue({
            data: { success: true, ticketId: 'tkt_1' }
        });

        const result = await service.rsvp({
            eventId: 'evt_2',
            ticketTypeId: 'free_1',
            email: 'guest@example.com',
            name: 'Guest User',
            invite: 'invite_1'
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith('/api/checkout/free', {
            eventId: 'evt_2',
            ticketTypeId: 'free_1',
            email: 'guest@example.com',
            name: 'Guest User',
            invite: 'invite_1'
        });
        expect(result).toMatchObject({
            success: true,
            ticketId: 'tkt_1'
        });
    });
});
