import { ClaudeClient } from './client';

export interface CodeAnalysis {
  issues: string[];
  improvements: string[];
  summary: string;
}

export async function analyzeCode(
  code: string,
  language: string = 'typescript',
): Promise<CodeAnalysis> {
  const client = new ClaudeClient();

  const systemPrompt = `You are an expert code reviewer. Analyze code for:
1. Bugs and logical errors
2. Performance issues
3. Code style and best practices
4. Type safety (especially for TypeScript)

Respond in JSON format with:
{
  "issues": ["issue 1", "issue 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "summary": "brief summary of the code"
}`;

  const userPrompt = `Review this ${language} code:

\`\`\`${language}
${code}
\`\`\``;

  try {
    const response = await client.generateText(userPrompt, {
      system: systemPrompt,
      maxTokens: 1500,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse code analysis response');
    }

    return JSON.parse(jsonMatch[0]) as CodeAnalysis;
  } catch (error) {
    throw new Error(
      `Code analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function generateCodeDocumentation(
  code: string,
  language: string = 'typescript',
): Promise<string> {
  const client = new ClaudeClient();

  const systemPrompt = `You are an expert technical writer. Generate clear, concise documentation for the provided code.
Include:
- Function/class descriptions
- Parameter documentation
- Return value documentation
- Usage examples`;

  const userPrompt = `Generate documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\``;

  return client.generateText(userPrompt, {
    system: systemPrompt,
    maxTokens: 2000,
  });
}

export async function suggestRefactoring(
  code: string,
  language: string = 'typescript',
): Promise<string> {
  const client = new ClaudeClient();

  const systemPrompt = `You are an expert software architect. Suggest refactoring improvements for code quality, maintainability, and performance.
Provide specific code examples and explanations.`;

  const userPrompt = `Suggest refactoring for this ${language} code:

\`\`\`${language}
${code}
\`\`\``;

  return client.generateText(userPrompt, {
    system: systemPrompt,
    maxTokens: 2000,
  });
}

export async function explainCode(
  code: string,
  language: string = 'typescript',
): Promise<string> {
  const client = new ClaudeClient();

  const systemPrompt =
    'You are a patient educator. Explain code in simple terms, suitable for junior developers.';

  const userPrompt = `Explain what this ${language} code does:

\`\`\`${language}
${code}
\`\`\``;

  return client.generateText(userPrompt, {
    system: systemPrompt,
    maxTokens: 1500,
  });
}
