const jestPreset = require('jest-expo/jest-preset');

module.exports = {
  ...jestPreset,
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
};
