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

    it('maps workspace.list entries and cursor metadata', async () => {
        const service = createService();
        const invokeMock = jest.fn().mockResolvedValue({
            result: {
                entries: [
                    { filename: 'a.txt', type: 'file', size: '12', etag: 'etag-a', version: '4' },
                    { path: '/docs/folder-b', type: 'folder' }
                ],
                cursor: 'next-page-token'
            }
        });
        (service as any).invokeWorkspaceTool = invokeMock;

        const result = await service.list({
            path: '/docs',
            recursive: true,
            limit: 10,
            cursor: 'start-cursor'
        });

        expect(invokeMock).toHaveBeenCalledWith('workspace.list', {
            path: '/docs',
            recursive: true,
            limit: 10,
            cursor: 'start-cursor'
        });
        expect(result.cursor).toBe('next-page-token');
        expect(result.entries).toHaveLength(2);
        expect(result.entries[0]).toMatchObject({
            path: '/docs/a.txt',
            type: 'file',
            size: 12,
            etag: 'etag-a',
            version: 4
        });
        expect(result.entries[1]).toMatchObject({
            path: '/docs/folder-b',
            type: 'folder'
        });
    });

    it('maps workspace.delete tool invocation and response payloads', async () => {
        const service = createService();
        const invokeMock = jest.fn().mockResolvedValue({
            result: {
                path: '/docs/a.txt',
                deleted: true,
                etag: 'etag-3',
                version: 5
            }
        });
        (service as any).invokeWorkspaceTool = invokeMock;

        const result = await service.delete({
            path: '/docs/a.txt',
            recursive: true,
            ifMatch: 'etag-2'
        });

        expect(invokeMock).toHaveBeenCalledWith('workspace.rm', {
            path: '/docs/a.txt',
            recursive: true,
            ifMatch: 'etag-2'
        });
        expect(result).toMatchObject({
            path: '/docs/a.txt',
            deleted: true,
            etag: 'etag-3',
            version: 5
        });
    });

    it('applies workspace.patch via read + write adapter flow', async () => {
        const service = createService();
        const invokeMock = jest.fn(async (tool: string, _input: Record<string, unknown>) => {
            if (tool === 'workspace.read') {
                return {
                    result: {
                        path: '/docs/a.json',
                        content: JSON.stringify({ title: 'old', count: 1 })
                    }
                };
            }
            if (tool === 'workspace.write') {
                return {
                    result: {
                        path: '/docs/a.json',
                        etag: 'etag-patch',
                        version: 6
                    }
                };
            }
            throw new Error(`Unexpected call: ${tool}`);
        });
        (service as any).invokeWorkspaceTool = invokeMock;

        const result = await service.patch({
            path: '/docs/a.json',
            operations: [{ op: 'replace', path: '/title', value: 'new' }]
        });

        const writeCall = invokeMock.mock.calls.find(([tool]) => tool === 'workspace.write');
        expect(writeCall).toBeDefined();
        const writeInput = writeCall?.[1] as Record<string, unknown>;
        expect(writeInput).toMatchObject({
            path: '/docs/a.json',
            contentType: 'application/json'
        });
        expect(JSON.parse(String(writeInput.content))).toEqual({
            title: 'new',
            count: 1
        });
        expect(result).toMatchObject({
            path: '/docs/a.json',
            operationCount: 1,
            etag: 'etag-patch',
            version: 6
        });
    });

    it('applies workspace.move via read + write + rm adapter flow', async () => {
        const service = createService();
        const invokeMock = jest.fn(async (tool: string, input: Record<string, unknown>) => {
            if (tool === 'workspace.read') {
                return {
                    result: {
                        path: '/docs/from.txt',
                        content: 'hello',
                        contentType: 'text/plain'
                    }
                };
            }
            if (tool === 'workspace.write') {
                return {
                    result: {
                        path: '/docs/to.txt',
                        etag: 'etag-move',
                        version: 9
                    }
                };
            }
            if (tool === 'workspace.rm') {
                return {
                    result: {
                        path: '/docs/from.txt',
                        deleted: true
                    }
                };
            }
            throw new Error(`Unexpected call: ${tool}:${JSON.stringify(input)}`);
        });
        (service as any).invokeWorkspaceTool = invokeMock;

        const result = await service.move({
            from: '/docs/from.txt',
            to: '/docs/to.txt'
        });

        expect(invokeMock).toHaveBeenNthCalledWith(1, 'workspace.read', { path: '/docs/from.txt' });
        expect(invokeMock).toHaveBeenNthCalledWith(2, 'workspace.write', {
            path: '/docs/to.txt',
            content: 'hello',
            contentType: 'text/plain'
        });
        expect(invokeMock).toHaveBeenNthCalledWith(3, 'workspace.rm', { path: '/docs/from.txt' });
        expect(result).toMatchObject({
            from: '/docs/from.txt',
            to: '/docs/to.txt',
            deletedSource: true,
            etag: 'etag-move',
            version: 9
        });
    });

    it('computes workspace.diff between revisions via adapter reads', async () => {
        const service = createService();
        const invokeMock = jest.fn(async (tool: string, input: Record<string, unknown>) => {
            if (tool !== 'workspace.read') {
                throw new Error(`Unexpected call: ${tool}`);
            }

            if (input.version === 1) {
                return {
                    result: {
                        path: '/docs/a.txt',
                        content: 'old line',
                        version: 1,
                        etag: 'etag-old'
                    }
                };
            }

            return {
                result: {
                    path: '/docs/a.txt',
                    content: 'new line',
                    version: 2,
                    etag: 'etag-new'
                }
            };
        });
        (service as any).invokeWorkspaceTool = invokeMock;

        const result = await service.diff({
            path: '/docs/a.txt',
            from: '1'
        });

        expect(invokeMock).toHaveBeenNthCalledWith(1, 'workspace.read', { path: '/docs/a.txt', version: 1 });
        expect(invokeMock).toHaveBeenNthCalledWith(2, 'workspace.read', { path: '/docs/a.txt' });
        expect(result.changed).toBe(true);
        expect(result.diff).toContain('--- /docs/a.txt@1');
        expect(result.diff).toContain('+++ /docs/a.txt@latest');
        expect(result.diff).toContain('-old line');
        expect(result.diff).toContain('+new line');
        expect(result.fromVersion).toBe(1);
        expect(result.toVersion).toBe(2);
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
