import { Bookmark, BookmarkCheck, ExternalLink, MessageSquare, Clock, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Article } from '../types'
import { useStore } from '../store'
import { behaviorAgent } from '../services/behaviorAgent'

interface ArticleCardProps {
  article: Article
  onAskAbout?: (article: Article) => void
  onReadMore?: (article: Article) => void
  compact?: boolean
}

export function ArticleCard({ article, onAskAbout, onReadMore, compact = false }: ArticleCardProps) {
  const { updateArticle } = useStore()

  const toggleSaved = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateArticle(article.id, { saved: !article.saved })
    behaviorAgent.trackAction(article, article.saved ? 'unsave' : 'save')
  }

  const openExternal = (e: React.MouseEvent) => {
    e.stopPropagation()
    behaviorAgent.trackAction(article, 'click_source')
    window.open(article.url, '_blank')
  }

  const handleAsk = (e: React.MouseEvent) => {
    e.stopPropagation()
    behaviorAgent.trackAction(article, 'ask')
    onAskAbout?.(article)
  }

  const handleClick = () => {
    behaviorAgent.trackAction(article, 'open')
    onReadMore?.(article)
  }

  // Relevance indicator with glow
  const isHighRelevance = article.relevanceScore > 0.7
  const isMedRelevance = article.relevanceScore > 0.4

  if (compact) {
    return (
      <article
        onClick={handleClick}
        className="card card-interactive p-4 cursor-pointer group"
      >
        <div className="flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
            isHighRelevance ? 'bg-[--success] shadow-[0_0_8px_var(--success-glow)]' :
            isMedRelevance ? 'bg-[--warning] shadow-[0_0_8px_var(--warning-glow)]' :
            'bg-[--gray-7]'
          }`} />
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-medium text-[--gray-12] line-clamp-2 group-hover:text-[--accent-lighter] transition-colors">
              {article.title}
            </h4>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-medium text-[--gray-10]">{article.source}</span>
              <span className="text-[11px] text-[--gray-8]">
                {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      onClick={handleClick}
      className="card card-interactive card-glow p-5 cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="badge badge-blue">
            {article.source}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[--gray-8]">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
          </span>
        </div>
        {isHighRelevance && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[--success-subtle] border border-[--success-subtle]">
            <TrendingUp className="w-3 h-3 text-[--success]" />
            <span className="text-[10px] font-semibold text-[--success]">
              {Math.round(article.relevanceScore * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-[--gray-white] leading-snug mb-2 group-hover:text-[--accent-lighter] transition-colors">
        {article.title}
      </h3>

      {/* Summary */}
      <p className="text-[13px] text-[--gray-9] leading-relaxed mb-3 line-clamp-2">
        {article.summary}
      </p>

      {/* Key Points Preview */}
      {article.keyPoints.length > 0 && (
        <div className="mb-3 p-3 bg-gradient-to-br from-[--gray-3] to-[--gray-4]/50 rounded-lg border border-[--border-subtle]">
          <p className="text-[12px] text-[--gray-10] line-clamp-2 leading-relaxed">
            {article.keyPoints[0]}
          </p>
        </div>
      )}

      {/* Categories */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {article.categories.slice(0, 3).map((cat, i) => (
          <span
            key={i}
            className="tag"
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-4 border-t border-[--border-subtle]">
        <button
          onClick={toggleSaved}
          className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-lg transition-all ${
            article.saved
              ? 'text-[--accent-lighter] bg-[--accent-muted] shadow-[0_0_12px_var(--accent-subtle)]'
              : 'text-[--gray-10] hover:text-[--gray-12] hover:bg-[--gray-4]'
          }`}
        >
          {article.saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          {article.saved ? 'Saved' : 'Save'}
        </button>

        <button
          onClick={handleAsk}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[--gray-10] hover:text-[--gray-12] hover:bg-[--gray-4] rounded-lg transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          Ask AI
        </button>

        <button
          onClick={openExternal}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[--gray-10] hover:text-[--gray-12] hover:bg-[--gray-4] rounded-lg transition-all ml-auto"
        >
          <ExternalLink className="w-4 h-4" />
          Source
        </button>
      </div>
    </article>
  )
}
