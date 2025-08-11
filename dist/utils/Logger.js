import chalk from 'chalk';
export class Logger {
    constructor(context, logLevel = 'info') {
        this.context = context;
        this.logLevel = this.parseLogLevel(process.env['LOG_LEVEL'] || logLevel);
    }
    parseLogLevel(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.includes(level) ? level : 'info';
    }
    shouldLog(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[this.logLevel];
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') : '';
        return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${formattedArgs}`;
    }
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(chalk.gray(this.formatMessage('debug', message, ...args)));
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(chalk.blue(this.formatMessage('info', message, ...args)));
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.log(chalk.yellow(this.formatMessage('warn', message, ...args)));
        }
    }
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(chalk.red(this.formatMessage('error', message, ...args)));
        }
    }
    success(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(chalk.green(this.formatMessage('info', `✅ ${message}`, ...args)));
        }
    }
    task(taskName, message, ...args) {
        if (this.shouldLog('info')) {
            console.log(chalk.cyan(this.formatMessage('info', `🔄 [${taskName}] ${message}`, ...args)));
        }
    }
    progress(step, total, message) {
        if (this.shouldLog('info')) {
            const percentage = Math.round((step / total) * 100);
            const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
            console.log(chalk.magenta(this.formatMessage('info', `📊 [${progressBar}] ${percentage}% ${message}`)));
        }
    }
}
//# sourceMappingURL=Logger.js.map