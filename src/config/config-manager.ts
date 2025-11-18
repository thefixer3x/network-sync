/**
 * Configuration Management System
 *
 * Centralizes all application configuration with:
 * - Type-safe configuration objects
 * - Environment variable validation
 * - Sensible defaults
 * - Easy testing and mocking
 */

import { validateEnvOrThrow, type EnvConfig } from './env-validation';

/**
 * AI Agent Configuration
 */
export interface AIAgentConfig {
  perplexity: {
    apiKey: string;
    model: string;
    temperature: number;
  };
  claude: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  openai: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens?: number | undefined;
  };
}

/**
 * Database Configuration
 */
export interface DatabaseConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string | undefined;
  };
}

/**
 * Social Media Platform Configuration
 */
export interface PlatformConfig {
  twitter?: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
  };
  linkedin?: {
    accessToken: string;
    personId: string;
  };
  facebook?: {
    accessToken: string;
    pageId: string;
  };
  instagram?: {
    accessToken: string;
    accountId: string;
    businessAccountId?: string | undefined;
  };
}

/**
 * Application Configuration
 */
export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  port: number;
}

/**
 * Complete Application Configuration
 */
export interface Config {
  app: AppConfig;
  ai: AIAgentConfig;
  database: DatabaseConfig;
  platforms: PlatformConfig;
  env: EnvConfig;
}

/**
 * Configuration Manager - Singleton pattern
 */
class ConfigManager {
  private static instance: ConfigManager;
  private config: Config | null = null;
  private envConfig: EnvConfig | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize configuration (call once at startup)
   */
  public initialize(): Config {
    if (this.config) {
      return this.config;
    }

    // Validate environment first
    this.envConfig = validateEnvOrThrow();

    // Build configuration
    this.config = this.buildConfig(this.envConfig);

    return this.config;
  }

  /**
   * Get configuration (throws if not initialized)
   */
  public getConfig(): Config {
    if (!this.config) {
      throw new Error(
        'Configuration not initialized. Call ConfigManager.getInstance().initialize() first.'
      );
    }
    return this.config;
  }

  /**
   * Get specific configuration section
   */
  public get app(): AppConfig {
    return this.getConfig().app;
  }

  public get ai(): AIAgentConfig {
    return this.getConfig().ai;
  }

  public get database(): DatabaseConfig {
    return this.getConfig().database;
  }

  public get platforms(): PlatformConfig {
    return this.getConfig().platforms;
  }

  /**
   * Check if configuration is initialized
   */
  public isInitialized(): boolean {
    return this.config !== null;
  }

  /**
   * Reset configuration (useful for testing)
   */
  public reset(): void {
    this.config = null;
    this.envConfig = null;
  }

  /**
   * Build configuration from environment variables
   */
  private buildConfig(env: EnvConfig): Config {
    return {
      app: {
        nodeEnv: env.NODE_ENV,
        logLevel: env.LOG_LEVEL,
        port: env.PORT,
      },
      ai: {
        perplexity: {
          apiKey: env.PERPLEXITY_API_KEY,
          model: 'llama-3.1-sonar-large-128k-online',
          temperature: 0.2,
        },
        claude: {
          apiKey: env.CLAUDE_API_KEY,
          model: 'claude-3-5-sonnet-20241022',
          maxTokens: 4096,
        },
        openai: {
          apiKey: env.OPENAI_API_KEY,
          model: env.OPENAI_MODEL,
          temperature: env.OPENAI_TEMPERATURE,
          ...(env.OPENAI_MAX_TOKENS ? { maxTokens: env.OPENAI_MAX_TOKENS } : {}),
        },
      },
      database: {
        supabase: {
          url: env.SUPABASE_URL,
          anonKey: env.SUPABASE_ANON_KEY,
          ...(env.SUPABASE_SERVICE_ROLE_KEY ? { serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY } : {}),
        },
      },
      platforms: this.buildPlatformConfig(env),
      env,
    };
  }

  /**
   * Build platform configuration (only include configured platforms)
   */
  private buildPlatformConfig(env: EnvConfig): PlatformConfig {
    const platforms: PlatformConfig = {};

    // Twitter
    if (
      env.TWITTER_API_KEY &&
      env.TWITTER_API_SECRET &&
      env.TWITTER_ACCESS_TOKEN &&
      (env.TWITTER_ACCESS_SECRET || env.TWITTER_ACCESS_TOKEN_SECRET)
    ) {
      platforms.twitter = {
        apiKey: env.TWITTER_API_KEY,
        apiSecret: env.TWITTER_API_SECRET,
        accessToken: env.TWITTER_ACCESS_TOKEN,
        accessSecret: env.TWITTER_ACCESS_SECRET || env.TWITTER_ACCESS_TOKEN_SECRET!,
      };
    }

    // LinkedIn
    if (env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_PERSON_ID) {
      platforms.linkedin = {
        accessToken: env.LINKEDIN_ACCESS_TOKEN,
        personId: env.LINKEDIN_PERSON_ID,
      };
    }

    // Facebook
    if (env.FACEBOOK_ACCESS_TOKEN && env.FACEBOOK_PAGE_ID) {
      platforms.facebook = {
        accessToken: env.FACEBOOK_ACCESS_TOKEN,
        pageId: env.FACEBOOK_PAGE_ID,
      };
    }

    // Instagram
    if (env.INSTAGRAM_ACCESS_TOKEN && env.INSTAGRAM_ACCOUNT_ID) {
      platforms.instagram = {
        accessToken: env.INSTAGRAM_ACCESS_TOKEN,
        accountId: env.INSTAGRAM_ACCOUNT_ID,
        ...(env.INSTAGRAM_BUSINESS_ACCOUNT_ID ? { businessAccountId: env.INSTAGRAM_BUSINESS_ACCOUNT_ID } : {}),
      };
    }

    return platforms;
  }
}

/**
 * Convenience functions for accessing configuration
 */

// Get the singleton instance
export const configManager = ConfigManager.getInstance();

/**
 * Get complete configuration
 */
export function getConfig(): Config {
  return configManager.getConfig();
}

/**
 * Get app configuration
 */
export function getAppConfig(): AppConfig {
  return configManager.app;
}

/**
 * Get AI configuration
 */
export function getAIConfig(): AIAgentConfig {
  return configManager.ai;
}

/**
 * Get database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  return configManager.database;
}

/**
 * Get platform configuration
 */
export function getPlatformConfig(): PlatformConfig {
  return configManager.platforms;
}

/**
 * Check if specific platform is configured
 */
export function hasPlatform(platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram'): boolean {
  const platforms = configManager.platforms;
  return platform in platforms && platforms[platform] !== undefined;
}

/**
 * Get list of configured platforms
 */
export function getAvailablePlatforms(): Array<'twitter' | 'linkedin' | 'facebook' | 'instagram'> {
  const platforms = configManager.platforms;
  return Object.keys(platforms) as Array<'twitter' | 'linkedin' | 'facebook' | 'instagram'>;
}

/**
 * Initialize configuration (call once at app startup)
 */
export function initializeConfig(): Config {
  return configManager.initialize();
}

/**
 * Check if configuration is ready
 */
export function isConfigReady(): boolean {
  return configManager.isInitialized();
}

// Export ConfigManager for testing
export { ConfigManager };
