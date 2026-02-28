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
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="logo-mark">
              <Newspaper className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[15px] font-semibold text-[--gray-white] tracking-tight">NewsIntel</span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-medium text-[--gray-8] bg-[--gray-4] px-1.5 py-0.5 rounded">
                BETA
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {lastFetchTime && (
              <span className="hidden md:flex items-center gap-1.5 text-[12px] text-[--gray-9]">
                <span className="status-dot active"></span>
                Updated {formatDistanceToNow(new Date(lastFetchTime), { addSuffix: true })}
              </span>
            )}

            {onOpenBriefing && articles.length > 0 && (
              <button
                onClick={onOpenBriefing}
                className="btn btn-secondary h-9 px-3.5 text-[13px] gap-2"
                title="Daily Briefing"
              >
                <Headphones className="w-4 h-4" />
                <span className="hidden sm:inline">Briefing</span>
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={isFetching}
              className="btn btn-accent h-9 px-4 text-[13px] gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isFetching ? 'Fetching...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[--gray-white]'
                  : 'text-[--gray-9] hover:text-[--gray-11] hover:bg-[--gray-4]/50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[--accent-lighter]' : ''}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-[--accent-muted] text-[--accent-lighter]'
                    : 'bg-[--gray-5] text-[--gray-10]'
                }`}>
                  {tab.count > 99 ? '99+' : tab.count}
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
