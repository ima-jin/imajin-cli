/**
 * Jest Configuration for Service Testing
 * 
 * Enhanced configuration specifically for service testing,
 * integration tests, and API mocking scenarios.
 */

const baseConfig = require('./jest.config.cjs');

module.exports = {
    ...baseConfig,
    
    // Service-specific test patterns
    testMatch: [
        '**/__tests__/**/*.service.test.ts',
        '**/__tests__/**/*.service.test.js',
        '**/__tests__/**/*.integration.test.ts',
        '**/__tests__/**/*.integration.test.js',
        '**/test/**/*.service.test.ts',
        '**/test/**/*.service.test.js',
        '**/test/**/*.integration.test.ts',
        '**/test/**/*.integration.test.js'
    ],
    
    // Setup files for service testing
    setupFilesAfterEnv: [
        '<rootDir>/src/test/setup/serviceTestSetup.ts'
    ],
    
    // Longer timeout for service tests (API calls, network operations)
    testTimeout: 30000,
    
    // Enhanced coverage requirements for services
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        },
        // Specific requirements for service files
        './src/services/**/*.ts': {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85
        }
    },
    
    // Coverage collection patterns
    collectCoverageFrom: [
        ...baseConfig.collectCoverageFrom,
        'src/services/**/*.ts',
        'src/test/framework/**/*.ts',
        '!src/test/factories/**/*.ts', // Exclude test data factories from coverage
        '!src/test/setup/**/*.ts'       // Exclude test setup files from coverage
    ],
    
    // Mock patterns for external dependencies
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        // Mock external service libraries
        '^stripe$': '<rootDir>/src/test/__mocks__/stripe.js',
        '^contentful$': '<rootDir>/src/test/__mocks__/contentful.js',
        '^cloudinary$': '<rootDir>/src/test/__mocks__/cloudinary.js',
        '^axios$': '<rootDir>/src/test/__mocks__/axios.js'
    },
    
    // Global variables for service testing
    globals: {
        'ts-jest': {
            tsconfig: {
                // Relax some type checking for test files
                compilerOptions: {
                    strictNullChecks: false,
                    strictPropertyInitialization: false
                }
            }
        }
    },
    
    // Test environment setup
    testEnvironment: 'node',
    
    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,
    
    // Verbose output for debugging service tests
    verbose: true,
    
    // Maximum number of concurrent workers for service tests
    maxWorkers: '50%',
    
    // Bail on first test failure in CI environments
    bail: process.env.CI ? 1 : 0,
    
    // Force exit after tests complete
    forceExit: true,
    
    // Detect open handles (useful for service tests with connections)
    detectOpenHandles: true,
    
    // Custom test result processors
    testResultsProcessor: process.env.CI ? 'jest-junit' : undefined,
    
    // Watch plugins for development
    watchPlugins: [
        'jest-watch-typeahead/filename',
        'jest-watch-typeahead/testname'
    ]
}; 