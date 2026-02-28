/**
 * Memory Agent
 * Persists all conversations, learnings, and context.
 * Now with semantic search when OpenAI is available.
 */

import type { Article } from '../types'
import { vectorStore } from './vectorStore'
import { openaiService } from './openai'

export interface MemoryEntry {
  id: string
  type: 'conversation' | 'learning' | 'preference' | 'insight' | 'article_summary'
  content: string
  context?: string
  tags: string[]
  importance: number // 0-1
  timestamp: string
  metadata?: Record<string, unknown>
  hasEmbedding?: boolean
}

export interface UserProfile {
  interests: string[]
  expertise: string[]
  goals: string[]
  patterns: string[]
  lastInteraction: string
}

export interface AgentStatus {
  name: string
  status: 'running' | 'idle' | 'error'
  lastAction: string
  timestamp: string
  metrics: Record<string, number>
  actionsTracked?: number
  totalMemories?: number
  semanticSearchEnabled?: boolean
}

const MEMORY_STORAGE_KEY = 'news-intel-memory'
const PROFILE_STORAGE_KEY = 'news-intel-user-profile'
const AGENT_DASHBOARD_URL = 'https://agent-dashboard-liard.vercel.app/api/agents'

class MemoryAgentService {
  private memories: MemoryEntry[] = []
  private userProfile: UserProfile
  private status: AgentStatus

