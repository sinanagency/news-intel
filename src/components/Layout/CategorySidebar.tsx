import { Home, Cpu, Rocket, Building2, Globe2, TrendingUp, Headphones, RefreshCw } from 'lucide-react'
import { useStore } from '../../store'
import { AskBar } from '../AskBar'

interface CategorySidebarProps {
  onRefresh: () => void
  onOpenBriefing?: () => void
}

export function CategorySidebar({ onRefresh, onOpenBriefing }: CategorySidebarProps) {
  const { activeTab, setActiveTab, articles, isFetching, settings } = useStore()

  const feedCount = articles.filter(a => !a.saved).length

  return (
    <div className="category-sidebar">
      {/* Ask Bar - Master input */}
      <AskBar />

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Main Navigation */}
        <div className="nav-section">
          <div
            className={`nav-item ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            <Home className="nav-icon" />
            <span>Home</span>
            {feedCount > 0 && <span className="nav-badge">{feedCount}</span>}
          </div>
        </div>

        {/* Categories */}
        <div className="nav-section">
          <div className="nav-section-title">Categories</div>
          {settings.interests.slice(0, 6).map((interest, i) => {
            const icons = [Cpu, Rocket, Building2, Globe2, TrendingUp, Cpu]
            const Icon = icons[i % icons.length]
            return (
              <div
                key={interest}
                className="nav-item"
                onClick={() => setActiveTab('today')}
              >
                <Icon className="nav-icon" />
                <span>{interest}</span>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="nav-section">
          <div className="nav-section-title">Quick Actions</div>
          <div
            className="nav-item"
            onClick={onRefresh}
          >
            <RefreshCw className={`nav-icon ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Fetching...' : 'Refresh Feed'}</span>
          </div>
          {onOpenBriefing && articles.length > 0 && (
            <div
              className="nav-item"
              onClick={onOpenBriefing}
            >
              <Headphones className="nav-icon" />
              <span>Daily Briefing</span>
            </div>
          )}
        </div>
      </nav>

      {/* User bar at bottom */}
      <div className="user-bar">
        <div className="user-bar-content">
          <div className="user-avatar">NI</div>
          <div className="user-info">
            <div className="user-name">NewsIntel</div>
            <div className="user-status">Online</div>
          </div>
        </div>
      </div>
    </div>
  )
}
