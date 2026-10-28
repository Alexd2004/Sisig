import { ClaudeClient } from './client';

export type Language =
  | 'English'
  | 'Spanish'
  | 'French'
  | 'German'
  | 'Japanese'
  | 'Chinese'
  | 'Korean'
  | 'Portuguese'
  | 'Russian'
  | 'Arabic';

export interface TranslationResult {
  original: string;
  translated: string;
  sourceLanguage: Language;
  targetLanguage: Language;
}

export async function translateText(
  text: string,
  sourceLanguage: Language = 'English',
  targetLanguage: Language = 'Spanish',
): Promise<TranslationResult> {
  const client = new ClaudeClient();

  const systemPrompt = `You are an expert translator. Translate the provided text from ${sourceLanguage} to ${targetLanguage}.
Maintain the original meaning, tone, and style.
Respond ONLY with the translated text, no explanations.`;

  const translation = await client.generateText(text, {
    system: systemPrompt,
    maxTokens: Math.max(text.length, 500),
  });

  return {
    original: text,
    translated: translation,
    sourceLanguage,
    targetLanguage,
  };
}

export async function detectLanguage(text: string): Promise<Language> {
  const client = new ClaudeClient();

  const systemPrompt = `Detect the language of the given text.
Respond with ONLY the language name (e.g., "English", "Spanish", "French").
Do not include any explanation.`;

  const result = await client.generateText(text, {
    system: systemPrompt,
    maxTokens: 50,
  });

  return result.trim() as Language;
}

export async function translateToMultipleLanguages(
  text: string,
  sourceLanguage: Language,
  targetLanguages: Language[],
): Promise<TranslationResult[]> {
  return Promise.all(
    targetLanguages.map((targetLang) =>
      translateText(text, sourceLanguage, targetLang),
    ),
  );
}

export const SUPPORTED_LANGUAGES: Language[] = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Chinese',
  'Korean',
  'Portuguese',
  'Russian',
  'Arabic',
];
