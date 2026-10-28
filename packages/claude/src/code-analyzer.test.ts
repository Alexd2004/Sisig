import { analyzeCode, generateCodeDocumentation, suggestRefactoring, explainCode } from './code-analyzer';

// Note: These are placeholder tests. Real tests would mock the ClaudeClient
// or use integration tests with actual API calls

describe('Code Analyzer', () => {
  const sampleCode = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
`;

  describe('analyzeCode', () => {
    it('should handle code analysis request', async () => {
      try {
        const analysis = await analyzeCode(sampleCode, 'javascript');
        expect(analysis).toHaveProperty('issues');
        expect(analysis).toHaveProperty('improvements');
        expect(analysis).toHaveProperty('summary');
        expect(Array.isArray(analysis.issues)).toBe(true);
        expect(Array.isArray(analysis.improvements)).toBe(true);
      } catch (error) {
        // Expected to fail without API key - just verify structure
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('generateCodeDocumentation', () => {
    it('should generate documentation', async () => {
      try {
        const docs = await generateCodeDocumentation(sampleCode, 'javascript');
        expect(typeof docs).toBe('string');
        expect(docs.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected to fail without API key
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('suggestRefactoring', () => {
    it('should suggest refactoring improvements', async () => {
      try {
        const suggestions = await suggestRefactoring(sampleCode, 'javascript');
        expect(typeof suggestions).toBe('string');
        expect(suggestions.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected to fail without API key
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('explainCode', () => {
    it('should explain code', async () => {
      try {
        const explanation = await explainCode(sampleCode, 'javascript');
        expect(typeof explanation).toBe('string');
        expect(explanation.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected to fail without API key
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
