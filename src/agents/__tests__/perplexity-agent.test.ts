import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { PerplexityAgent } from '../perplexity-agent';

// Mock the global fetch function
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('PerplexityAgent', () => {
  let agent: PerplexityAgent;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['PERPLEXITY_API_KEY'] = 'test-api-key';
    agent = new PerplexityAgent();
  });

  describe('Constructor', () => {
    it('should initialize with correct config', () => {
      expect(agent).toBeInstanceOf(PerplexityAgent);
    });

    it('should use environment variable for API key', () => {
      process.env['PERPLEXITY_API_KEY'] = 'custom-key';
      const customAgent = new PerplexityAgent();
      expect(customAgent).toBeInstanceOf(PerplexityAgent);
    });
  });

  describe('research', () => {
    it('should successfully perform research with valid query', async () => {
      const mockResponse = {
        id: 'test-id',
        model: 'llama-3.1-sonar-large-128k-online',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Research results about AI trends',
            },
            finish_reason: 'stop',
          },
        ],
        citations: ['https://example.com/source1'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await agent.research({
        query: 'What are the latest AI trends?',
        maxResults: 5,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.perplexity.ai/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(agent.research({ query: 'test query' })).rejects.toThrow('Research failed');
    });

    it('should include optional parameters in request', async () => {
      const mockResponse = {
        id: 'test-id',
        choices: [{ message: { role: 'assistant', content: 'result' } }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await agent.research({
        query: 'test',
        sources: ['domain.com'],
        includeImages: true,
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs?.[1]?.body as string);

      expect(body.return_images).toBe(true);
      expect(body.search_domain_filter).toEqual(['domain.com']);
    });
  });

  describe('factCheck', () => {
    it('should fact-check multiple claims', async () => {
      const mockResponse = {
        id: 'test-id',
        choices: [{ message: { role: 'assistant', content: 'Fact check result' } }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await agent.factCheck('Content to check', ['Claim 1', 'Claim 2']);

      expect(result.claims).toHaveLength(2);
      expect(result.overallAccuracy).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle missing API key', () => {
      delete process.env['PERPLEXITY_API_KEY'];
      const agentWithoutKey = new PerplexityAgent();
      expect(agentWithoutKey).toBeInstanceOf(PerplexityAgent);
    });

    it('should throw descriptive error on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error: Rate limit exceeded'));

      await expect(agent.research({ query: 'test' })).rejects.toThrow(
        'Research failed: API Error: Rate limit exceeded'
      );
    });
  });
});
