/**
 * Example Usage of Multi-Agent Orchestration System
 */
type ResearchSummary = {
    summary: string;
    citations?: Array<Record<string, unknown>>;
    [key: string]: unknown;
};
type GeneratedContent = {
    content: string;
    [key: string]: unknown;
};
type GeneratedVariations = Array<{
    id: string;
    content: string;
    [key: string]: unknown;
}>;
type EmbeddingSummary = {
    embeddingIds: string[];
    dimensions: number;
};
declare function demonstrateOrchestration(): Promise<void>;
declare function contentProductionPipeline(topic: string): Promise<{
    research: ResearchSummary;
    content: GeneratedContent;
    variations: GeneratedVariations;
    embeddings: EmbeddingSummary;
}>;
declare function monitorTrends(): Promise<() => void>;
export { demonstrateOrchestration, contentProductionPipeline, monitorTrends };
//# sourceMappingURL=example-usage.d.ts.map