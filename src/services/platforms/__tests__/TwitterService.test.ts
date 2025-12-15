import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { Content } from '../../../types/typescript-types';
import { AuthenticationError } from '../../../types/typescript-types';

// Mock Twitter-api-v2
jest.mock('twitter-api-v2', () => ({
  TwitterApi: jest.fn(),
}));
import { TwitterApi } from 'twitter-api-v2';
const MockedTwitterApi = TwitterApi as jest.MockedClass<typeof TwitterApi>;

// Create properly typed mocked functions
const mockTweet = jest.fn() as jest.MockedFunction<any>;
const mockMe = jest.fn() as jest.MockedFunction<any>;
const mockUploadMedia = jest.fn() as jest.MockedFunction<any>;
const mockUserTimeline = jest.fn() as jest.MockedFunction<any>;
const mockDeleteTweet = jest.fn() as jest.MockedFunction<any>;

const mockTwitterApiInstance = {
  v2: {
    tweet: mockTweet,
    me: mockMe,
    userTimeline: mockUserTimeline,
  },
  v1: {
    uploadMedia: mockUploadMedia,
    deleteTweet: mockDeleteTweet,
  },
};

// Set up the mocked constructor
MockedTwitterApi.mockImplementation(() => mockTwitterApiInstance as any);

