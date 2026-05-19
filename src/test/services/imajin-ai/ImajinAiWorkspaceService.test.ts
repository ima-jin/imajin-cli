import { ImajinAiWorkspaceService } from '../../../services/imajin-ai/ImajinAiWorkspaceService.js';

describe('ImajinAiWorkspaceService', () => {
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

        return new ImajinAiWorkspaceService(mockSessionService as any, mockLogger as any);
    };

    it('maps workspace.get response payloads', async () => {
        const service = createService();
        const invokeMock = jest.fn().mockResolvedValue({
            result: {
                path: '/docs/a.txt',
                content: 'hello world',
                etag: 'etag-1',
                version: 2
            }
        });
        (service as any).invokeWorkspaceTool = invokeMock;

        const result = await service.get({ path: '/docs/a.txt', version: 2 });

        expect(invokeMock).toHaveBeenCalledWith('workspace.read', { path: '/docs/a.txt', version: 2 });
        expect(result.path).toBe('/docs/a.txt');
        expect(result.content).toBe('hello world');
        expect(result.etag).toBe('etag-1');
        expect(result.version).toBe(2);
    });

    it('maps workspace.put response payloads', async () => {
        const service = createService();
        const invokeMock = jest.fn().mockResolvedValue({
            data: {
                path: '/docs/a.txt',
                etag: 'etag-2',
                version: 3
            }
        });
        (service as any).invokeWorkspaceTool = invokeMock;

        const result = await service.put({
            path: '/docs/a.txt',
            content: 'updated content',
            contentType: 'text/plain'
        });

        expect(invokeMock).toHaveBeenCalledWith('workspace.write', {
            path: '/docs/a.txt',
            content: 'updated content',
            contentType: 'text/plain'
        });
        expect(result.path).toBe('/docs/a.txt');
        expect(result.etag).toBe('etag-2');
        expect(result.version).toBe(3);
    });

    it('executes adapter search using list + read tool calls', async () => {
        const service = createService();
        const invokeMock = jest.fn(async (tool: string, input: Record<string, unknown>) => {
            if (tool === 'workspace.list') {
                return {
                    result: {
                        entries: [
                            { path: '/docs/a.txt', type: 'file' },
                            { path: '/docs/b.txt', type: 'file' }
                        ]
                    }
                };
            }

            if (tool === 'workspace.read' && input.path === '/docs/a.txt') {
                return { result: { path: '/docs/a.txt', content: 'hello from alpha document' } };
            }

            if (tool === 'workspace.read' && input.path === '/docs/b.txt') {
                return { result: { path: '/docs/b.txt', content: 'this file has nothing useful' } };
            }

            throw new Error(`Unexpected call: ${tool}`);
        });
        (service as any).invokeWorkspaceTool = invokeMock;

        const result = await service.search({
            query: 'alpha',
            path: '/docs',
            limit: 5
        });

        expect(invokeMock).toHaveBeenCalledWith('workspace.list', expect.objectContaining({
            path: '/docs',
            recursive: true
        }));
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0]?.path).toBe('/docs/a.txt');
        expect(result.matches[0]?.snippet).toContain('alpha');
    });
});
