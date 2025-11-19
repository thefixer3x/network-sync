#!/usr/bin/env node

/**
 * Migration Runner for Supabase Database
 * 
 * This script runs SQL migrations against your Supabase database using the service role key.
 * It checks the current database state and runs migrations in the correct order.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../web-interface/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHEMA = process.env.SUPABASE_SCHEMA || 'network_sync';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration. Please check your .env.local file.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    // Use public for admin queries; target schema is handled explicitly in queries
    schema: 'public'
  }
});

const MIGRATIONS_DIR = join(__dirname, '../migrations');

const migrations = [
  {
    file: '001_create_vector_store.sql',
    name: 'Create Vector Store',
    checkTable: 'vector_documents',
    checkExtension: 'vector'
  },
  {
    file: '002_create_social_accounts.sql', 
    name: 'Create Social Accounts',
    checkTable: 'social_accounts'
  },
  {
    file: '003_create_workflows.sql',
    name: 'Create Workflows', 
    checkTable: 'workflows'
  }
];

async function checkDatabaseConnection() {
  console.log('🔍 Checking database connection...');
  try {
    const { data, error } = await supabase.from('pg_tables').select('tablename').limit(1);
    if (error) throw error;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', SCHEMA)
      .eq('table_name', tableName);
    
    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error.message);
    return false;
  }
}

async function checkExtensionExists(extensionName) {
  try {
    const { data: extData, error: extError } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', extensionName);
    
    if (extError) throw extError;
    return extData && extData.length > 0;
  } catch (error) {
    console.log(`Note: Could not check extension ${extensionName}, will attempt to create`);
    return false;
  }
}

async function runSqlMigration(filePath, migrationName) {
  console.log(`\n📄 Running migration: ${migrationName}`);
  console.log(`📁 File: ${filePath}`);
  
  try {
    const sqlContent = readFileSync(filePath, 'utf8');
    
    console.log('📊 Executing SQL via exec_sql RPC (single call)...');
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });

    if (error) {
      console.error('❌ exec_sql RPC failed or is missing. Please run this file manually via Supabase SQL editor or psql.');
      console.error('Details:', error.message);
      return false;
    }
    
    console.log(`✅ Migration completed: ${migrationName}`);
    return true;
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationName}`);
    console.error('Error:', error.message);
    return false;
  }
}

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  // Check database connection
  if (!(await checkDatabaseConnection())) {
    process.exit(1);
  }
  
  console.log('\n📋 Migration Plan:');
  for (const migration of migrations) {
    console.log(`   • ${migration.name} (${migration.file})`);
  }
  
  console.log('\n🔍 Checking current database state...');
  
  for (const migration of migrations) {
    const filePath = join(MIGRATIONS_DIR, migration.file);
    
    // Check if migration is needed
    let needsMigration = false;
    
    if (migration.checkExtension) {
      const extensionExists = await checkExtensionExists(migration.checkExtension);
      if (!extensionExists) {
        console.log(`   Extension '${migration.checkExtension}' not found`);
        needsMigration = true;
      }
    }
    
    if (migration.checkTable) {
      const tableExists = await checkTableExists(migration.checkTable);
      if (!tableExists) {
        console.log(`   Table '${migration.checkTable}' not found`);
        needsMigration = true;
      } else {
        console.log(`   ✅ Table '${migration.checkTable}' already exists`);
      }
    }
    
    if (needsMigration) {
      const success = await runSqlMigration(filePath, migration.name);
      if (!success) {
        console.error('\n❌ Migration process stopped due to error');
        process.exit(1);
      }
    } else {
      console.log(`   ⏭️  Skipping '${migration.name}' - already applied`);
    }
  }
  
  console.log('\n🎉 All migrations completed successfully!');
  console.log('\n📊 Verifying final database state...');
  
  // Final verification
  for (const migration of migrations) {
    if (migration.checkTable) {
      const exists = await checkTableExists(migration.checkTable);
      console.log(`   ${exists ? '✅' : '❌'} Table '${SCHEMA}.${migration.checkTable}': ${exists ? 'EXISTS' : 'MISSING'}`);
    }
  }
  
  console.log('\n✨ Migration process complete!');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 Supabase Migration Runner

Usage: node run-migrations.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be executed without running migrations
  --force        Force run all migrations even if tables exist

Environment Variables (from web-interface/.env.local):
  NEXT_PUBLIC_SUPABASE_URL      Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY     Your Supabase service role key

Migration Files:
${migrations.map(m => `  • ${m.file} - ${m.name}`).join('\n')}
`);
  process.exit(0);
}

if (args.includes('--dry-run')) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
  console.log('Would execute the following migrations:');
  migrations.forEach(m => {
    console.log(`  • ${m.name} (${m.file})`);
  });
  process.exit(0);
}

// Run migrations
runMigrations().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
