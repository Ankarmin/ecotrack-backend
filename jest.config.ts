import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        diagnostics: { ignoreCodes: ['TS151001'] },
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.module.ts',
    '!src/**/*.guard.ts',
    '!src/**/*.types.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.controller.ts',
    '!src/**/*.decorator.ts',
    '!src/main.ts',
    '!src/config/**',
    '!src/admin/**',
    '!src/recycling-centers/**',
    '!src/database/typeorm.config.ts',
  ],
  coveragePathIgnorePatterns: [
    'node_modules',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
