import { getTimeContext } from 'core/src/llm/systemprompt/systemPromptHelper';

import type { Message } from 'core/src/workspace/conversation.types';

describe('systemPromptHelper.ts', () => {
  describe('getTimeContext', () => {
    test('should return empty string for empty conversation', () => {
      const result = getTimeContext([]);
      expect(result).toBe('');
    });

    test('should return empty string for single message', () => {
      const conversation: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date().toISOString(),
        },
      ];

      const result = getTimeContext(conversation);
      expect(result).toBe('');
    });

    test('should return empty string for messages without timestamps', () => {
      const conversation: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: undefined,
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there',
          timestamp: undefined,
        },
      ];

      const result = getTimeContext(conversation);
      expect(result).toBe('');
    });

    test('should return active conversation message for recent messages', () => {
      const now = new Date();
      const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);

      const conversation: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: threeMinutesAgo.toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there',
          timestamp: now.toISOString(),
        },
      ];

      const result = getTimeContext(conversation);
      expect(result).toBe('Conversation is active and ongoing.');
    });

    test('should return minutes message for moderate gap', () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      const conversation: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: thirtyMinutesAgo.toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there',
          timestamp: now.toISOString(),
        },
      ];

      const result = getTimeContext(conversation);
      expect(result).toBe('30 minutes have passed since the last exchange.');
    });

    test('should return hours message for longer gap', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const conversation: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: twoHoursAgo.toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there',
          timestamp: now.toISOString(),
        },
      ];

      const result = getTimeContext(conversation);
      expect(result).toBe('2 hours have passed since you last spoke.');
    });

    test('should return singular hour message for one hour gap', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const conversation: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: oneHourAgo.toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there',
          timestamp: now.toISOString(),
        },
      ];

      const result = getTimeContext(conversation);
      expect(result).toBe('1 hour have passed since you last spoke.');
    });

    test('should return days message for very long gap', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const conversation: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: threeDaysAgo.toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there',
          timestamp: now.toISOString(),
        },
      ];

      const result = getTimeContext(conversation);
      expect(result).toBe('3 days have passed since your last conversation.');
    });

    test('should return singular day message for one day gap', () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const conversation: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: oneDayAgo.toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there',
          timestamp: now.toISOString(),
        },
      ];

      const result = getTimeContext(conversation);
      expect(result).toBe('1 day have passed since your last conversation.');
    });
  });
});
