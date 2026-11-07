# @sisig/claude

Shared Claude API integration package for the Sisig platform. It wraps the Anthropic TypeScript SDK (`@anthropic-ai/sdk` `^0.24`, locked at 0.24.3) and exports:

- `ClaudeClient` and `createClaudeClient`: chat, text generation and streaming.
- `ConversationManager`: in-memory message history with a size limit.
- Utilities: `parseJSON`, `truncateText`, `createSystemPrompt`.
- Helpers built on `ClaudeClient`: translation, code analysis and documentation generation.

`tsc` builds the package to `dist/`, and other workspaces import it from there.

> **Warning: keep the API key out of the mobile app.** `ClaudeClient` is meant for Node processes such as scripts or a server. In the Expo app, `process.env.ANTHROPIC_API_KEY` is not available (Expo inlines only `EXPO_PUBLIC_*` variables), so `new ClaudeClient()` throws. Do not "fix" that with an `EXPO_PUBLIC_ANTHROPIC_*` variable or by passing a key from app code: a key in the JavaScript bundle can be extracted from the installed app. No screen calls the Claude API today.

## Known Issues

These are problems in the current code. This README describes them; it does not fix them.

- **The default model is retired.** `chat` and `streamChat` default to `claude-3-5-sonnet-20241022`, which Anthropic's model deprecation docs list as retired on October 28, 2025. A call that does not pass `options.model` fails. The translation, code-analysis and documentation helpers never pass a model, so they always use the retired default.
- **Every request sends `temperature`** (default `0.7`). According to Anthropic's docs, Claude Opus 4.7 and later and the 5.x models reject a non-default `temperature` with a 400 error.
- **The SDK is old.** `^0.24` resolves to 0.24.3, which sends API version `2023-06-01`. Anthropic's docs describe newer SDK releases (1.0 and later) that send a newer API version by default.
- **Helpers cannot take a key or a model.** Each helper creates its own `new ClaudeClient()`, so it reads the key from `process.env.ANTHROPIC_API_KEY` and uses the default model.
- **Text only.** `chat` and `streamChat` accept string message content only, so images and tool results cannot be sent.

## Setup

### 1. Install and Build

```bash
pnpm install
pnpm -F @sisig/claude build
```

### 2. Provide an API Key (Node only)

Pass the key to the constructor, or set `ANTHROPIC_API_KEY` in the environment of the Node process:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

The package does not load `.env` or `.env.local` files. A key written only to `.env.local` is not picked up.

## Usage

