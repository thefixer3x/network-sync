// utils/Logger.ts
export class Logger {
    constructor(context) {
        this.context = context;
    }
    info(message, ...args) {
        console.log(`[${this.context}] INFO: ${message}`, ...args);
    }
    error(message, ...args) {
        console.error(`[${this.context}] ERROR: ${message}`, ...args);
    }
    warn(message, ...args) {
        console.warn(`[${this.context}] WARN: ${message}`, ...args);
    }
    debug(message, ...args) {
        console.debug(`[${this.context}] DEBUG: ${message}`, ...args);
    }
}
//# sourceMappingURL=Logger.js.map