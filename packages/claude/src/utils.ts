export interface ParsedResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function parseJSON<T>(jsonString: string): Promise<ParsedResponse<T>> {
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

export function createSystemPrompt(context: string): string {
  return `You are a helpful AI assistant. ${context}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export class ConversationManager {
  private messages: ConversationMessage[] = [];
  private maxMessages: number;

  constructor(maxMessages: number = 20) {
    this.maxMessages = maxMessages;
  }

  addMessage(role: 'user' | 'assistant', content: string): void {
    this.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });

    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  getMessages(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  clear(): void {
    this.messages = [];
  }

  getHistory(): ConversationMessage[] {
    return [...this.messages];
  }
}
