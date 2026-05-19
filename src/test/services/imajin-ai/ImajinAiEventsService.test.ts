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
        const postMock = jest.fn();
        (service as any).createClient = jest.fn().mockReturnValue({ post: postMock });

        return { service, sessionService: mockSessionService, postMock };
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
});