The examples show the API shape. Because of the [known issues](#known-issues), they fail against the live API unless you pass a `model` that is still available and accepts `temperature: 0.7`. Check the [models overview](https://platform.claude.com/docs/en/about-claude/models/overview) for current IDs.

### Basic Chat

```typescript
import { ClaudeClient } from '@sisig/claude';

const client = new ClaudeClient(); // reads ANTHROPIC_API_KEY

const response = await client.chat(
  [{ role: 'user', content: 'Hello, Claude!' }],
  { model: '<model id>' },
);

const text = response.content.find((block) => block.type === 'text')?.text;
console.log(text);
```

### Generate Text

```typescript
const text = await client.generateText('Write a haiku about monorepos', {
  model: '<model id>',
  maxTokens: 500,
});
```

### Streaming Chat

```typescript
await client.streamChat(
  [{ role: 'user', content: 'Tell me about AI' }],
  (chunk) => {
    process.stdout.write(chunk);
  },
  { model: '<model id>' },
);
```

### Conversation Manager

Keeps message history in memory and drops the oldest messages past the limit:

```typescript
import { ConversationManager } from '@sisig/claude';

const manager = new ConversationManager(20); // 20 is also the default

manager.addMessage('user', 'What is AI?');
manager.addMessage('assistant', 'AI is artificial intelligence...');

const messages = manager.getMessages(); // { role, content }[] for chat()
const history = manager.getHistory(); // the same messages with timestamps

manager.clear();
```

### In the Mobile App

- `apps/mobile/app/ai-chat.tsx` uses `ConversationManager` for local history and replies with fixed placeholder text.
- `apps/mobile/app/ai-translator.tsx` uses `SUPPORTED_LANGUAGES` for its pickers and shows placeholder text.
- `apps/mobile/src/hooks/useAI.ts` wraps `ClaudeClient` in a hook with `generate`, `chat` and `reset`. No screen uses it. It creates a new `ClaudeClient` on every render, so without a key it throws during render.

## API Reference

### ClaudeClient

#### Constructor

```typescript
constructor(apiKey?: string)
```

Uses `apiKey`, then `process.env.ANTHROPIC_API_KEY`. If neither is set, it throws `ANTHROPIC_API_KEY environment variable is required`. `createClaudeClient(apiKey?)` does the same.

#### Methods

**`chat(messages, options?)`** returns `Promise<MessageResponse>`, which has `id`, `content` (an array of `ContentBlock`) and `stopReason`.

```typescript
interface CreateMessageOptions {
  model?: string; // default: 'claude-3-5-sonnet-20241022' (retired)
  maxTokens?: number; // default: 1024
  temperature?: number; // default: 0.7
  system?: string; // system prompt
}
```

**`generateText(prompt, options?)`** sends one user message and returns the first text block as a string. It throws `No text content in response` if there is none.

**`streamChat(messages, onChunk, options?)`** streams the response and calls `onChunk` with each text delta.

`messages` is an array of `{ role: 'user' | 'assistant'; content: string }`. The SDK retries 408, 409, 429 and 5xx responses and connection errors twice by default; `ClaudeClient` adds no retry logic of its own.

### ConversationManager

`new ConversationManager(maxMessages = 20)` with `addMessage(role, content)`, `getMessages()`, `getHistory()` and `clear()`.

### Utilities

- **`parseJSON<T>(jsonString)`** is async and returns `{ success: true, data }` or `{ success: false, error }`.
- **`truncateText(text, maxLength)`** returns the text unchanged if it fits, otherwise cuts it and adds `...` within `maxLength`. `truncateText('Long text here...', 10)` returns `'Long te...'`.
- **`createSystemPrompt(context)`** returns `'You are a helpful AI assistant. '` followed by `context`.

### Helpers

All helpers use `new ClaudeClient()` internally (see [Known Issues](#known-issues)).

| Module | Exports |
|--------|---------|
| `translator.ts` | `translateText(text, sourceLanguage = 'English', targetLanguage = 'Spanish')` returns a `TranslationResult`. `detectLanguage(text)` returns the model's answer cast to `Language`, unchecked. `translateToMultipleLanguages(text, source, targets)` sends one request per target language in parallel. `SUPPORTED_LANGUAGES`: English, Spanish, French, German, Japanese, Chinese, Korean, Portuguese, Russian, Arabic. |
| `code-analyzer.ts` | `analyzeCode(code, language = 'typescript')` returns a `CodeAnalysis` (`issues`, `improvements`, `summary`) parsed with the greedy pattern `/\{[\s\S]*\}/`, which spans from the first `{` to the last `}` in the reply, so a reply with two JSON objects fails to parse. `generateCodeDocumentation`, `suggestRefactoring` and `explainCode` take the same arguments and return a string. |
| `doc-generator.ts` | `generateAPIDocs(code, { style, includeExamples, includeTypeInfo })`, `generateREADME(description, features, setup)`, `generateTestCases(code, framework)`, `generateChangelog(currentVersion, previousVersion, changes)`, `generateContributingGuide(projectName, techStack)`. Each returns a string. |

Exported types: `CreateMessageOptions`, `ContentBlock`, `MessageResponse`, `ParsedResponse`, `ConversationMessage`, `CodeAnalysis`, `Language`, `TranslationResult`, `DocGenerationOptions`.

## Testing

```bash
pnpm -F @sisig/claude test
```

Jest runs with `ts-jest` in Node. The utility tests and the `SUPPORTED_LANGUAGES` tests run offline. The translator, code-analyzer and doc-generator tests call the real API when `ANTHROPIC_API_KEY` is set in your shell, which costs money. Without a key they pass by catching the expected error. To be sure no request is sent:

```bash
env -u ANTHROPIC_API_KEY pnpm -F @sisig/claude test
```

## Models

The only model ID in the code is the retired default, `claude-3-5-sonnet-20241022`. The IDs this README used to suggest (`claude-opus-4-1`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`) are retired too. See the [models overview](https://platform.claude.com/docs/en/about-claude/models/overview) for current IDs.

## API Keys

- Create keys in the [Claude Console](https://platform.claude.com).
- Never commit a key. `.env` and `.env.local` are gitignored. CI runs gitleaks, and a separate `git grep` step in `.github/workflows/ci.yml` fails on a string that looks like an Anthropic key (`sk-ant-` followed by 20 or more characters) in `apps/` or `packages/`.
- Never put a key in the mobile app (see the warning at the top).

## Troubleshooting

### `ANTHROPIC_API_KEY environment variable is required`

No key was passed and `ANTHROPIC_API_KEY` is not set in the process environment. In Node, export it in the shell that runs the process. In the mobile app this is expected: the key is not, and must not be, in the bundle.

### A 404 or "model not found" error

The default model is retired. Pass a current `model` in the options.

### A 400 error about `temperature`

The model does not accept `temperature: 0.7`. `ClaudeClient` always sends it, so this needs a change in `src/client.ts`.

### `ClaudeClient is not defined`

Use the named import:

```typescript
// Correct
import { ClaudeClient } from '@sisig/claude';

// Wrong: the package has no default export
import ClaudeClient from '@sisig/claude';
```
