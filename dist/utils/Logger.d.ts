export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare class Logger {
    private context;
    private logLevel;
    constructor(context: string, logLevel?: LogLevel);
    private parseLogLevel;
    private shouldLog;
    private formatMessage;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    success(message: string, ...args: any[]): void;
    task(taskName: string, message: string, ...args: any[]): void;
    progress(step: number, total: number, message: string): void;
}
//# sourceMappingURL=Logger.d.ts.map