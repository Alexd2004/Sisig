module.exports = {
  ...require('jest-expo/jest-preset'),
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/*.(test|spec).(ts|tsx)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // The first React Native render in a file lazily loads and transforms RN internals,
  // which takes several seconds on a cold CI cache. The 5s default is too tight for that.
  testTimeout: 20000,
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native|@testing-library|expo[^/]*|@expo/[^/]*|@sisig/[^/]*)/)',
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
