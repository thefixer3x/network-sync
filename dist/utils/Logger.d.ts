export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare class Logger {
    private readonly context;
    private readonly logLevel;
    constructor(context: string, logLevel?: LogLevel);
    private parseLogLevel;
    private shouldLog;
    private formatMessage;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    success(message: string, ...args: unknown[]): void;
    task(taskName: string, message: string, ...args: unknown[]): void;
    progress(step: number, total: number, message: string): void;
}
//# sourceMappingURL=Logger.d.ts.map