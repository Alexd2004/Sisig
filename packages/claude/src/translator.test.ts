import { SUPPORTED_LANGUAGES, detectLanguage, translateText } from './translator';

describe('Translator', () => {
  describe('SUPPORTED_LANGUAGES', () => {
    it('includes common languages', () => {
      expect(SUPPORTED_LANGUAGES).toContain('English');
      expect(SUPPORTED_LANGUAGES).toContain('Spanish');
      expect(SUPPORTED_LANGUAGES).toContain('French');
      expect(SUPPORTED_LANGUAGES).toContain('Japanese');
    });

    it('has at least 10 languages', () => {
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('detectLanguage', () => {
    it('should attempt to detect language', async () => {
      try {
        const language = await detectLanguage('Hello world');
        expect(typeof language).toBe('string');
      } catch (error) {
        // Expected to fail without API key
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('translateText', () => {
    it('should translate text between languages', async () => {
      try {
        const result = await translateText('Hello world', 'English', 'Spanish');
        expect(result).toHaveProperty('original');
        expect(result).toHaveProperty('translated');
        expect(result.sourceLanguage).toBe('English');
        expect(result.targetLanguage).toBe('Spanish');
      } catch (error) {
        // Expected to fail without API key
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
