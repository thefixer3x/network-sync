import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { Content } from '../../../types/typescript-types';
import { AuthenticationError } from '../../../types/typescript-types';

// Mock axios
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();
const mockAxiosDelete = jest.fn();

jest.mock('axios', () => ({
  default: {
    get: mockAxiosGet,
    post: mockAxiosPost,
    delete: mockAxiosDelete,
  },
}));

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
    accessToken: 'test-linkedin-token',
    personId: '12345',
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
      process.env['LINKEDIN_ACCESS_TOKEN'] = 'env-token';
      process.env['LINKEDIN_PERSON_ID'] = 'env-person-id';

      const envService = new LinkedInService();
      expect(envService).toBeInstanceOf(LinkedInService);

      delete process.env['LINKEDIN_ACCESS_TOKEN'];
      delete process.env['LINKEDIN_PERSON_ID'];
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate and return true', async () => {
      (mockAxiosGet as any).mockResolvedValue({
        data: {
          id: '12345',
          localizedFirstName: 'John',
          localizedLastName: 'Doe',
        },
      });

      const result = await service.authenticate();

      expect(result).toBe(true);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-linkedin-token',
          }),
        })
      );
    });

    it('should throw AuthenticationError on authentication failure', async () => {
      (mockAxiosGet as any).mockRejectedValue({
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
      (mockAxiosPost as any).mockResolvedValue({
        data: {
          id: 'urn:li:share:123456789',
        },
      });

      const postId = await service.post(validContent);

      expect(postId).toBeDefined();
      expect(mockAxiosPost).toHaveBeenCalledWith(
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

      (mockAxiosPost as any).mockResolvedValue({
        data: {
          id: 'urn:li:share:987654321',
        },
      });

      const postId = await service.post(contentWithMedia);

      expect(postId).toBeDefined();
      expect(mockAxiosPost).toHaveBeenCalled();
    });

    it('should reject content exceeding character limit', async () => {
      const longContent: Content = {
        ...validContent,
        content: 'a'.repeat(3001), // LinkedIn limit is 3000
      };

      await expect(service.post(longContent)).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      (mockAxiosPost as any).mockRejectedValue({
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
      (mockAxiosGet as any).mockResolvedValue({
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
      (mockAxiosGet as any).mockRejectedValue(new Error('API error'));

      await expect(service.getMetrics()).rejects.toThrow();
    });
  });

  describe('deletePost', () => {
    it('should successfully delete a post', async () => {
      (mockAxiosDelete as any).mockResolvedValue({
        status: 204,
      });

      const result = await service.deletePost('urn:li:share:123456789');

      expect(result).toBe(true);
      expect(mockAxiosDelete).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      (mockAxiosDelete as any).mockRejectedValue(new Error('Post not found'));

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
      (mockAxiosPost as any).mockRejectedValue(new Error('Network timeout'));

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
      (mockAxiosPost as any).mockResolvedValue({
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
