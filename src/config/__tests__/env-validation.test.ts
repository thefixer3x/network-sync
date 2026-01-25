import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import {
  validateEnv,
  validateEnvOrThrow,
  formatValidationResult,
  isPlatformConfigured,
  getConfiguredPlatforms,
} from '../env-validation';

describe('Environment Validation', () => {
  let originalEnv: NodeJS.ProcessEnv;
  const seedRequiredEnv = () => {
    process.env['CLAUDE_API_KEY'] = 'test-key';
    process.env['OPENAI_API_KEY'] = 'test-key';
    process.env['PERPLEXITY_API_KEY'] = 'test-key';
    process.env['SUPABASE_URL'] = 'https://test.supabase.co';
    process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
    process.env['JWT_SECRET'] = 'x'.repeat(32);
    process.env['JWT_REFRESH_SECRET'] = 'y'.repeat(32);
  };

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear environment for clean test state
    process.env = {};
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('should pass with all required variables', () => {
      seedRequiredEnv();

      const result = validateEnv();

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.CLAUDE_API_KEY).toBe('test-key');
    });

    it('should fail when required variables are missing', () => {
      process.env['CLAUDE_API_KEY'] = 'test-key';
      // Missing other required variables

      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should identify missing required variables', () => {
      const result = validateEnv();

      expect(result.success).toBe(false);
      const requiredErrors = result.errors?.filter((e) => e.severity === 'required');
      expect(requiredErrors?.length).toBe(7); // 7 required variables
    });

    it('should accept valid optional variables', () => {
      // Set required variables
      seedRequiredEnv();

      // Set optional variables
      process.env['TWITTER_API_KEY'] = 'twitter-key';
      process.env['LOG_LEVEL'] = 'debug';

      const result = validateEnv();

      expect(result.success).toBe(true);
      expect(result.config?.TWITTER_API_KEY).toBe('twitter-key');
      expect(result.config?.LOG_LEVEL).toBe('debug');
    });

    it('should use default values for optional configuration', () => {
      // Set required variables
      seedRequiredEnv();

      const result = validateEnv();

      expect(result.success).toBe(true);
      expect(result.config?.NODE_ENV).toBe('development');
      expect(result.config?.LOG_LEVEL).toBe('info');
      expect(result.config?.OPENAI_MODEL).toBe('gpt-4-turbo-preview');
    });

    it('should warn when no social media credentials are configured', () => {
      // Set only required variables
      seedRequiredEnv();

      const result = validateEnv();

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some((w) => w.includes('social media'))).toBe(true);
    });

    it('should validate URL format for SUPABASE_URL', () => {
      seedRequiredEnv();
      process.env['SUPABASE_URL'] = 'not-a-valid-url';

      const result = validateEnv();

      expect(result.success).toBe(false);
      const supabaseError = result.errors?.find((e) => e.field === 'SUPABASE_URL');
      expect(supabaseError).toBeDefined();
      expect(supabaseError?.message).toContain('URL');
    });

    it('should transform and validate numeric values', () => {
      seedRequiredEnv();
      process.env['OPENAI_TEMPERATURE'] = '0.8';
      process.env['PORT'] = '4000';

      const result = validateEnv();

      expect(result.success).toBe(true);
      expect(result.config?.OPENAI_TEMPERATURE).toBe(0.8);
      expect(result.config?.PORT).toBe(4000);
    });
  });

  describe('validateEnvOrThrow', () => {
    it('should throw error when required variables are missing', () => {
      expect(() => validateEnvOrThrow()).toThrow('Missing required environment variables');
    });

    it('should return config when validation passes', () => {
      seedRequiredEnv();

      const config = validateEnvOrThrow();

      expect(config).toBeDefined();
      expect(config.CLAUDE_API_KEY).toBe('test-key');
    });

    it('should include helpful error message with missing variables', () => {
      try {
        validateEnvOrThrow();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('CLAUDE_API_KEY');
          expect(error.message).toContain('OPENAI_API_KEY');
          expect(error.message).toContain('.env.example');
        }
      }
    });
  });

  describe('formatValidationResult', () => {
    it('should format successful validation', () => {
      seedRequiredEnv();

      const result = validateEnv();
      const formatted = formatValidationResult(result);

      expect(formatted).toContain('✅');
      expect(formatted).toContain('validation passed');
    });

    it('should format failed validation with errors', () => {
      const result = validateEnv();
      const formatted = formatValidationResult(result);

      expect(formatted).toContain('❌');
      expect(formatted).toContain('validation failed');
      expect(formatted).toContain('Required variables');
    });
  });

  describe('isPlatformConfigured', () => {
    it('should detect configured Twitter credentials', () => {
      process.env['TWITTER_API_KEY'] = 'key';
      process.env['TWITTER_API_SECRET'] = 'secret';
      process.env['TWITTER_ACCESS_TOKEN'] = 'token';
      process.env['TWITTER_ACCESS_SECRET'] = 'secret';

      expect(isPlatformConfigured('twitter')).toBe(true);
      expect(isPlatformConfigured('Twitter')).toBe(true); // Case insensitive
    });

    it('should detect incomplete Twitter credentials', () => {
      process.env['TWITTER_API_KEY'] = 'key';
      // Missing other credentials

      expect(isPlatformConfigured('twitter')).toBe(false);
    });

    it('should detect configured LinkedIn credentials', () => {
      process.env['LINKEDIN_ACCESS_TOKEN'] = 'token';
      process.env['LINKEDIN_PERSON_ID'] = '12345';

      expect(isPlatformConfigured('linkedin')).toBe(true);
    });

    it('should detect configured Facebook credentials', () => {
      process.env['FACEBOOK_ACCESS_TOKEN'] = 'token';
      process.env['FACEBOOK_PAGE_ID'] = '12345';

      expect(isPlatformConfigured('facebook')).toBe(true);
    });

    it('should detect configured Instagram credentials', () => {
      process.env['INSTAGRAM_ACCESS_TOKEN'] = 'token';
      process.env['INSTAGRAM_ACCOUNT_ID'] = '12345';

      expect(isPlatformConfigured('instagram')).toBe(true);
    });

    it('should return false for unconfigured platform', () => {
      expect(isPlatformConfigured('twitter')).toBe(false);
      expect(isPlatformConfigured('unknown')).toBe(false);
    });
  });

  describe('getConfiguredPlatforms', () => {
    it('should return empty array when no platforms configured', () => {
      const platforms = getConfiguredPlatforms();
      expect(platforms).toEqual([]);
    });

    it('should return list of configured platforms', () => {
      process.env['TWITTER_API_KEY'] = 'key';
      process.env['TWITTER_API_SECRET'] = 'secret';
      process.env['TWITTER_ACCESS_TOKEN'] = 'token';
      process.env['TWITTER_ACCESS_SECRET'] = 'secret';

      process.env['LINKEDIN_ACCESS_TOKEN'] = 'token';
      process.env['LINKEDIN_PERSON_ID'] = '12345';

      const platforms = getConfiguredPlatforms();
      expect(platforms).toContain('twitter');
      expect(platforms).toContain('linkedin');
      expect(platforms).not.toContain('facebook');
      expect(platforms).not.toContain('instagram');
    });
  });
});
