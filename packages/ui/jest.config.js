const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  testEnvironment: 'node',
  // Resolve Tamagui's native build (react-native condition), as Metro does on device.
  testEnvironmentOptions: {
    customExportConditions: ['react-native', 'require', 'default'],
  },
  // Keep the preset's setup files (they define __DEV__ and the native mocks) and add ours.
  setupFiles: [...(expoPreset.setupFiles ?? []), '<rootDir>/jest.setup.ts'],
  testMatch: ['**/*.(test|spec).(ts|tsx)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native|@testing-library|expo[^/]*|@expo/[^/]*)/)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
