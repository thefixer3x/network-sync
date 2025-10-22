import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import { Logger } from '@/utils/Logger';
export class EmbeddingAgent {
    constructor() {
        this.logger = new Logger('EmbeddingAgent');
        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) {
            this.logger.warn('OPENAI_API_KEY is not set. EmbeddingAgent will generate mock embeddings.');
            this.client = null;
        }
        else {
            this.client = new OpenAI({ apiKey });
        }
    }
    async createEmbeddings(params) {
        if (this.client) {
            const response = await this.client.embeddings.create({
                model: params.model ?? 'text-embedding-3-small',
                input: params.texts
            });
            return response.data.map((item, index) => {
                const metadata = params.metadata?.[index];
                return {
                    id: randomUUID(),
                    content: params.texts[index] ?? '',
                    embedding: item.embedding,
                    dimensions: item.embedding.length,
                    ...(metadata ? { metadata } : {})
                };
            });
        }
        // Fallback: generate deterministic mock embeddings for demo purposes
        this.logger.warn('Generating mock embeddings (OpenAI client unavailable).');
        return params.texts.map((text, index) => {
            const mockEmbedding = Array.from({ length: 10 }, (_, idx) => (text.charCodeAt(idx % text.length) % 100) / 100);
            const metadata = params.metadata?.[index];
            return {
                id: randomUUID(),
                content: text,
                embedding: mockEmbedding,
                dimensions: mockEmbedding.length,
                ...(metadata ? { metadata } : {})
            };
        });
    }
}
//# sourceMappingURL=embedding-agent.js.map