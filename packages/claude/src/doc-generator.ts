import { ClaudeClient } from './client';

export interface DocGenerationOptions {
  style?: 'markdown' | 'html' | 'jsdoc' | 'sphinx';
  includeExamples?: boolean;
  includeTypeInfo?: boolean;
}

export async function generateAPIDocs(
  code: string,
  options: DocGenerationOptions = {},
): Promise<string> {
  const {
    style = 'markdown',
    includeExamples = true,
    includeTypeInfo = true,
  } = options;

  const client = new ClaudeClient();

  const systemPrompt = `Generate comprehensive API documentation in ${style} format.
${includeExamples ? 'Include practical usage examples.' : 'Do not include examples.'}
${includeTypeInfo ? 'Include type information and signatures.' : 'Focus on functionality description.'}
Make it clear and concise for developers.`;

  const userPrompt = `Generate documentation for this API:

\`\`\`
${code}
\`\`\``;

  return client.generateText(userPrompt, {
    system: systemPrompt,
    maxTokens: 3000,
  });
}

export async function generateREADME(
  projectDescription: string,
  features: string[],
  setup: string,
): Promise<string> {
  const client = new ClaudeClient();

  const systemPrompt = `You are an expert technical writer. Generate a professional README.md file.
Include:
- Project description and purpose
- Key features
- Installation instructions
- Quick start guide
- Configuration options
- Troubleshooting section
- Links to documentation

Format with proper Markdown.`;

  const userPrompt = `Generate a README for:
Project: ${projectDescription}
Features: ${features.join(', ')}
Setup: ${setup}`;

  return client.generateText(userPrompt, {
    system: systemPrompt,
    maxTokens: 2000,
  });
}

export async function generateTestCases(
  code: string,
  framework: 'jest' | 'mocha' | 'pytest' = 'jest',
): Promise<string> {
  const client = new ClaudeClient();

  const systemPrompt = `Generate comprehensive test cases in ${framework} format.
Cover:
- Normal usage
- Edge cases
- Error handling
- Boundary conditions

Write well-structured, readable tests with clear assertions.`;

  const userPrompt = `Generate ${framework} tests for this code:

\`\`\`
${code}
\`\`\``;

  return client.generateText(userPrompt, {
    system: systemPrompt,
    maxTokens: 2000,
  });
}

export async function generateChangelog(
  currentVersion: string,
  previousVersion: string,
  changes: string[],
): Promise<string> {
  const client = new ClaudeClient();

  const systemPrompt = `Generate a professional CHANGELOG.md entry.
Format:
- Use semantic versioning
- Group changes by category (Added, Fixed, Changed, Removed, Deprecated)
- Be clear and user-facing

Follow [Keep a Changelog](https://keepachangelog.com) format.`;

  const userPrompt = `Create a changelog entry:
Current Version: ${currentVersion}
Previous Version: ${previousVersion}
Changes: ${changes.join(', ')}`;

  return client.generateText(userPrompt, {
    system: systemPrompt,
    maxTokens: 1000,
  });
}

export async function generateContributingGuide(
  projectName: string,
  techStack: string[],
): Promise<string> {
  const client = new ClaudeClient();

  const systemPrompt = `Generate a comprehensive CONTRIBUTING.md file for an open source project.
Include:
- Code of conduct reference
- Development setup instructions
- Branching strategy
- Commit message guidelines
- Pull request process
- Testing requirements
- Style guide references`;

  const userPrompt = `Generate CONTRIBUTING.md for:
Project: ${projectName}
Tech Stack: ${techStack.join(', ')}`;

  return client.generateText(userPrompt, {
    system: systemPrompt,
    maxTokens: 2500,
  });
}
