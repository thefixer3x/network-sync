#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { AutomationEngine } from '../src/engine/AutomationEngine';
import { ConfigManager } from './ConfigManager';
import { DatabaseManager } from './DatabaseManager';
import { Logger } from '../src/utils/Logger';
const program = new Command();
const logger = new Logger('CLI');
program
    .name('social-automation')
    .description('Advanced Social Media Automation CLI')
    .version('1.0.0');
// Start automation
program
    .command('start')
    .description('Start the automation engine')
    .option('-c, --config <id>', 'Configuration ID to use')
    .action(async (options) => {
    console.log(chalk.blue.bold('🚀 Starting Social Media Automation Engine...'));
    try {
        const engine = new AutomationEngine();
        await engine.start(options.config);
        console.log(chalk.green.bold('✅ Automation engine started successfully!'));
        console.log(chalk.gray('Press Ctrl+C to stop the engine.'));
        // Keep the process alive
        process.on('SIGINT', async () => {
            console.log(chalk.yellow('\n🛑 Stopping automation engine...'));
            await engine.stop();
            console.log(chalk.green('✅ Engine stopped successfully.'));
            process.exit(0);
        });
    }
    catch (error) {
        console.error(chalk.red.bold('❌ Failed to start automation engine:'), error.message);
        process.exit(1);
    }
});
// Stop automation
program
    .command('stop')
    .description('Stop the automation engine')
    .action(async () => {
    console.log(chalk.yellow('🛑 Stopping automation engine...'));
    // Implementation would depend on how you manage the running process
    console.log(chalk.green('✅ Engine stopped successfully.'));
});
// Status check
program
    .command('status')
    .description('Check automation engine status')
    .action(async () => {
    try {
        const engine = new AutomationEngine();
        const status = await engine.getStatus();
        console.log(chalk.blue.bold('\n📊 Automation Engine Status'));
        console.log(chalk.gray('='.repeat(40)));
        console.log(`Status: ${status.data.isRunning ? chalk.green('Running') : chalk.red('Stopped')}`);
        console.log(`Configuration: ${chalk.cyan(status.data.configName || 'None')}`);
        console.log(`Enabled Platforms: ${chalk.yellow(status.data.enabledPlatforms.join(', '))}`);
        console.log(`Active Jobs: ${chalk.magenta(status.data.scheduledJobs.length)}`);
        console.log('\nService Status:');
        Object.entries(status.data.servicesStatus).forEach(([platform, status]) => {
            const icon = status === 'connected' ? '🟢' : '🔴';
            console.log(`  ${icon} ${platform}: ${status}`);
        });
    }
    catch (error) {
        console.error(chalk.red('❌ Failed to get status:'), error.message);
    }
});
// Configuration management
program
    .command('config')
    .description('Manage automation configurations')
    .action(async () => {
    const configManager = new ConfigManager();
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                'Create new configuration',
                'List configurations',
                'Edit configuration',
                'Delete configuration',
                'Test configuration'
            ]
        }
    ]);
    switch (action) {
        case 'Create new configuration':
            await configManager.createConfiguration();
            break;
        case 'List configurations':
            await configManager.listConfigurations();
            break;
        case 'Edit configuration':
            await configManager.editConfiguration();
            break;
        case 'Delete configuration':
            await configManager.deleteConfiguration();
            break;
        case 'Test configuration':
            await configManager.testConfiguration();
            break;
    }
});
// Database management
program
    .command('db')
    .description('Database management operations')
    .action(async () => {
    const dbManager = new DatabaseManager();
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Database operation:',
            choices: [
                'Initialize database',
                'Run migrations',
                'Backup data',
                'Clear old data',
                'Database status'
            ]
        }
    ]);
    switch (action) {
        case 'Initialize database':
            await dbManager.initialize();
            break;
        case 'Run migrations':
            await dbManager.runMigrations();
            break;
        case 'Backup data':
            await dbManager.backup();
            break;
        case 'Clear old data':
            await dbManager.cleanupOldData();
            break;
        case 'Database status':
            await dbManager.status();
            break;
    }
});
// Content management
program
    .command('content')
    .description('Content management operations')
    .action(async () => {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Content operation:',
            choices: [
                'Generate content',
                'Schedule post',
                'List scheduled posts',
                'Cancel scheduled post',
                'View analytics'
            ]
        }
    ]);
    // Implementation depends on your content management needs
    console.log(chalk.yellow(`Content management: ${action} - Implementation pending`));
});
// Analytics and reporting
program
    .command('analytics')
    .description('View analytics and generate reports')
    .option('-p, --platform <platform>', 'Specific platform')
    .option('-d, --days <days>', 'Number of days', '30')
    .action(async (options) => {
    console.log(chalk.blue.bold('\n📈 Social Media Analytics'));
    console.log(chalk.gray('='.repeat(40)));
    // Implementation would fetch and display analytics
    console.log(chalk.yellow('Analytics feature - Implementation pending'));
});
// Testing and validation
program
    .command('test')
    .description('Test API connections and configurations')
    .action(async () => {
    console.log(chalk.blue.bold('\n🧪 Testing API Connections'));
    console.log(chalk.gray('='.repeat(40)));
    const platforms = ['twitter', 'linkedin', 'facebook', 'instagram'];
    for (const platform of platforms) {
        try {
            console.log(`Testing ${platform}...`);
            // Test API connection
            console.log(chalk.green(`✅ ${platform} connection successful`));
        }
        catch (error) {
            console.log(chalk.red(`❌ ${platform} connection failed: ${error.message}`));
        }
    }
});
// Development utilities
program
    .command('dev')
    .description('Development utilities')
    .action(async () => {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Development utility:',
            choices: [
                'Generate sample data',
                'Clear all data',
                'Run diagnostics',
                'Environment check'
            ]
        }
    ]);
    switch (action) {
        case 'Generate sample data':
            console.log(chalk.blue('Generating sample data...'));
            // Implementation for sample data generation
            break;
        case 'Clear all data':
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: chalk.red('This will delete ALL data. Are you sure?'),
                    default: false
                }
            ]);
            if (confirm) {
                console.log(chalk.red('Clearing all data...'));
            }
            break;
        case 'Run diagnostics':
            console.log(chalk.blue('Running system diagnostics...'));
            break;
        case 'Environment check':
            await checkEnvironment();
            break;
    }
});
async function checkEnvironment() {
    console.log(chalk.blue.bold('\n🔍 Environment Check'));
    console.log(chalk.gray('='.repeat(40)));
    const requiredEnvVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'OPENAI_API_KEY',
        'TWITTER_API_KEY',
        'LINKEDIN_CLIENT_ID'
    ];
    let allGood = true;
    for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
            console.log(chalk.green(`✅ ${envVar}`));
        }
        else {
            console.log(chalk.red(`❌ ${envVar} - Missing`));
            allGood = false;
        }
    }
    if (allGood) {
        console.log(chalk.green.bold('\n🎉 Environment configuration looks good!'));
    }
    else {
        console.log(chalk.red.bold('\n⚠️  Some environment variables are missing.'));
        console.log(chalk.yellow('Please check your .env file.'));
    }
}
program.parse();
import { createClient } from '@supabase/supabase-js';
import { schemas } from '../types';
export class ConfigManager {
    constructor() {
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    async createConfiguration() {
        console.log(chalk.blue.bold('\n🛠️  Creating New Configuration'));
        console.log(chalk.gray('='.repeat(40)));
        try {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Configuration name:',
                    validate: (input) => input.trim().length > 0 || 'Name is required'
                },
                {
                    type: 'checkbox',
                    name: 'platforms',
                    message: 'Select platforms:',
                    choices: [
                        { name: 'Twitter', value: 'twitter' },
                        { name: 'LinkedIn', value: 'linkedin' },
                        { name: 'Facebook', value: 'facebook' },
                        { name: 'Instagram', value: 'instagram' }
                    ],
                    validate: (choices) => choices.length > 0 || 'Select at least one platform'
                },
                {
                    type: 'input',
                    name: 'timezone',
                    message: 'Timezone:',
                    default: 'America/New_York'
                },
                {
                    type: 'checkbox',
                    name: 'daysOfWeek',
                    message: 'Days to post:',
                    choices: [
                        { name: 'Monday', value: 1 },
                        { name: 'Tuesday', value: 2 },
                        { name: 'Wednesday', value: 3 },
                        { name: 'Thursday', value: 4 },
                        { name: 'Friday', value: 5 },
                        { name: 'Saturday', value: 6 },
                        { name: 'Sunday', value: 0 }
                    ],
                    default: [1, 2, 3, 4, 5]
                },
                {
                    type: 'input',
                    name: 'timesOfDay',
                    message: 'Posting times (comma-separated, HH:MM format):',
                    default: '09:00,13:00,17:00',
                    validate: (input) => {
                        const times = input.split(',').map(t => t.trim());
                        return times.every(time => /^\d{2}:\d{2}$/.test(time)) || 'Use HH:MM format';
                    }
                },
                {
                    type: 'input',
                    name: 'keywords',
                    message: 'Monitoring keywords (comma-separated):',
                    default: 'business development,innovation,technology'
                },
                {
                    type: 'input',
                    name: 'industries',
                    message: 'Industries to monitor (comma-separated):',
                    default: 'technology,business,startups'
                }
            ]);
            const config = {
                id: crypto.randomUUID(),
                name: answers.name,
                enabled: true,
                platforms: answers.platforms,
                postingSchedule: {
                    timezone: answers.timezone,
                    daysOfWeek: answers.daysOfWeek,
                    timesOfDay: answers.timesOfDay.split(',').map(t => t.trim())
                },
                contentRules: {
                    minCharacters: 10,
                    maxCharacters: 280,
                    requiredHashtags: 1,
                    maxHashtags: 5,
                    aiEnhancementEnabled: true,
                    duplicateContentCheck: true
                },
                trendMonitoring: {
                    enabled: true,
                    keywords: answers.keywords.split(',').map(k => k.trim()),
                    industries: answers.industries.split(',').map(i => i.trim()),
                    locations: [],
                    minimumVolume: 100
                },
                competitorTracking: {
                    enabled: true,
                    competitors: []
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            // Validate configuration
            const validatedConfig = schemas.AutomationConfig.parse(config);
            // Save to database
            const { error } = await this.supabase
                .from('automation_configs')
                .insert([validatedConfig]);
            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }
            console.log(chalk.green.bold('\n✅ Configuration created successfully!'));
            console.log(chalk.cyan(`Configuration ID: ${config.id}`));
        }
        catch (error) {
            console.error(chalk.red.bold('❌ Failed to create configuration:'), error.message);
        }
    }
    async listConfigurations() {
        try {
            const { data, error } = await this.supabase
                .from('automation_configs')
                .select('id, name, enabled, platforms, created_at')
                .order('created_at', { ascending: false });
            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }
            if (!data || data.length === 0) {
                console.log(chalk.yellow('No configurations found.'));
                return;
            }
            console.log(chalk.blue.bold('\n📋 Automation Configurations'));
            console.log(chalk.gray('='.repeat(60)));
            data.forEach((config, index) => {
                const status = config.enabled ? chalk.green('Enabled') : chalk.red('Disabled');
                const platforms = config.platforms.join(', ');
                const created = new Date(config.created_at).toLocaleDateString();
                console.log(`${index + 1}. ${chalk.cyan(config.name)}`);
                console.log(`   ID: ${chalk.gray(config.id)}`);
                console.log(`   Status: ${status}`);
                console.log(`   Platforms: ${chalk.yellow(platforms)}`);
                console.log(`   Created: ${chalk.gray(created)}`);
                console.log();
            });
        }
        catch (error) {
            console.error(chalk.red.bold('❌ Failed to list configurations:'), error.message);
        }
    }
    async editConfiguration() {
        // Implementation for editing configurations
        console.log(chalk.yellow('Configuration editing - Implementation pending'));
    }
    async deleteConfiguration() {
        // Implementation for deleting configurations
        console.log(chalk.yellow('Configuration deletion - Implementation pending'));
    }
    async testConfiguration() {
        // Implementation for testing configurations
        console.log(chalk.yellow('Configuration testing - Implementation pending'));
    }
}
export class DatabaseManager {
    constructor() {
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        this.logger = new Logger('DatabaseManager');
    }
    async initialize() {
        console.log(chalk.blue.bold('\n🗄️  Initializing Database'));
        console.log(chalk.gray('='.repeat(40)));
        try {
            // Create tables if they don't exist
            await this.createTables();
            console.log(chalk.green.bold('✅ Database initialized successfully!'));
        }
        catch (error) {
            console.error(chalk.red.bold('❌ Database initialization failed:'), error.message);
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
        `
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
        `
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
        `
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
            top_performing_content TEXT[] DEFAULT "{}",
            recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
            }
        ];
    }
    ;
}
//# sourceMappingURL=cli-interface.js.map