import { parseJSON, truncateText, ConversationManager, createSystemPrompt } from './utils';

describe('Claude Utils', () => {
  describe('parseJSON', () => {
    it('parses valid JSON', async () => {
      const result = await parseJSON('{"key":"value"}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
    });

    it('handles invalid JSON', async () => {
      const result = await parseJSON('invalid json');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('truncateText', () => {
    it('returns text unchanged if within limit', () => {
      const text = 'Hello world';
      expect(truncateText(text, 20)).toBe('Hello world');
    });

    it('truncates text and adds ellipsis', () => {
      const text = 'Hello world this is a long string';
      expect(truncateText(text, 10)).toBe('Hello w...');
      expect(truncateText(text, 10).length).toBe(10);
    });
  });

  describe('createSystemPrompt', () => {
    it('creates a system prompt with context', () => {
      const prompt = createSystemPrompt('Be helpful and concise');
      expect(prompt).toContain('helpful AI assistant');
      expect(prompt).toContain('Be helpful and concise');
    });
  });

  describe('ConversationManager', () => {
    it('adds messages in order', () => {
      const manager = new ConversationManager();
      manager.addMessage('user', 'Hello');
      manager.addMessage('assistant', 'Hi there!');
      const msgs = manager.getMessages();
      expect(msgs).toHaveLength(2);
      expect(msgs[0].content).toBe('Hello');
      expect(msgs[1].content).toBe('Hi there!');
    });

    it('limits message count to maxMessages', () => {
      const manager = new ConversationManager(5);
      for (let i = 0; i < 10; i += 1) {
        manager.addMessage('user', `Message ${i}`);
      }
      expect(manager.getMessages()).toHaveLength(5);
    });

    it('clears messages', () => {
      const manager = new ConversationManager();
      manager.addMessage('user', 'Hello');
      manager.clear();
      expect(manager.getMessages()).toHaveLength(0);
    });

    it('provides conversation history with timestamps', () => {
      const manager = new ConversationManager();
      manager.addMessage('user', 'Hello');
      const history = manager.getHistory();
      expect(history[0]).toHaveProperty('timestamp');
      expect(typeof history[0].timestamp).toBe('number');
    });
  });
});
