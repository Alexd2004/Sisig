# Sisig Mobile App

React Native Expo app with TypeScript strict mode, Expo Router, development client, and Claude AI integration.

## Quick Start

From the root directory:

```bash
pnpm install
pnpm dev
```

This starts the Expo dev server. Open the development client on a simulator or device and connect it to the server (see Development Client below). Expo Go cannot run this app.

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router pages (file-based routing)
│   ├── _layout.tsx        # Root navigation layout
│   ├── index.tsx          # Home screen
│   ├── ai-chat.tsx        # AI chat feature
│   ├── ai-summarizer.tsx  # Text summarization feature
│   └── index.test.tsx     # Home screen tests
├── src/
│   └── hooks/             # Custom React hooks
│       ├── useAI.ts       # Claude AI integration hook
│       └── useImageAnalysis.ts # Image analysis hook (vision model)
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript strict mode config
└── jest.config.js         # Jest test configuration
```

## Development Client

This app requires a **development client** because it uses native modules:

- Camera
- Secure Storage (`expo-secure-store`)
- Sentry error tracking
- Lottie animations
- Future POS/payment SDK

Expo Go cannot run custom native code, so we build and run a custom dev client.

### Building the Development Client

Install the development client with the local Expo CLI. This needs Xcode for iOS or Android Studio for Android.

**iOS Simulator:**

```bash
pnpm -F @sisig/mobile exec expo run:ios
```

**Android Device or Emulator:**

```bash
pnpm -F @sisig/mobile exec expo run:android
```

**Local Development (Easiest):**

```bash
pnpm dev
# Then open the installed development client and connect it to the server
```

**Release builds** are not configured. The local Expo CLI rejects `expo build`, and there is no `eas.json`. Release builds need EAS (`eas build`); that setup is deferred to DEVOPS-04.

## Routing (Expo Router)

Files in `app/` automatically become routes:

- `app/index.tsx` → `/` (home)
- `app/ai-chat.tsx` → `/ai-chat`
- `app/ai-summarizer.tsx` → `/ai-summarizer`

Add new screens as `.tsx` files in the `app/` directory.

## Claude AI Features

The app includes several AI-powered features using the `@sisig/claude` package.

### 1. AI Chat (`app/ai-chat.tsx`)

Multi-turn conversation with Claude.

```typescript
import AIChatScreen from './app/ai-chat';

// Features:
// - Chat history management
// - Streaming responses
// - Type-safe messages
```

### 2. Text Summarizer (`app/ai-summarizer.tsx`)

Summarize long text documents.

```typescript
import AISummarizerScreen from './app/ai-summarizer';

// Features:
// - Automatic text truncation
// - Summary statistics
// - Compression ratio display
```

### 3. useAI Hook (`src/hooks/useAI.ts`)

React hook for AI features in any component.

```typescript
import { useAI } from 'src/hooks/useAI';

