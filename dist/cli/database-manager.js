import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import { Logger } from '@/utils/Logger';
function formatError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return typeof error === 'string' ? error : JSON.stringify(error);
}
export class DatabaseManager {
    constructor() {
        this.logger = new Logger('DatabaseManager');
        const supabaseUrl = process.env['SUPABASE_URL'];
        const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to manage the database.');
        }
        this.supabase = createClient(supabaseUrl, serviceRoleKey);
    }
    async initialize() {
        console.log(chalk.blue.bold('\n🗄️  Initializing Database'));
        console.log(chalk.gray('='.repeat(40)));
        try {
            await this.createTables();
            console.log(chalk.green.bold('✅ Database initialization complete (see logs for SQL).'));
        }
        catch (error) {
            console.error(chalk.red.bold('❌ Database initialization failed:'), formatError(error));
        }
    }
    async runMigrations() {
        console.log(chalk.yellow('Database migrations are not automated yet. Please run them manually via Supabase.'));
    }
    async backup() {
        console.log(chalk.yellow('Database backup is not implemented. Use Supabase backups or export scripts.'));
    }
    async cleanupOldData() {
        console.log(chalk.yellow('Data cleanup routine is not implemented yet.'));
    }
    async status() {
        try {
            const configCountResult = await this.supabase
                .from('automation_configs')
                .select('id', { count: 'exact', head: true });
            const contentCountResult = await this.supabase
                .from('content')
                .select('id', { count: 'exact', head: true });
            if (configCountResult.error) {
                throw configCountResult.error;
            }
            if (contentCountResult.error) {
                throw contentCountResult.error;
            }
            console.log(chalk.blue.bold('\n📦 Database Status'));
            console.log(chalk.gray('='.repeat(40)));
            console.log(`Configurations: ${chalk.cyan(configCountResult.count ?? 0)}`);
            console.log(`Content items: ${chalk.cyan(contentCountResult.count ?? 0)}`);
        }
        catch (error) {
            console.error(chalk.red.bold('❌ Failed to fetch database status:'), formatError(error));
        }
    }
    async createTables() {
        const tables = [
            {
                name: 'automation_configs',
                sql: `
CREATE TABLE IF NOT EXISTS automation_configs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  platforms TEXT[] NOT NULL,
  posting_schedule JSONB NOT NULL,
  content_rules JSONB NOT NULL,
  trend_monitoring JSONB NOT NULL,
  competitor_tracking JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`.trim()
            },
            {
                name: 'content',
                sql: `
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_time TIMESTAMP WITH TIME ZONE,
  published_time TIMESTAMP WITH TIME ZONE,
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  metrics JSONB,
  ai_generated BOOLEAN DEFAULT false,
  original_topic TEXT,
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`.trim()
            },
            {
                name: 'trends',
                sql: `
CREATE TABLE IF NOT EXISTS trends (
  id UUID PRIMARY KEY,
  topic TEXT NOT NULL,
  platform TEXT NOT NULL,
  volume INTEGER NOT NULL,
  sentiment_score DECIMAL(3,2),
  relevance_score DECIMAL(3,2),
  keywords TEXT[] DEFAULT '{}',
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  source_urls TEXT[] DEFAULT '{}'
);
`.trim()
            },
            {
                name: 'account_metrics',
                sql: `
CREATE TABLE IF NOT EXISTS account_metrics (
  id UUID PRIMARY KEY,
  platform TEXT NOT NULL,
  followers_count INTEGER NOT NULL,
  following_count INTEGER NOT NULL,
  posts_count INTEGER NOT NULL,
  engagement_rate DECIMAL(5,2) NOT NULL,
  growth_rate DECIMAL(5,2) NOT NULL,
  average_likes DECIMAL(10,2) NOT NULL,
  average_comments DECIMAL(10,2) NOT NULL,
  average_shares DECIMAL(10,2) NOT NULL,
  top_performing_content TEXT[] DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`.trim()
            }
        ];
        this.logger.info('Displaying SQL required to set up Supabase tables:');
        for (const table of tables) {
            this.logger.info(`\n--- ${table.name} ---\n${table.sql}\n`);
        }
        this.logger.warn('Run the above SQL statements manually in Supabase (JS SDK cannot execute DDL directly).');
    }
}
//# sourceMappingURL=database-manager.js.map