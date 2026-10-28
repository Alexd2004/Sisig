# Claude AI Skills Guide

This document outlines all Claude AI-powered features integrated into the Sisig platform.

## Overview

The Sisig platform includes **7 major Claude AI skills** across the mobile app and shared packages. All skills are built on the `@sisig/claude` package, which provides:

- **ClaudeClient** - Direct access to Claude API with streaming support
- **ConversationManager** - Multi-turn conversation history management
- **Utilities** - JSON parsing, text truncation, prompt building

## Skills Breakdown

### 1. AI Chat (`apps/mobile/app/ai-chat.tsx`)

**Purpose:** Multi-turn conversations with Claude

**Features:**
- Real-time message streaming
- Conversation history
- Loading and error states
- Type-safe message management

**Usage:**
```typescript
import AIChatScreen from 'apps/mobile/app/ai-chat';

// User can have ongoing conversations with Claude
// Messages are persisted in local state
```

**API:**
```typescript
const { chat } = useAI();
await chat([{ role: 'user', content: 'Hello!' }]);
```

---

### 2. Text Summarizer (`apps/mobile/app/ai-summarizer.tsx`)

**Purpose:** Condense long documents into key points

**Features:**
- Paste any text
- Get Claude-powered summary
- Track compression ratio
- Compare original vs summary side-by-side

**Usage:**
```typescript
import AISummarizerScreen from 'apps/mobile/app/ai-summarizer';

// User pastes article/document
// Claude generates concise summary
// Shows compression statistics
```

**API:**
```typescript
const summary = await client.generateText(
  `Summarize: ${longText}`,
  { maxTokens: 500 }
);
```

---

### 3. Code Analyzer (`packages/claude/src/code-analyzer.ts`)

**Purpose:** Analyze, document, and improve code

**Features:**
- Code review (bugs, performance, style)
- Auto-generate documentation
- Suggest refactoring improvements
- Explain code in simple terms

**Usage:**
```typescript
import {
  analyzeCode,
  generateCodeDocumentation,
  suggestRefactoring,
  explainCode,
} from '@sisig/claude';

// Analyze code for issues
const analysis = await analyzeCode(codeString, 'typescript');
console.log(analysis.issues);     // Bug list
console.log(analysis.improvements); // Suggestions

// Generate docs for function
const docs = await generateCodeDocumentation(codeString);

// Get refactoring suggestions
const suggestions = await suggestRefactoring(codeString);

// Explain to junior developers
const explanation = await explainCode(codeString);
```

**Returns:**
```typescript
interface CodeAnalysis {
  issues: string[];           // Found bugs/issues
  improvements: string[];     // Suggestions
  summary: string;            // Code overview
}
```

---

### 4. Image Analysis (`apps/mobile/src/hooks/useImageAnalysis.ts`)

**Purpose:** Analyze and describe images (vision model ready)

**Features:**
- Upload image from camera or gallery
- Claude vision model describes image
- Works with base64 image encoding
- Ready for Claude 3 vision models

**Usage:**
```typescript
import { useImageAnalysis } from 'src/hooks/useImageAnalysis';

function MyComponent(): JSX.Element {
  const { description, loading, analyzeImage } = useImageAnalysis();

  const handlePickImage = async (uri: string): Promise<void> => {
    await analyzeImage(uri);
  };

  return (
    <View>
      <Button title="Analyze" onPress={() => handlePickImage(uri)} />
      {loading && <ActivityIndicator />}
      {description && <Text>{description}</Text>}
    </View>
  );
}
```

**Vision Model Setup:**
```typescript
// In packages/claude/src/client.ts, add vision support:
const response = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: base64 }
      },
      { type: 'text', text: 'Describe this image' }
    ]
  }]
});
```

---

### 5. Translator (`packages/claude/src/translator.ts`)

**Purpose:** Multi-language text translation

**Features:**
- Translate between 10+ languages
- Automatic language detection
- Batch translations
- Preserve tone and style

**Supported Languages:**
English, Spanish, French, German, Japanese, Chinese, Korean, Portuguese, Russian, Arabic

**Usage:**
```typescript
import {
  translateText,
  detectLanguage,
  translateToMultipleLanguages,
  SUPPORTED_LANGUAGES,
} from '@sisig/claude';

// Translate single text
const result = await translateText(
  'Hello world',
  'English',
  'Spanish'
);
console.log(result.translated); // 'Hola mundo'

// Detect language
const lang = await detectLanguage('Bonjour');
console.log(lang); // 'French'

// Translate to multiple languages
const results = await translateToMultipleLanguages(
  'Hello',
  'English',
  ['Spanish', 'French', 'German']
);

// See all supported languages
console.log(SUPPORTED_LANGUAGES);
```

**Mobile UI** (`apps/mobile/app/ai-translator.tsx`):
- Language selection dropdown
- Swap source/target languages
- Real-time translation
- Show original and translated side-by-side

---

### 6. Documentation Generator (`packages/claude/src/doc-generator.ts`)

**Purpose:** Automate documentation generation for projects

**Features:**
- Generate API documentation (Markdown, HTML, JSDoc, Sphinx)
- Create comprehensive README files
- Generate test case templates
- Auto-generate CHANGELOG entries
- Create CONTRIBUTING guides

