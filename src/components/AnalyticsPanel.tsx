import { useMemo } from 'react'
import { useStore } from '../store'
import { behaviorAgent } from '../services/behaviorAgent'
import { memoryAgent } from '../services/memoryAgent'
import { trendService } from '../services/trends'
import { Clock, BookmarkCheck, MessageSquare, Zap, Brain, BarChart3, TrendingUp, Sparkles } from 'lucide-react'
import { subDays, startOfDay, isAfter } from 'date-fns'

export function AnalyticsPanel() {
  const { articles, messages } = useStore()
  const preferences = behaviorAgent.getPreferences()
  const memoryStatus = memoryAgent.getStatus()
  const trendAnalysis = useMemo(() => trendService.analyze(articles), [articles])

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = new Date()
    const last7Days = subDays(now, 7)

    // Articles stats
    const totalArticles = articles.length
    const savedArticles = articles.filter(a => a.saved).length
    const recentArticles = articles.filter(a => isAfter(new Date(a.publishedAt), last7Days)).length
    const todayArticles = articles.filter(a => isAfter(new Date(a.publishedAt), startOfDay(now))).length

    // Engagement rate (saved / total)
    const engagementRate = totalArticles > 0 ? (savedArticles / totalArticles) * 100 : 0

    // Category breakdown
    const categoryCount: Record<string, number> = {}
    articles.forEach(a => {
      a.categories.forEach(cat => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1
      })
    })
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)

    // Source breakdown
    const sourceCount: Record<string, number> = {}
    articles.forEach(a => {
      sourceCount[a.source] = (sourceCount[a.source] || 0) + 1
    })
    const topSources = Object.entries(sourceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    // Reading activity by hour
    const hourlyActivity = Array(24).fill(0)
    articles.forEach(a => {
      const hour = new Date(a.publishedAt).getHours()
      hourlyActivity[hour]++
    })

    // Conversations
    const totalConversations = messages.length
    const userMessages = messages.filter(m => m.role === 'user').length
    const aiResponses = messages.filter(m => m.role === 'assistant').length

    return {
      totalArticles,
      savedArticles,
      recentArticles,
      todayArticles,
      engagementRate,
      topCategories,
      topSources,
      hourlyActivity,
      totalConversations,
      userMessages,
      aiResponses
    }
  }, [articles, messages])

  // Chart bar helper
  const maxCategoryCount = Math.max(...analytics.topCategories.map(c => c[1]), 1)
  const maxSourceCount = Math.max(...analytics.topSources.map(s => s[1]), 1)
  const maxHourlyCount = Math.max(...analytics.hourlyActivity, 1)

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-in">
      <div className="mb-8">
        <h2 className="text-[20px] font-semibold text-[--gray-12] mb-1">Analytics</h2>
        <p className="text-[13px] text-[--gray-9]">Your reading patterns and engagement metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium text-[--gray-9]">Total Articles</span>
            <div className="w-8 h-8 rounded-lg bg-[--gray-4] flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[--gray-11]" />
            </div>
          </div>
          <p className="metric-value">{analytics.totalArticles}</p>
          <p className="metric-label">{analytics.todayArticles} today</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium text-[--gray-9]">Saved</span>
            <div className="w-8 h-8 rounded-lg bg-[--accent-muted] flex items-center justify-center">
              <BookmarkCheck className="w-4 h-4 text-[--accent]" />
            </div>
          </div>
          <p className="metric-value">{analytics.savedArticles}</p>
          <p className={`metric-change ${analytics.engagementRate > 10 ? 'positive' : ''}`}>
            {analytics.engagementRate.toFixed(1)}% engagement
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium text-[--gray-9]">AI Conversations</span>
            <div className="w-8 h-8 rounded-lg bg-[--success-muted] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[--success]" />
            </div>
          </div>
          <p className="metric-value">{analytics.userMessages}</p>
          <p className="metric-label">{analytics.aiResponses} responses</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium text-[--gray-9]">Memory Bank</span>
            <div className="w-8 h-8 rounded-lg bg-[--warning-muted] flex items-center justify-center">
              <Brain className="w-4 h-4 text-[--warning]" />
            </div>
          </div>
          <p className="metric-value">{memoryStatus.totalMemories}</p>
          <p className="metric-label">insights learned</p>
        </div>
      </div>

      {/* Trends Section */}
      {(trendAnalysis.trending.length > 0 || trendAnalysis.emerging.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Trending Now */}
          <div className="chart-container">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[--success]" />
              <h3 className="text-[14px] font-medium text-[--gray-12]">Trending Now</h3>
            </div>
            <div className="space-y-2">
              {trendAnalysis.trending.slice(0, 5).map((trend, i) => (
                <div key={trend.id} className="flex items-center justify-between p-2 bg-[--gray-3] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[--gray-8] w-4">{i + 1}</span>
                    <span className="text-[13px] text-[--gray-11]">{trend.keyword}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[--gray-8]">{trend.articleCount} stories</span>
                    {trend.growth > 0 && (
                      <span className="text-[10px] text-[--success] flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" />
                        {trend.growth}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {trendAnalysis.trending.length === 0 && (
                <p className="text-[12px] text-[--gray-8] text-center py-4">No trends detected yet</p>
              )}
            </div>
          </div>

          {/* Emerging Topics */}
          <div className="chart-container">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[--warning]" />
              <h3 className="text-[14px] font-medium text-[--gray-12]">Emerging Topics</h3>
            </div>
            <div className="space-y-2">
              {trendAnalysis.emerging.slice(0, 5).map((trend) => (
                <div key={trend.id} className="flex items-center justify-between p-2 bg-[--gray-3] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[--gray-11]">{trend.keyword}</span>
                    <span className="badge badge-green text-[10px]">New</span>
                  </div>
                  <span className="text-[11px] text-[--success] flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    +{trend.growth}%
                  </span>
                </div>
              ))}
              {trendAnalysis.emerging.length === 0 && (
                <p className="text-[12px] text-[--gray-8] text-center py-4">No emerging topics</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Top Categories */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-medium text-[--gray-12]">Top Categories</h3>
            <span className="text-[11px] text-[--gray-8]">{analytics.topCategories.length} topics</span>
          </div>
          <div className="space-y-3">
            {analytics.topCategories.map(([category, count]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] text-[--gray-11]">{category}</span>
                  <span className="text-[12px] text-[--gray-8]">{count}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {analytics.topCategories.length === 0 && (
              <p className="text-[13px] text-[--gray-8] text-center py-4">No data yet</p>
            )}
          </div>
        </div>

        {/* Top Sources */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-medium text-[--gray-12]">News Sources</h3>
            <span className="text-[11px] text-[--gray-8]">{analytics.topSources.length} sources</span>
          </div>
          <div className="space-y-3">
            {analytics.topSources.map(([source, count]) => (
              <div key={source}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] text-[--gray-11]">{source}</span>
                  <span className="text-[12px] text-[--gray-8]">{count}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(count / maxSourceCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {analytics.topSources.length === 0 && (
              <p className="text-[13px] text-[--gray-8] text-center py-4">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Activity */}
      <div className="chart-container mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-medium text-[--gray-12]">Publication Times</h3>
          <span className="text-[11px] text-[--gray-8]">24 hour distribution</span>
        </div>
        <div className="flex items-end gap-1 h-24">
          {analytics.hourlyActivity.map((count, hour) => (
            <div
              key={hour}
              className="flex-1 bg-[--accent] rounded-t opacity-80 hover:opacity-100 transition-opacity relative group"
              style={{
                height: `${Math.max((count / maxHourlyCount) * 100, 4)}%`,
                minHeight: '4px'
              }}
            >
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="tooltip">
                  {hour}:00 - {count}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-[--gray-8]">
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>12am</span>
        </div>
      </div>

      {/* Learning Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Your Interests */}
        <div className="chart-container">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-[--warning]" />
            <h3 className="text-[14px] font-medium text-[--gray-12]">Learned Interests</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {preferences.topCategories.slice(0, 12).map((cat, i) => (
              <span
                key={cat.category}
                className="px-2.5 py-1 text-[12px] bg-[--gray-4] text-[--gray-11] rounded-md"
                style={{ opacity: 1 - (i * 0.06) }}
              >
                {cat.category}
              </span>
            ))}
            {preferences.topCategories.length === 0 && (
              <p className="text-[13px] text-[--gray-8]">Start reading to build your profile</p>
            )}
          </div>
        </div>

        {/* Reading Pattern */}
        <div className="chart-container">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[--accent]" />
            <h3 className="text-[14px] font-medium text-[--gray-12]">Reading Patterns</h3>
          </div>
          <div className="space-y-3 text-[13px] text-[--gray-10]">
            <div className="flex justify-between">
              <span>Total articles read</span>
              <span className="text-[--gray-12] font-medium">{preferences.readingPatterns.totalArticlesRead}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg reading time</span>
              <span className="text-[--gray-12] font-medium">
                {preferences.readingPatterns.avgReadTimeMs > 0
                  ? `${Math.round(preferences.readingPatterns.avgReadTimeMs / 60000)} min`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Preferred time</span>
              <span className="text-[--gray-12] font-medium capitalize">
                {preferences.readingPatterns.preferredTimeOfDay || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Actions tracked</span>
              <span className="text-[--gray-12] font-medium">{behaviorAgent.getStatus().actionsTracked}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
