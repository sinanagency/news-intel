/**
 * Behavior Agent
 * Tracks user interactions and learns preferences like a social media algorithm.
 * Now with semantic similarity when OpenAI is available.
 */

import type { Article } from '../types'
import { vectorStore } from './vectorStore'
import { openaiService } from './openai'

export interface UserBehavior {
  articleId: string
  action: 'open' | 'save' | 'unsave' | 'ask' | 'read_full' | 'click_source'
  timestamp: string
  readTimeMs?: number
  categories?: string[]
  source?: string
  articleTitle?: string
}

export interface UserPreferences {
  topCategories: { category: string; score: number }[]
  topSources: { source: string; score: number }[]
  topKeywords: { keyword: string; score: number }[]
  readingPatterns: {
    avgReadTimeMs: number
    preferredTimeOfDay: string
    totalArticlesRead: number
  }
  lastUpdated: string
}

export interface AgentStatus {
  name: string
  status: 'running' | 'idle' | 'error'
  lastAction: string
  timestamp: string
  metrics: Record<string, number>
  actionsTracked?: number
  totalMemories?: number
  semanticEnabled?: boolean
}

const BEHAVIOR_STORAGE_KEY = 'news-intel-behavior'
const PREFERENCES_STORAGE_KEY = 'news-intel-preferences'
const AGENT_DASHBOARD_URL = 'https://agent-dashboard-liard.vercel.app/api/agents'

class BehaviorAgentService {
  private behaviors: UserBehavior[] = []
  private preferences: UserPreferences
  private status: AgentStatus
  private decayFactor = 0.95

  constructor() {
    this.loadFromStorage()
    this.preferences = this.loadPreferences()
    this.status = {
      name: 'BehaviorAgent',
      status: 'idle',
      lastAction: 'Initialized',
      timestamp: new Date().toISOString(),
      metrics: { totalInteractions: this.behaviors.length },
      semanticEnabled: openaiService.hasApiKey()
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(BEHAVIOR_STORAGE_KEY)
      if (stored) {
        this.behaviors = JSON.parse(stored)
      }
    } catch {
      this.behaviors = []
    }
  }

  private saveToStorage(): void {
    try {
      const trimmed = this.behaviors.slice(-1000)
      localStorage.setItem(BEHAVIOR_STORAGE_KEY, JSON.stringify(trimmed))
    } catch (e) {
      console.error('Failed to save behaviors:', e)
    }
  }

