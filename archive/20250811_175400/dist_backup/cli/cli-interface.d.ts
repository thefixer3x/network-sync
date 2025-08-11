#!/usr/bin/env node
export declare class ConfigManager {
    private supabase;
    createConfiguration(): Promise<void>;
    listConfigurations(): Promise<void>;
    editConfiguration(): Promise<void>;
    deleteConfiguration(): Promise<void>;
    testConfiguration(): Promise<void>;
}
export declare class DatabaseManager {
    private supabase;
    private logger;
    initialize(): Promise<void>;
    private createTables;
}
//# sourceMappingURL=cli-interface.d.ts.map