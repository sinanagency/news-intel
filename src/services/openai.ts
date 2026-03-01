/**
 * OpenAI Service
 * Handles embeddings for semantic search and optional GPT-4o for deep analysis.
 * All features are optional - app works without OpenAI key.
 */

export interface EmbeddingResult {
  text: string
  embedding: number[]
  model: string
}

export interface DeepAnalysis {
  summary: string
  keyInsights: string[]
  opportunities: string[]
  risks: string[]
  actionItems: string[]
  relatedTopics: string[]
}

const EMBEDDING_MODEL = 'text-embedding-3-small'
const ANALYSIS_MODEL = 'gpt-4o'
const BACKEND_OPENAI_URL = '/api/openai'

class OpenAIService {
  private apiKey: string | null = null
  private useBackend: boolean = false

  setApiKey(key: string): void {
    if (key === 'USE_BACKEND') {
      this.useBackend = true
      this.apiKey = null
    } else {
      this.apiKey = key
      this.useBackend = false
    }
  }

  hasApiKey(): boolean {
    return this.useBackend || (!!this.apiKey && this.apiKey.startsWith('sk-'))
  }

  private async callOpenAI(endpoint: string, body: Record<string, unknown>): Promise<Response> {
    if (this.useBackend) {
      return fetch(BACKEND_OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, ...body })
      })
    }

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
  }

  // Generate embedding for text
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.hasApiKey()) return null

    try {
      const response = await this.callOpenAI('https://api.openai.com/v1/embeddings', {
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000) // Limit input size
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('OpenAI embedding error:', error)
        return null
      }

      const data = await response.json()
      return data.data[0].embedding
    } catch (error) {
      console.error('Failed to generate embedding:', error)
      return null
    }
  }

  // Generate embeddings for multiple texts (batched)
  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.hasApiKey()) return texts.map(() => null)

    try {
      const response = await this.callOpenAI('https://api.openai.com/v1/embeddings', {
        model: EMBEDDING_MODEL,
        input: texts.map(t => t.slice(0, 8000))
      })

      if (!response.ok) {
        return texts.map(() => null)
      }

      const data = await response.json()
      return data.data.map((d: { embedding: number[] }) => d.embedding)
    } catch {
      return texts.map(() => null)
    }
  }

  // Calculate cosine similarity between two embeddings
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }

  // Find most similar items from a list
  findMostSimilar<T>(
    queryEmbedding: number[],
    items: { item: T; embedding: number[] }[],
    topK: number = 5
  ): { item: T; similarity: number }[] {
    const scored = items.map(({ item, embedding }) => ({
      item,
      similarity: this.cosineSimilarity(queryEmbedding, embedding)
    }))

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
  }

  // Deep analysis with GPT-4o
  async deepAnalysis(
    articleTitle: string,
    articleSummary: string,
    userContext: string
  ): Promise<DeepAnalysis | null> {
    if (!this.hasApiKey()) return null

    try {
      const response = await this.callOpenAI('https://api.openai.com/v1/chat/completions', {
        model: ANALYSIS_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a strategic analyst helping a business-focused user understand news and identify opportunities. Be specific and actionable. Return JSON only.`
          },
          {
            role: 'user',
            content: `Analyze this article for business implications:

Title: ${articleTitle}
Summary: ${articleSummary}

User context: ${userContext}

Return a JSON object with:
{
  "summary": "2-3 sentence executive summary",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "risks": ["risk 1", "risk 2"],
  "actionItems": ["specific action 1", "specific action 2"],
  "relatedTopics": ["topic to research 1", "topic 2"]
}`
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })

      if (!response.ok) {
        console.error('OpenAI analysis error:', await response.json())
        return null
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      return JSON.parse(content) as DeepAnalysis
    } catch (error) {
      console.error('Failed to analyze:', error)
      return null
    }
  }

  // Smart question generation based on user profile
  async generateSmartQuestions(
    articles: { title: string; summary: string }[],
    userInterests: string[],
    recentQuestions: string[]
  ): Promise<string[]> {
    if (!this.hasApiKey()) return []

    try {
      const response = await this.callOpenAI('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini', // Cheaper for this task
        messages: [
          {
            role: 'system',
            content: 'Generate insightful questions a business-minded user would want to ask about these articles. Return JSON array of 4 questions.'
          },
          {
            role: 'user',
            content: `Articles:
${articles.slice(0, 5).map(a => `- ${a.title}: ${a.summary}`).join('\n')}

User interests: ${userInterests.join(', ')}
Recent questions (avoid similar): ${recentQuestions.slice(0, 3).join('; ')}

Return: { "questions": ["q1", "q2", "q3", "q4"] }`
          }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      })

      if (!response.ok) return []

      const data = await response.json()
      const content = JSON.parse(data.choices[0].message.content)
      return content.questions || []
    } catch {
      return []
    }
  }

  // Enable backend mode for deployment
  enableBackendMode(): void {
    this.useBackend = true
  }
}

export const openaiService = new OpenAIService()
