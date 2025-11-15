/**
 * Environment Variable Validation
 *
 * Validates all environment variables at application startup
 * to ensure required configuration is present before running.
 */

import { z } from 'zod';

// Validation severity levels
export type ValidationLevel = 'required' | 'optional' | 'development';

// Environment variable schema
const envSchema = z.object({
  // ===== AI API Keys (Required) =====
  CLAUDE_API_KEY: z.string().min(1, 'Claude API key is required'),
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  PERPLEXITY_API_KEY: z.string().min(1, 'Perplexity API key is required'),

  // ===== Database (Required) =====
  SUPABASE_URL: z.string().url('Supabase URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_SCHEMA: z.string().default('public'),

  // ===== Security - JWT (Required in Production) =====
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for production')
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !val.includes('development'),
      'JWT_SECRET cannot contain "development" in production'
    ),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !val.includes('development'),
      'JWT_REFRESH_SECRET cannot contain "development" in production'
    ),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // ===== Security - Encryption (Required in Production) =====
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be at least 32 characters')
    .optional()
    .or(z.literal('')),

  // ===== Redis (Required for Caching & Queues) =====
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().positive()).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).pipe(z.number().min(0)).default('0'),
  REDIS_QUEUE_DB: z.string().transform(Number).pipe(z.number().min(0)).default('1'),
  REDIS_KEY_PREFIX: z.string().default('network-sync:'),

  // ===== Caching Configuration =====
  CACHE_DEFAULT_TTL: z.string().transform(Number).pipe(z.number().positive()).default('3600'),
  REDIS_MAX_RETRIES: z.string().transform(Number).pipe(z.number().positive()).default('3'),
  REDIS_RETRY_DELAY: z.string().transform(Number).pipe(z.number().positive()).default('1000'),

  // ===== Database Connection Pool =====
  DB_POOL_MIN: z.string().transform(Number).pipe(z.number().positive()).default('2'),
  DB_POOL_MAX: z.string().transform(Number).pipe(z.number().positive()).default('10'),
  DB_CONNECTION_TIMEOUT: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default('30000'),
  DB_IDLE_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('60000'),
  DB_ACQUIRE_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('10000'),

  // ===== Social Media Platforms (Optional) =====
  // Twitter
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  TWITTER_ACCESS_TOKEN: z.string().optional(),
  TWITTER_ACCESS_SECRET: z.string().optional(),
  TWITTER_ACCESS_TOKEN_SECRET: z.string().optional(), // Alias

  // LinkedIn
  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  LINKEDIN_PERSON_ID: z.string().optional(),

  // Facebook
  FACEBOOK_ACCESS_TOKEN: z.string().optional(),
  FACEBOOK_PAGE_ID: z.string().optional(),

  // Instagram
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_ACCOUNT_ID: z.string().optional(),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional(),

  // ===== Google Services (Optional) =====
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),

  // ===== OpenAI Configuration (Optional) =====
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  OPENAI_TEMPERATURE: z.string().transform(Number).pipe(z.number().min(0).max(2)).default('0.7'),
  OPENAI_MAX_TOKENS: z.string().transform(Number).pipe(z.number().positive()).optional(),

  // ===== Application Configuration (Optional) =====
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  PORT: z.string().transform(Number).pipe(z.number().positive()).default('3000'),

  // ===== Other Services (Optional) =====
  LANONASIS_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  success: boolean;
  config?: EnvConfig | undefined;
  errors?:
    | Array<{
        field: string;
        message: string;
        severity: ValidationLevel;
      }>
    | undefined;
  warnings?: string[] | undefined;
}

/**
 * Categorize environment variables by severity
 */
