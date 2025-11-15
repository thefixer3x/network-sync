import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

// Mock OpenAI module BEFORE importing EmbeddingAgent
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return {
    default: class MockOpenAI {
      embeddings = {
        create: mockCreate,
      };
    },
  };
});

// Mock Logger
jest.mock('@/utils/Logger', () => ({
  Logger: class MockLogger {
    warn = jest.fn();
    error = jest.fn();
    info = jest.fn();
  },
}));

// Now import after mocks are set up
import { EmbeddingAgent } from '../embedding-agent';

describe('EmbeddingAgent', () => {
  let agent: EmbeddingAgent;
  let originalEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockClear();
    originalEnv = process.env['OPENAI_API_KEY'];
  });

  afterEach(() => {
    if (originalEnv) {
      process.env['OPENAI_API_KEY'] = originalEnv;
    } else {
      delete process.env['OPENAI_API_KEY'];
    }
  });

  describe('Constructor', () => {
    it('should initialize with OpenAI client when API key is present', () => {
      process.env['OPENAI_API_KEY'] = 'test-api-key';
      agent = new EmbeddingAgent();
      expect(agent).toBeInstanceOf(EmbeddingAgent);
    });

    it('should initialize without OpenAI client when API key is missing', () => {
      delete process.env['OPENAI_API_KEY'];
      agent = new EmbeddingAgent();
      expect(agent).toBeInstanceOf(EmbeddingAgent);
    });
  });

  describe('createEmbeddings with OpenAI client', () => {
    beforeEach(() => {
      process.env['OPENAI_API_KEY'] = 'test-api-key';
    });

    it('should create embeddings using OpenAI API', async () => {
      (mockCreate as any).mockResolvedValue({
        data: [
          {
            embedding: Array.from({ length: 1536 }, (_, i) => i / 1536),
            index: 0,
          },
          {
            embedding: Array.from({ length: 1536 }, (_, i) => (i + 1) / 1536),
            index: 1,
          },
        ],
      });

      agent = new EmbeddingAgent();

      const result = await agent.createEmbeddings({
        texts: ['test text 1', 'test text 2'],
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['test text 1', 'test text 2'],
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        content: 'test text 1',
        dimensions: 1536,
      });
      expect(result[0]?.id).toBeDefined();
      expect(result[0]?.embedding).toHaveLength(1536);
    });

    it('should use custom model when specified', async () => {
      (mockCreate as any).mockResolvedValue({
        data: [
          {
            embedding: Array.from({ length: 3072 }, (_, i) => i / 3072),
            index: 0,
          },
        ],
      });

      agent = new EmbeddingAgent();

      await agent.createEmbeddings({
        texts: ['test text'],
        model: 'text-embedding-3-large',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: ['test text'],
      });
    });

    it('should include metadata in results when provided', async () => {
      (mockCreate as any).mockResolvedValue({
        data: [
          {
            embedding: Array.from({ length: 1536 }, (_, i) => i / 1536),
            index: 0,
          },
        ],
      });

      agent = new EmbeddingAgent();

      const metadata = [{ source: 'test', timestamp: Date.now() }];
      const result = await agent.createEmbeddings({
        texts: ['test text'],
        metadata,
      });

      expect(result[0]?.metadata).toEqual(metadata[0]);
    });

    it('should handle multiple texts with partial metadata', async () => {
      (mockCreate as any).mockResolvedValue({
        data: [
          { embedding: Array.from({ length: 1536 }, (_, i) => i / 1536), index: 0 },
          { embedding: Array.from({ length: 1536 }, (_, i) => i / 1536), index: 1 },
          { embedding: Array.from({ length: 1536 }, (_, i) => i / 1536), index: 2 },
        ],
      });

      agent = new EmbeddingAgent();

      const result = await agent.createEmbeddings({
        texts: ['text1', 'text2', 'text3'],
        metadata: [{ id: 1 }, undefined, { id: 3 }],
      });

      expect(result[0]?.metadata).toEqual({ id: 1 });
      expect(result[1]?.metadata).toBeUndefined();
      expect(result[2]?.metadata).toEqual({ id: 3 });
    });
  });

  describe('createEmbeddings with mock fallback', () => {
    beforeEach(() => {
      delete process.env['OPENAI_API_KEY'];
      agent = new EmbeddingAgent();
    });

    it('should generate mock embeddings when API key is missing', async () => {
      const result = await agent.createEmbeddings({
        texts: ['test text 1', 'test text 2'],
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        content: 'test text 1',
        dimensions: 10, // Mock embeddings have 10 dimensions
      });
      expect(result[0]?.id).toBeDefined();
      expect(result[0]?.embedding).toHaveLength(10);
      expect(result[0]?.embedding.every(v => v >= 0 && v <= 1)).toBe(true);
    });

    it('should generate deterministic mock embeddings', async () => {
      const result1 = await agent.createEmbeddings({
        texts: ['same text'],
      });
      const result2 = await agent.createEmbeddings({
        texts: ['same text'],
      });

      // Embeddings should be the same for the same text
      expect(result1[0]?.embedding).toEqual(result2[0]?.embedding);
    });

    it('should generate different mock embeddings for different texts', async () => {
      const result = await agent.createEmbeddings({
        texts: ['text one', 'text two'],
      });

      expect(result[0]?.embedding).not.toEqual(result[1]?.embedding);
    });

    it('should include metadata in mock embeddings', async () => {
      const metadata = [{ source: 'test' }];
      const result = await agent.createEmbeddings({
        texts: ['test text'],
        metadata,
      });

      expect(result[0]?.metadata).toEqual(metadata[0]);
    });
  });

  describe('Error handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      process.env['OPENAI_API_KEY'] = 'test-api-key';

      (mockCreate as any).mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      agent = new EmbeddingAgent();

      await expect(
        agent.createEmbeddings({ texts: ['test'] })
      ).rejects.toThrow('API rate limit exceeded');
    });

    it('should handle empty text array', async () => {
      delete process.env['OPENAI_API_KEY'];
      agent = new EmbeddingAgent();

      const result = await agent.createEmbeddings({
        texts: [],
      });

      expect(result).toEqual([]);
    });
  });
});
