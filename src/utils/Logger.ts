import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private context: string;
  private logLevel: LogLevel;

  constructor(context: string, logLevel: LogLevel = 'info') {
    this.context = context;
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || logLevel);
  }

  private parseLogLevel(level: string): LogLevel {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.includes(level as LogLevel) ? (level as LogLevel) : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(this.formatMessage('debug', message, ...args)));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(this.formatMessage('info', message, ...args)));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.log(chalk.yellow(this.formatMessage('warn', message, ...args)));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red(this.formatMessage('error', message, ...args)));
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green(this.formatMessage('info', `✅ ${message}`, ...args)));
    }
  }

  task(taskName: string, message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.cyan(this.formatMessage('info', `🔄 [${taskName}] ${message}`, ...args)));
    }
  }

  progress(step: number, total: number, message: string): void {
    if (this.shouldLog('info')) {
      const percentage = Math.round((step / total) * 100);
      const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
      console.log(chalk.magenta(this.formatMessage('info', `📊 [${progressBar}] ${percentage}% ${message}`)));
    }
  }
}