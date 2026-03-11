module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.m?js$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(marked|turndown)/)',
  ],
  moduleNameMapper: {
    '^file-type$': '<rootDir>/test/mocks/file-type-mock.js',
    '^p-queue$': '<rootDir>/test/mocks/p-queue-mock.js',
    '^eventemitter3$': '<rootDir>/test/mocks/eventemitter3-mock.js',
    '^chalk$': '<rootDir>/test/mocks/chalk-mock.js',
    '^cli-progress$': '<rootDir>/test/mocks/cli-progress-mock.js'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 30000,
};
