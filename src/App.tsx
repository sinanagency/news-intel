import { useEffect, useCallback, useState } from 'react'
import { IconRail, CategorySidebar, RightPanel, MainContent } from './components/Layout'
import { ArticleReader, ChatPanel, SettingsPanel, AnalyticsPanel, DailyBriefing } from './components'
import { useStore } from './store'
import { fetchAllNews, filterByInterests } from './services/newsFetcher'
import { summarizeArticles, chatWithContext } from './services/groq'
import { behaviorAgent } from './services/behaviorAgent'
import { memoryAgent } from './services/memoryAgent'
import { openaiService } from './services/openai'
import type { Article } from './types'

function App() {
  const {
    activeTab,
    setActiveTab,
    addArticles,
    articles,
    settings,
    setIsFetching,
    setLastFetchTime,
    addMessage
  } = useStore()

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [showBriefing, setShowBriefing] = useState(false)

  // Initialize agents and OpenAI on mount
  useEffect(() => {
    if (settings.openaiApiKey) {
      openaiService.setApiKey(settings.openaiApiKey)
    }

    behaviorAgent.startReporting()
    memoryAgent.startReporting()

    return () => {
      behaviorAgent.stopReporting()
      memoryAgent.stopReporting()
    }
  }, [settings.openaiApiKey])

  // Fetch and process news
  const handleRefresh = useCallback(async () => {
    if (!settings.groqApiKey && settings.groqApiKey !== 'USE_BACKEND') {
      alert('Please set your Groq API key in Settings first.')
      setActiveTab('settings')
      return
    }

    setIsFetching(true)

    try {
      const rawNews = await fetchAllNews()
      console.log(`Fetched ${rawNews.length} articles`)

      const filtered = filterByInterests(
        rawNews,
        settings.interests,
        settings.ignoredKeywords
      )
      console.log(`Filtered to ${filtered.length} articles`)

      const limited = filtered.slice(0, settings.maxArticlesPerFetch)

      const processed = await summarizeArticles(
        limited,
        settings.groqApiKey,
        settings.interests
      )

      addArticles(processed)
      setLastFetchTime(new Date().toISOString())

      console.log(`Added ${processed.length} processed articles`)
    } catch (error) {
      console.error('Failed to fetch news:', error)
      alert(`Failed to fetch news: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsFetching(false)
    }
  }, [settings, addArticles, setIsFetching, setLastFetchTime, setActiveTab])

  // Handle "Ask about this" from article card
  const handleAskAbout = useCallback(async (article: Article) => {
    setSelectedArticle(null)
    setActiveTab('chat')

    behaviorAgent.trackAction(article, 'ask')
    memoryAgent.storeArticleInteraction(article, 'asked')

    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: `Tell me more about this article: "${article.title}"`,
      articleIds: [article.id],
      createdAt: new Date().toISOString()
    })

    try {
      const response = await chatWithContext(
        `Analyze this article in detail: "${article.title}". Summary: ${article.summary}. What are the key implications? What opportunities does this create?`,
        articles,
        [],
        settings.groqApiKey
      )

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        createdAt: new Date().toISOString()
      })

      memoryAgent.storeConversation(
        `Tell me more about: ${article.title}`,
        response,
        article.categories
      )
    } catch (error) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to analyze article'}`,
        createdAt: new Date().toISOString()
      })
    }
  }, [articles, settings.groqApiKey, addMessage, setActiveTab])

  // Handle reading more
  const handleReadMore = (article: Article) => {
    setSelectedArticle(article)
  }

  // Close reader
  const handleCloseReader = () => {
    setSelectedArticle(null)
  }

  // Auto-fetch on mount if no recent articles
  useEffect(() => {
    const lastFetch = useStore.getState().lastFetchTime
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000

    if (!lastFetch || new Date(lastFetch).getTime() < fourHoursAgo) {
      if (settings.groqApiKey) {
        handleRefresh()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app-layout">
      {/* Left: Icon Rail */}
      <IconRail />

      {/* Left: Category Sidebar */}
      <CategorySidebar
        onRefresh={handleRefresh}
        onOpenBriefing={() => setShowBriefing(true)}
      />

      {/* Center: Main Content */}
      {(activeTab === 'today' || activeTab === 'saved') && (
        <MainContent
          onAskAbout={handleAskAbout}
          onRefresh={handleRefresh}
          onReadMore={handleReadMore}
        />
      )}
      {activeTab === 'analytics' && (
        <div className="main-content">
          <div className="main-content-inner">
            <AnalyticsPanel />
          </div>
        </div>
      )}
      {activeTab === 'chat' && (
        <div className="main-content">
          <div className="main-content-inner">
            <ChatPanel />
          </div>
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="main-content">
          <div className="main-content-inner">
            <SettingsPanel />
          </div>
        </div>
      )}

      {/* Right: Side Panel */}
      <RightPanel />

      {/* Article Reader Panel */}
      <ArticleReader
        article={selectedArticle}
        onClose={handleCloseReader}
        onAskAbout={handleAskAbout}
      />

      {/* Daily Briefing Modal */}
      {showBriefing && (
        <DailyBriefing onClose={() => setShowBriefing(false)} />
      )}
    </div>
  )
}

export default App
