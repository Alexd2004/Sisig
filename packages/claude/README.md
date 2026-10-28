# @sisig/claude

Shared Claude API integration package for Sisig platform.

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Environment Variable

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or set it in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

### Basic Chat

```typescript
import { ClaudeClient } from '@sisig/claude';

const client = new ClaudeClient();

const response = await client.chat([
  { role: 'user', content: 'Hello, Claude!' },
]);

console.log(response.content[0].text);
```

### Generate Text

```typescript
const text = await client.generateText(
  'Write a haiku about monorepos',
  {
    maxTokens: 500,
    temperature: 0.7,
  },
);

console.log(text);
```

### Streaming Chat

```typescript
await client.streamChat(
  [{ role: 'user', content: 'Tell me about AI' }],
  (chunk) => {
    process.stdout.write(chunk);
  },
);
```

### Conversation Manager

Maintain conversation history with automatic message limiting:

```typescript
import { ConversationManager } from '@sisig/claude';

const manager = new ConversationManager(20); // Keep 20 messages max

manager.addMessage('user', 'What is AI?');
manager.addMessage('assistant', 'AI is artificial intelligence...');

const messages = manager.getMessages(); // Ready for API call
const history = manager.getHistory(); // Full history with timestamps

manager.clear(); // Reset conversation
```

### React Native Hook

In mobile app (`apps/mobile`):

```typescript
import { useAI } from 'src/hooks/useAI';

export function AIFeature(): JSX.Element {
  const { response, loading, error, generate } = useAI({
    systemPrompt: 'You are a helpful assistant for a mobile app.',
  });

  const handleGenerate = async (): Promise<void> => {
    await generate('What is React Native?');
  };

  return (
    <View>
      <Button title="Ask AI" onPress={handleGenerate} />
      {loading && <ActivityIndicator />}
      {response && <Text>{response}</Text>}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

## API Reference

### ClaudeClient

#### Constructor

```typescript
constructor(apiKey?: string)
```

Uses `ANTHROPIC_API_KEY` environment variable if not provided.

#### Methods

**`chat(messages, options?)`**

Send messages and get a response.

```typescript
interface CreateMessageOptions {
  model?: string; // default: 'claude-3-5-sonnet-20241022'
  maxTokens?: number; // default: 1024
  temperature?: number; // default: 0.7
  system?: string; // system prompt
}

const response = await client.chat(
  [{ role: 'user', content: 'Hello' }],
  { temperature: 0.5 },
);
```

**`generateText(prompt, options?)`**

Shorthand for single-message text generation.

```typescript
const text = await client.generateText('Write a poem', {
  maxTokens: 500,
});
```

**`streamChat(messages, onChunk, options?)`**

Stream response tokens in real-time.

```typescript
await client.streamChat(
  [{ role: 'user', content: 'Hello' }],
  (chunk) => console.log(chunk),
);
```

### ConversationManager

Manage multi-turn conversations with message limiting.

```typescript
const manager = new ConversationManager(maxMessages);

manager.addMessage('user', 'Hello');
manager.addMessage('assistant', 'Hi!');

const messages = manager.getMessages(); // API format
const history = manager.getHistory(); // With timestamps
manager.clear();
```

### Utilities

**`parseJSON<T>(jsonString)`**

Type-safe JSON parsing.

```typescript
const result = await parseJSON<{ name: string }>(jsonString);
if (result.success) {
  console.log(result.data.name);
} else {
  console.error(result.error);
}
```

**`truncateText(text, maxLength)`**

Truncate text with ellipsis.

```typescript
const short = truncateText('Long text here...', 10); // 'Long te...'
```

**`createSystemPrompt(context)`**

Helper to create system prompts.

```typescript
const prompt = createSystemPrompt('You are a code reviewer');
```

## Examples

### AI Chat Screen

See `apps/mobile/app/ai-chat.tsx` for a complete chat UI example.

### AI Hook

See `apps/mobile/src/hooks/useAI.ts` for React hook integration.

## Testing

```bash
pnpm test
```

Run tests for Claude utilities (JSON parsing, conversation management, text truncation).

## Models

Currently configured for `claude-3-5-sonnet-20241022`. Update in `packages/claude/src/client.ts` to use different models:

- `claude-opus-4-1`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

## API Keys

Get your API key from [Anthropic Console](https://console.anthropic.com).

Never commit `.env` files with API keys. Use `.env.local` (in `.gitignore`).

## Rate Limits

Claude API has rate limits. Implement retry logic and backoff for production:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000),
      );
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Troubleshooting

### `ANTHROPIC_API_KEY environment variable is required`

Set the environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### `ClaudeClient is not defined`

Make sure you're importing from the package:

```typescript
// ✅ Correct
import { ClaudeClient } from '@sisig/claude';

// ❌ Wrong
import ClaudeClient from '@sisig/claude';
```

### Rate limit errors

Implement retry logic with exponential backoff.

## Next Steps

- Implement prompt caching for long contexts
- Add vision (image) support
- Implement function calling for tool use
- Add streaming response handling in mobile UI
