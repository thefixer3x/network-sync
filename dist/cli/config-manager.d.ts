export declare class ConfigManager {
    private readonly supabase;
    private readonly logger;
    constructor();
    createConfiguration(): Promise<void>;
    listConfigurations(): Promise<void>;
    editConfiguration(): Promise<void>;
    deleteConfiguration(): Promise<void>;
    testConfiguration(): Promise<void>;
}
//# sourceMappingURL=config-manager.d.ts.map