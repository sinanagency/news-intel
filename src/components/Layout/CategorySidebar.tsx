import { useState } from 'react'
import { Home, Bookmark, Search, RefreshCw, Headphones } from 'lucide-react'
import { useStore } from '../../store'

interface CategorySidebarProps {
  onRefresh: () => void
  onOpenBriefing?: () => void
}

export function CategorySidebar({ onRefresh, onOpenBriefing }: CategorySidebarProps) {
  const { activeTab, setActiveTab, articles, isFetching } = useStore()
  const [searchQuery, setSearchQuery] = useState('')

  const feedCount = articles.filter(a => !a.saved).length
  const savedCount = articles.filter(a => a.saved).length

  return (
    <div className="category-sidebar">
      {/* Search */}
      <div className="sidebar-header">
        <div className="sidebar-search-wrap">
          <Search className="sidebar-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="sidebar-search"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Main */}
        <div className="nav-section">
          <div
            className={`nav-item ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            <Home className="nav-icon" />
            <span>Feed</span>
            {feedCount > 0 && <span className="nav-badge">{feedCount}</span>}
          </div>
          <div
            className={`nav-item ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <Bookmark className="nav-icon" />
            <span>Saved</span>
            {savedCount > 0 && <span className="nav-badge">{savedCount}</span>}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="nav-section">
          <div className="nav-section-title">Actions</div>
          <div
            className="nav-item"
            onClick={onRefresh}
          >
            <RefreshCw className={`nav-icon ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Fetching...' : 'Refresh'}</span>
          </div>
          {onOpenBriefing && articles.length > 0 && (
            <div
              className="nav-item"
              onClick={onOpenBriefing}
            >
              <Headphones className="nav-icon" />
              <span>Briefing</span>
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
