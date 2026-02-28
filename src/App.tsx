import { useEffect, useCallback, useState } from 'react'
import { Header, ArticleList, ArticleReader, ChatPanel, SettingsPanel, AnalyticsPanel, DailyBriefing } from './components'
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
    // Initialize OpenAI if key exists
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
    if (!settings.groqApiKey) {
      alert('Please set your Groq API key in Settings first.')
      setActiveTab('settings')
      return
    }

    setIsFetching(true)

    try {
      // Fetch raw news
      const rawNews = await fetchAllNews()
      console.log(`Fetched ${rawNews.length} articles`)

      // Filter by interests
      const filtered = filterByInterests(
        rawNews,
        settings.interests,
        settings.ignoredKeywords
      )
      console.log(`Filtered to ${filtered.length} articles`)

      // Limit to max articles
      const limited = filtered.slice(0, settings.maxArticlesPerFetch)

      // Summarize with AI
      const processed = await summarizeArticles(
        limited,
        settings.groqApiKey,
        settings.interests
      )

      // Add to store
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
    setSelectedArticle(null) // Close reader if open
    setActiveTab('chat')

    // Track the ask action
    behaviorAgent.trackAction(article, 'ask')
    memoryAgent.storeArticleInteraction(article, 'asked')

    // Add user message
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: `Tell me more about this article: "${article.title}"`,
      articleIds: [article.id],
      createdAt: new Date().toISOString()
    })

    // Get AI response
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

      // Store the conversation in memory
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
    <div className="min-h-screen">
      <Header onRefresh={handleRefresh} onOpenBriefing={() => setShowBriefing(true)} />

      <main>
        {(activeTab === 'today' || activeTab === 'saved') && (
          <ArticleList
            onAskAbout={handleAskAbout}
            onRefresh={handleRefresh}
            onReadMore={handleReadMore}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsPanel />}
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

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
