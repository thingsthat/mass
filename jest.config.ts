import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/core'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          resolveJsonModule: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^core/(.*)$': '<rootDir>/core/$1',
    '^cli/(.*)$': '<rootDir>/cli/$1',
    '^backend/(.*)$': '<rootDir>/backend/$1',
    '^tests/(.*)$': '<rootDir>/tests/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },
  // Enable JSON module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 60000, // 60 seconds for LLM API calls
  collectCoverageFrom: [
    'core/src/**/*.ts',
    '!core/**/*.d.ts',
    '!core/types/**/*',
    '!core/**/*.config.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts'],
};

export default config;
