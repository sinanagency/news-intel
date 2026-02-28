import { RefreshCw, Newspaper, Bookmark, MessageSquare, Settings, Zap, BarChart3, Headphones } from 'lucide-react'
import { useStore } from '../store'
import { formatDistanceToNow } from 'date-fns'

interface HeaderProps {
  onRefresh: () => void
  onOpenBriefing?: () => void
}

export function Header({ onRefresh, onOpenBriefing }: HeaderProps) {
  const { activeTab, setActiveTab, isFetching, lastFetchTime, articles } = useStore()

  const tabs = [
    { id: 'today' as const, label: 'Feed', icon: Zap, count: articles.filter(a => !a.saved).length },
    { id: 'saved' as const, label: 'Saved', icon: Bookmark, count: articles.filter(a => a.saved).length },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'chat' as const, label: 'Ask AI', icon: MessageSquare },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ]

  return (
    <header className="sticky top-0 z-40 glass border-b border-[--border-subtle]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Top row */}
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[--gray-12] flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-[--gray-1]" />
            </div>
            <span className="text-[15px] font-semibold text-[--gray-12]">NewsIntel</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {lastFetchTime && (
              <span className="hidden sm:block text-xs text-[--gray-9]">
                Updated {formatDistanceToNow(new Date(lastFetchTime), { addSuffix: true })}
              </span>
            )}

            {onOpenBriefing && articles.length > 0 && (
              <button
                onClick={onOpenBriefing}
                className="btn btn-secondary h-8 px-3 text-[13px]"
                title="Daily Briefing"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Briefing</span>
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={isFetching}
              className="btn btn-secondary h-8 px-3 text-[13px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isFetching ? 'Fetching...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[--gray-12]'
                  : 'text-[--gray-9] hover:text-[--gray-11]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-[11px] font-medium rounded ${
                  activeTab === tab.id
                    ? 'bg-[--gray-12] text-[--gray-1]'
                    : 'bg-[--gray-5] text-[--gray-10]'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="tab-indicator" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
