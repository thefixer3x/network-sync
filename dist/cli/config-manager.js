import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { createClient } from '@supabase/supabase-js';
import { schemas } from '@/types';
import { Logger } from '@/utils/Logger';
function formatError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return typeof error === 'string' ? error : JSON.stringify(error);
}
export class ConfigManager {
    constructor() {
        this.logger = new Logger('ConfigManager');
        const supabaseUrl = process.env['SUPABASE_URL'];
        const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to manage configurations.');
        }
        this.supabase = createClient(supabaseUrl, serviceRoleKey);
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
                        const times = input.split(',').map((t) => t.trim());
                        return times.every((time) => /^\d{2}:\d{2}$/.test(time)) || 'Use HH:MM format';
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
            const draftConfig = schemas.AutomationConfig.parse({
                id: randomUUID(),
                name: answers.name,
                enabled: true,
                platforms: answers.platforms,
                postingSchedule: {
                    timezone: answers.timezone,
                    daysOfWeek: answers.daysOfWeek,
                    timesOfDay: answers.timesOfDay.split(',').map((time) => time.trim())
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
                    keywords: answers.keywords.split(',').map((keyword) => keyword.trim()),
                    industries: answers.industries.split(',').map((industry) => industry.trim()),
                    locations: [],
                    minimumVolume: 100
                },
                competitorTracking: {
                    enabled: true,
                    competitors: []
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const { error } = await this.supabase
                .from('automation_configs')
                .insert([draftConfig]);
            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }
            console.log(chalk.green.bold('\n✅ Configuration created successfully!'));
            console.log(chalk.cyan(`Configuration ID: ${draftConfig.id}`));
        }
        catch (error) {
            console.error(chalk.red.bold('❌ Failed to create configuration:'), formatError(error));
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
                const platforms = Array.isArray(config.platforms) ? config.platforms.join(', ') : 'N/A';
                const createdAt = config.created_at ? new Date(config.created_at).toLocaleString() : 'Unknown';
                console.log(`${index + 1}. ${chalk.cyan(config.name ?? 'Untitled config')}`);
                console.log(`   ID: ${chalk.gray(config.id)}`);
                console.log(`   Status: ${status}`);
                console.log(`   Platforms: ${chalk.yellow(platforms)}`);
                console.log(`   Created: ${chalk.gray(createdAt)}`);
                console.log();
            });
        }
        catch (error) {
            console.error(chalk.red.bold('❌ Failed to list configurations:'), formatError(error));
        }
    }
    async editConfiguration() {
        console.log(chalk.yellow('Configuration editing - Implementation pending'));
    }
    async deleteConfiguration() {
        console.log(chalk.yellow('Configuration deletion - Implementation pending'));
    }
    async testConfiguration() {
        console.log(chalk.yellow('Configuration testing - Implementation pending'));
    }
}
//# sourceMappingURL=config-manager.js.map