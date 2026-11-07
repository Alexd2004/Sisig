# Claude AI Skills Guide

This document lists the Claude AI features in the Sisig platform and what state each one is in on `main`.

## Overview

The repository has **7 Claude-related features** across the mobile app and the `@sisig/claude` package. None of them calls the Claude API from the app today:

- The four AI screens in `apps/mobile/app/` are UI only and show fixed placeholder text.
- The helpers in `packages/claude/src/` call the API, but only from Node, and the [known issues](packages/claude/README.md#known-issues) in that package (retired default model, `temperature` always sent) make live calls fail until `src/client.ts` changes.

`@sisig/claude` provides:

- **ClaudeClient**: chat, text generation and streaming over `@anthropic-ai/sdk` 0.24.3.
- **ConversationManager**: in-memory message history with a size limit.
- **Utilities**: JSON parsing, text truncation, a system prompt helper.

> **Warning:** do not put an Anthropic API key in the mobile app. Expo inlines `EXPO_PUBLIC_*` variables into the JavaScript bundle, and anyone with the installed app can extract them. `ClaudeClient` reads `process.env.ANTHROPIC_API_KEY`, which Expo does not inline, so it throws in the app. That is the safe outcome; keep it that way.

| # | Feature | Where | Status on `main` |
|---|---------|-------|------------------|
| 1 | AI Chat | `apps/mobile/app/ai-chat.tsx` | UI only, placeholder replies |
| 2 | Text Summarizer | `apps/mobile/app/ai-summarizer.tsx` | UI only, placeholder summary |
| 3 | Code Analyzer | `packages/claude/src/code-analyzer.ts` | Node helpers, affected by the known issues |
| 4 | Image Analysis | `apps/mobile/src/hooks/useImageAnalysis.ts` | Stub, never calls the API, not used by any screen |
| 5 | Translator | `packages/claude/src/translator.ts`, `apps/mobile/app/ai-translator.tsx` | Node helpers; the screen is UI only |
| 6 | Documentation Generator | `packages/claude/src/doc-generator.ts` | Node helpers, affected by the known issues |
| 7 | AI Journal | `apps/mobile/app/ai-journal.tsx` | UI only, placeholder insights |

No screen links to the four AI routes (`/ai-chat`, `/ai-summarizer`, `/ai-translator`, `/ai-journal`).

## Skills Breakdown

### 1. AI Chat (`apps/mobile/app/ai-chat.tsx`)

**Purpose:** multi-turn conversation with Claude.

**What it does today:**
- Shows a message list, a text input and a Send button.
- Adds each message to component state and to a `ConversationManager`.
- Replies with a fixed placeholder message. There is no API call and no streaming.
- Messages live in memory only and are lost when the screen unmounts.

**Code it would use:** `useAI` from `apps/mobile/src/hooks/useAI.ts` exposes `chat(messages)`, but the screen does not use it, and it cannot run in the app without a key in the bundle (see the warning above).

---

### 2. Text Summarizer (`apps/mobile/app/ai-summarizer.tsx`)

**Purpose:** condense long text into key points.

**What it does today:**
- Takes pasted text and shows a fixed placeholder summary.
- Shows the original length, the summary length and a compression percentage.
- Makes no API call.

**Node equivalent:**
```typescript
import { ClaudeClient } from '@sisig/claude';

const client = new ClaudeClient();
const summary = await client.generateText(`Summarize: ${longText}`, {
  model: '<model id>', // the default model is retired
  maxTokens: 500,
});
```

---

### 3. Code Analyzer (`packages/claude/src/code-analyzer.ts`)

**Purpose:** review, document, refactor and explain code.

**Exports:**
```typescript
import {
  analyzeCode,
  generateCodeDocumentation,
  suggestRefactoring,
  explainCode,
} from '@sisig/claude';

// Each takes (code, language = 'typescript')
const analysis = await analyzeCode(codeString, 'typescript'); // Promise<CodeAnalysis>
console.log(analysis.issues);
console.log(analysis.improvements);

const docs = await generateCodeDocumentation(codeString); // Promise<string>
const suggestions = await suggestRefactoring(codeString); // Promise<string>
const explanation = await explainCode(codeString); // Promise<string>
```

**Returns:**
```typescript
interface CodeAnalysis {
  issues: string[];
  improvements: string[];
  summary: string;
}
```

`analyzeCode` asks for JSON and parses the first `{...}` block in the reply. Each function creates its own `ClaudeClient`, so it reads `ANTHROPIC_API_KEY` from the environment and uses the retired default model.

---

### 4. Image Analysis (`apps/mobile/src/hooks/useImageAnalysis.ts`)

**Purpose:** describe an image with a Claude vision model. Not implemented.

**What the hook does today:**
- `analyzeImage(uri)` fetches the URI and reads it as a data URL with `FileReader`.
- It then sets a fixed message, "Image analysis feature requires Claude vision model setup.", and never calls the API.
- It returns `description`, `loading`, `error`, `analyzeImage` and `reset`.
- No screen uses it, and the app has no camera or image picker dependency.

**What a real version needs:** `ClaudeClient.chat` only accepts string message content, so sending an image needs a change to `packages/claude/src/client.ts`. The key restriction above still applies, so the call would have to happen outside the app.

---

### 5. Translator (`packages/claude/src/translator.ts`)

**Purpose:** translate text between languages.

**Supported languages** (`SUPPORTED_LANGUAGES`): English, Spanish, French, German, Japanese, Chinese, Korean, Portuguese, Russian, Arabic.

**Exports:**
```typescript
import {
  translateText,
  detectLanguage,
  translateToMultipleLanguages,
  SUPPORTED_LANGUAGES,
} from '@sisig/claude';

// Defaults: from English to Spanish
const result = await translateText('Hello world', 'English', 'Spanish');
console.log(result.translated);

// Returns the model's one-word answer, cast to Language without checking
const lang = await detectLanguage('Bonjour');

// One request per target language, sent in parallel
const results = await translateToMultipleLanguages('Hello', 'English', [
  'Spanish',
  'French',
  'German',
]);
```

**Mobile UI** (`apps/mobile/app/ai-translator.tsx`):
- "From" and "To" language pickers built from `SUPPORTED_LANGUAGES`.
- A swap button.
- Translate shows placeholder text that repeats the input. There is no API call.

---

### 6. Documentation Generator (`packages/claude/src/doc-generator.ts`)

**Purpose:** generate documentation text from code or a description.

**Exports:**
```typescript
import {
  generateAPIDocs,
  generateREADME,
  generateTestCases,
  generateChangelog,
  generateContributingGuide,
} from '@sisig/claude';

// style: 'markdown' | 'html' | 'jsdoc' | 'sphinx'
const docs = await generateAPIDocs(code, {
  style: 'markdown',
  includeExamples: true,
  includeTypeInfo: true,
});

const readme = await generateREADME(
  'A simple calculator library',
  ['Add', 'Subtract', 'Multiply', 'Divide'],
  'npm install calculator',
);

// framework: 'jest' | 'mocha' | 'pytest'
const tests = await generateTestCases(code, 'jest');

const changelog = await generateChangelog('1.1.0', '1.0.0', ['Added feature X', 'Fixed bug Y']);

const guide = await generateContributingGuide('MyProject', ['TypeScript', 'React', 'Node.js']);
```

Each function returns a string and creates its own `ClaudeClient`.

---

### 7. AI Journal (`apps/mobile/app/ai-journal.tsx`)

**Purpose:** journaling with AI insights.

**What it does today:**
- Saves each entry with a timestamp to component state, newest first.
- Attaches the same fixed placeholder "insights" text to every entry. There is no emotion, theme or sentiment analysis.
- Entries are lost when the screen unmounts.

---

## Integration Points

### useAI Hook (React)

`apps/mobile/src/hooks/useAI.ts` returns `response`, `loading`, `error`, `generate(prompt)`, `chat(messages)` and `reset()`, and takes `{ apiKey?, systemPrompt? }`.

No screen uses it. It creates a `new ClaudeClient(options.apiKey)` on every render, so in the app it throws during render unless a key is passed, and passing a key from app code puts the key in the bundle. Treat the hook as an interface sketch, not something to wire up as it is.

### ClaudeClient (Direct)

For Node scripts or a server:

```typescript
import { ClaudeClient } from '@sisig/claude';

const client = new ClaudeClient(process.env.ANTHROPIC_API_KEY);

const response = await client.chat([{ role: 'user', content: 'Hello' }], {
  model: '<model id>',
  maxTokens: 500,
});

const text = await client.generateText('Write a poem', { model: '<model id>', maxTokens: 300 });

await client.streamChat(
  [{ role: 'user', content: 'Tell me a story' }],
  (chunk) => console.log(chunk),
  { model: '<model id>' },
);
```

Every request also sends `temperature` (default 0.7), which current models reject. See the [package README](packages/claude/README.md#known-issues).

### Conversation Manager

```typescript
import { ConversationManager } from '@sisig/claude';

const manager = new ConversationManager(20); // max 20 messages, the default

manager.addMessage('user', 'What is AI?');
manager.addMessage('assistant', 'AI is...');

const messages = manager.getMessages(); // for chat()
const history = manager.getHistory(); // with timestamps

manager.clear();
```

---

## Setup & Configuration

### 1. Set the API Key (Node only)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

The package does not read `.env` or `.env.local` files, so the key must be in the environment of the Node process, or passed to the `ClaudeClient` constructor. Never put it in `apps/mobile/.env.local`.

### 2. Install & Build

```bash
# From the repository root
pnpm install
pnpm -F @sisig/claude build
```

### 3. Run the Mobile App

The app needs a development build; Expo Go is not supported. See [apps/mobile/README.md](apps/mobile/README.md) and [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md). The AI screens show placeholder text whether or not a key is set.

### 4. Run the Tests

```bash
pnpm -F @sisig/claude test
pnpm -F @sisig/mobile test
```

The translator, code-analyzer and doc-generator tests call the real API when `ANTHROPIC_API_KEY` is set in your shell. Run `env -u ANTHROPIC_API_KEY pnpm -F @sisig/claude test` to keep them offline.

---

## Best Practices

### 1. API Key Security

```typescript
// Good: a Node process reads the key from its environment
const client = new ClaudeClient(process.env.ANTHROPIC_API_KEY);

// Bad: a key written in source code
const client = new ClaudeClient('sk-ant-xxx');
```

- Never commit a key. CI runs gitleaks and fails on a string that looks like an Anthropic key in `apps/` or `packages/`.
- Never ship a key in the mobile bundle, including through an `EXPO_PUBLIC_` variable.

### 2. Error Handling

```typescript
try {
  const text = await client.generateText(prompt, { model: '<model id>' });
} catch (error) {
  if (error instanceof Error) {
    console.error('Claude API error:', error.message);
  }
}
```

### 3. Retries

The SDK already retries 408, 409, 429 and 5xx responses and connection errors twice by default. Do not wrap calls in a loop that also retries 400-level errors, which fail the same way every time.

### 4. Type Safety

The helpers are typed. `analyzeCode` already returns `Promise<CodeAnalysis>`, so no cast is needed:

```typescript
const analysis = await analyzeCode(code);
analysis.issues.forEach((issue) => console.log(issue));
```

---

## Performance Tips

1. **Cache results** you will reuse, such as translations or summaries.
2. **Parallel translations:** `translateToMultipleLanguages` sends one request per language at the same time. It does not use the Message Batches API.
3. **Stream long replies** with `streamChat`.
4. **Limit context:** `ConversationManager` keeps only the most recent messages.
5. **Set `maxTokens`** to control reply length. The default is 1024.

---

## Not Built Yet

There are no Jira tickets for these in the repository:

- Real API calls from the AI screens, which need a server-side caller so the key stays out of the app.
- Image input (`useImageAnalysis` is a stub, and `chat` accepts text only).
- Streaming in the mobile UI.
- Fixing the [known issues](packages/claude/README.md#known-issues) in `packages/claude/src/client.ts`.

---

## Resources

- [Claude API documentation](https://platform.claude.com/docs)
- [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [@sisig/claude package](packages/claude/README.md)
- [Mobile app README](apps/mobile/README.md)

---

**Questions?** See the README files in individual packages or contact the dev team.
