import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { Content } from '../../../types/typescript-types';
import { AuthenticationError } from '../../../types/typescript-types';

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = jest.mocked(axios);

// Mock Logger
jest.mock('../../../utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Import after mocks
import { InstagramService } from '../InstagramService';

describe('InstagramService', () => {
  let service: InstagramService;
  const mockCredentials = {
    accessToken: 'test-instagram-token-for-testing',
    instagramAccountId: 'test-instagram-account-id-for-testing',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InstagramService(mockCredentials);
  });

  describe('Constructor', () => {
    it('should initialize with provided credentials', () => {
      expect(service).toBeInstanceOf(InstagramService);
      expect(service.platform).toBe('instagram');
    });

    it('should throw AuthenticationError when credentials are missing', () => {
      expect(() => new InstagramService({})).toThrow(AuthenticationError);
      expect(() => new InstagramService({})).toThrow('Missing Instagram credentials');
    });

    it('should use environment variables when credentials not provided', () => {
      process.env['INSTAGRAM_ACCESS_TOKEN'] = 'instagram-env-access-token-for-tests';
      process.env['INSTAGRAM_BUSINESS_ACCOUNT_ID'] = 'instagram-env-account-id-for-tests';

      const envService = new InstagramService();
      expect(envService).toBeInstanceOf(InstagramService);

      delete process.env['INSTAGRAM_ACCESS_TOKEN'];
      delete process.env['INSTAGRAM_BUSINESS_ACCOUNT_ID'];
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate and return true', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: '123456',
          username: 'testuser',
        },
      });

      const result = await service.authenticate();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should throw AuthenticationError on authentication failure', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Invalid access token',
            },
          },
        },
      });

      await expect(service.authenticate()).rejects.toThrow(AuthenticationError);
    });
  });

  describe('post', () => {
    const validContent: Content = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Test Instagram post #instagram #test',
      platform: 'instagram',
      status: 'published',
      hashtags: ['instagram', 'test'],
      mentions: [],
      mediaUrls: ['https://example.com/image.jpg'],
      createdAt: new Date(),
      aiGenerated: false,
      updatedAt: new Date(),
    };

    it('should post content with media successfully', async () => {
      // Mock container creation
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          id: 'container_123',
        },
      });

      // Mock publish
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          id: 'media_456',
        },
      });

      const postId = await service.post(validContent);

      expect(postId).toBe('media_456');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should reject content without media', async () => {
      const contentWithoutMedia: Content = {
        ...validContent,
        mediaUrls: [],
      };

      await expect(service.post(contentWithoutMedia)).rejects.toThrow();
    });

    it('should handle caption length limits', async () => {
      const longCaption: Content = {
        ...validContent,
        content: 'a'.repeat(2201), // Instagram limit is 2200
      };

      await expect(service.post(longCaption)).rejects.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should retrieve account metrics successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          followers_count: 5000,
          follows_count: 500,
          media_count: 100,
        },
      });

      const metrics = await service.getMetrics();

      expect(metrics.platform).toBe('instagram');
      expect(metrics).toHaveProperty('followersCount');
      expect(metrics).toHaveProperty('engagementRate');
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API error'));

      await expect(service.getMetrics()).rejects.toThrow();
    });
  });

  describe('deletePost', () => {
    it('should successfully delete a media item', async () => {
      mockedAxios.delete.mockResolvedValue({
        data: { success: true },
      });

      const result = await service.deletePost('media_123');

      expect(result).toBe(true);
      expect(mockedAxios.delete).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      mockedAxios.delete.mockRejectedValue(new Error('Media not found'));

      await expect(service.deletePost('invalid-id')).rejects.toThrow();
    });
  });

  describe('schedulePost', () => {
    it('should throw error as scheduling is not implemented', async () => {
      const content: Content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Scheduled Instagram post',
        platform: 'instagram',
        status: 'scheduled',
        scheduledTime: new Date(Date.now() + 3600000),
        hashtags: [],
        mentions: [],
        mediaUrls: ['https://example.com/image.jpg'],
        createdAt: new Date(),
        aiGenerated: false,
        updatedAt: new Date(),
      };

      await expect(service.schedulePost(content)).rejects.toThrow(
        'Instagram API does not support native post scheduling'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network timeout'));

      const content: Content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test post',
        platform: 'instagram',
        status: 'published',
        hashtags: [],
        mentions: [],
        mediaUrls: ['https://example.com/image.jpg'],
        createdAt: new Date(),
        aiGenerated: false,
        updatedAt: new Date(),
      };

      await expect(service.post(content)).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 429,
          data: {
            error: {
              message: 'Rate limit exceeded',
            },
          },
        },
      });

      const content: Content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test post',
        platform: 'instagram',
        status: 'published',
        hashtags: [],
        mentions: [],
        mediaUrls: ['https://example.com/image.jpg'],
        createdAt: new Date(),
        aiGenerated: false,
        updatedAt: new Date(),
      };

      await expect(service.post(content)).rejects.toThrow();
    });
  });
});
