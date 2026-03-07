import { Newspaper, Zap, Bookmark, BarChart3, MessageSquare, Settings, Plus } from 'lucide-react'
import { useStore } from '../../store'

export function IconRail() {
  const { activeTab, setActiveTab } = useStore()

  const featureItems = [
    { id: 'today' as const, icon: Zap, label: 'Today' },
    { id: 'saved' as const, icon: Bookmark, label: 'Saved' },
    { id: 'analytics' as const, icon: BarChart3, label: 'Analytics' },
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
  ]

  return (
    <div className="icon-rail">
      {/* App Logo */}
      <div
        className={`icon-rail-item ${activeTab === 'today' ? 'active' : ''}`}
        onClick={() => setActiveTab('today')}
        title="NewsIntel"
      >
        <Newspaper className="w-5 h-5" />
      </div>

      <div className="icon-rail-divider" />

      {/* Feature icons */}
      {featureItems.map(item => (
        <div
          key={item.id}
          className={`icon-rail-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => setActiveTab(item.id)}
          title={item.label}
        >
          <item.icon className="w-5 h-5" />
        </div>
      ))}

      <div className="icon-rail-divider" />

      {/* Add button */}
      <div
        className="icon-rail-item"
        title="Add Interest"
      >
        <Plus className="w-5 h-5" />
      </div>

      {/* Bottom section */}
      <div className="icon-rail-bottom">
        <div
          className={`icon-rail-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
