#!/usr/bin/env node

/**
 * Database State Checker
 * 
 * This script checks the current state of your Supabase database
 * and shows which migrations have been applied.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../web-interface/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHEMA = process.env.SUPABASE_SCHEMA || 'network_sync';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    // Keep admin client in public schema to allow catalog queries
    schema: 'public'
  }
});

async function checkDatabaseState() {
  console.log('🔍 Checking Supabase Database State\n');
  console.log(`📍 Database: ${SUPABASE_URL}`);
  console.log(`📦 Target schema: ${SCHEMA}\n`);

  try {
    // Test connection
    console.log('🔗 Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Connection failed:', connectionError.message);
      return;
    }
    console.log('✅ Database connection successful\n');

    // Check extensions
    console.log('🧩 Checking Extensions:');
    try {
      const { data: extensions, error: extError } = await supabase
        .from('pg_extension')
        .select('extname, extversion');
      
      if (extError) throw extError;
      
      const vectorExt = extensions?.find(ext => ext.extname === 'vector');
      console.log(`   pgvector: ${vectorExt ? `✅ v${vectorExt.extversion}` : '❌ Not installed'}`);
    } catch (error) {
      console.log('   pgvector: ❓ Could not check (may need service role)');
    }

    // Check tables
    console.log('\n📋 Checking Tables:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type, table_schema')
      .eq('table_schema', SCHEMA)
      .in('table_name', ['vector_documents', 'social_accounts', 'workflows']);
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError.message);
      return;
    }

    const expectedTables = [
      { name: 'vector_documents', migration: '001_create_vector_store.sql' },
      { name: 'social_accounts', migration: '002_create_social_accounts.sql' },
      { name: 'workflows', migration: '003_create_workflows.sql' }
    ];

    expectedTables.forEach(expected => {
      const exists = tables?.some(t => t.table_name === expected.name);
      console.log(`   ${SCHEMA}.${expected.name}: ${exists ? '✅ EXISTS' : '❌ MISSING'} (${expected.migration})`);
    });

    // Check indexes for vector_documents if it exists
    const vectorTableExists = tables?.some(t => t.table_name === 'vector_documents');
    if (vectorTableExists) {
      console.log('\n🔍 Checking Vector Documents Indexes:');
      try {
        const { data: indexes, error: indexError } = await supabase
          .from('pg_indexes')
          .select('schemaname, tablename, indexname, indexdef')
          .eq('schemaname', SCHEMA)
          .eq('tablename', 'vector_documents');
        
        if (indexError) throw indexError;
        
        const expectedIndexes = [
          'vector_documents_embedding_idx',
          'vector_documents_created_at_idx', 
          'vector_documents_metadata_idx',
          'vector_documents_metadata_user_idx'
        ];
        
        expectedIndexes.forEach(expectedIndex => {
          const exists = indexes?.some(idx => idx.indexname === expectedIndex);
          console.log(`   ${expectedIndex}: ${exists ? '✅' : '❌'}`);
        });
      } catch (error) {
        console.log('   Could not check indexes (may need elevated permissions)');
      }
    }

    // Check RLS predicate indexes for ownership lookups
    console.log('\n🔍 Checking RLS predicate indexes:');
    const rlsIndexTargets = [
      { table: 'social_accounts', index: 'social_accounts_credentials_user_idx' },
      { table: 'workflows', index: 'workflows_config_user_idx' },
    ];
    for (const target of rlsIndexTargets) {
      try {
        const { data: indexes, error: rlsError } = await supabase
          .from('pg_indexes')
          .select('indexname')
          .eq('schemaname', SCHEMA)
          .eq('tablename', target.table);

        if (rlsError) throw rlsError;
        const exists = indexes?.some((idx) => idx.indexname === target.index);
        console.log(`   ${target.table}.${target.index}: ${exists ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`   ${target.table}: ❓ Could not check indexes`);
      }
    }

    // Check functions
    console.log('\n⚙️ Checking Functions:');
    try {
      const { data: functions, error: funcError } = await supabase
        .from('information_schema.routines')
        .select('routine_name, routine_type')
        .in('routine_schema', [SCHEMA, 'public'])
        .in('routine_name', ['search_vectors', 'update_updated_at_column']);
      
      if (funcError) throw funcError;
      
      const expectedFunctions = [
        `${SCHEMA}.search_vectors`,
        `${SCHEMA}.update_updated_at_column`,
        'public.search_vectors'
      ];
      
      expectedFunctions.forEach(expectedFunc => {
        const exists = functions?.some(f => `${f.routine_schema}.${f.routine_name}` === expectedFunc);
        console.log(`   ${expectedFunc}(): ${exists ? '✅' : '❌'}`);
      });
    } catch (error) {
      console.log('   Could not check functions (may need elevated permissions)');
    }

    // Summary
    console.log('\n📊 Migration Status Summary:');
    const allTablesExist = expectedTables.every(expected => 
      tables?.some(t => t.table_name === expected.name)
    );
    
    if (allTablesExist) {
      console.log('✅ All migrations appear to be applied successfully!');
      console.log('\n🎯 Next steps:');
      console.log('   • Test vector search functionality through public.search_vectors');
      console.log('   • Insert test data (ensure JSONB user_id fields are set for RLS)');
      console.log('   • Point clients at the network_sync schema');
    } else {
      console.log('⚠️  Some migrations are missing. Please run:');
      expectedTables.forEach(expected => {
        const exists = tables?.some(t => t.table_name === expected.name);
        if (!exists) {
          console.log(`   • ${expected.migration}`);
        }
      });
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

// Run the check
checkDatabaseState();
