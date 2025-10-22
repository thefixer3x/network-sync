type EmbeddingResult = {
    id: string;
    content: string;
    embedding: number[];
    dimensions: number;
    metadata?: Record<string, unknown>;
};
interface EmbeddingParams {
    texts: string[];
    model?: string;
    metadata?: Array<Record<string, unknown> | undefined>;
}
export declare class EmbeddingAgent {
    private readonly logger;
    private readonly client;
    constructor();
    createEmbeddings(params: EmbeddingParams): Promise<EmbeddingResult[]>;
}
export {};
//# sourceMappingURL=embedding-agent.d.ts.map