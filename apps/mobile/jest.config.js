module.exports = {
  ...require('jest-expo/jest-preset'),
  testEnvironment: 'node',
  // Resolve Tamagui's native build (react-native condition), as Metro does on device.
  testEnvironmentOptions: {
    customExportConditions: ['react-native', 'require', 'default'],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/*.(test|spec).(ts|tsx)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native|@testing-library|expo[^/]*|@expo/[^/]*|@sisig/[^/]*)/)',
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
