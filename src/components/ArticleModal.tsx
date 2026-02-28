import { useEffect, useState } from 'react'
import { X, ExternalLink, Bookmark, BookmarkCheck, MessageSquare, Clock, Loader2, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import type { Article } from '../types'
import { useStore } from '../store'

interface ArticleModalProps {
  article: Article | null
  onClose: () => void
  onAskAbout: (article: Article) => void
}

export function ArticleModal({ article, onClose, onAskAbout }: ArticleModalProps) {
  const { updateArticle } = useStore()
  const [fullContent, setFullContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch full article content
  useEffect(() => {
    if (!article) return

    const fetchContent = async () => {
      setIsLoading(true)
      try {
        // Try to fetch via proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(article.url)}`
        const response = await fetch(proxyUrl)
        const html = await response.text()

        // Extract main content (basic extraction)
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')

        // Remove scripts, styles, nav, footer, ads
        const removeSelectors = ['script', 'style', 'nav', 'footer', 'aside', 'header', '.ad', '.ads', '.advertisement', '[role="banner"]', '[role="navigation"]']
        removeSelectors.forEach(sel => {
          doc.querySelectorAll(sel).forEach(el => el.remove())
        })

        // Try to find main content
        const mainContent = doc.querySelector('article, main, .post-content, .article-content, .entry-content, [role="main"]')
        const content = mainContent?.textContent || doc.body?.textContent || ''

        // Clean up whitespace
        const cleaned = content
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n\n')
          .trim()
          .slice(0, 5000) // Limit length

        setFullContent(cleaned || article.summary)
      } catch {
        setFullContent(article.summary)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
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
  }

  const relevanceColor = article.relevanceScore > 0.7
    ? 'bg-emerald-500'
    : article.relevanceScore > 0.4
    ? 'bg-amber-500'
    : 'bg-zinc-600'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl mx-4 my-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-wide uppercase text-indigo-400">
              {article.source}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
            </span>
            <div
              className={clsx('w-2 h-2 rounded-full', relevanceColor)}
              title={`${Math.round(article.relevanceScore * 100)}% relevant`}
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-white leading-tight tracking-tight mb-4">
            {article.title}
          </h1>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-6">
            {article.categories.map((cat, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-xs font-medium bg-zinc-800 text-zinc-400 rounded-lg"
              >
                {cat}
              </span>
            ))}
          </div>

          {/* AI Summary */}
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">AI Summary</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {article.summary}
            </p>
          </div>

          {/* Key Points */}
          {article.keyPoints.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Key Points</h3>
              <ul className="space-y-2.5">
                {article.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Content */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Full Article</h3>
            {isLoading ? (
              <div className="flex items-center gap-3 py-8 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading article content...</span>
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                  {fullContent || article.content || article.summary}
                </p>
              </div>
            )}
          </div>

          {/* Suggested Questions */}
          {article.autoQuestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Questions to Explore</h3>
              <div className="space-y-2">
                {article.autoQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onAskAbout(article)}
                    className="w-full text-left px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 text-sm text-zinc-400 hover:text-zinc-200 rounded-xl transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 flex items-center gap-2 px-6 py-4 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800">
          <button
            onClick={toggleSaved}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-150',
              article.saved
                ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
                : 'text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-200'
            )}
          >
            {article.saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {article.saved ? 'Saved' : 'Save'}
          </button>

          <button
            onClick={() => onAskAbout(article)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-200 rounded-xl transition-all duration-150"
          >
            <MessageSquare className="w-4 h-4" />
            Ask AI
          </button>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all duration-150 ml-auto"
          >
            <ExternalLink className="w-4 h-4" />
            Read Original
          </a>
        </div>
      </div>
    </div>
  )
}
