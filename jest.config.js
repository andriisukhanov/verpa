module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/backend'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'backend/**/*.ts',
    '!backend/**/*.d.ts',
    '!backend/**/index.ts',
    '!backend/**/*.interface.ts',
    '!backend/**/*.module.ts',
    '!backend/**/main.ts',
    '!backend/**/__tests__/**',
    '!backend/**/*.spec.ts',
    '!backend/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: '<rootDir>/coverage',
  moduleNameMapper: {
    '^@verpa/common$': '<rootDir>/backend/packages/common/src',
    '^@verpa/common/(.*)$': '<rootDir>/backend/packages/common/src/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        strictNullChecks: true,
        strictPropertyInitialization: false,
      },
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
  verbose: true,
};