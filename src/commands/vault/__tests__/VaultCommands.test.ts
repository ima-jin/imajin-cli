jest.mock('../../../crypto/vault-crypto.js', () => ({
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    deserializeBlob: jest.fn(),
    serializeBlob: jest.fn(),
    computeCid: jest.fn(),
    deriveKeyId: jest.fn(),
    deriveDidKeyFromPublicKey: jest.fn(),
    verifyDidKeyBinding: jest.fn(),
    signVaultPayload: jest.fn(),
    hexToBytes: jest.fn(),
    bytesToHex: jest.fn()
}));

jest.mock('@noble/curves/ed25519.js', () => ({
    ed25519: {
        getPublicKey: jest.fn(() => new Uint8Array(32))
    }
}));
jest.mock('chalk', () => ({
    __esModule: true,
    default: {
        yellow: (text: string) => text,
        green: (text: string) => text,
        red: (text: string) => text,
        gray: (text: string) => text,
        blue: (text: string) => text,
        cyan: (text: string) => text,
    }
}));

import { VaultCommands } from '../VaultCommands.js';

describe('VaultCommands stdin handling', () => {
    const logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    };

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('fails fast for --stdin when running in TTY with no pipe', async () => {
        const commands = new VaultCommands(logger as any);
        const originalIsTTY = process.stdin.isTTY;
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

        await expect((commands as any).resolveSecretValue({ stdin: true })).rejects.toThrow(
            'No stdin input detected'
        );

        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    });

    it('times out when stdin does not end', async () => {
        const commands = new VaultCommands(logger as any);
        const originalIsTTY = process.stdin.isTTY;
        const originalTimeout = (VaultCommands as any).STDIN_TIMEOUT_MS;
        Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
        (VaultCommands as any).STDIN_TIMEOUT_MS = 10;
        jest.useFakeTimers();

        const promise = (commands as any).readValueFromStdin();
        jest.advanceTimersByTime(10);

        await expect(promise).rejects.toThrow('Timed out waiting for stdin input');

        (VaultCommands as any).STDIN_TIMEOUT_MS = originalTimeout;
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    });
});
