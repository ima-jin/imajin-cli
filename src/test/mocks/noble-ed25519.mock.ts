import { createHash, randomBytes } from 'node:crypto';
import nacl from 'tweetnacl';

function toBytes(input: Uint8Array): Uint8Array {
    return new Uint8Array(input);
}

function digestSignature(publicKey: Uint8Array, message: Uint8Array): Uint8Array {
    const hash = createHash('sha512');
    hash.update(Buffer.from(publicKey));
    hash.update(Buffer.from(message));
    return new Uint8Array(hash.digest());
}

export const ed25519 = {
    utils: {
        randomSecretKey(): Uint8Array {
            return new Uint8Array(randomBytes(32));
        },
        toMontgomerySecret(secret: Uint8Array): Uint8Array {
            return toBytes(secret);
        },
        toMontgomery(publicKey: Uint8Array): Uint8Array {
            return toBytes(publicKey);
        },
    },
    getPublicKey(secretKey: Uint8Array): Uint8Array {
        return nacl.box.keyPair.fromSecretKey(toBytes(secretKey)).publicKey;
    },
    sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
        const publicKey = ed25519.getPublicKey(secretKey);
        return digestSignature(publicKey, message);
    },
    verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
        const expected = digestSignature(publicKey, message);
        if (signature.length !== expected.length) {
            return false;
        }
        for (let i = 0; i < signature.length; i += 1) {
            if (signature[i] !== expected[i]) {
                return false;
            }
        }
        return true;
    }
};
