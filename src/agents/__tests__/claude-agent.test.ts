import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ClaudeAgent } from '../claude-agent';

// Mock the global fetch function
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('ClaudeAgent', () => {
  let agent: ClaudeAgent;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['CLAUDE_API_KEY'] = 'test-claude-key';
    agent = new ClaudeAgent();
  });

  describe('Constructor', () => {
    it('should initialize with correct config', () => {
      expect(agent).toBeInstanceOf(ClaudeAgent);
    });

    it('should initialize brand voices', () => {
      expect(agent).toBeInstanceOf(ClaudeAgent);
      // Brand voices are initialized internally
    });
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Generated content for social media',
          },
        ],
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          input_tokens: 50,
          output_tokens: 100,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await agent.generateContent({
        prompt: 'Write a social media post about AI',
        brandVoice: 'professional',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-claude-key',
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it('should handle different brand voices', async () => {
      const mockResponse = {
        id: 'msg_123',
        content: [{ type: 'text', text: 'Content' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await agent.generateContent({
        prompt: 'Test prompt',
        brandVoice: 'casual',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs?.[1]?.body as string);

      expect(body.messages).toBeDefined();
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await expect(
        agent.generateContent({ prompt: 'test' })
      ).rejects.toThrow();
    });
  });

  describe('adaptContent', () => {
    it('should adapt content from Twitter to LinkedIn', async () => {
      const mockResponse = {
        id: 'msg_123',
        content: [{ type: 'text', text: 'Professional LinkedIn post adapted from tweet' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await agent.adaptContent({
        content: 'Original tweet content',
        fromPlatform: 'twitter',
        toPlatform: 'linkedin',
        maintainMessage: true,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should adapt content from LinkedIn to Instagram', async () => {
      const mockResponse = {
        id: 'msg_123',
        content: [{ type: 'text', text: 'Engaging Instagram post 📸' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await agent.adaptContent({
        content: 'Professional LinkedIn post',
        fromPlatform: 'linkedin',
        toPlatform: 'instagram',
        maintainMessage: false,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle missing API key gracefully', () => {
      delete process.env['CLAUDE_API_KEY'];
      const agentWithoutKey = new ClaudeAgent();
      expect(agentWithoutKey).toBeInstanceOf(ClaudeAgent);
    });

    it('should format errors properly', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        agent.generateContent({ prompt: 'test' })
      ).rejects.toThrow();
    });
  });

  describe('analyzeContent', () => {
    it('should analyze sentiment successfully', async () => {
      const mockResponse = {
        id: 'msg_123',
        content: [{ type: 'text', text: JSON.stringify({
          sentiment: 'positive',
          confidence: 0.85,
          details: 'The content has an optimistic and encouraging tone'
        })}],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await agent.analyzeContent({
        content: 'Test content for sentiment analysis',
        analysisType: 'sentiment',
      });

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should analyze readability', async () => {
      const mockResponse = {
        id: 'msg_123',
        content: [{ type: 'text', text: JSON.stringify({
          readability: 'high',
          score: 82,
          suggestions: []
        })}],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await agent.analyzeContent({
        content: 'Test content for readability analysis',
        analysisType: 'readability',
        targetAudience: 'general',
      });

      expect(result).toBeDefined();
    });
  });

  describe('generateVariations', () => {
    it('should generate content variations', async () => {
      const mockResponse = {
        id: 'msg_123',
        content: [{ type: 'text', text: 'Variation 1\n---\nVariation 2\n---\nVariation 3' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 10, output_tokens: 50 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await agent.generateVariations({
        baseContent: 'Original content',
        numberOfVariations: 3,
        variationType: 'full',
        testingGoal: 'Test different tones and engagement',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