const envCategories = {
  required: [
    'CLAUDE_API_KEY',
    'OPENAI_API_KEY',
    'PERPLEXITY_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ],
  production_required: [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY',
    'REDIS_PASSWORD', // Highly recommended for production
  ],
  development: ['LOG_LEVEL', 'NODE_ENV', 'PORT'],
  optional: [
    'TWITTER_API_KEY',
    'LINKEDIN_ACCESS_TOKEN',
    'FACEBOOK_ACCESS_TOKEN',
    'INSTAGRAM_ACCESS_TOKEN',
    'GOOGLE_CLIENT_ID',
    'SUPABASE_SERVICE_ROLE_KEY',
    'REDIS_PASSWORD', // Optional in development
    'ENCRYPTION_KEY', // Optional in development
  ],
};

/**
 * Validate environment variables with detailed error reporting
 */
export function validateEnv(): ValidationResult {
  try {
    const config = envSchema.parse(process.env);

    // Check for warnings (optional but recommended variables)
    const warnings: string[] = [];

    // Warn if no social media credentials are configured
    const hasSocialCreds =
      process.env['TWITTER_API_KEY'] ||
      process.env['LINKEDIN_ACCESS_TOKEN'] ||
      process.env['FACEBOOK_ACCESS_TOKEN'] ||
      process.env['INSTAGRAM_ACCESS_TOKEN'];

    if (!hasSocialCreds) {
      warnings.push(
        'No social media platform credentials configured. Platform posting will not work.'
      );
    }

    // Warn about Twitter credential aliases
    if (
      process.env['TWITTER_ACCESS_SECRET'] &&
      process.env['TWITTER_ACCESS_TOKEN_SECRET'] &&
      process.env['TWITTER_ACCESS_SECRET'] !== process.env['TWITTER_ACCESS_TOKEN_SECRET']
    ) {
      warnings.push(
        'Both TWITTER_ACCESS_SECRET and TWITTER_ACCESS_TOKEN_SECRET are set with different values. Using TWITTER_ACCESS_SECRET.'
      );
    }

    return {
      success: true,
      config,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => {
        const field = err.path.join('.');
        let severity: ValidationLevel = 'optional';

        if (envCategories.required.includes(field)) {
          severity = 'required';
        } else if (envCategories.development.includes(field)) {
          severity = 'development';
        }

        return {
          field,
          message: err.message,
          severity,
        };
      });

      return {
        success: false,
        errors,
      };
    }

    throw error;
  }
}

/**
 * Validate and throw error if required variables are missing
 * Use this at application startup
 */
export function validateEnvOrThrow(): EnvConfig {
  const result = validateEnv();

  if (!result.success) {
    const requiredErrors = result.errors?.filter((e) => e.severity === 'required');

    if (requiredErrors && requiredErrors.length > 0) {
      const errorMessages = requiredErrors.map((e) => `  - ${e.field}: ${e.message}`).join('\n');

      throw new Error(
        `❌ Missing required environment variables:\n\n${errorMessages}\n\n` +
          `Please copy .env.example to .env and fill in the required values.\n` +
          `See docs/ENVIRONMENT.md for more information.`
      );
    }

    // Non-required errors
    const warningMessages =
      result.errors?.map((e) => `  - ${e.field}: ${e.message}`).join('\n') || '';
    console.warn(
      `⚠️  Environment variable warnings:\n\n${warningMessages}\n\n` +
        `These are not critical, but some features may not work correctly.\n`
    );
  }

  if (result.warnings) {
    console.warn('\n⚠️  Environment warnings:');
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
    console.warn('');
  }

  return result.config!;
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  if (result.success) {
    let output = '✅ Environment validation passed!\n';

    if (result.warnings) {
      output += '\n⚠️  Warnings:\n';
      result.warnings.forEach((warning) => {
        output += `  - ${warning}\n`;
      });
    }

    return output;
  }

  let output = '❌ Environment validation failed!\n\n';

  if (result.errors) {
    const requiredErrors = result.errors.filter((e) => e.severity === 'required');
    const optionalErrors = result.errors.filter((e) => e.severity !== 'required');

    if (requiredErrors.length > 0) {
      output += 'Required variables:\n';
      requiredErrors.forEach((error) => {
        output += `  ❌ ${error.field}: ${error.message}\n`;
      });
    }

    if (optionalErrors.length > 0) {
      output += '\nOptional variables:\n';
      optionalErrors.forEach((error) => {
        output += `  ⚠️  ${error.field}: ${error.message}\n`;
      });
    }
  }

  output += '\nPlease check your .env file and ensure all required variables are set.\n';

  return output;
}

/**
 * Check if specific platform credentials are configured
 */
export function isPlatformConfigured(platform: string): boolean {
  switch (platform.toLowerCase()) {
    case 'twitter':
      return !!(
        process.env['TWITTER_API_KEY'] &&
        process.env['TWITTER_API_SECRET'] &&
        process.env['TWITTER_ACCESS_TOKEN'] &&
        (process.env['TWITTER_ACCESS_SECRET'] || process.env['TWITTER_ACCESS_TOKEN_SECRET'])
      );
    case 'linkedin':
      return !!(process.env['LINKEDIN_ACCESS_TOKEN'] && process.env['LINKEDIN_PERSON_ID']);
    case 'facebook':
      return !!(process.env['FACEBOOK_ACCESS_TOKEN'] && process.env['FACEBOOK_PAGE_ID']);
    case 'instagram':
      return !!(process.env['INSTAGRAM_ACCESS_TOKEN'] && process.env['INSTAGRAM_ACCOUNT_ID']);
    default:
      return false;
  }
}

/**
 * Get list of configured platforms
 */
export function getConfiguredPlatforms(): string[] {
  const platforms = ['twitter', 'linkedin', 'facebook', 'instagram'];
  return platforms.filter((platform) => isPlatformConfigured(platform));
}
