import { useState, useCallback } from 'react';
import { ClaudeClient } from '@sisig/claude';

interface UseAIOptions {
  apiKey?: string;
  systemPrompt?: string;
}

interface UseAIResult {
  response: string | null;
  loading: boolean;
  error: string | null;
  generate: (prompt: string) => Promise<void>;
  chat: (
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) => Promise<void>;
  reset: () => void;
}

export function useAI(options: UseAIOptions = {}): UseAIResult {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const client = new ClaudeClient(options.apiKey);

  const generate = useCallback(
    async (prompt: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.generateText(prompt, {
          system: options.systemPrompt,
        });
        setResponse(result);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, options.systemPrompt],
  );

  const chat = useCallback(
    async (
      messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    ): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.chat(messages, {
          system: options.systemPrompt,
        });
        const textContent = result.content.find((c) => c.type === 'text');
        if (textContent && textContent.text) {
          setResponse(textContent.text);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, options.systemPrompt],
  );

  const reset = useCallback((): void => {
    setResponse(null);
    setError(null);
    setLoading(false);
  }, []);

  return { response, loading, error, generate, chat, reset };
}
