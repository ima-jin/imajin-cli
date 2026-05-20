module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    roots: ['<rootDir>/src/crypto/__tests__'],
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { useESM: true }],
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    transformIgnorePatterns: [
        '/node_modules/(?!(@noble|@ipld|multiformats)/)'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    extensionsToTreatAsEsm: ['.ts'],
    verbose: true,
    testTimeout: 10000
};
