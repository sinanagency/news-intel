import { useEffect, useState, useRef } from 'react'
import { Bookmark, BookmarkCheck, MessageSquare, ExternalLink, Clock, Loader2, X } from 'lucide-react'
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
    <div className="article-modal-overlay" onClick={onClose}>
      {/* Centered Modal */}
      <div className="article-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="article-modal-header">
          <div className="article-modal-meta">
            <span className="badge">{article.source}</span>
            <span className="article-modal-time">
              <Clock className="w-3.5 h-3.5" />
              {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
            </span>
            {fullArticle && (
              <span className="article-modal-read-time">
                {fullArticle.readTimeMinutes} min read
              </span>
            )}
          </div>

          <div className="article-modal-actions">
            <button
              onClick={toggleSaved}
              className={`article-action-btn ${article.saved ? 'active' : ''}`}
            >
              {article.saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {article.saved ? 'Saved' : 'Save'}
            </button>

            <button onClick={handleAskAI} className="article-action-btn">
              <MessageSquare className="w-4 h-4" />
              Ask AI
            </button>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="article-action-btn primary"
            >
              <ExternalLink className="w-4 h-4" />
              Original
            </a>

            <button onClick={onClose} className="article-close-btn">
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div ref={contentRef} className="article-modal-content">
          {/* Title */}
          <h1 className="article-modal-title">{article.title}</h1>

          {/* AI Summary Box */}
          <div className="article-summary-box">
            <p className="article-summary-label">AI Summary</p>
            <p className="article-summary-text">{article.summary}</p>

            {/* Key Points */}
            {article.keyPoints.length > 0 && (
              <div className="article-key-points">
                <p className="article-summary-label">Key Points</p>
                <ul>
                  {article.keyPoints.map((point, i) => (
                    <li key={i}>
                      <span className="bullet" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="article-categories">
            {article.categories.map((cat, i) => (
              <span key={i} className="article-category">{cat}</span>
            ))}
          </div>

          {/* Full Article Content */}
          <div className="article-full-content">
            <h2>Full Article</h2>

            {isLoading ? (
              <div className="article-loading">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p>Loading article content...</p>
              </div>
            ) : fullArticle ? (
              <div className="article-prose">
                {fullArticle.content.split('\n\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <div className="article-fallback">
                <p>Could not load full article content.</p>
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <ExternalLink className="w-4 h-4" />
                  Read on {article.source}
                </a>
              </div>
            )}
          </div>

          {/* Suggested Questions */}
          {article.autoQuestions.length > 0 && (
            <div className="article-questions">
              <h3>Questions to Explore</h3>
              <div className="article-questions-list">
                {article.autoQuestions.map((q, i) => (
                  <button key={i} onClick={handleAskAI} className="article-question">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