function MyComponent(): JSX.Element {
  const { response, loading, error, generate } = useAI({
    systemPrompt: 'You are a helpful assistant.',
  });

  const handleAsk = async (): Promise<void> => {
    await generate('Your prompt here');
  };

  return (
    <View>
      <Button title="Ask Claude" onPress={handleAsk} />
      {loading && <ActivityIndicator />}
      {response && <Text>{response}</Text>}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

### 4. Image Analysis (`src/hooks/useImageAnalysis.ts`)

Analyze images using Claude vision model (requires vision model setup).

```typescript
import { useImageAnalysis } from 'src/hooks/useImageAnalysis';

function MyComponent(): JSX.Element {
  const { description, loading, analyzeImage } = useImageAnalysis();

  const handlePickImage = async (imageUri: string): Promise<void> => {
    await analyzeImage(imageUri);
  };

  return (
    <View>
      <Button title="Analyze Image" onPress={() => handlePickImage(uri)} />
      {loading && <ActivityIndicator />}
      {description && <Text>{description}</Text>}
    </View>
  );
}
```

## Setup Claude API

### 1. Get an API Key

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Create an account and navigate to API Keys
3. Create a new API key

### 2. Set Environment Variable

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or in `.env.local` (ignored by Git):

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Enable in Expo

Pass the API key to the Expo client:

```bash
ANTHROPIC_API_KEY=sk-ant-... pnpm dev
```

## Testing

### Run Tests

```bash
pnpm test
```

### Sample Tests Included

- `app/index.test.tsx` — Home screen component tests
- UI component tests (Button, etc.)

### Writing Tests

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from './index';

describe('HomeScreen', () => {
  it('renders welcome text', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Welcome to Sisig')).toBeTruthy();
  });

  it('increments count on button press', () => {
    const { getByText } = render(<HomeScreen />);
    const button = getByText('Increment');
    fireEvent.press(button);
    expect(getByText('Count: 1')).toBeTruthy();
  });
});
```

## Linting & Type Checking

```bash
pnpm lint        # ESLint
pnpm format      # Prettier auto-format
pnpm typecheck   # TypeScript (strict mode)
```

## Dependencies

### Core

- `expo` — Mobile app framework
- `expo-router` — File-based routing
- `react-native` — iOS/Android framework
- `typescript` — Type safety

### AI Integration

- `@sisig/claude` — Claude API client
- `@anthropic-ai/sdk` — Anthropic SDK
- `@sisig/ui` — Shared UI components
- `@sisig/api` — Shared API utilities

### Storage & Utilities

- `expo-secure-store` — Secure device storage
- `expo-constants` — App configuration
- `sentry-react-native` — Error tracking

### Development

- `jest-expo` — Test runner
- `@testing-library/react-native` — Component testing
- `expo-dev-client` — Custom development client

## Debugging

### Expo Logs

```bash
# View logs in terminal
pnpm dev

# Or use the local Expo CLI directly
pnpm -F @sisig/mobile exec expo start --dev-client
```

### TypeScript Errors

Clear cache and reinstall:

```bash
rm -rf node_modules .expo
pnpm install
pnpm typecheck
```

### Metro Issues

Restart the dev server:

```bash
# Stop (Ctrl+C) and restart
pnpm dev
```

## Best Practices

1. **Use TypeScript strict mode** — Type all props and return values
2. **Share logic via hooks** — Extract component logic into `src/hooks/`
3. **Leverage shared packages** — Use `@sisig/ui`, `@sisig/api`, `@sisig/claude`
4. **Test components** — At least test key user interactions
5. **Use Expo Router** — Don't use React Navigation directly; Router handles it
6. **Handle errors gracefully** — Show loading and error states in AI features

## Environment Variables

Create `.env.local` in this directory (ignored by Git):

```bash
ANTHROPIC_API_KEY=sk-ant-...
API_URL=http://localhost:3000
```

Access in code:

```typescript
const apiUrl = process.env.API_URL || 'http://localhost:3000';
const apiKey = process.env.ANTHROPIC_API_KEY;
```

## Troubleshooting

### `expo-doctor` reports errors

```bash
pnpm -F @sisig/mobile run doctor
```

Check [Expo docs](https://docs.expo.dev) or update Expo:

```bash
pnpm -F @sisig/mobile upgrade expo
```

### Claude API errors

- Verify `ANTHROPIC_API_KEY` is set
- Check API key is valid (not expired)
- Verify request format matches Anthropic SDK

### Tests failing

Clear Jest cache:

```bash
pnpm -F @sisig/mobile test -- --clearCache
```

### Native module errors

Rebuild the development client, then clear the Metro cache:

```bash
pnpm -F @sisig/mobile exec expo run:ios        # or: expo run:android
pnpm -F @sisig/mobile exec expo start --dev-client --clear
```

## Next Steps

1. **Add More AI Features** — Use `useAI` hook for custom AI features
2. **Implement Vision** — Set up Claude vision model for image analysis
3. **Add Authentication** — Use Supabase for user auth
4. **Error Tracking** — Configure Sentry for production
5. **Analytics** — Track AI feature usage

## Further Reading

- [Expo Documentation](https://docs.expo.dev)
- [Expo Router](https://expo.dev/routing)
- [React Native Docs](https://reactnative.dev)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Claude Models & Pricing](https://www.anthropic.com/pricing)

## Questions?

Check the root README, CONTRIBUTING.md, or the `@sisig/claude` package README for more details on Claude integration.
