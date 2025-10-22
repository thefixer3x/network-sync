export declare class DatabaseManager {
    private readonly supabase;
    private readonly logger;
    constructor();
    initialize(): Promise<void>;
    runMigrations(): Promise<void>;
    backup(): Promise<void>;
    cleanupOldData(): Promise<void>;
    status(): Promise<void>;
    private createTables;
}
//# sourceMappingURL=database-manager.d.ts.map