  constructor() {
    this.loadFromStorage()
    this.userProfile = this.loadProfile()
    this.status = {
      name: 'MemoryAgent',
      status: 'idle',
      lastAction: 'Initialized',
      timestamp: new Date().toISOString(),
      metrics: { totalMemories: this.memories.length },
      semanticSearchEnabled: openaiService.hasApiKey()
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY)
      if (stored) {
        this.memories = JSON.parse(stored)
      }
    } catch {
      this.memories = []
    }
  }

  private saveToStorage(): void {
    try {
      // Keep most important and recent memories (max 500)
      const sorted = [...this.memories]
        .sort((a, b) => {
          const importanceDiff = b.importance - a.importance
          if (Math.abs(importanceDiff) > 0.2) return importanceDiff
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        })
        .slice(0, 500)

      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(sorted))
      this.memories = sorted
    } catch (e) {
      console.error('Failed to save memories:', e)
    }
  }

  private loadProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // ignore
    }
    return {
      interests: [],
      expertise: [],
      goals: [],
      patterns: [],
      lastInteraction: new Date().toISOString()
    }
  }

  private saveProfile(): void {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.userProfile))
    } catch (e) {
      console.error('Failed to save profile:', e)
    }
  }

  // Store a conversation exchange
  async storeConversation(userMessage: string, assistantResponse: string, contextTags?: string[]): Promise<void> {
    this.status = { ...this.status, status: 'running', lastAction: 'Storing conversation' }

    const memory: MemoryEntry = {
      id: crypto.randomUUID(),
      type: 'conversation',
      content: `User: ${userMessage}\n\nAssistant: ${assistantResponse}`,
      context: contextTags ? `Related to: ${contextTags.join(', ')}` : undefined,
      tags: [...this.extractTags(userMessage + ' ' + assistantResponse), ...(contextTags || [])],
      importance: this.calculateImportance(userMessage, assistantResponse),
      timestamp: new Date().toISOString(),
      hasEmbedding: false
    }

    this.memories.push(memory)
    this.saveToStorage()

    // Generate embedding if OpenAI is available
    if (openaiService.hasApiKey()) {
      const added = await vectorStore.addVector(memory.id, memory.content, {
        type: 'memory',
        sourceId: memory.id,
        timestamp: memory.timestamp
      })
      if (added) {
        memory.hasEmbedding = true
        this.saveToStorage()
      }
    }

    // Update user profile
    await this.updateProfileFromConversation(userMessage, assistantResponse)

    this.status = {
      ...this.status,
      status: 'idle',
      lastAction: 'Stored conversation',
      timestamp: new Date().toISOString(),
      metrics: { totalMemories: this.memories.length },
      semanticSearchEnabled: openaiService.hasApiKey()
    }

    this.reportToDashboard()
  }

  // Store a learning/insight
  async storeLearning(learning: string, source: string, importance: number = 0.5): Promise<void> {
    this.status = { ...this.status, status: 'running', lastAction: 'Storing learning' }

    const memory: MemoryEntry = {
      id: crypto.randomUUID(),
      type: 'learning',
      content: learning,
      context: source,
      tags: this.extractTags(learning),
      importance,
      timestamp: new Date().toISOString(),
      hasEmbedding: false
    }

    this.memories.push(memory)
    this.saveToStorage()

    // Generate embedding
    if (openaiService.hasApiKey()) {
      const added = await vectorStore.addVector(memory.id, memory.content, {
        type: 'memory',
        sourceId: memory.id,
        timestamp: memory.timestamp
      })
      if (added) {
        memory.hasEmbedding = true
        this.saveToStorage()
      }
    }

    this.status = {
      ...this.status,
      status: 'idle',
      lastAction: `Learned: ${learning.slice(0, 50)}...`,
      timestamp: new Date().toISOString(),
      metrics: { totalMemories: this.memories.length }
    }

    this.reportToDashboard()
  }

  // Store article interaction
  async storeArticleInteraction(article: Article, action: string): Promise<void> {
    const memory: MemoryEntry = {
      id: crypto.randomUUID(),
      type: 'article_summary',
      content: `${action}: "${article.title}" - ${article.summary}`,
      tags: [...article.categories, article.source],
      importance: action === 'saved' ? 0.8 : 0.4,
      timestamp: new Date().toISOString(),
      metadata: { articleId: article.id, action },
      hasEmbedding: false
    }

    this.memories.push(memory)
    this.saveToStorage()

    // Generate embedding for article interactions too
    if (openaiService.hasApiKey()) {
      await vectorStore.addVector(memory.id, memory.content, {
        type: 'memory',
        sourceId: article.id,
        timestamp: memory.timestamp
      })
    }
  }

  // Extract relevant tags from text
  private extractTags(text: string): string[] {
    const commonTags = [
      'AI', 'machine learning', 'startup', 'business', 'technology',
      'investment', 'product', 'design', 'engineering', 'data',
      'Claude', 'OpenAI', 'Anthropic', 'API', 'automation',
      'agency', 'SaaS', 'fintech', 'crypto', 'web3'
    ]

    const textLower = text.toLowerCase()
    return commonTags.filter(tag => textLower.includes(tag.toLowerCase()))
  }

  // Calculate importance
  private calculateImportance(userMessage: string, response: string): number {
    let importance = 0.5

    if (userMessage.includes('?')) importance += 0.1

    const actionWords = ['build', 'create', 'implement', 'strategy', 'opportunity', 'should I']
    if (actionWords.some(word => userMessage.toLowerCase().includes(word))) {
      importance += 0.2
    }

    if (response.length > 500) importance += 0.1

    return Math.min(1, importance)
  }

  // Update user profile from conversation
  private async updateProfileFromConversation(userMessage: string, response: string): Promise<void> {
    const tags = this.extractTags(userMessage + ' ' + response)
    tags.forEach(tag => {
      if (!this.userProfile.interests.includes(tag)) {
        this.userProfile.interests.push(tag)
      }
    })

    this.userProfile.interests = this.userProfile.interests.slice(0, 20)
    this.userProfile.lastInteraction = new Date().toISOString()

    this.saveProfile()
  }

  // SEMANTIC SEARCH: Get relevant memories using embeddings
  async getRelevantMemoriesSemantic(query: string, limit: number = 5): Promise<MemoryEntry[]> {
    if (!openaiService.hasApiKey()) {
      return this.getRelevantMemories(query, limit)
    }

    this.status = { ...this.status, status: 'running', lastAction: 'Semantic search' }

    try {
      const results = await vectorStore.search(query, {
        topK: limit,
        type: 'memory',
        minSimilarity: 0.4
      })

      const memoryIds = results.map(r => r.entry.metadata.sourceId as string)
      const memories = memoryIds
        .map(id => this.memories.find(m => m.id === id))
        .filter((m): m is MemoryEntry => m !== undefined)

      this.status = { ...this.status, status: 'idle', lastAction: `Found ${memories.length} semantic matches` }
      return memories
    } catch (error) {
      console.error('Semantic search failed, falling back to keyword:', error)
      return this.getRelevantMemories(query, limit)
    }
  }

  // KEYWORD SEARCH: Original method (fallback)
  getRelevantMemories(query: string, limit: number = 5): MemoryEntry[] {
    const queryTags = this.extractTags(query)
    const queryLower = query.toLowerCase()

    const scored = this.memories.map(memory => {
      let score = memory.importance

      const tagMatches = memory.tags.filter(tag =>
        queryTags.some(qt => qt.toLowerCase() === tag.toLowerCase())
      ).length
      score += tagMatches * 0.2

      const contentLower = memory.content.toLowerCase()
      const queryWords = queryLower.split(' ').filter(w => w.length > 3)
      const wordMatches = queryWords.filter(w => contentLower.includes(w)).length
      score += wordMatches * 0.1

      const ageInDays = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      score += Math.max(0, 0.3 - ageInDays * 0.01)

      return { memory, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.memory)
  }

  // Get user profile
  getProfile(): UserProfile {
    return this.userProfile
  }

  // Get all memories
  getAllMemories(): MemoryEntry[] {
    return this.memories
  }

  // Get agent status
  getStatus(): AgentStatus {
    return {
      ...this.status,
      totalMemories: this.memories.length,
      semanticSearchEnabled: openaiService.hasApiKey()
    }
  }

  // Reporting
  private reportingInterval: ReturnType<typeof setInterval> | null = null

  startReporting(): void {
    this.reportToDashboard()
    this.reportingInterval = setInterval(() => {
      this.reportToDashboard()
    }, 30000)
  }

  stopReporting(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval)
      this.reportingInterval = null
    }
  }

  // Build context string for AI prompts (uses semantic search when available)
  async buildContextStringSemantic(query: string): Promise<string> {
    const relevantMemories = await this.getRelevantMemoriesSemantic(query)
    if (relevantMemories.length === 0) return ''

    const context = relevantMemories
      .map(m => `[${m.type}] ${m.content}`)
      .join('\n\n')

    return `\n\nRelevant context from memory (semantic search):\n${context}`
  }

  // Original buildContextString for compatibility
  buildContextString(query: string): string {
    const relevantMemories = this.getRelevantMemories(query)
    if (relevantMemories.length === 0) return ''

    const context = relevantMemories
      .map(m => `[${m.type}] ${m.content}`)
      .join('\n\n')

    return `\n\nRelevant context from memory:\n${context}`
  }

  // Clear all memories
  clearAllMemories(): void {
    this.memories = []
    this.userProfile = {
      interests: [],
      expertise: [],
      goals: [],
      patterns: [],
      lastInteraction: new Date().toISOString()
    }
    localStorage.removeItem(MEMORY_STORAGE_KEY)
    localStorage.removeItem(PROFILE_STORAGE_KEY)
    vectorStore.clear()
  }

  // Report to dashboard
  private async reportToDashboard(): Promise<void> {
    try {
      await fetch(AGENT_DASHBOARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.status)
      }).catch(() => {})
    } catch {
      // Silently fail
    }
  }

  // Embed all existing memories (call after setting OpenAI key)
  async embedAllMemories(): Promise<number> {
    if (!openaiService.hasApiKey()) return 0

    const unembedded = this.memories.filter(m => !m.hasEmbedding)
    if (unembedded.length === 0) return 0

    this.status = { ...this.status, status: 'running', lastAction: `Embedding ${unembedded.length} memories` }

    const items = unembedded.map(m => ({
      id: m.id,
      text: m.content,
      metadata: {
        type: 'memory' as const,
        sourceId: m.id,
        timestamp: m.timestamp
      }
    }))

    const added = await vectorStore.addVectors(items)

    // Mark as embedded
    unembedded.forEach(m => {
      m.hasEmbedding = true
    })
    this.saveToStorage()

    this.status = { ...this.status, status: 'idle', lastAction: `Embedded ${added} memories` }
    return added
  }
}

export const memoryAgent = new MemoryAgentService()
