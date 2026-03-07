import { Bell, MessageCircle, Settings, Bookmark, TrendingUp, Clock } from 'lucide-react'
import { useStore } from '../../store'
import { formatDistanceToNow } from 'date-fns'

export function RightPanel() {
  const { articles, lastFetchTime } = useStore()

  const savedArticles = articles.filter(a => a.saved).slice(0, 4)
  const recentArticles = articles.slice(0, 4)
  const topCategories = getTopCategories(articles)

  return (
    <div className="right-panel">
      {/* Header icons */}
      <div className="right-panel-header">
        <button className="header-icon-btn" title="Notifications">
          <Bell className="w-5 h-5" />
        </button>
        <button className="header-icon-btn" title="Messages">
          <MessageCircle className="w-5 h-5" />
        </button>
        <button className="header-icon-btn" title="Settings">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="right-panel-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="profile-avatar-inner">NI</div>
          </div>
          <div className="profile-name">NewsIntel</div>
          <div className="profile-handle">@news_intel</div>
        </div>

        {/* Saved Articles */}
        {savedArticles.length > 0 && (
          <div className="activity-section">
            <div className="activity-header">
              <div className="activity-title">Saved Articles</div>
              <div className="activity-see-all">See all</div>
            </div>
            {savedArticles.map(article => (
              <div key={article.id} className="activity-item">
                <div className="activity-avatar">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div className="activity-text">
                  <div className="activity-name" style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '180px'
                  }}>
                    {article.title}
                  </div>
                  <div className="activity-time">
                    {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trending Categories */}
        {topCategories.length > 0 && (
          <div className="activity-section">
            <div className="activity-header">
              <div className="activity-title">Your Interests</div>
              <div className="activity-see-all">See all</div>
            </div>
            {topCategories.map((cat, i) => (
              <div key={cat.name} className="activity-item">
                <div className="activity-avatar" style={{
                  background: i === 0 ? 'linear-gradient(135deg, var(--accent), var(--pink))' :
                             i === 1 ? 'linear-gradient(135deg, var(--cyan), var(--accent))' :
                             i === 2 ? 'linear-gradient(135deg, var(--pink), var(--accent))' :
                             'var(--gray-5)',
                  color: i < 3 ? 'white' : 'var(--gray-10)'
                }}>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="activity-text">
                  <div className="activity-name">{cat.name}</div>
                  <div className="activity-time">{cat.count} articles</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Activity */}
        <div className="activity-section">
          <div className="activity-header">
            <div className="activity-title">Recent Activity</div>
            <div className="activity-see-all">See all</div>
          </div>
          {lastFetchTime && (
            <div className="activity-item">
              <div className="activity-avatar">
                <Clock className="w-4 h-4" />
              </div>
              <div className="activity-text">
                <div className="activity-name">Feed Updated</div>
                <div className="activity-time">
                  {formatDistanceToNow(new Date(lastFetchTime), { addSuffix: true })}
                </div>
              </div>
            </div>
          )}
          {recentArticles.slice(0, 2).map(article => (
            <div key={article.id} className="activity-item">
              <div className="activity-avatar">
                {article.source.charAt(0)}
              </div>
              <div className="activity-text">
                <div className="activity-name" style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '180px'
                }}>
                  {article.source}
                </div>
                <div className="activity-time">
                  {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getTopCategories(articles: { categories: string[] }[]) {
  const counts: Record<string, number> = {}
  articles.forEach(a => {
    a.categories.forEach(cat => {
      counts[cat] = (counts[cat] || 0) + 1
    })
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }))
}
