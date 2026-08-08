/**
 * Lazy keytar loader — defers the native module import so the CLI can
 * start (and fall back to EnvironmentProvider / EncryptedFileProvider)
 * on platforms where keytar's .node binary isn't available (CI, Warp
 * sandbox, standalone single-file builds, etc.).
 */

type KeytarModule = typeof import('keytar');

let _keytar: KeytarModule | null | undefined; // undefined = not yet loaded

export async function getKeytar(): Promise<KeytarModule | null> {
    if (_keytar !== undefined) return _keytar;
    try {
        // keytar is CommonJS: under ESM the real API lands on `.default`, and
        // only some names are re-exported on the namespace object. Without the
        // unwrap, `keytar.getPassword` resolves but `keytar.setPassword` is
        // undefined — reads appear to work while every write throws.
        const mod = await import('keytar') as KeytarModule & { default?: KeytarModule };
        _keytar = mod.default ?? mod;
        return _keytar;
    } catch {
        _keytar = null;
        return null;
    }
}

/** Synchronous check — reliable only after `getKeytar()` has been called once. */
export function isKeytarLoaded(): boolean {
    return _keytar != null;
}
