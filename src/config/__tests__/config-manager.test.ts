import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import {
  ConfigManager,
  initializeConfig,
  getConfig,
  getAppConfig,
  getAIConfig,
  getDatabaseConfig,
  getPlatformConfig,
  hasPlatform,
  getAvailablePlatforms,
  isConfigReady,
} from '../config-manager';

describe('ConfigManager', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set up minimal required environment
    process.env['CLAUDE_API_KEY'] = 'test-claude-key';
    process.env['OPENAI_API_KEY'] = 'test-openai-key';
    process.env['PERPLEXITY_API_KEY'] = 'test-perplexity-key';
    process.env['SUPABASE_URL'] = 'https://test.supabase.co';
    process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';

    // Get fresh instance and reset
    configManager = ConfigManager.getInstance();
    configManager.reset();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    configManager.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize configuration with required variables', () => {
      const config = configManager.initialize();

      expect(config).toBeDefined();
      expect(config.ai.claude.apiKey).toBe('test-claude-key');
      expect(config.ai.openai.apiKey).toBe('test-openai-key');
      expect(config.ai.perplexity.apiKey).toBe('test-perplexity-key');
      expect(config.database.supabase.url).toBe('https://test.supabase.co');
    });

    it('should use default values for optional configuration', () => {
      const config = configManager.initialize();

      expect(config.app.nodeEnv).toBe('test'); // Jest sets NODE_ENV to 'test'
      expect(config.app.logLevel).toBe('info');
      expect(config.app.port).toBe(3000);
      expect(config.ai.openai.model).toBe('gpt-4-turbo-preview');
    });

    it('should return same config on multiple calls', () => {
      const config1 = configManager.initialize();
      const config2 = configManager.initialize();

      expect(config1).toBe(config2);
    });

    it('should throw error if required variables are missing', () => {
      configManager.reset();
      process.env = {};

      expect(() => configManager.initialize()).toThrow('Missing required environment variables');
    });
  });

  describe('getConfig', () => {
    it('should return configuration after initialization', () => {
      configManager.initialize();
      const config = configManager.getConfig();

      expect(config).toBeDefined();
      expect(config.ai).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.platforms).toBeDefined();
    });

    it('should throw error if not initialized', () => {
      expect(() => configManager.getConfig()).toThrow('Configuration not initialized');
    });
  });

  describe('Configuration Sections', () => {
    beforeEach(() => {
      configManager.initialize();
    });

    it('should get app configuration', () => {
      const appConfig = configManager.app;

      expect(appConfig.nodeEnv).toBe('test'); // Jest sets NODE_ENV to 'test'
      expect(appConfig.logLevel).toBe('info');
      expect(appConfig.port).toBe(3000);
    });

    it('should get AI configuration', () => {
      const aiConfig = configManager.ai;

      expect(aiConfig.claude.apiKey).toBe('test-claude-key');
      expect(aiConfig.claude.model).toBe('claude-3-5-sonnet-20241022');
      expect(aiConfig.openai.apiKey).toBe('test-openai-key');
      expect(aiConfig.perplexity.apiKey).toBe('test-perplexity-key');
    });

    it('should get database configuration', () => {
      const dbConfig = configManager.database;

      expect(dbConfig.supabase.url).toBe('https://test.supabase.co');
      expect(dbConfig.supabase.anonKey).toBe('test-anon-key');
    });

    it('should get platform configuration', () => {
      const platformConfig = configManager.platforms;

      expect(platformConfig).toBeDefined();
      expect(typeof platformConfig).toBe('object');
    });
  });

  describe('Platform Configuration', () => {
    it('should include Twitter when fully configured', () => {
      process.env['TWITTER_API_KEY'] = 'twitter-key';
      process.env['TWITTER_API_SECRET'] = 'twitter-secret';
      process.env['TWITTER_ACCESS_TOKEN'] = 'twitter-token';
      process.env['TWITTER_ACCESS_SECRET'] = 'twitter-access-secret';

      configManager.reset();
      const config = configManager.initialize();

      expect(config.platforms.twitter).toBeDefined();
      expect(config.platforms.twitter?.apiKey).toBe('twitter-key');
      expect(config.platforms.twitter?.accessSecret).toBe('twitter-access-secret');
    });

    it('should include LinkedIn when configured', () => {
      process.env['LINKEDIN_ACCESS_TOKEN'] = 'linkedin-token';
      process.env['LINKEDIN_PERSON_ID'] = 'person-123';

      configManager.reset();
      const config = configManager.initialize();

      expect(config.platforms.linkedin).toBeDefined();
      expect(config.platforms.linkedin?.accessToken).toBe('linkedin-token');
      expect(config.platforms.linkedin?.personId).toBe('person-123');
    });

    it('should include Facebook when configured', () => {
      process.env['FACEBOOK_ACCESS_TOKEN'] = 'fb-token';
      process.env['FACEBOOK_PAGE_ID'] = 'page-123';

      configManager.reset();
      const config = configManager.initialize();

      expect(config.platforms.facebook).toBeDefined();
      expect(config.platforms.facebook?.accessToken).toBe('fb-token');
    });

    it('should include Instagram when configured', () => {
      process.env['INSTAGRAM_ACCESS_TOKEN'] = 'ig-token';
      process.env['INSTAGRAM_ACCOUNT_ID'] = 'account-123';

      configManager.reset();
      const config = configManager.initialize();

      expect(config.platforms.instagram).toBeDefined();
      expect(config.platforms.instagram?.accessToken).toBe('ig-token');
    });

    it('should not include platforms with incomplete credentials', () => {
      process.env['TWITTER_API_KEY'] = 'twitter-key';
      // Missing other Twitter credentials

      configManager.reset();
      const config = configManager.initialize();

      expect(config.platforms.twitter).toBeUndefined();
    });
  });

  describe('Convenience Functions', () => {
    beforeEach(() => {
      initializeConfig();
    });

    it('should get complete config via convenience function', () => {
      const config = getConfig();
      expect(config).toBeDefined();
      expect(config.ai).toBeDefined();
    });

    it('should get app config via convenience function', () => {
      const appConfig = getAppConfig();
      expect(appConfig.nodeEnv).toBe('test'); // Jest sets NODE_ENV to 'test'
    });

    it('should get AI config via convenience function', () => {
      const aiConfig = getAIConfig();
      expect(aiConfig.claude).toBeDefined();
    });

    it('should get database config via convenience function', () => {
      const dbConfig = getDatabaseConfig();
      expect(dbConfig.supabase).toBeDefined();
    });

    it('should get platform config via convenience function', () => {
      const platformConfig = getPlatformConfig();
      expect(platformConfig).toBeDefined();
    });
  });

  describe('Platform Helpers', () => {
    it('should check if platform is configured', () => {
      process.env['TWITTER_API_KEY'] = 'key';
      process.env['TWITTER_API_SECRET'] = 'secret';
      process.env['TWITTER_ACCESS_TOKEN'] = 'token';
      process.env['TWITTER_ACCESS_SECRET'] = 'access-secret';

      configManager.reset();
      initializeConfig();

      expect(hasPlatform('twitter')).toBe(true);
      expect(hasPlatform('linkedin')).toBe(false);
      expect(hasPlatform('facebook')).toBe(false);
      expect(hasPlatform('instagram')).toBe(false);
    });

    it('should get list of available platforms', () => {
      process.env['TWITTER_API_KEY'] = 'key';
      process.env['TWITTER_API_SECRET'] = 'secret';
      process.env['TWITTER_ACCESS_TOKEN'] = 'token';
      process.env['TWITTER_ACCESS_SECRET'] = 'secret';
      process.env['LINKEDIN_ACCESS_TOKEN'] = 'token';
      process.env['LINKEDIN_PERSON_ID'] = '123';

      configManager.reset();
      initializeConfig();

      const platforms = getAvailablePlatforms();

      expect(platforms).toContain('twitter');
      expect(platforms).toContain('linkedin');
      expect(platforms).not.toContain('facebook');
      expect(platforms).not.toContain('instagram');
    });

    it('should check if config is ready', () => {
      expect(isConfigReady()).toBe(false);

      initializeConfig();

      expect(isConfigReady()).toBe(true);
    });
  });

  describe('Custom Environment Values', () => {
    it('should use custom NODE_ENV', () => {
      process.env['NODE_ENV'] = 'production';

      configManager.reset();
      const config = initializeConfig();

      expect(config.app.nodeEnv).toBe('production');
    });

    it('should use custom LOG_LEVEL', () => {
      process.env['LOG_LEVEL'] = 'debug';

      configManager.reset();
      const config = initializeConfig();

      expect(config.app.logLevel).toBe('debug');
    });

    it('should use custom PORT', () => {
      process.env['PORT'] = '4000';

      configManager.reset();
      const config = initializeConfig();

      expect(config.app.port).toBe(4000);
    });

    it('should use custom OpenAI configuration', () => {
      process.env['OPENAI_MODEL'] = 'gpt-4';
      process.env['OPENAI_TEMPERATURE'] = '0.5';
      process.env['OPENAI_MAX_TOKENS'] = '2000';

      configManager.reset();
      const config = initializeConfig();

      expect(config.ai.openai.model).toBe('gpt-4');
      expect(config.ai.openai.temperature).toBe(0.5);
      expect(config.ai.openai.maxTokens).toBe(2000);
    });
  });

  describe('reset', () => {
    it('should reset configuration', () => {
      configManager.initialize();
      expect(configManager.isInitialized()).toBe(true);

      configManager.reset();
      expect(configManager.isInitialized()).toBe(false);
    });

    it('should allow re-initialization after reset', () => {
      const config1 = configManager.initialize();
      configManager.reset();

      process.env['OPENAI_MODEL'] = 'gpt-4';
      const config2 = configManager.initialize();

      expect(config2).not.toBe(config1);
      expect(config2.ai.openai.model).toBe('gpt-4');
    });
  });
});
