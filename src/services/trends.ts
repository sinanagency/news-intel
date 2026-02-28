/**
 * Trend Detection Service
 * Identifies trending topics and emerging patterns in news
 */

import type { Article } from '../types'

export interface Trend {
  id: string
  keyword: string
  score: number
  growth: number // percentage change
  articleCount: number
  articleIds: string[]
  category: string
  firstSeen: string
  lastSeen: string
}

export interface TrendAnalysis {
  trending: Trend[]
  emerging: Trend[]
  declining: Trend[]
  analyzedAt: string
}

class TrendService {
  private previousAnalysis: Map<string, { count: number; time: string }> = new Map()

  analyze(articles: Article[]): TrendAnalysis {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    // Get recent articles
    const recentArticles = articles.filter(a =>
      new Date(a.publishedAt) > last48h
    )

    // Extract keywords from titles and categories
    const keywordCounts = new Map<string, {
      count: number
      articleIds: string[]
      category: string
      firstSeen: Date
      lastSeen: Date
      recent: number // count in last 24h
    }>()

    recentArticles.forEach(article => {
      const keywords = this.extractKeywords(article)
      const isRecent = new Date(article.publishedAt) > last24h

      keywords.forEach(keyword => {
        const existing = keywordCounts.get(keyword) || {
          count: 0,
          articleIds: [],
          category: article.categories[0] || 'General',
          firstSeen: new Date(article.publishedAt),
          lastSeen: new Date(article.publishedAt),
          recent: 0
        }

        existing.count++
        existing.articleIds.push(article.id)
        if (isRecent) existing.recent++

        if (new Date(article.publishedAt) < existing.firstSeen) {
          existing.firstSeen = new Date(article.publishedAt)
        }
        if (new Date(article.publishedAt) > existing.lastSeen) {
          existing.lastSeen = new Date(article.publishedAt)
        }

        keywordCounts.set(keyword, existing)
      })
    })

    // Calculate trends
    const trends: Trend[] = []

    keywordCounts.forEach((data, keyword) => {
      if (data.count < 2) return // Need at least 2 mentions

      const previousData = this.previousAnalysis.get(keyword)
      let growth = 0

      if (previousData) {
        const prevCount = previousData.count
        growth = prevCount > 0 ? ((data.count - prevCount) / prevCount) * 100 : 100
      } else if (data.count >= 2) {
        growth = 100 // New trend
      }

      // Score based on count, recency, and growth
      const recencyBoost = data.recent / Math.max(data.count, 1)
      const score = data.count * (1 + recencyBoost) * (1 + Math.min(growth, 200) / 100)

      trends.push({
        id: crypto.randomUUID(),
        keyword,
        score,
        growth: Math.round(growth),
        articleCount: data.count,
        articleIds: data.articleIds.slice(0, 10),
        category: data.category,
        firstSeen: data.firstSeen.toISOString(),
        lastSeen: data.lastSeen.toISOString()
      })

      // Update previous analysis for next comparison
      this.previousAnalysis.set(keyword, {
        count: data.count,
        time: now.toISOString()
      })
    })

    // Sort and categorize
    trends.sort((a, b) => b.score - a.score)

    const trending = trends
      .filter(t => t.score > 5 && t.articleCount >= 3)
      .slice(0, 10)

    const emerging = trends
      .filter(t => t.growth > 50 && t.articleCount >= 2)
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 5)

    const declining = trends
      .filter(t => t.growth < -20)
      .sort((a, b) => a.growth - b.growth)
      .slice(0, 5)

    return {
      trending,
      emerging,
      declining,
      analyzedAt: now.toISOString()
    }
  }

  private extractKeywords(article: Article): string[] {
    const keywords: string[] = []

    // Add categories
    keywords.push(...article.categories)

    // Extract significant words from title
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'that', 'which', 'who', 'whom', 'this',
      'these', 'those', 'it', 'its', 'they', 'their', 'we', 'our', 'you', 'your',
      'he', 'his', 'she', 'her', 'new', 'how', 'why', 'what', 'when', 'where'
    ])

    const titleWords = article.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))

    // Get bigrams (two-word phrases)
    for (let i = 0; i < titleWords.length - 1; i++) {
      const bigram = `${titleWords[i]} ${titleWords[i + 1]}`
      keywords.push(bigram)
    }

    // Get significant single words
    keywords.push(...titleWords.slice(0, 5))

    return [...new Set(keywords)]
  }

  // Get trend alerts (new significant trends)
  getAlerts(analysis: TrendAnalysis): string[] {
    const alerts: string[] = []

    analysis.emerging.slice(0, 3).forEach(trend => {
      if (trend.growth > 100) {
        alerts.push(`📈 "${trend.keyword}" is surging (+${trend.growth}%)`)
      }
    })

    analysis.trending.slice(0, 2).forEach(trend => {
      if (trend.articleCount >= 5) {
        alerts.push(`🔥 "${trend.keyword}" is trending (${trend.articleCount} stories)`)
      }
    })

    return alerts
  }
}

export const trendService = new TrendService()
