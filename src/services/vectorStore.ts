/**
 * Vector Store
 * Local storage for embeddings with efficient similarity search.
 * Persists to localStorage for offline access.
 */

import { openaiService } from './openai'

export interface VectorEntry {
  id: string
  text: string
  embedding: number[]
  metadata: {
    type: 'article' | 'memory' | 'conversation' | 'user_interest'
    sourceId?: string
    timestamp: string
    [key: string]: unknown
  }
}

const VECTOR_STORAGE_KEY = 'news-intel-vectors'
const MAX_VECTORS = 1000 // Limit to prevent localStorage overflow

class VectorStoreService {
  private vectors: VectorEntry[] = []

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(VECTOR_STORAGE_KEY)
      if (stored) {
        this.vectors = JSON.parse(stored)
      }
    } catch {
      this.vectors = []
    }
  }

  private saveToStorage(): void {
    try {
      // Keep most recent vectors if over limit
      if (this.vectors.length > MAX_VECTORS) {
        this.vectors = this.vectors
          .sort((a, b) =>
            new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
          )
          .slice(0, MAX_VECTORS)
      }
      localStorage.setItem(VECTOR_STORAGE_KEY, JSON.stringify(this.vectors))
    } catch (e) {
      console.error('Failed to save vectors:', e)
      // If storage is full, remove oldest half
      this.vectors = this.vectors.slice(0, Math.floor(this.vectors.length / 2))
      try {
        localStorage.setItem(VECTOR_STORAGE_KEY, JSON.stringify(this.vectors))
      } catch {
        // Give up
      }
    }
  }

  // Add a single vector
  async addVector(
    id: string,
    text: string,
    metadata: VectorEntry['metadata']
  ): Promise<boolean> {
    // Check if already exists
    const existing = this.vectors.findIndex(v => v.id === id)
    if (existing !== -1) {
      return true // Already have this vector
    }

    const embedding = await openaiService.generateEmbedding(text)
    if (!embedding) return false

    this.vectors.push({
      id,
      text,
      embedding,
      metadata
    })

    this.saveToStorage()
    return true
  }

  // Add multiple vectors (batched for efficiency)
  async addVectors(
    items: { id: string; text: string; metadata: VectorEntry['metadata'] }[]
  ): Promise<number> {
    // Filter out existing
    const newItems = items.filter(
      item => !this.vectors.some(v => v.id === item.id)
    )

    if (newItems.length === 0) return 0

    // Batch embed
    const texts = newItems.map(item => item.text)
    const embeddings = await openaiService.generateEmbeddings(texts)

    let added = 0
    newItems.forEach((item, i) => {
      const embedding = embeddings[i]
      if (embedding) {
        this.vectors.push({
          id: item.id,
          text: item.text,
          embedding,
          metadata: item.metadata
        })
        added++
      }
    })

    if (added > 0) {
      this.saveToStorage()
    }

    return added
  }

  // Search for similar vectors
  async search(
    query: string,
    options: {
      topK?: number
      type?: VectorEntry['metadata']['type']
      minSimilarity?: number
    } = {}
  ): Promise<{ entry: VectorEntry; similarity: number }[]> {
    const { topK = 5, type, minSimilarity = 0.3 } = options

    const queryEmbedding = await openaiService.generateEmbedding(query)
    if (!queryEmbedding) return []

    // Filter by type if specified
    let candidates = this.vectors
    if (type) {
      candidates = candidates.filter(v => v.metadata.type === type)
    }

    // Calculate similarities
    const results = candidates.map(entry => ({
      entry,
      similarity: openaiService.cosineSimilarity(queryEmbedding, entry.embedding)
    }))

    // Filter by minimum similarity and sort
    return results
      .filter(r => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
  }

  // Search with pre-computed embedding (faster for repeated searches)
  searchWithEmbedding(
    queryEmbedding: number[],
    options: {
      topK?: number
      type?: VectorEntry['metadata']['type']
      minSimilarity?: number
    } = {}
  ): { entry: VectorEntry; similarity: number }[] {
    const { topK = 5, type, minSimilarity = 0.3 } = options

    let candidates = this.vectors
    if (type) {
      candidates = candidates.filter(v => v.metadata.type === type)
    }

    const results = candidates.map(entry => ({
      entry,
      similarity: openaiService.cosineSimilarity(queryEmbedding, entry.embedding)
    }))

    return results
      .filter(r => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
  }

  // Find similar articles
  async findSimilarArticles(
    articleId: string,
    topK: number = 5
  ): Promise<{ entry: VectorEntry; similarity: number }[]> {
    const article = this.vectors.find(v => v.id === articleId)
    if (!article) return []

    return this.searchWithEmbedding(article.embedding, {
      topK: topK + 1, // +1 because it will find itself
      type: 'article',
      minSimilarity: 0.5
    }).filter(r => r.entry.id !== articleId)
  }

  // Get entry by ID
  getById(id: string): VectorEntry | undefined {
    return this.vectors.find(v => v.id === id)
  }

  // Check if we have an embedding for this ID
  hasEmbedding(id: string): boolean {
    return this.vectors.some(v => v.id === id)
  }

  // Get all vectors of a type
  getByType(type: VectorEntry['metadata']['type']): VectorEntry[] {
    return this.vectors.filter(v => v.metadata.type === type)
  }

  // Remove a vector
  remove(id: string): void {
    this.vectors = this.vectors.filter(v => v.id !== id)
    this.saveToStorage()
  }

  // Clear all vectors
  clear(): void {
    this.vectors = []
    localStorage.removeItem(VECTOR_STORAGE_KEY)
  }

  // Get stats
  getStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {}
    this.vectors.forEach(v => {
      byType[v.metadata.type] = (byType[v.metadata.type] || 0) + 1
    })
    return { total: this.vectors.length, byType }
  }
}

export const vectorStore = new VectorStoreService()
