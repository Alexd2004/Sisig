// Screen uses react-native-safe-area-context, whose native module does not exist under Jest.
// SafeAreaView becomes a plain View that keeps its props (edges, style) for assertions.
// The package's own jest/mock is TypeScript outside this package's Babel root, so it is not used.
jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    SafeAreaView: function SafeAreaView(props: Record<string, unknown>) {
      return React.createElement(View, props);
    },
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});
