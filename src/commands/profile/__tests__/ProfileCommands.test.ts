jest.mock('chalk', () => ({
    __esModule: true,
    default: {
        green: (text: string) => text,
        red: (text: string) => text
    }
}));

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ProfileCommands } from '../ProfileCommands.js';

describe('ProfileCommands', () => {
    const createCommands = () => {
        const profileService = {
            getProfile: jest.fn().mockResolvedValue({ did: 'did:imajin:alice' }),
            createProfile: jest.fn().mockResolvedValue({ handle: 'alice' }),
            updateProfile: jest.fn().mockResolvedValue({ handle: 'alice' }),
            deleteProfile: jest.fn().mockResolvedValue({ success: true }),
            searchProfiles: jest.fn().mockResolvedValue({ profiles: [] }),
            getProfileCounts: jest.fn().mockResolvedValue({ followers: 1 }),
            claimHandle: jest.fn().mockResolvedValue({ success: true }),
            checkHandleAvailability: jest.fn().mockResolvedValue({ available: true }),
            toggleInference: jest.fn().mockResolvedValue({ inferenceEnabled: true }),
            queryProfile: jest.fn().mockResolvedValue({ response: 'ok' }),
            streamProfile: jest.fn().mockResolvedValue('stream')
        };
        const logger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn()
        };
        const commands = new ProfileCommands(profileService as any, logger as any);

        return { commands, profileService, logger };
    };

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('calls profile.get with id in JSON mode', async () => {
        const { commands, profileService } = createCommands();

        await (commands as any).handleGet({ id: 'did:imajin:alice', json: true });

        expect(profileService.getProfile).toHaveBeenCalledWith({ id: 'did:imajin:alice' });
    });

    it('uses create defaults for displayName/displayType', async () => {
        const { commands, profileService } = createCommands();

        await (commands as any).handleCreate({ handle: 'alice', json: true });

        expect(profileService.createProfile).toHaveBeenCalledWith({
            handle: 'alice',
            displayName: 'alice',
            displayType: 'human'
        });
    });

    it('loads metadata from file for profile.create', async () => {
        const { commands, profileService } = createCommands();
        const tmpFile = path.join(os.tmpdir(), `profile-metadata-${Date.now()}.json`);
        fs.writeFileSync(tmpFile, JSON.stringify({ locale: 'en', timezone: 'UTC' }), 'utf8');

        try {
            await (commands as any).handleCreate({
                handle: 'alice',
                metadataFile: tmpFile,
                json: true
            });

            expect(profileService.createProfile).toHaveBeenCalledWith({
                handle: 'alice',
                displayName: 'alice',
                displayType: 'human',
                metadata: { locale: 'en', timezone: 'UTC' }
            });
        } finally {
            if (fs.existsSync(tmpFile)) {
                fs.unlinkSync(tmpFile);
            }
        }
    });

    it('passes parsed context object to profile.query', async () => {
        const { commands, profileService } = createCommands();

        await (commands as any).handleQuery({
            id: 'did:imajin:alice',
            query: 'hello',
            contextJson: JSON.stringify({ conversationId: 'c1' }),
            json: true
        });

        expect(profileService.queryProfile).toHaveBeenCalledWith({
            id: 'did:imajin:alice',
            query: 'hello',
            context: { conversationId: 'c1' }
        });
    });

    it('exits with code 1 when both metadata-json and metadata-file are provided', async () => {
        const { commands } = createCommands();
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit:1');
        }) as never);

        await expect((commands as any).handleCreate({
            handle: 'alice',
            metadataJson: '{"a":1}',
            metadataFile: '/tmp/metadata.json',
            json: true
        })).rejects.toThrow('process.exit:1');

        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});