**Usage:**
```typescript
import {
  generateAPIDocs,
  generateREADME,
  generateTestCases,
  generateChangelog,
  generateContributingGuide,
} from '@sisig/claude';

// Generate API docs
const docs = await generateAPIDocs(code, {
  style: 'markdown',
  includeExamples: true,
  includeTypeInfo: true,
});

// Generate README
const readme = await generateREADME(
  'A simple calculator library',
  ['Add', 'Subtract', 'Multiply', 'Divide'],
  'npm install calculator'
);

// Generate tests
const tests = await generateTestCases(code, 'jest');

// Generate changelog
const changelog = await generateChangelog(
  '1.1.0',
  '1.0.0',
  ['Added feature X', 'Fixed bug Y']
);

// Generate contributing guide
const guide = await generateContributingGuide(
  'MyProject',
  ['TypeScript', 'React', 'Node.js']
);
```

---

### 7. AI Journal (`apps/mobile/app/ai-journal.tsx`)

**Purpose:** Personal journaling with AI insights

**Features:**
- Write daily thoughts and experiences
- Claude analyzes emotional themes
- Get insights on mood and topics
- Review past entries with timestamps
- Sentiment analysis

**Usage:**
```typescript
import AIJournalScreen from 'apps/mobile/app/ai-journal';

// User writes journal entry
// Claude provides:
// - Emotion recognition
// - Theme identification
// - Sentiment analysis
// - Personal growth insights

// Entries saved with timestamps
// Easy review of past journals
```

**Example Insights:**
```
Key themes in your entry:
- Emotion: Thoughtful and reflective
- Topics: Personal growth, learning
- Sentiment: Positive with opportunities

Suggested reflection:
- Consider these patterns over time
- Build on your strengths
- Address challenges systematically
```

---

## Integration Points

### useAI Hook (React)

Generic hook for using Claude in any component:

```typescript
import { useAI } from 'apps/mobile/src/hooks/useAI';

function MyComponent(): JSX.Element {
  const { response, loading, error, generate, chat, reset } = useAI({
    apiKey: process.env.ANTHROPIC_API_KEY,
    systemPrompt: 'You are a helpful assistant.',
  });

  return (
    <View>
      <Button
        title="Ask"
        onPress={() => generate('Your question')}
      />
      {loading && <ActivityIndicator />}
      {response && <Text>{response}</Text>}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

### ClaudeClient (Direct)

For backend/server-side usage:

```typescript
import { ClaudeClient } from '@sisig/claude';

const client = new ClaudeClient(process.env.ANTHROPIC_API_KEY);

// Chat
const response = await client.chat(
  [{ role: 'user', content: 'Hello' }],
  { maxTokens: 500, temperature: 0.7 }
);

// Generate text
const text = await client.generateText('Write a poem', {
  maxTokens: 300,
});

// Stream responses
await client.streamChat(
  [{ role: 'user', content: 'Tell me a story' }],
  (chunk) => console.log(chunk)
);
```

### Conversation Manager

Manage multi-turn conversations:

```typescript
import { ConversationManager } from '@sisig/claude';

const manager = new ConversationManager(20); // Max 20 messages

// Add messages
manager.addMessage('user', 'What is AI?');
manager.addMessage('assistant', 'AI is...');

// Get for API
const messages = manager.getMessages();

// Get full history
const history = manager.getHistory(); // With timestamps

// Reset
manager.clear();
```

---

## Setup & Configuration

### 1. Set API Key

```bash
# Environment variable
export ANTHROPIC_API_KEY=sk-ant-...

# Or in .env.local
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
```

### 2. Install & Build

```bash
# From root
pnpm install

# Build Claude package
pnpm -F @sisig/claude build
```

### 3. Run Mobile App

```bash
pnpm dev

# Scan QR code with Expo Go or development client
```

### 4. Test Claude Features

```bash
# Test Claude package
pnpm -F @sisig/claude test

# Test mobile app
pnpm -F @sisig/mobile test
```

---

## Best Practices

### 1. API Key Security

```typescript
// ✅ Good: Use environment variable
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = new ClaudeClient(apiKey);

// ❌ Bad: Hardcode API key
const client = new ClaudeClient('sk-ant-xxx');
```

### 2. Error Handling

```typescript
try {
  const response = await client.generateText(prompt);
} catch (error) {
  if (error instanceof Error) {
    console.error('Claude API error:', error.message);
  }
}
```

### 3. Rate Limiting

```typescript
// Implement retry logic with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 4. Type Safety

```typescript
// ✅ Always type responses
interface CodeAnalysis {
  issues: string[];
  improvements: string[];
  summary: string;
}

const analysis = await analyzeCode(code) as CodeAnalysis;
```

---

## Performance Tips

1. **Cache responses** - Store summaries, translations, analysis results
2. **Batch requests** - Use `translateToMultipleLanguages` for multiple translations
3. **Stream responses** - Use `streamChat` for long-running tasks
4. **Limit context** - ConversationManager keeps only recent messages
5. **Set max tokens** - Specify `maxTokens` to control response length

---

## Future Enhancements

- [ ] Prompt caching for repeated queries
- [ ] Function calling for tool use
- [ ] Batch API for document processing
- [ ] Custom fine-tuned models
- [ ] Vision model support (Claude 3)
- [ ] Audio transcription (Whisper integration)

---

## Resources

- [Anthropic Documentation](https://docs.anthropic.com)
- [Claude Models](https://www.anthropic.com/models)
- [API Pricing](https://www.anthropic.com/pricing)
- [@sisig/claude Package](./packages/claude/README.md)
- [Mobile App README](./apps/mobile/README.md)

---

**Questions?** See the README files in individual packages or contact the dev team.
