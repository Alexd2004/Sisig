import Anthropic from '@anthropic-ai/sdk';

export interface CreateMessageOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export interface ContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface MessageResponse {
  id: string;
  content: ContentBlock[];
  stopReason: string | null;
}

export class ClaudeClient {
  private client: Anthropic;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.client = new Anthropic({ apiKey: this.apiKey });
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    const {
      model = 'claude-3-5-sonnet-20241022',
      maxTokens = 1024,
      temperature = 0.7,
      system,
    } = options;

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages,
    });

    return {
      id: response.id,
      content: response.content as ContentBlock[],
      stopReason: response.stop_reason,
    };
  }

  async generateText(
    prompt: string,
    options: CreateMessageOptions = {},
  ): Promise<string> {
    const response = await this.chat(
      [{ role: 'user', content: prompt }],
      options,
    );

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || !textContent.text) {
      throw new Error('No text content in response');
    }

    return textContent.text;
  }

  async streamChat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (chunk: string) => void,
    options: CreateMessageOptions = {},
  ): Promise<void> {
    const {
      model = 'claude-3-5-sonnet-20241022',
      maxTokens = 1024,
      temperature = 0.7,
      system,
    } = options;

    const stream = await this.client.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        onChunk(chunk.delta.text);
      }
    }
  }
}

export function createClaudeClient(apiKey?: string): ClaudeClient {
  return new ClaudeClient(apiKey);
}
