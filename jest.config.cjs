module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.test.js',
        '**/test/**/*.test.ts',
        '**/test/**/*.test.js'
    ],
    transform: {
        '^.+\\.ts$': 'ts-jest',
        '^.+\\.js$': 'babel-jest'
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
        '!src/**/index.ts'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: [],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/'
    ],
    transformIgnorePatterns: [
        '/node_modules/(?!(@noble|@ipld|multiformats|chalk|@imajin/vault-core)/)'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@imajin/vault-core$': '<rootDir>/../imajin-ai/packages/vault-core/src/index.ts',
        '^@noble/curves/ed25519\\.js$': '<rootDir>/src/test/mocks/noble-ed25519.mock.ts',
        '^@ipld/dag-cbor$': '<rootDir>/node_modules/@ipld/dag-cbor/src/index.js',
        '^multiformats/cid$': '<rootDir>/node_modules/multiformats/src/cid.js',
        '^multiformats/hashes/sha2$': '<rootDir>/node_modules/multiformats/src/hashes/sha2.js',
        '^multiformats/bases/base58$': '<rootDir>/node_modules/multiformats/src/bases/base58.js',
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    verbose: true,
    testTimeout: 10000
}; 