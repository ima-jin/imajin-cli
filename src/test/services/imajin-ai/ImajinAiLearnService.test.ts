import { ImajinAiLearnService } from '../../../services/imajin-ai/ImajinAiLearnService.js';

describe('ImajinAiLearnService', () => {
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

        const service = new ImajinAiLearnService(mockSessionService as any, mockLogger as any);
        const getMock = jest.fn();
        (service as any).createClient = jest.fn().mockReturnValue({ get: getMock });

        return { service, sessionService: mockSessionService, getMock };
    };

    it('maps learn.courses.list to GET /api/courses with query params', async () => {
        const { service, sessionService, getMock } = createService();
        getMock.mockResolvedValue({
            data: { items: [{ course_id: 'crs_1' }], next_cursor: 'cur_2' }
        });

        const result = await service.listCourses({
            mine: true,
            teaching: true,
            limit: 10,
            cursor: 'cur_1'
        });

        expect(sessionService.getAuthHeadersForRequest).toHaveBeenCalled();
        expect(getMock).toHaveBeenCalledWith('/api/courses?mine=true&teaching=true&limit=10&cursor=cur_1');
        expect(result).toMatchObject({
            items: [{ course_id: 'crs_1' }],
            next_cursor: 'cur_2'
        });
    });
});
