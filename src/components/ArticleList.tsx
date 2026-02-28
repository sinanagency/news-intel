import { useStore } from '../store'
import { ArticleCard } from './ArticleCard'
import { TopPicks } from './TopPicks'
import { RefreshCw, Inbox } from 'lucide-react'
import type { Article } from '../types'
import { behaviorAgent } from '../services/behaviorAgent'

interface ArticleListProps {
  onAskAbout: (article: Article) => void
  onRefresh: () => void
  onReadMore: (article: Article) => void
}

export function ArticleList({ onAskAbout, onRefresh, onReadMore }: ArticleListProps) {
  const { articles, activeTab, isFetching } = useStore()

  const filteredArticles = activeTab === 'saved'
    ? articles.filter(a => a.saved)
    : articles.filter(a => !a.saved)

  // Personalize sort using behavior agent
  const sortedArticles = activeTab === 'today'
    ? behaviorAgent.getTopPicks(filteredArticles, filteredArticles.length)
    : filteredArticles

  if (sortedArticles.length === 0) {
    return (
      <div className="empty-state animate-in">
        <div className="w-12 h-12 rounded-xl bg-[--gray-4] flex items-center justify-center mb-4">
          <Inbox className="empty-state-icon w-6 h-6" />
        </div>
        <h3 className="empty-state-title">
          {activeTab === 'saved' ? 'No saved articles' : 'Your feed is empty'}
        </h3>
        <p className="empty-state-description">
          {activeTab === 'saved'
            ? 'Save articles by clicking the bookmark icon. They\'ll appear here for easy access.'
            : 'Click refresh to fetch the latest news. We\'ll learn your preferences as you read.'}
        </p>
        {activeTab !== 'saved' && (
          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="btn btn-primary mt-6"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Fetching...' : 'Fetch News'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Top Picks Section (only on Today tab) */}
      {activeTab === 'today' && sortedArticles.length >= 4 && (
        <TopPicks
          articles={sortedArticles}
          onAskAbout={onAskAbout}
          onReadMore={onReadMore}
        />
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[17px] font-semibold text-[--gray-12]">
            {activeTab === 'saved' ? 'Saved Articles' : 'All Stories'}
          </h2>
          <p className="text-[13px] text-[--gray-9] mt-0.5">
            {sortedArticles.length} article{sortedArticles.length !== 1 ? 's' : ''}
            {activeTab === 'today' && ' · Personalized for you'}
          </p>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {sortedArticles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onAskAbout={onAskAbout}
            onReadMore={onReadMore}
          />
        ))}
      </div>
    </div>
  )
}
