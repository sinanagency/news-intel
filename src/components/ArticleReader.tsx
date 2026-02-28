import { useEffect, useState, useRef } from 'react'
import { Bookmark, BookmarkCheck, MessageSquare, ExternalLink, Clock, Loader2, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Article } from '../types'
import { useStore } from '../store'
import { fetchFullArticle, type FullArticle } from '../services/articleFetcher'
import { behaviorAgent } from '../services/behaviorAgent'
import { memoryAgent } from '../services/memoryAgent'

interface ArticleReaderProps {
  article: Article | null
  onClose: () => void
  onAskAbout: (article: Article) => void
}

export function ArticleReader({ article, onClose, onAskAbout }: ArticleReaderProps) {
  const { updateArticle } = useStore()
  const [fullArticle, setFullArticle] = useState<FullArticle | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [readStartTime] = useState(Date.now())
  const contentRef = useRef<HTMLDivElement>(null)

  // Track reading time on close
  useEffect(() => {
    if (!article) return

    return () => {
      const readTimeMs = Date.now() - readStartTime
      behaviorAgent.trackAction(article, 'read_full', readTimeMs)
      memoryAgent.storeArticleInteraction(article, 'read')
    }
  }, [article, readStartTime])

  // Fetch full article content
  useEffect(() => {
    if (!article) {
      setFullArticle(null)
      return
    }

    const loadArticle = async () => {
      setIsLoading(true)
      try {
        const content = await fetchFullArticle(article.url)
        setFullArticle(content)
      } catch (error) {
        console.error('Failed to fetch article:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadArticle()
  }, [article])

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!article) return null

  const toggleSaved = () => {
    updateArticle(article.id, { saved: !article.saved })
    behaviorAgent.trackAction(article, article.saved ? 'unsave' : 'save')
  }

  const handleAskAI = () => {
    onAskAbout(article)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Reader Panel */}
      <div className="relative ml-auto w-full max-w-3xl h-full bg-[--gray-1] border-l border-[--border-subtle] overflow-hidden animate-slide-up flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 glass border-b border-[--border-subtle] px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-[13px] font-medium text-[--gray-9] hover:text-[--gray-12] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSaved}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  article.saved
                    ? 'text-[--accent] bg-[--accent-muted]'
                    : 'text-[--gray-9] hover:text-[--gray-12] hover:bg-[--gray-4]'
                }`}
              >
                {article.saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                {article.saved ? 'Saved' : 'Save'}
              </button>

              <button
                onClick={handleAskAI}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[--gray-9] hover:text-[--gray-12] hover:bg-[--gray-4] rounded-md transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Ask AI
              </button>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary h-8 px-3 text-[12px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Original
              </a>
            </div>
          </div>
        </header>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            {/* Meta */}
            <div className="flex items-center gap-2 mb-4">
              <span className="badge">
                {article.source}
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-[--gray-8]">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
              </span>
              {fullArticle && (
                <span className="text-[12px] text-[--gray-8]">
                  · {fullArticle.readTimeMinutes} min read
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-[24px] font-semibold text-[--gray-12] leading-tight mb-6">
              {article.title}
            </h1>

            {/* AI Summary Box */}
            <div className="card p-5 mb-6">
              <p className="text-[11px] font-semibold text-[--gray-9] uppercase tracking-wide mb-2">AI Summary</p>
              <p className="text-[14px] text-[--gray-11] leading-relaxed mb-4">
                {article.summary}
              </p>

              {/* Key Points */}
              {article.keyPoints.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[--border-subtle]">
                  <p className="text-[11px] font-semibold text-[--gray-9] uppercase tracking-wide mb-2">Key Points</p>
                  <ul className="space-y-2">
                    {article.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[--gray-10]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[--gray-7] mt-2 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {article.categories.map((cat, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-[11px] font-medium bg-[--gray-4] text-[--gray-9] rounded"
                >
                  {cat}
                </span>
              ))}
            </div>

            {/* Full Article Content */}
            <div className="mb-8">
              <h2 className="text-[15px] font-semibold text-[--gray-12] mb-4">Full Article</h2>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[--gray-8] animate-spin mb-3" />
                  <p className="text-[13px] text-[--gray-8]">Loading article content...</p>
                </div>
              ) : fullArticle ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  {fullArticle.content.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-[14px] text-[--gray-10] leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[13px] text-[--gray-8] mb-4">
                    Could not load full article content.
                  </p>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Read on {article.source}
                  </a>
                </div>
              )}
            </div>

            {/* Suggested Questions */}
            {article.autoQuestions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[13px] font-semibold text-[--gray-12] mb-3">Questions to Explore</h3>
                <div className="space-y-2">
                  {article.autoQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={handleAskAI}
                      className="w-full text-left px-4 py-3 card card-interactive text-[13px] text-[--gray-10] hover:text-[--gray-12] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
