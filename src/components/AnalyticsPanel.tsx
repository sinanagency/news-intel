import { useMemo } from 'react'
import { useStore } from '../store'
import { behaviorAgent } from '../services/behaviorAgent'
import { memoryAgent } from '../services/memoryAgent'
import { trendService } from '../services/trends'
import { BookmarkCheck, MessageSquare, Brain, BarChart3, TrendingUp, Sparkles, Activity } from 'lucide-react'
import { startOfDay, isAfter } from 'date-fns'

export function AnalyticsPanel() {
  const { articles, messages } = useStore()
  const preferences = behaviorAgent.getPreferences()
  const memoryStatus = memoryAgent.getStatus()
  const trendAnalysis = useMemo(() => trendService.analyze(articles), [articles])

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = new Date()

    // Articles stats
    const totalArticles = articles.length
    const savedArticles = articles.filter(a => a.saved).length
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
    const userMessages = messages.filter(m => m.role === 'user').length
    const aiResponses = messages.filter(m => m.role === 'assistant').length

    return {
      totalArticles,
      savedArticles,
      todayArticles,
      engagementRate,
      topCategories,
      topSources,
      hourlyActivity,
      userMessages,
      aiResponses
    }
  }, [articles, messages])

  // Chart bar helper
  const maxCategoryCount = Math.max(...analytics.topCategories.map(c => c[1]), 1)
  const maxSourceCount = Math.max(...analytics.topSources.map(s => s[1]), 1)
  const maxHourlyCount = Math.max(...analytics.hourlyActivity, 1)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-in">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="icon-container-accent">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h2 className="text-[22px] font-semibold text-[--gray-white]">Analytics</h2>
        </div>
        <p className="text-[14px] text-[--gray-9] ml-[52px]">Your reading patterns and engagement metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger-in">
        <div className="metric-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px] font-semibold text-[--gray-9] uppercase tracking-wide">Total Articles</span>
            <div className="icon-container">
              <BarChart3 className="w-4 h-4 text-[--gray-11]" />
            </div>
          </div>
          <p className="metric-value">{analytics.totalArticles}</p>
          <p className="metric-label">{analytics.todayArticles} added today</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px] font-semibold text-[--gray-9] uppercase tracking-wide">Saved</span>
            <div className="icon-container-accent">
              <BookmarkCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="metric-value">{analytics.savedArticles}</p>
          <p className={`metric-change ${analytics.engagementRate > 10 ? 'positive' : ''}`}>
            {analytics.engagementRate.toFixed(1)}% engagement
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px] font-semibold text-[--gray-9] uppercase tracking-wide">AI Chats</span>
            <div className="icon-container-success">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="metric-value">{analytics.userMessages}</p>
          <p className="metric-label">{analytics.aiResponses} responses</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px] font-semibold text-[--gray-9] uppercase tracking-wide">Memory</span>
            <div className="icon-container-warning">
              <Brain className="w-4 h-4" />
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
          <div className="section-card">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[--success-muted] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[--success]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[--gray-white]">Trending Now</h3>
            </div>
            <div className="space-y-2">
              {trendAnalysis.trending.slice(0, 5).map((trend, i) => (
                <div key={trend.id} className="feature-row py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-[--gray-5] flex items-center justify-center text-[11px] font-bold text-[--gray-10]">
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-medium text-[--gray-12]">{trend.keyword}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[--gray-8]">{trend.articleCount} stories</span>
                    {trend.growth > 0 && (
                      <span className="badge badge-green text-[10px]">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +{trend.growth}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {trendAnalysis.trending.length === 0 && (
                <p className="text-[13px] text-[--gray-8] text-center py-6">No trends detected yet</p>
              )}
            </div>
          </div>

          {/* Emerging Topics */}
          <div className="section-card">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[--warning-muted] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[--warning]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[--gray-white]">Emerging Topics</h3>
            </div>
            <div className="space-y-2">
              {trendAnalysis.emerging.slice(0, 5).map((trend) => (
                <div key={trend.id} className="feature-row py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[--gray-12]">{trend.keyword}</span>
                    <span className="badge badge-yellow text-[10px]">New</span>
                  </div>
                  <span className="badge badge-green text-[10px]">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{trend.growth}%
                  </span>
                </div>
              ))}
              {trendAnalysis.emerging.length === 0 && (
                <p className="text-[13px] text-[--gray-8] text-center py-6">No emerging topics</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Top Categories */}
        <div className="section-card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold text-[--gray-white]">Top Categories</h3>
            <span className="badge">{analytics.topCategories.length} topics</span>
          </div>
          <div className="space-y-4">
            {analytics.topCategories.map(([category, count]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium text-[--gray-11]">{category}</span>
                  <span className="text-[12px] font-semibold text-[--gray-9]">{count}</span>
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
              <p className="text-[13px] text-[--gray-8] text-center py-6">No data yet</p>
            )}
          </div>
        </div>

        {/* Top Sources */}
        <div className="section-card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold text-[--gray-white]">News Sources</h3>
            <span className="badge">{analytics.topSources.length} sources</span>
          </div>
          <div className="space-y-4">
            {analytics.topSources.map(([source, count]) => (
              <div key={source}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium text-[--gray-11]">{source}</span>
                  <span className="text-[12px] font-semibold text-[--gray-9]">{count}</span>
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
              <p className="text-[13px] text-[--gray-8] text-center py-6">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Activity */}
      <div className="section-card mb-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-semibold text-[--gray-white]">Publication Times</h3>
          <span className="badge">24h distribution</span>
        </div>
        <div className="flex items-end gap-1 h-28 px-2">
          {analytics.hourlyActivity.map((count, hour) => (
            <div
              key={hour}
              className="flex-1 bg-gradient-to-t from-[--accent] to-[--accent-lighter] rounded-t-sm relative group cursor-pointer transition-all hover:opacity-100"
              style={{
                height: `${Math.max((count / maxHourlyCount) * 100, 4)}%`,
                minHeight: '4px',
                opacity: count > 0 ? 0.7 + (count / maxHourlyCount) * 0.3 : 0.3
              }}
            >
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="tooltip">
                  {hour}:00 · {count} articles
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 px-2 text-[11px] text-[--gray-8]">
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>11pm</span>
        </div>
      </div>

      {/* Learning Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Your Interests */}
        <div className="section-card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[--accent-muted] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[--accent-lighter]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[--gray-white]">Learned Interests</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.topCategories.slice(0, 12).map((cat, i) => (
              <span
                key={cat.category}
                className="tag tag-accent"
                style={{ opacity: 1 - (i * 0.05) }}
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
        <div className="section-card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[--success-muted] flex items-center justify-center">
              <Activity className="w-4 h-4 text-[--success]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[--gray-white]">Reading Patterns</h3>
          </div>
          <div className="space-y-4">
            <div className="feature-row py-3">
              <span className="text-[13px] text-[--gray-10]">Total articles read</span>
              <span className="text-[14px] font-semibold text-[--gray-white]">{preferences.readingPatterns.totalArticlesRead}</span>
            </div>
            <div className="feature-row py-3">
              <span className="text-[13px] text-[--gray-10]">Avg reading time</span>
              <span className="text-[14px] font-semibold text-[--gray-white]">
                {preferences.readingPatterns.avgReadTimeMs > 0
                  ? `${Math.round(preferences.readingPatterns.avgReadTimeMs / 60000)} min`
                  : 'N/A'}
              </span>
            </div>
            <div className="feature-row py-3">
              <span className="text-[13px] text-[--gray-10]">Preferred time</span>
              <span className="text-[14px] font-semibold text-[--gray-white] capitalize">
                {preferences.readingPatterns.preferredTimeOfDay || 'N/A'}
              </span>
            </div>
            <div className="feature-row py-3">
              <span className="text-[13px] text-[--gray-10]">Actions tracked</span>
              <span className="text-[14px] font-semibold text-[--gray-white]">{behaviorAgent.getStatus().actionsTracked}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
