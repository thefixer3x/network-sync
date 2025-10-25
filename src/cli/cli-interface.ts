#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { AutomationEngine } from '../engine/automation-engine';
import { ConfigManager } from './config-manager';
import { DatabaseManager } from './database-manager';
import { Logger } from '@/utils/Logger';

const program = new Command();
const logger = new Logger('CLI');

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

async function checkEnvironment(): Promise<void> {
  console.log(chalk.blue.bold('\n🔍 Environment Check'));
  console.log(chalk.gray('='.repeat(40)));

  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'TWITTER_API_KEY',
    'LINKEDIN_CLIENT_ID'
  ];

  let allGood = true;

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(chalk.green(`✅ ${envVar}`));
    } else {
      console.log(chalk.red(`❌ ${envVar} - Missing`));
      allGood = false;
    }
  }

  if (allGood) {
    console.log(chalk.green.bold('\n🎉 Environment configuration looks good!'));
  } else {
    console.log(chalk.red.bold('\n⚠️  Some environment variables are missing.'));
    console.log(chalk.yellow('Please check your .env file.'));
  }
}

program
  .name('social-automation')
  .description('Advanced Social Media Automation CLI')
  .version('1.0.0');

program
  .command('start')
  .description('Start the automation engine')
  .option('-c, --config <id>', 'Configuration ID to use')
  .action(async (options: { config?: string }) => {
    console.log(chalk.blue.bold('🚀 Starting Social Media Automation Engine...'));

    try {
      const engine = new AutomationEngine();
      await engine.start(options.config);

      console.log(chalk.green.bold('✅ Automation engine started successfully!'));
      console.log(chalk.gray('Press Ctrl+C to stop the engine.'));

      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n🛑 Stopping automation engine...'));
        await engine.stop();
        console.log(chalk.green('✅ Engine stopped successfully.'));
        process.exit(0);
      });
    } catch (error) {
      console.error(chalk.red.bold('❌ Failed to start automation engine:'), formatError(error));
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Stop the automation engine')
  .action(async () => {
    console.log(chalk.yellow('🛑 Stopping automation engine...'));
    console.log(chalk.green('✅ Engine stop command issued (requires running instance).'));
  });

program
  .command('status')
  .description('Check automation engine status')
  .action(async () => {
    try {
      const engine = new AutomationEngine();
      const status = await engine.getStatus();

      console.log(chalk.blue.bold('\n📊 Automation Engine Status'));
      console.log(chalk.gray('='.repeat(40)));

      const isRunning = status.data?.isRunning;
      console.log(`Status: ${isRunning ? chalk.green('Running') : chalk.red('Stopped')}`);
      console.log(`Configuration: ${chalk.cyan(status.data?.configName || 'None')}`);
      console.log(`Enabled Platforms: ${chalk.yellow((status.data?.enabledPlatforms || []).join(', ') || 'None')}`);
      console.log(`Active Jobs: ${chalk.magenta(status.data?.scheduledJobs?.length || 0)}`);

      console.log('\nService Status:');
      const servicesStatus = status.data?.servicesStatus ?? {};
      Object.entries(servicesStatus).forEach(([platform, serviceStatus]) => {
        const icon = serviceStatus === 'connected' ? '🟢' : '🔴';
        console.log(`  ${icon} ${platform}: ${serviceStatus}`);
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to get status:'), formatError(error));
    }
  });

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
      default:
        logger.warn(`Unknown action selected: ${action}`);
    }
  });

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
      default:
        logger.warn(`Unknown DB action selected: ${action}`);
    }
  });

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

    console.log(chalk.yellow(`Content management: ${action} - Implementation pending`));
  });

program
  .command('analytics')
  .description('View analytics and generate reports')
  .option('-p, --platform <platform>', 'Specific platform')
  .option('-d, --days <days>', 'Number of days', '30')
  .action(async (options: { platform?: string; days: string }) => {
    console.log(chalk.blue.bold('\n📈 Social Media Analytics'));
    console.log(chalk.gray('='.repeat(40)));

    console.log(chalk.yellow('Analytics reporting is not yet implemented.'));
    if (options.platform) {
      console.log(`Requested platform: ${chalk.cyan(options.platform)}`);
    }
    console.log(`Requested range: ${chalk.cyan(`${options.days} days`)}`);
  });

program
  .command('diagnostics')
  .description('Run system diagnostics and environment checks')
  .action(async () => {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Diagnostic operation:',
        choices: [
          'Environment check',
          'Connectivity check',
          'List services',
          'Exit'
        ]
      }
    ]);

    switch (action) {
      case 'Environment check':
        await checkEnvironment();
        break;
      case 'Connectivity check':
        console.log(chalk.yellow('Connectivity diagnostics not implemented yet.'));
        break;
      case 'List services':
        console.log(chalk.gray('- Automation engine'));
        console.log(chalk.gray('- Trend monitoring'));
        console.log(chalk.gray('- Analytics collector'));
        break;
      default:
        console.log(chalk.green('Diagnostics complete.'));
    }
  });

program
  .command('env')
  .description('Validate required environment variables')
  .action(async () => {
    await checkEnvironment();
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(chalk.red.bold('❌ CLI execution failed:'), formatError(error));
  process.exit(1);
});
