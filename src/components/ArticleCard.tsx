import { Bookmark, BookmarkCheck, ExternalLink, MessageSquare, Clock } from 'lucide-react'
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

  // Relevance indicator - clean, no glow
  const relevanceColor = article.relevanceScore > 0.7
    ? 'bg-[--success]'
    : article.relevanceScore > 0.4
    ? 'bg-[--warning]'
    : 'bg-[--gray-7]'

  if (compact) {
    return (
      <article
        onClick={handleClick}
        className="card card-interactive p-4 cursor-pointer group animate-slide-up"
      >
        <div className="flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${relevanceColor}`} />
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-medium text-[--gray-12] line-clamp-2 group-hover:text-[--gray-11] transition-colors">
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
      className="card card-interactive p-5 cursor-pointer group animate-slide-up"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="badge">
            {article.source}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[--gray-8]">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
          </span>
        </div>
        <div
          className={`w-2 h-2 rounded-full ${relevanceColor}`}
          title={`${Math.round(article.relevanceScore * 100)}% match`}
        />
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-[--gray-12] leading-snug mb-2 group-hover:text-[--gray-11] transition-colors">
        {article.title}
      </h3>

      {/* Summary */}
      <p className="text-[13px] text-[--gray-9] leading-relaxed mb-3 line-clamp-2">
        {article.summary}
      </p>

      {/* Key Points Preview */}
      {article.keyPoints.length > 0 && (
        <div className="mb-3 p-3 bg-[--gray-3] rounded-lg border border-[--border-subtle]">
          <p className="text-[12px] text-[--gray-10] line-clamp-2">
            {article.keyPoints[0]}
          </p>
        </div>
      )}

      {/* Categories */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {article.categories.slice(0, 3).map((cat, i) => (
          <span
            key={i}
            className="px-2 py-0.5 text-[11px] font-medium bg-[--gray-4] text-[--gray-9] rounded"
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-3 border-t border-[--border-subtle]">
        <button
          onClick={toggleSaved}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
            article.saved
              ? 'text-[--accent] bg-[--accent-muted]'
              : 'text-[--gray-9] hover:text-[--gray-11] hover:bg-[--gray-4]'
          }`}
        >
          {article.saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          {article.saved ? 'Saved' : 'Save'}
        </button>

        <button
          onClick={handleAsk}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-[--gray-9] hover:text-[--gray-11] hover:bg-[--gray-4] rounded-md transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Ask AI
        </button>

        <button
          onClick={openExternal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-[--gray-9] hover:text-[--gray-11] hover:bg-[--gray-4] rounded-md transition-colors ml-auto"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Source
        </button>
      </div>
    </article>
  )
}
