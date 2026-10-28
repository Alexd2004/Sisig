export { ClaudeClient, createClaudeClient } from './client';
export type { CreateMessageOptions, ContentBlock, MessageResponse } from './client';
export {
  parseJSON,
  createSystemPrompt,
  truncateText,
  ConversationManager,
} from './utils';
export type { ParsedResponse, ConversationMessage } from './utils';
export {
  analyzeCode,
  generateCodeDocumentation,
  suggestRefactoring,
  explainCode,
} from './code-analyzer';
export type { CodeAnalysis } from './code-analyzer';
export {
  translateText,
  detectLanguage,
  translateToMultipleLanguages,
  SUPPORTED_LANGUAGES,
} from './translator';
export type { Language, TranslationResult } from './translator';
export {
  generateAPIDocs,
  generateREADME,
  generateTestCases,
  generateChangelog,
  generateContributingGuide,
} from './doc-generator';
export type { DocGenerationOptions } from './doc-generator';
