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
import { FacebookService } from '../FacebookService';

describe('FacebookService', () => {
  let service: FacebookService;
  const mockCredentials = {
    accessToken: 'facebook-access-token-for-tests',
    pageId: 'facebook-page-id-for-tests',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FacebookService(mockCredentials);
  });

  describe('Constructor', () => {
    it('should initialize with provided credentials', () => {
      expect(service).toBeInstanceOf(FacebookService);
      expect(service.platform).toBe('facebook');
    });

    it('should throw AuthenticationError when access token is missing', () => {
      expect(() => new FacebookService({})).toThrow(AuthenticationError);
      expect(() => new FacebookService({})).toThrow('Missing Facebook access token');
    });

    it('should use environment variables when credentials not provided', () => {
      process.env['FACEBOOK_ACCESS_TOKEN'] = 'facebook-env-access-token-for-tests';
      process.env['FACEBOOK_PAGE_ID'] = 'facebook-env-page-id-for-tests';

      const envService = new FacebookService();
      expect(envService).toBeInstanceOf(FacebookService);

      delete process.env['FACEBOOK_ACCESS_TOKEN'];
      delete process.env['FACEBOOK_PAGE_ID'];
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate and return true', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: '123456',
          name: 'Test User',
        },
      });

      const result = await service.authenticate();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/me'),
        expect.objectContaining({
          params: { access_token: mockCredentials.accessToken },
        })
      );
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
      content: 'Test Facebook post',
      platform: 'facebook',
      status: 'published',
      hashtags: [],
      mentions: [],
      mediaUrls: [],
      createdAt: new Date(),
      aiGenerated: false,
      updatedAt: new Date(),
    };

    it('should post a text-only update successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          id: 'post_123456',
        },
      });

      const postId = await service.post(validContent);

      expect(postId).toBe('post_123456');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/posts'),
        expect.objectContaining({
          message: 'Test Facebook post',
          access_token: mockCredentials.accessToken,
        })
      );
    });

    it('should post with a single image', async () => {
      const contentWithMedia: Content = {
        ...validContent,
        mediaUrls: ['https://example.com/image.jpg'],
      };

      mockedAxios.post.mockResolvedValue({
        data: {
          id: 'post_789',
        },
      });

      const postId = await service.post(contentWithMedia);

      expect(postId).toBe('post_789');
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should reject empty content', async () => {
      const emptyContent: Content = {
        ...validContent,
        content: '',
      };

      await expect(service.post(emptyContent)).rejects.toThrow('Facebook content cannot be empty');
    });
  });

  describe('getMetrics', () => {
    it('should retrieve account metrics successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: '123456',
          followers_count: 1000,
          fan_count: 1000,
        },
      });

      const metrics = await service.getMetrics();

      expect(metrics.platform).toBe('facebook');
      expect(metrics).toHaveProperty('followersCount');
      expect(metrics).toHaveProperty('engagementRate');
    });
  });

  describe('deletePost', () => {
    it('should successfully delete a post', async () => {
      mockedAxios.delete.mockResolvedValue({
        data: { success: true },
      });

      const result = await service.deletePost('post_123');

      expect(result).toBe(true);
      expect(mockedAxios.delete).toHaveBeenCalled();
    });
  });

  describe('schedulePost', () => {
    it('should schedule a post when scheduledTime is provided', async () => {
      const content: Content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Scheduled post',
        platform: 'facebook',
        status: 'scheduled',
        scheduledTime: new Date(Date.now() + 3600000),
        hashtags: [],
        mentions: [],
        mediaUrls: [],
        createdAt: new Date(),
        aiGenerated: false,
        updatedAt: new Date(),
      };

      mockedAxios.post.mockResolvedValue({
        data: { id: 'scheduled_post_123' },
      });

      const scheduledId = await service.schedulePost(content);

      expect(scheduledId).toBe('scheduled_post_123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/posts'),
        expect.objectContaining({
          scheduled_publish_time: expect.any(Number),
          access_token: mockCredentials.accessToken,
        })
      );
    });
  });
});
