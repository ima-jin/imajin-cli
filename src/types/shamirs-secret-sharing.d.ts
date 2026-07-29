declare module 'shamirs-secret-sharing' {
    type BufferLike = Buffer | Uint8Array | string;

    interface SplitOptions {
        shares: number;
        threshold: number;
        random?: (n: number) => Buffer;
    }

    export function split(secret: BufferLike, options: SplitOptions): Buffer[];
    export function combine(shares: BufferLike[]): Buffer;
    const defaultExport: { split: typeof split; combine: typeof combine };
    export default defaultExport;
}
