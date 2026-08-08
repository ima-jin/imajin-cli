jest.mock('chalk', () => ({
    __esModule: true,
    default: {
        green: (text: string) => text,
        red: (text: string) => text,
        gray: (text: string) => text,
        blue: (text: string) => text,
        yellow: (text: string) => text,
        cyan: (text: string) => text,
        white: (text: string) => text,
    },
}));

jest.mock('inquirer', () => ({
    __esModule: true,
    default: { prompt: jest.fn() },
}));

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AuthCommands } from '../AuthCommands.js';
import { generateKeypair, signMessage } from '../../../crypto/vault-crypto.js';

const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

function makeCommands(sessionOverrides: Record<string, jest.Mock> = {}) {
    const sessionService = {
        getStoredSession: jest.fn(),
        clearStoredSession: jest.fn(),
        getBaseUrl: jest.fn(),
        getAuthHeadersForRequest: jest.fn(),
        fetchSession: jest.fn(),
        createLoginChallenge: jest.fn(),
        finalizeLogin: jest.fn().mockResolvedValue({ identity: { did: 'did:imajin:alice' }, stored: true, authMode: 'cookie-session' }),
        getSessionStatusSummary: jest.fn(),
        ...sessionOverrides,
    };
    const commands = new AuthCommands({} as any, logger as any, sessionService as any);
    return { commands, sessionService };
}

function writeIdentityFile(contents: Record<string, unknown>): string {
    const filePath = path.join(os.tmpdir(), `imajin-identity-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    fs.writeFileSync(filePath, JSON.stringify(contents), 'utf8');
    return filePath;
}

describe('AuthCommands imajin-ai login --key-file', () => {
    let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
    let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
    let exitSpy: jest.SpiedFunction<typeof process.exit>;
    const tempFiles: string[] = [];

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
            throw new Error(`process.exit(${code})`);
        }) as never);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        for (const file of tempFiles.splice(0)) {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        }
    });

    it('requests a challenge via --handle, signs it in-process with --key-file, and finalizes login', async () => {
        const identity = generateKeypair();
        const keyFile = writeIdentityFile({ privateKey: identity.privateKey, did: 'did:imajin:alice' });
        tempFiles.push(keyFile);

        const { commands, sessionService } = makeCommands({
            createLoginChallenge: jest.fn().mockResolvedValue({ challengeId: 'chal_123', challenge: 'sign-me-please' }),
        });

        await (commands as any).handleImajinAiLogin({ handle: 'alice', keyFile, json: true, prompt: false });

        expect(sessionService.createLoginChallenge).toHaveBeenCalledWith('alice');
        expect(sessionService.finalizeLogin).toHaveBeenCalledTimes(1);

        const finalizeArgs = sessionService.finalizeLogin.mock.calls[0][0];
        expect(finalizeArgs.challengeId).toBe('chal_123');

        const expectedSignature = signMessage('sign-me-please', identity.privateKey);
        expect(finalizeArgs.signature).toBe(expectedSignature);

        expect(exitSpy).not.toHaveBeenCalled();
    });

    it('supports the "seed" field name as an alternative to "privateKey"', async () => {
        const identity = generateKeypair();
        const keyFile = writeIdentityFile({ seed: identity.privateKey });
        tempFiles.push(keyFile);

        const { commands, sessionService } = makeCommands({
            createLoginChallenge: jest.fn().mockResolvedValue({ challengeId: 'chal_456', challenge: 'another-challenge' }),
        });

        await (commands as any).handleImajinAiLogin({ handle: 'alice', keyFile, json: true, prompt: false });

        const finalizeArgs = sessionService.finalizeLogin.mock.calls[0][0];
        expect(finalizeArgs.signature).toBe(signMessage('another-challenge', identity.privateKey));
    });

    it('never prints or logs the private key material', async () => {
        const identity = generateKeypair();
        const keyFile = writeIdentityFile({ privateKey: identity.privateKey });
        tempFiles.push(keyFile);

        const { commands } = makeCommands({
            createLoginChallenge: jest.fn().mockResolvedValue({ challengeId: 'chal_789', challenge: 'yet-another-challenge' }),
        });

        await (commands as any).handleImajinAiLogin({ handle: 'alice', keyFile, json: true, prompt: false });

        const allLoggedOutput = [
            ...consoleLogSpy.mock.calls.flat(),
            ...consoleErrorSpy.mock.calls.flat(),
            ...logger.error.mock.calls.flat(),
            ...logger.info.mock.calls.flat(),
            ...logger.debug.mock.calls.flat(),
        ].map((value) => JSON.stringify(value));

        for (const entry of allLoggedOutput) {
            expect(entry).not.toContain(identity.privateKey);
        }
    });

    it('still supports manual --signature without --key-file', async () => {
        const { commands, sessionService } = makeCommands();

        await (commands as any).handleImajinAiLogin({
            challengeId: 'chal_manual',
            signature: 'deadbeef',
            json: true,
            prompt: false,
        });

        expect(sessionService.createLoginChallenge).not.toHaveBeenCalled();
        expect(sessionService.finalizeLogin).toHaveBeenCalledWith(
            expect.objectContaining({ challengeId: 'chal_manual', signature: 'deadbeef' })
        );
    });

    it('errors when --key-file is combined with --challenge-id (no fresh challenge text available)', async () => {
        const identity = generateKeypair();
        const keyFile = writeIdentityFile({ privateKey: identity.privateKey });
        tempFiles.push(keyFile);

        const { commands, sessionService } = makeCommands();

        await expect(
            (commands as any).handleImajinAiLogin({ challengeId: 'chal_existing', keyFile, prompt: false })
        ).rejects.toThrow('process.exit(1)');

        expect(sessionService.finalizeLogin).not.toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('errors when --key-file JSON is missing both privateKey and seed', async () => {
        const keyFile = writeIdentityFile({ did: 'did:imajin:alice' });
        tempFiles.push(keyFile);

        const { commands } = makeCommands({
            createLoginChallenge: jest.fn().mockResolvedValue({ challengeId: 'chal_x', challenge: 'challenge-text' }),
        });

        await expect(
            (commands as any).handleImajinAiLogin({ handle: 'alice', keyFile, prompt: false })
        ).rejects.toThrow('process.exit(1)');
    });

    it('errors when --key-file points at a non-existent path', async () => {
        const { commands } = makeCommands({
            createLoginChallenge: jest.fn().mockResolvedValue({ challengeId: 'chal_y', challenge: 'challenge-text' }),
        });

        await expect(
            (commands as any).handleImajinAiLogin({ handle: 'alice', keyFile: '/nonexistent/identity.json', prompt: false })
        ).rejects.toThrow('process.exit(1)');
    });
});
