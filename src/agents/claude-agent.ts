/**
 * Claude Agent - Specialized for High-Quality Writing & Analysis
 */

interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

interface BrandVoice {
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'playful';
  vocabulary: 'simple' | 'moderate' | 'sophisticated';
  sentenceLength: 'short' | 'medium' | 'long' | 'varied';
  personality: string[];
}

export class ClaudeAgent {
  private config: ClaudeConfig;
  private apiEndpoint = 'https://api.anthropic.com/v1/messages';
  private brandVoices: Map<string, BrandVoice>;

  constructor() {
    this.config = {
      apiKey: process.env['CLAUDE_API_KEY'] || '',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096
    };
    this.initializeBrandVoices();
  }

  private initializeBrandVoices() {
    this.brandVoices = new Map([
      ['professional', {
        tone: 'professional',
        vocabulary: 'sophisticated',
        sentenceLength: 'medium',
        personality: ['authoritative', 'knowledgeable', 'trustworthy']
      }],
      ['casual', {
        tone: 'casual',
        vocabulary: 'simple',
        sentenceLength: 'short',
        personality: ['friendly', 'approachable', 'conversational']
      }],
      ['engaging', {
        tone: 'friendly',
        vocabulary: 'moderate',
        sentenceLength: 'varied',
        personality: ['enthusiastic', 'helpful', 'empathetic']
      }]
    ]);
  }

  /**
   * Generate high-quality content with brand voice
   */
  async generateContent(params: {
    prompt: string;
    context?: string;
    brandVoice?: string;
    format?: string;
    maxTokens?: number;
    sections?: string[];
  }) {
    const voice = this.brandVoices.get(params.brandVoice || 'professional');
    
    const systemPrompt = this.buildSystemPrompt(voice, params.format);
    const userPrompt = this.buildUserPrompt(params);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: params.maxTokens || this.config.maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7 // Balanced for creativity and coherence
        })
      });

      const data = await response.json();
      return this.formatContent(data, params.format);
    } catch (error) {
      console.error('Claude generation error:', error);
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  /**
   * Analyze content for insights and improvements
   */
  async analyzeContent(params: {
    content: string;
    analysisType: 'sentiment' | 'readability' | 'engagement' | 'seo';
    targetAudience?: string;
  }) {
    const analysisPrompts = {
      sentiment: 'Analyze the emotional tone and sentiment of this content',
      readability: 'Assess readability, clarity, and accessibility of this content',
      engagement: 'Evaluate engagement potential and suggest improvements',
      seo: 'Analyze SEO effectiveness and provide optimization suggestions'
    };

    const prompt = `${analysisPrompts[params.analysisType]}:

Content: ${params.content}

${params.targetAudience ? `Target Audience: ${params.targetAudience}` : ''}

Provide:
1. Overall assessment
2. Specific strengths
3. Areas for improvement
4. Actionable recommendations
5. Score (0-100)`;

    const response = await this.generateContent({
      prompt,
      format: 'analysis'
    });

    return this.parseAnalysis(response);
  }

  /**
   * Rewrite content for different platforms
   */
  async adaptContent(params: {
    content: string;
    fromPlatform: string;
    toPlatform: string;
    maintainMessage: boolean;
  }) {
    const platformSpecs = {
      twitter: { maxLength: 280, style: 'concise', hashtags: true },
      linkedin: { maxLength: 3000, style: 'professional', formatting: 'rich' },
      instagram: { maxLength: 2200, style: 'visual', emojis: true },
      blog: { maxLength: null, style: 'comprehensive', structure: 'full' },
      email: { maxLength: null, style: 'personalized', cta: true }
    };

    const fromSpec = platformSpecs[params.fromPlatform];
    const toSpec = platformSpecs[params.toPlatform];

    const prompt = `Adapt this ${params.fromPlatform} content for ${params.toPlatform}:

Original: ${params.content}

Requirements:
- Style: ${toSpec.style}
- Max length: ${toSpec.maxLength || 'no limit'}
- ${params.maintainMessage ? 'Maintain core message' : 'Optimize for platform'}
- Platform best practices for ${params.toPlatform}`;

    return await this.generateContent({
      prompt,
      format: params.toPlatform
    });
  }

  /**
   * Generate content variations for A/B testing
   */
  async generateVariations(params: {
    baseContent: string;
    numberOfVariations: number;
    variationType: 'headline' | 'cta' | 'full';
    testingGoal: string;
  }) {
    const variations = [];
    
    for (let i = 0; i < params.numberOfVariations; i++) {
      const prompt = `Create variation ${i + 1} of this content for A/B testing:

Base: ${params.baseContent}

Variation Type: ${params.variationType}
Testing Goal: ${params.testingGoal}

Make this variation distinctly different while maintaining the core message.`;

      const variation = await this.generateContent({
        prompt,
        format: params.variationType
      });

      variations.push({
        id: `var_${i + 1}`,
        content: variation,
        hypothesis: `Variation focusing on ${this.generateHypothesis(i)}`
      });
    }

    return variations;
  }

  /**
   * Build system prompt based on brand voice
   */
  private buildSystemPrompt(voice: BrandVoice | undefined, format?: string): string {
    const basePrompt = `You are an expert content creator specializing in ${format || 'general'} content.`;
    
    if (!voice) return basePrompt;

    return `${basePrompt}

Writing Style:
- Tone: ${voice.tone}
- Vocabulary: ${voice.vocabulary} level
- Sentence length: ${voice.sentenceLength}
- Personality traits: ${voice.personality.join(', ')}

Maintain consistency throughout the content while ensuring high quality and engagement.`;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(params: any): string {
    let prompt = params.prompt;
    
    if (params.context) {
      prompt = `Context:\n${params.context}\n\nTask:\n${prompt}`;
    }
    
    if (params.sections) {
      prompt += `\n\nInclude these sections:\n${params.sections.map(s => `- ${s}`).join('\n')}`;
    }
    
    return prompt;
  }

  /**
   * Format content based on type
   */
  private formatContent(data: any, format?: string): any {
    const content = data.content?.[0]?.text || '';
    
    const formatted = {
      content,
      format,
      metadata: {
        model: data.model,
        tokenUsage: data.usage,
        generatedAt: new Date()
      }
    };

    if (format === 'report') {
      formatted['sections'] = this.extractSections(content);
    }

    return formatted;
  }

  /**
   * Extract sections from formatted content
   */
  private extractSections(content: string): any {
    const sections = {};
    const sectionRegex = /##\s+(.+?)\n([\s\S]*?)(?=##\s+|$)/g;
    let match;

    while ((match = sectionRegex.exec(content)) !== null) {
      const title = match[1].trim();
      const body = match[2].trim();
      sections[title] = body;
    }

    return sections;
  }

  /**
   * Parse analysis results
   */
  private parseAnalysis(response: any): any {
    const content = response.content;
    
    // Extract score if present
    const scoreMatch = content.match(/Score:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

    return {
      fullAnalysis: content,
      score,
      timestamp: new Date()
    };
  }

  /**
   * Generate hypothesis for A/B testing
   */
  private generateHypothesis(index: number): string {
    const hypotheses = [
      'emotional appeal',
      'direct value proposition',
      'social proof emphasis',
      'urgency creation',
      'benefit-focused messaging'
    ];
    
    return hypotheses[index % hypotheses.length];
  }
}