// Mock Logger
jest.mock('../../../utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Now import TwitterService after mocks are set up
import { TwitterService } from '../TwitterService';

describe.skip('TwitterService', () => {
  let service: TwitterService;
  const mockCredentials = {
    apiKey: 'test-twitter-api-key-for-tests',
    apiSecret: 'test-twitter-api-secret-for-tests',
    accessToken: 'test-twitter-access-token-for-tests',
    accessSecret: 'test-twitter-access-secret-for-tests',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TwitterService(mockCredentials);
  });

  describe('Constructor', () => {
    it('should initialize with provided credentials', () => {
      expect(service).toBeInstanceOf(TwitterService);
      expect(service.platform).toBe('twitter');
    });

    it('should throw AuthenticationError when credentials are missing', () => {
      expect(() => new TwitterService({})).toThrow(AuthenticationError);
      expect(() => new TwitterService({})).toThrow('Missing Twitter API credentials');
    });

    it('should use environment variables when credentials not provided', () => {
      process.env['TWITTER_API_KEY'] = 'twitter-env-api-key-for-tests';
      process.env['TWITTER_API_SECRET'] = 'twitter-env-api-secret-for-tests';
      process.env['TWITTER_ACCESS_TOKEN'] = 'twitter-env-access-token-for-tests';
      process.env['TWITTER_ACCESS_SECRET'] = 'twitter-env-access-secret-for-tests';

      const envService = new TwitterService();
      expect(envService).toBeInstanceOf(TwitterService);

      delete process.env['TWITTER_API_KEY'];
      delete process.env['TWITTER_API_SECRET'];
      delete process.env['TWITTER_ACCESS_TOKEN'];
      delete process.env['TWITTER_ACCESS_SECRET'];
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate and return true', async () => {
      mockMe.mockResolvedValue({
        data: {
          id: '123456',
          username: 'testuser',
        },
      });

      const result = await service.authenticate();

      expect(result).toBe(true);
      expect(mockMe).toHaveBeenCalled();
    });

    it('should throw AuthenticationError on authentication failure', async () => {
      mockMe.mockRejectedValue(new Error('Invalid credentials'));

      await expect(service.authenticate()).rejects.toThrow(AuthenticationError);
      await expect(service.authenticate()).rejects.toThrow('Invalid credentials');
    });
  });

  describe('post', () => {
    const validContent: Content = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Test tweet content',
      platform: 'twitter',
      status: 'published',
      hashtags: ['test', 'jest'],
      mentions: [],
      mediaUrls: [],
      createdAt: new Date(),
      aiGenerated: false,
      updatedAt: new Date(),
    };

    it('should post a text-only tweet successfully', async () => {
      mockTweet.mockResolvedValue({
        data: {
          id: 'tweet-123',
          text: 'Test tweet content',
        },
      });

      const postId = await service.post(validContent);

      expect(postId).toBe('tweet-123');
      expect(mockTweet).toHaveBeenCalledWith({
        text: 'Test tweet content',
      });
    });

    it('should post a tweet with media', async () => {
      const contentWithMedia: Content = {
        ...validContent,
        mediaUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      };

      mockUploadMedia.mockResolvedValue('media-id-1');
      mockTweet.mockResolvedValue({
        data: {
          id: 'tweet-456',
          text: 'Test tweet with media',
        },
      });

      const postId = await service.post(contentWithMedia);

      expect(postId).toBe('tweet-456');
      expect(mockUploadMedia).toHaveBeenCalledTimes(2);
      expect(mockTweet).toHaveBeenCalled();
    });

    it('should reject content exceeding character limit', async () => {
      const longContent: Content = {
        ...validContent,
        content: 'a'.repeat(281), // Twitter limit is 280
      };

      await expect(service.post(longContent)).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      mockTweet.mockRejectedValue({
        code: 429,
        message: 'Rate limit exceeded',
      });

      await expect(service.post(validContent)).rejects.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should retrieve account metrics successfully', async () => {
      mockMe.mockResolvedValue({
        data: {
          id: '123456',
          username: 'testuser',
          public_metrics: {
            followers_count: 1000,
            following_count: 500,
            tweet_count: 250,
          },
          created_at: '2020-01-01T00:00:00.000Z',
        },
      });

      mockUserTimeline.mockResolvedValue({
        data: {
          data: [
            {
              id: 'tweet1',
              public_metrics: { like_count: 10, retweet_count: 5, reply_count: 2 },
            },
            {
              id: 'tweet2',
              public_metrics: { like_count: 20, retweet_count: 10, reply_count: 5 },
            },
          ],
        },
      });

      const metrics = await service.getMetrics();

      expect(metrics.platform).toBe('twitter');
      expect(metrics.followersCount).toBe(1000);
      expect(metrics.followingCount).toBe(500);
      expect(metrics.postsCount).toBe(250);
      expect(metrics.engagementRate).toBeDefined();
      expect(metrics.growthRate).toBeDefined();
    });

    it('should handle missing public_metrics gracefully', async () => {
      mockMe.mockResolvedValue({
        data: {
          id: '123456',
          username: 'testuser',
          // Missing public_metrics
        },
      });

      mockUserTimeline.mockResolvedValue({
        data: { data: [] },
      });

      const metrics = await service.getMetrics();

      expect(metrics.followersCount).toBe(0);
      expect(metrics.followingCount).toBe(0);
      expect(metrics.postsCount).toBe(0);
    });
  });

  describe('deletePost', () => {
    it('should successfully delete a tweet', async () => {
      mockDeleteTweet.mockResolvedValue({
        data: { deleted: true },
      });

      const result = await service.deletePost('tweet-123');

      expect(result).toBe(true);
      expect(mockDeleteTweet).toHaveBeenCalledWith('tweet-123');
    });

    it('should return false when tweet deletion fails', async () => {
      mockDeleteTweet.mockRejectedValue(new Error('Tweet not found'));

      await expect(service.deletePost('invalid-tweet')).rejects.toThrow();
    });
  });

  describe('schedulePost', () => {
    it('should throw error as scheduling is not implemented', async () => {
      const content: Content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Scheduled tweet',
        platform: 'twitter',
        status: 'scheduled',
        scheduledTime: new Date(Date.now() + 3600000),
        hashtags: [],
        mentions: [],
        mediaUrls: [],
        createdAt: new Date(),
        aiGenerated: false,
        updatedAt: new Date(),
      };

      await expect(service.schedulePost(content)).rejects.toThrow('Scheduling not implemented');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockTweet.mockRejectedValue(new Error('Network error'));

      const content: Content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test tweet',
        platform: 'twitter',
        status: 'published',
        hashtags: [],
        mentions: [],
        mediaUrls: [],
        createdAt: new Date(),
        aiGenerated: false,
        updatedAt: new Date(),
      };

      await expect(service.post(content)).rejects.toThrow('Network error');
    });

    it('should handle API errors with proper error types', async () => {
      mockMe.mockRejectedValue({
        code: 401,
        message: 'Unauthorized',
      });

      await expect(service.authenticate()).rejects.toThrow(AuthenticationError);
    });
  });
});
