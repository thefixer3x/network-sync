#!/usr/bin/env bun
/**
 * Environment Variable Validation CLI
 *
 * Run this script to validate your environment configuration:
 * bun scripts/validate-env.ts
 */

import { config } from 'dotenv';
import {
  validateEnv,
  formatValidationResult,
  getConfiguredPlatforms,
} from '../src/config/env-validation';

// Load .env file
config();

console.log('🔍 Validating environment variables...\n');

const result = validateEnv();
const formatted = formatValidationResult(result);

console.log(formatted);

if (result.success) {
  console.log('📋 Configuration Summary:');
  console.log(`   Node Environment: ${result.config?.NODE_ENV}`);
  console.log(`   Log Level: ${result.config?.LOG_LEVEL}`);
  console.log(`   OpenAI Model: ${result.config?.OPENAI_MODEL}`);
  console.log(`   Port: ${result.config?.PORT}\n`);

  const platforms = getConfiguredPlatforms();
  if (platforms.length > 0) {
    console.log(`✅ Configured platforms: ${platforms.join(', ')}`);
  } else {
    console.log('⚠️  No social media platforms configured');
  }

  console.log('\n✨ Your environment is ready!\n');
  process.exit(0);
} else {
  const requiredErrors = result.errors?.filter((e) => e.severity === 'required');
  if (requiredErrors && requiredErrors.length > 0) {
    console.log('\n💡 Quick fix:');
    console.log('   1. Copy .env.example to .env');
    console.log('   2. Fill in the required API keys');
    console.log('   3. Run this script again\n');
    process.exit(1);
  }

  console.log('\n⚠️  Some optional variables are missing, but the app may still work.\n');
  process.exit(0);
}