  private loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // ignore
    }
    return {
      topCategories: [],
      topSources: [],
      topKeywords: [],
      readingPatterns: {
        avgReadTimeMs: 0,
        preferredTimeOfDay: 'morning',
        totalArticlesRead: 0
      },
      lastUpdated: new Date().toISOString()
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(this.preferences))
    } catch (e) {
      console.error('Failed to save preferences:', e)
    }
  }

  // Track a user action and optionally embed the article
  async trackAction(
    article: Article,
    action: UserBehavior['action'],
    readTimeMs?: number
  ): Promise<void> {
    this.status = { ...this.status, status: 'running', lastAction: `Tracking ${action}` }

    const behavior: UserBehavior = {
      articleId: article.id,
      action,
      timestamp: new Date().toISOString(),
      readTimeMs,
      categories: article.categories,
      source: article.source,
      articleTitle: article.title
    }

    this.behaviors.push(behavior)
    this.saveToStorage()

    // Embed article for semantic search if OpenAI available and action is significant
    if (openaiService.hasApiKey() && ['save', 'read_full', 'ask'].includes(action)) {
      const articleText = `${article.title}. ${article.summary}. Categories: ${article.categories.join(', ')}`
      await vectorStore.addVector(article.id, articleText, {
        type: 'article',
        sourceId: article.id,
        timestamp: new Date().toISOString(),
        action,
        source: article.source
      })
    }

    await this.updatePreferences()

    this.status = {
      ...this.status,
      status: 'idle',
      lastAction: `Tracked ${action} on "${article.title.slice(0, 30)}..."`,
      timestamp: new Date().toISOString(),
      metrics: { totalInteractions: this.behaviors.length },
      semanticEnabled: openaiService.hasApiKey()
    }

    this.reportToDashboard()
  }

  // Update user preferences based on behavior
  private async updatePreferences(): Promise<void> {
    const categoryScores: Record<string, number> = {}
    const sourceScores: Record<string, number> = {}
    let totalReadTime = 0
    let readCount = 0

    const now = Date.now()
    this.behaviors.forEach((behavior) => {
      const age = now - new Date(behavior.timestamp).getTime()
      const ageInDays = age / (1000 * 60 * 60 * 24)
      const weight = Math.pow(this.decayFactor, ageInDays)

      const actionWeight = {
        'open': 1,
        'save': 3,
        'unsave': -1,
        'ask': 2,
        'read_full': 2.5,
        'click_source': 0.5
      }[behavior.action] || 1

      const finalWeight = weight * actionWeight

      behavior.categories?.forEach(cat => {
        categoryScores[cat] = (categoryScores[cat] || 0) + finalWeight
      })

      if (behavior.source) {
        sourceScores[behavior.source] = (sourceScores[behavior.source] || 0) + finalWeight
      }

      if (behavior.readTimeMs) {
        totalReadTime += behavior.readTimeMs
        readCount++
      }
    })

    this.preferences.topCategories = Object.entries(categoryScores)
      .map(([category, score]) => ({ category, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    this.preferences.topSources = Object.entries(sourceScores)
      .map(([source, score]) => ({ source, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    this.preferences.readingPatterns = {
      avgReadTimeMs: readCount > 0 ? totalReadTime / readCount : 0,
      preferredTimeOfDay: this.calculatePreferredTime(),
      totalArticlesRead: this.behaviors.filter(b => b.action === 'read_full' || b.action === 'open').length
    }

    this.preferences.lastUpdated = new Date().toISOString()
    this.savePreferences()
  }

  private calculatePreferredTime(): string {
    const hourCounts: Record<string, number> = {
      'morning': 0,
      'afternoon': 0,
      'evening': 0,
      'night': 0
    }

    this.behaviors.forEach(b => {
      const hour = new Date(b.timestamp).getHours()
      if (hour >= 6 && hour < 12) hourCounts['morning']++
      else if (hour >= 12 && hour < 18) hourCounts['afternoon']++
      else if (hour >= 18) hourCounts['evening']++
      else hourCounts['night']++
    })

    return Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'morning'
  }

  // Score an article based on user preferences (keyword-based)
  scoreArticle(article: Article): number {
    let score = article.relevanceScore || 0.5

    const categoryBoost = article.categories.reduce((boost, cat) => {
      const pref = this.preferences.topCategories.find(p =>
        p.category.toLowerCase() === cat.toLowerCase()
      )
      return boost + (pref ? pref.score * 0.1 : 0)
    }, 0)

    const sourcePref = this.preferences.topSources.find(p =>
      p.source.toLowerCase() === article.source.toLowerCase()
    )
    const sourceBoost = sourcePref ? sourcePref.score * 0.15 : 0

    score = Math.min(1, score + categoryBoost + sourceBoost)
    return score
  }

  // SEMANTIC SCORING: Score article based on similarity to liked articles
  async scoreArticleSemantic(article: Article): Promise<number> {
    if (!openaiService.hasApiKey()) {
      return this.scoreArticle(article)
    }

    // Get base score
    let score = this.scoreArticle(article)

    // Get similar articles from user's history
    const articleText = `${article.title}. ${article.summary}`
    const similar = await vectorStore.search(articleText, {
      topK: 5,
      type: 'article',
      minSimilarity: 0.5
    })

    // Boost score based on similarity to liked articles
    if (similar.length > 0) {
      const avgSimilarity = similar.reduce((sum, s) => sum + s.similarity, 0) / similar.length
      score += avgSimilarity * 0.3 // Up to 30% boost from semantic similarity
    }

    return Math.min(1, score)
  }

  // Get personalized "Top Picks" (keyword-based, fast)
  getTopPicks(articles: Article[], count: number = 5): Article[] {
    const scored = articles.map(article => ({
      article,
      personalScore: this.scoreArticle(article)
    }))

    return scored
      .sort((a, b) => b.personalScore - a.personalScore)
      .slice(0, count)
      .map(s => s.article)
  }

  // SEMANTIC TOP PICKS: Get personalized picks using embeddings
  async getTopPicksSemantic(articles: Article[], count: number = 5): Promise<Article[]> {
    if (!openaiService.hasApiKey()) {
      return this.getTopPicks(articles, count)
    }

    this.status = { ...this.status, status: 'running', lastAction: 'Computing semantic recommendations' }

    // Score all articles with semantic similarity
    const scoredPromises = articles.map(async article => ({
      article,
      personalScore: await this.scoreArticleSemantic(article)
    }))

    const scored = await Promise.all(scoredPromises)

    this.status = { ...this.status, status: 'idle', lastAction: 'Semantic recommendations ready' }

    return scored
      .sort((a, b) => b.personalScore - a.personalScore)
      .slice(0, count)
      .map(s => s.article)
  }

  // Find articles similar to a given article
  async findSimilarArticles(article: Article, allArticles: Article[], count: number = 5): Promise<Article[]> {
    if (!openaiService.hasApiKey()) {
      // Fallback to category matching
      return allArticles
        .filter(a => a.id !== article.id)
        .filter(a => a.categories.some(cat => article.categories.includes(cat)))
        .slice(0, count)
    }

    const results = await vectorStore.findSimilarArticles(article.id, count)
    const similarIds = results.map(r => r.entry.id)

    return allArticles.filter(a => similarIds.includes(a.id))
  }

  // Get current preferences
  getPreferences(): UserPreferences {
    return this.preferences
  }

  // Get agent status
  getStatus(): AgentStatus {
    return {
      ...this.status,
      actionsTracked: this.behaviors.length,
      semanticEnabled: openaiService.hasApiKey()
    }
  }

  // Embed all existing interactions
  async embedAllInteractions(articles: Article[]): Promise<number> {
    if (!openaiService.hasApiKey()) return 0

    // Get articles user has interacted with significantly
    const significantActions = this.behaviors.filter(b =>
      ['save', 'read_full', 'ask'].includes(b.action)
    )
    const interactedIds = [...new Set(significantActions.map(b => b.articleId))]

    const toEmbed = articles.filter(a =>
      interactedIds.includes(a.id) && !vectorStore.hasEmbedding(a.id)
    )

    if (toEmbed.length === 0) return 0

    const items = toEmbed.map(article => ({
      id: article.id,
      text: `${article.title}. ${article.summary}. Categories: ${article.categories.join(', ')}`,
      metadata: {
        type: 'article' as const,
        sourceId: article.id,
        timestamp: new Date().toISOString(),
        source: article.source
      }
    }))

    return await vectorStore.addVectors(items)
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
}

export const behaviorAgent = new BehaviorAgentService()
