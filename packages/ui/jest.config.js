module.exports = {
  ...require('jest-expo/jest-preset'),
  testEnvironment: 'node',
  testMatch: ['**/*.(test|spec).(ts|tsx)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native|@testing-library|expo[^/]*|@expo/[^/]*)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
