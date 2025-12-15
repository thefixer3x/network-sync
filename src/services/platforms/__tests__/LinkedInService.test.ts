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
import { LinkedInService } from '../LinkedInService';

describe('LinkedInService', () => {
  let service: LinkedInService;
  const mockCredentials = {
    accessToken: 'linkedin-access-token-for-tests',
    personId: 'linkedin-person-id-for-tests',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LinkedInService(mockCredentials);
  });

  describe('Constructor', () => {
    it('should initialize with provided credentials', () => {
      expect(service).toBeInstanceOf(LinkedInService);
      expect(service.platform).toBe('linkedin');
    });

    it('should throw AuthenticationError when access token is missing', () => {
      expect(() => new LinkedInService({})).toThrow(AuthenticationError);
      expect(() => new LinkedInService({})).toThrow('Missing LinkedIn access token');
    });

    it('should use environment variables when credentials not provided', () => {
      process.env['LINKEDIN_ACCESS_TOKEN'] = 'linkedin-env-access-token-for-tests';
      process.env['LINKEDIN_PERSON_ID'] = 'linkedin-env-person-id-for-tests';

      const envService = new LinkedInService();
      expect(envService).toBeInstanceOf(LinkedInService);

      delete process.env['LINKEDIN_ACCESS_TOKEN'];
      delete process.env['LINKEDIN_PERSON_ID'];
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate and return true', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: '12345',
          localizedFirstName: 'John',
          localizedLastName: 'Doe',
        },
      });

      const result = await service.authenticate();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-linkedin-token',
          }),
        })
      );
    });

    it('should throw AuthenticationError on authentication failure', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          data: {
            message: 'Invalid access token',
          },
        },
      });

      await expect(service.authenticate()).rejects.toThrow(AuthenticationError);
    });
  });

  describe('post', () => {
    const validContent: Content = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Professional LinkedIn post about industry trends',
      platform: 'linkedin',
      status: 'published',
      hashtags: ['professional', 'networking'],
      mentions: [],
      mediaUrls: [],
      createdAt: new Date(),
      aiGenerated: false,
      updatedAt: new Date(),
    };

    it('should post a text-only update successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          id: 'urn:li:share:123456789',
        },
      });

      const postId = await service.post(validContent);

      expect(postId).toBeDefined();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/ugcPosts',
        expect.objectContaining({
          author: 'urn:li:person:12345',
          lifecycleState: 'PUBLISHED',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-linkedin-token',
          }),
        })
      );
    });

    it('should post an update with media', async () => {
      const contentWithMedia: Content = {
        ...validContent,
        mediaUrls: ['https://example.com/image.jpg'],
      };

      mockedAxios.post.mockResolvedValue({
        data: {
          id: 'urn:li:share:987654321',
        },
      });

      const postId = await service.post(contentWithMedia);

      expect(postId).toBeDefined();
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should reject content exceeding character limit', async () => {
      const longContent: Content = {
        ...validContent,
        content: 'a'.repeat(3001), // LinkedIn limit is 3000
      };

      await expect(service.post(longContent)).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      (mockedAxios.post as any).mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
        },
      });

      await expect(service.post(validContent)).rejects.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should retrieve account metrics successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: '12345',
          localizedFirstName: 'John',
          localizedLastName: 'Doe',
        },
      });

      const metrics = await service.getMetrics();

      expect(metrics.platform).toBe('linkedin');
      expect(metrics).toHaveProperty('followersCount');
      expect(metrics).toHaveProperty('engagementRate');
      expect(metrics).toHaveProperty('growthRate');
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API error'));

      await expect(service.getMetrics()).rejects.toThrow();
    });
  });

  describe('deletePost', () => {
    it('should successfully delete a post', async () => {
      mockedAxios.delete.mockResolvedValue({
        status: 204,
      });

      const result = await service.deletePost('urn:li:share:123456789');

      expect(result).toBe(true);
      expect(mockedAxios.delete).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      mockedAxios.delete.mockRejectedValue(new Error('Post not found'));

      await expect(service.deletePost('invalid-id')).rejects.toThrow();
    });
  });

  describe('schedulePost', () => {
    it('should throw error as scheduling is not implemented', async () => {
      const content: Content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Scheduled LinkedIn post',
        platform: 'linkedin',
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
      mockedAxios.post.mockRejectedValue(new Error('Network timeout'));

      const content: Content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test post',
        platform: 'linkedin',
        status: 'published',
        hashtags: [],
        mentions: [],
        mediaUrls: [],
        createdAt: new Date(),
        aiGenerated: false,
        updatedAt: new Date(),
      };

      await expect(service.post(content)).rejects.toThrow('Network timeout');
    });

    it('should handle invalid response format', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {}, // Missing id field
      });

      const content: Content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test post',
        platform: 'linkedin',
        status: 'published',
        hashtags: [],
        mentions: [],
        mediaUrls: [],
        createdAt: new Date(),
        aiGenerated: false,
        updatedAt: new Date(),
      };

      await expect(service.post(content)).rejects.toThrow();
    });
  });
});
