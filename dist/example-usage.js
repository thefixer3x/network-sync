/**
 * Example Usage of Multi-Agent Orchestration System
 */
import { orchestrator } from './orchestrator/agent-orchestrator';
async function demonstrateOrchestration() {
    console.log('🚀 Starting Multi-Agent Orchestration Demo\n');
    // 1. Research Task - Delegated to Perplexity
    console.log('📊 Step 1: Research Current Social Media Trends');
    const researchTaskId = orchestrator.queueTask({
        type: 'research',
        priority: 10,
        payload: {
            query: 'Latest social media marketing trends 2025 with engagement statistics',
            sources: ['web', 'news', 'academic'],
            maxResults: 15,
            topic: 'Social_Media_Trends',
            storeInDrive: true
        }
    });
    // 2. Content Generation - Delegated to Claude
    console.log('✍️ Step 2: Generate Blog Post from Research');
    const writingTaskId = orchestrator.queueTask({
        type: 'writing',
        priority: 8,
        payload: {
            prompt: 'Create a comprehensive blog post about social media trends',
            useContext: true, // Will pull from vector store
            topic: 'Social_Media_Trends',
            brandVoice: 'engaging',
            format: 'blog',
            sections: [
                'Introduction',
                'Top 5 Trends',
                'Implementation Strategies',
                'Case Studies',
                'Conclusion'
            ],
            maxTokens: 3000,
            storeInDrive: true,
            driveFolder: 'Blog_Posts/2025'
        }
    });
    // 3. Create Social Media Variations
    console.log('🔄 Step 3: Create Platform-Specific Variations');
    const socialVariations = [
        { platform: 'twitter', maxLength: 280 },
        { platform: 'linkedin', maxLength: 1500 },
        { platform: 'instagram', maxLength: 2200 }
    ];
    for (const variant of socialVariations) {
        orchestrator.queueTask({
            type: 'writing',
            priority: 6,
            payload: {
                prompt: `Adapt the blog post for ${variant.platform}`,
                useContext: true,
                topic: 'Social_Media_Trends',
                format: variant.platform,
                maxTokens: variant.maxLength,
                brandVoice: variant.platform === 'linkedin' ? 'professional' : 'casual'
            }
        });
    }
    // 4. Embedding Generation for Semantic Search
    console.log('🔍 Step 4: Generate Embeddings for Future Reference');
    const embeddingTaskId = orchestrator.queueTask({
        type: 'embedding',
        priority: 5,
        payload: {
            texts: [
                'Social media trends 2025',
                'Engagement strategies',
                'Content marketing automation'
            ]
        }
    });
    // 5. Competitive Analysis
    console.log('🎯 Step 5: Analyze Competitors');
    const competitorTaskId = orchestrator.queueTask({
        type: 'research',
        priority: 7,
        payload: {
            query: 'Analyze top social media management platforms: Hootsuite, Buffer, Sprout Social',
            topic: 'Competitive_Analysis',
            storeInDrive: true,
            driveFolder: 'Market_Research/Competitors'
        }
    });
    // Process all queued tasks
    console.log('\n⚙️ Processing Task Queue...\n');
    await orchestrator.processQueue();
    console.log('✅ All tasks completed successfully!');
}
// Advanced Usage: Real-time Content Pipeline
async function contentProductionPipeline(topic) {
    console.log(`🏭 Starting Content Production Pipeline for: ${topic}\n`);
    // Phase 1: Research
    const research = await orchestrator.delegateTask({
        id: 'research_001',
        type: 'research',
        priority: 10,
        timestamp: new Date(),
        payload: {
            query: `Comprehensive research on ${topic}: trends, statistics, best practices`,
            maxResults: 20,
            includeImages: true
        }
    });
    console.log('✅ Research completed:', research.summary);
    // Phase 2: Content Creation
    const content = await orchestrator.delegateTask({
        id: 'content_001',
        type: 'writing',
        priority: 9,
        timestamp: new Date(),
        payload: {
            prompt: `Create engaging social media content about ${topic}`,
            context: research.summary,
            brandVoice: 'engaging',
            format: 'social_media_series',
            sections: ['Hook', 'Value Proposition', 'Call to Action']
        }
    });
    console.log('✅ Content created');
    // Phase 3: A/B Testing Variations
    const variations = await orchestrator.delegateTask({
        id: 'variations_001',
        type: 'writing',
        priority: 8,
        timestamp: new Date(),
        payload: {
            prompt: 'Generate A/B test variations',
            context: content.content,
            numberOfVariations: 3,
            variationType: 'headline',
            testingGoal: 'maximize engagement'
        }
    });
    console.log('✅ A/B variations generated:', variations.length);
    // Phase 4: Analytics Embedding
    const embeddings = await orchestrator.delegateTask({
        id: 'embed_001',
        type: 'embedding',
        priority: 7,
        timestamp: new Date(),
        payload: {
            texts: [content.content, ...variations.map((v) => v.content)]
        }
    });
    console.log('✅ Embeddings stored for semantic search');
    return {
        research,
        content,
        variations,
        embeddings
    };
}
// Monitoring and Analytics
async function monitorTrends() {
    console.log('📈 Starting Trend Monitoring...\n');
    // Set up recurring monitoring
    const monitoringInterval = setInterval(async () => {
        const trends = await orchestrator.delegateTask({
            id: `monitor_${Date.now()}`,
            type: 'research',
            priority: 5,
            timestamp: new Date(),
            payload: {
                query: 'Current viral topics on social media in the last 6 hours',
                sources: ['twitter', 'reddit', 'tiktok'],
                maxResults: 10
            }
        });
        console.log('📊 Trending Now:', trends.summary);
        // Auto-generate content for trending topics
        if (trends.citations?.length > 5) {
            console.log('🔥 Hot topic detected! Generating content...');
            await orchestrator.delegateTask({
                id: `trend_content_${Date.now()}`,
                type: 'writing',
                priority: 9,
                timestamp: new Date(),
                payload: {
                    prompt: 'Create timely content about this trending topic',
                    context: trends.summary,
                    brandVoice: 'casual',
                    format: 'twitter',
                    maxTokens: 280
                }
            });
        }
    }, 3600000); // Every hour
    // Return cleanup function
    return () => clearInterval(monitoringInterval);
}
// Main execution
if (require.main === module) {
    // Run demonstration
    demonstrateOrchestration()
        .then(() => contentProductionPipeline('AI in Social Media Marketing'))
        .then(() => {
        console.log('\n🎉 Multi-Agent Orchestration System Demo Complete!');
        process.exit(0);
    })
        .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}
export { demonstrateOrchestration, contentProductionPipeline, monitorTrends };
//# sourceMappingURL=example-usage.js.map