import { RefreshCw, Inbox, Zap, TrendingUp, Clock, Bookmark, Sparkles, Users } from 'lucide-react'
import { useStore } from '../../store'
import { formatDistanceToNow } from 'date-fns'
import type { Article } from '../../types'
import { behaviorAgent } from '../../services/behaviorAgent'

interface MainContentProps {
  onAskAbout: (article: Article) => void
  onRefresh: () => void
  onReadMore: (article: Article) => void
}

export function MainContent({ onAskAbout: _onAskAbout, onRefresh, onReadMore }: MainContentProps) {
  // _onAskAbout is available for future use in article actions
  void _onAskAbout
  const { articles, activeTab, isFetching } = useStore()

  const filteredArticles = activeTab === 'saved'
    ? articles.filter(a => a.saved)
    : articles.filter(a => !a.saved)

  const sortedArticles = activeTab === 'today'
    ? behaviorAgent.getTopPicks(filteredArticles, filteredArticles.length)
    : filteredArticles

  // Get top picks and remaining
  const topPicks = sortedArticles.slice(0, 2)
  const popularNow = sortedArticles.slice(2, 6)
  const recentAdd = sortedArticles.slice(6, 12)

  if (sortedArticles.length === 0) {
    return (
      <div className="main-content">
        <div className="main-content-inner">
          <div className="empty-state animate-in">
            <Inbox className="empty-state-icon" />
            <h3 className="empty-state-title">
              {activeTab === 'saved' ? 'No saved articles' : 'Your feed is empty'}
            </h3>
            <p className="empty-state-description">
              {activeTab === 'saved'
                ? 'Save articles by clicking the bookmark icon.'
                : 'Click refresh to fetch the latest news.'}
            </p>
            {activeTab !== 'saved' && (
              <button onClick={onRefresh} disabled={isFetching} className="btn btn-primary mt-6">
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Fetching...' : 'Fetch News'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const gradients = ['purple', 'pink', 'cyan', 'green'] as const
  const getGradient = (index: number) => gradients[index % gradients.length]

  return (
    <div className="main-content">
      <div className="main-content-inner">
        {/* Hero Banner */}
        <div className="hero-banner animate-in">
          <div className="hero-text">
            <h1 className="hero-title">Your Intelligence Feed</h1>
            <p className="hero-subtitle">
              {sortedArticles.length} articles personalized for you
            </p>
          </div>
        </div>

        {/* Featured / Top Picks */}
        {topPicks.length >= 2 && (
          <section className="content-section animate-slide-up">
            <div className="section-header">
              <h2 className="section-title">Featured Stories</h2>
              <span className="section-see-all">See all</span>
            </div>
            <div className="feature-cards-grid">
              {topPicks.map((article, i) => (
                <FeatureCard
                  key={article.id}
                  article={article}
                  gradient={getGradient(i)}
                  onClick={() => onReadMore(article)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Popular Right Now - Horizontal scroll */}
        {popularNow.length > 0 && (
          <section className="content-section">
            <div className="section-header">
              <h2 className="section-title">Popular Right Now</h2>
              <span className="section-see-all">See all</span>
            </div>
            <div className="horizontal-scroll">
              {popularNow.map((article, i) => (
                <ArticleCardNew
                  key={article.id}
                  article={article}
                  gradient={getGradient(i)}
                  onClick={() => onReadMore(article)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent Add - Compact list */}
        {recentAdd.length > 0 && (
          <section className="content-section">
            <div className="section-header">
              <h2 className="section-title">Recent Add</h2>
              <span className="section-see-all">See all</span>
            </div>
            <div className="compact-list">
              {recentAdd.map((article) => (
                <CompactItem
                  key={article.id}
                  article={article}
                  onClick={() => onReadMore(article)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// Feature Card - Large gradient cards
function FeatureCard({
  article,
  gradient,
  onClick
}: {
  article: Article
  gradient: 'purple' | 'pink' | 'cyan' | 'green'
  onClick: () => void
}) {
  const Icon = article.relevanceScore > 0.7 ? Sparkles :
               article.categories.includes('AI') ? Zap :
               article.categories.includes('fintech') ? TrendingUp :
               Users

  return (
    <div className={`feature-card ${gradient}-gradient`} onClick={onClick}>
      <div className="feature-card-icon">
        <Icon className="w-5 h-5" />
      </div>
      <div className="feature-card-content">
        <h3 className="feature-card-title">{article.title}</h3>
        <p className="feature-card-desc">{article.summary}</p>
        <div className="feature-card-meta">
          <span className="feature-card-stat">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
          </span>
          <span className="feature-card-stat">
            {article.source}
          </span>
        </div>
      </div>
    </div>
  )
}

// Article Card - For horizontal scroll
function ArticleCardNew({
  article,
  gradient,
  onClick
}: {
  article: Article
  gradient: 'purple' | 'pink' | 'cyan' | 'green'
  onClick: () => void
}) {
  const Icon = article.categories.includes('AI') ? Zap :
               article.categories.includes('fintech') ? TrendingUp :
               article.saved ? Bookmark :
               Sparkles

  return (
    <div className="article-card" onClick={onClick}>
      <div className="article-card-image">
        <div className={`article-card-gradient ${gradient}`} />
        <div className="article-card-icon">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="article-card-body">
        <h3 className="article-card-title">{article.title}</h3>
        <p className="article-card-summary">{article.summary}</p>
        <div className="article-card-footer">
          <span className="article-card-source">{article.source}</span>
          <span className="article-card-time">
            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  )
}

// Compact Item - For list view
function CompactItem({
  article,
  onClick
}: {
  article: Article
  onClick: () => void
}) {
  const relevance = article.relevanceScore > 0.7 ? 'high' :
                    article.relevanceScore > 0.4 ? 'medium' : 'low'

  return (
    <div className="compact-item" onClick={onClick}>
      <div className={`compact-item-indicator ${relevance}`} />
      <div className="compact-item-content">
        <div className="compact-item-title">{article.title}</div>
        <div className="compact-item-meta">
          {article.source} · {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
        </div>
      </div>
    </div>
  )
}
