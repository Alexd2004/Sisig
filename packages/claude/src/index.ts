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
