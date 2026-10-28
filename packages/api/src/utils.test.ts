import { apiUrl, buildHeaders } from './utils';

describe('API Utils', () => {
  describe('apiUrl', () => {
    it('returns default URL when env is not set', () => {
      delete process.env.API_URL;
      expect(apiUrl()).toBe('http://localhost:3000');
    });

    it('returns custom URL from env', () => {
      process.env.API_URL = 'https://api.example.com';
      expect(apiUrl()).toBe('https://api.example.com');
    });
  });

  describe('buildHeaders', () => {
    it('includes Content-Type header', () => {
      const headers = buildHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('includes Authorization header when token provided', () => {
      const headers = buildHeaders('test-token');
      expect(headers['Authorization']).toBe('Bearer test-token');
    });

    it('excludes Authorization header when no token', () => {
      const headers = buildHeaders();
      expect(headers['Authorization']).toBeUndefined();
    });
  });
});
