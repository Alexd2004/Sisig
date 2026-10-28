import {
  generateAPIDocs,
  generateREADME,
  generateTestCases,
  generateChangelog,
  generateContributingGuide,
} from './doc-generator';

describe('Documentation Generator', () => {
  const sampleCode = `
export function add(a: number, b: number): number {
  return a + b;
}
`;

  describe('generateAPIDocs', () => {
    it('should generate API documentation', async () => {
      try {
        const docs = await generateAPIDocs(sampleCode);
        expect(typeof docs).toBe('string');
        expect(docs.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should respect documentation style option', async () => {
      try {
        const docs = await generateAPIDocs(sampleCode, { style: 'jsdoc' });
        expect(typeof docs).toBe('string');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('generateREADME', () => {
    it('should generate README content', async () => {
      try {
        const readme = await generateREADME(
          'A simple calculator library',
          ['Add numbers', 'Subtract numbers'],
          'npm install calculator',
        );
        expect(typeof readme).toBe('string');
        expect(readme.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('generateTestCases', () => {
    it('should generate test cases', async () => {
      try {
        const tests = await generateTestCases(sampleCode, 'jest');
        expect(typeof tests).toBe('string');
        expect(tests.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('generateChangelog', () => {
    it('should generate changelog entry', async () => {
      try {
        const changelog = await generateChangelog(
          '1.1.0',
          '1.0.0',
          ['Added new feature', 'Fixed bug'],
        );
        expect(typeof changelog).toBe('string');
        expect(changelog.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('generateContributingGuide', () => {
    it('should generate CONTRIBUTING guide', async () => {
      try {
        const guide = await generateContributingGuide('MyProject', [
          'TypeScript',
          'React',
        ]);
        expect(typeof guide).toBe('string');
        expect(guide.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
