import { Zap } from 'lucide-react'
import type { Article } from '../types'
import { ArticleCard } from './ArticleCard'
import { behaviorAgent } from '../services/behaviorAgent'

interface TopPicksProps {
  articles: Article[]
  onAskAbout: (article: Article) => void
  onReadMore: (article: Article) => void
}

export function TopPicks({ articles, onAskAbout, onReadMore }: TopPicksProps) {
  // Get personalized top picks from behavior agent
  const topPicks = behaviorAgent.getTopPicks(articles, 4)
  const preferences = behaviorAgent.getPreferences()

  if (topPicks.length === 0) return null

  // Get top interests for display
  const topInterests = preferences.topCategories.slice(0, 3).map(c => c.category)

  return (
    <section className="mb-8 animate-in">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[--gray-4] flex items-center justify-center">
            <Zap className="w-4 h-4 text-[--gray-11]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[--gray-12]">
              Picked for You
            </h2>
            <p className="text-[12px] text-[--gray-8]">
              Based on your reading patterns
              {topInterests.length > 0 && (
                <span className="text-[--gray-10] ml-1">
                  · {topInterests.join(', ')}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Top Picks Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {topPicks.map(article => (
          <ArticleCard
            key={article.id}
            article={article}
            onAskAbout={onAskAbout}
            onReadMore={onReadMore}
            compact
          />
        ))}
      </div>

      {/* Learning indicator */}
      {preferences.readingPatterns.totalArticlesRead > 0 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[--gray-8]">
          <div className="status-dot active" />
          <span>
            Learning from {preferences.readingPatterns.totalArticlesRead} articles ·
            You prefer reading in the {preferences.readingPatterns.preferredTimeOfDay}
          </span>
        </div>
      )}
    </section>
  )
}
