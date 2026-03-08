import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Article, Message, Settings } from '../types'

interface AppState {
  // Articles
  articles: Article[]
  setArticles: (articles: Article[]) => void
  addArticles: (articles: Article[]) => void
  updateArticle: (id: string, updates: Partial<Article>) => void
  deleteArticle: (id: string) => void

  // Chat
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void

  // Settings
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void

  // UI State
  selectedArticleId: string | null
  setSelectedArticleId: (id: string | null) => void
  activeTab: 'today' | 'saved' | 'analytics' | 'chat' | 'settings'
  setActiveTab: (tab: 'today' | 'saved' | 'analytics' | 'chat' | 'settings') => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  isFetching: boolean
  setIsFetching: (fetching: boolean) => void
  lastFetchTime: string | null
  setLastFetchTime: (time: string | null) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Articles
      articles: [],
      setArticles: (articles) => set({ articles }),
      addArticles: (newArticles) => set((state) => ({
        articles: [...newArticles, ...state.articles]
          .filter((article, index, self) =>
            index === self.findIndex(a => a.url === article.url)
          )
          .slice(0, 500) // Keep max 500 articles
      })),
      updateArticle: (id, updates) => set((state) => ({
        articles: state.articles.map(a =>
          a.id === id ? { ...a, ...updates } : a
        )
      })),
      deleteArticle: (id) => set((state) => ({
        articles: state.articles.filter(a => a.id !== id)
      })),

      // Chat
      messages: [],
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
      })),
      clearMessages: () => set({ messages: [] }),

      // Settings
      settings: {
        groqApiKey: 'USE_BACKEND',
        openaiApiKey: 'USE_BACKEND',
        interests: [
          // AI & LLMs (top priority)
          'AI',
          'LLM',
          'GPT',
          'Claude',
          'Anthropic',
          'OpenAI',
          'Gemini',
          'machine learning',
          // GPUs & Hardware
          'GPU',
          'NVIDIA',
          'CUDA',
          'semiconductor',
          // Crypto
          'crypto',
          'bitcoin',
          'ethereum',
          'blockchain',
          'DeFi',
          // Tech
          'startups',
          'SaaS',
          'fintech',
          'tech'
        ],
        ignoredKeywords: ['gaming', 'sports', 'celebrity', 'entertainment'],
        fetchIntervalHours: 4,
        maxArticlesPerFetch: 100,
        enableSemanticSearch: true,
        enableDeepAnalysis: true
      },
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      // UI State
      selectedArticleId: null,
      setSelectedArticleId: (id) => set({ selectedArticleId: id }),
      activeTab: 'today',
      setActiveTab: (tab) => set({ activeTab: tab }),
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      isFetching: false,
      setIsFetching: (fetching) => set({ isFetching: fetching }),
      lastFetchTime: null,
      setLastFetchTime: (time) => set({ lastFetchTime: time }),
    }),
    {
      name: 'news-intel-storage',
      version: 1,
      partialize: (state) => ({
        articles: state.articles,
        messages: state.messages,
        settings: state.settings,
        lastFetchTime: state.lastFetchTime,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<AppState>
        // Migrate from v0: reset old API keys to USE_BACKEND
        if (version === 0 && state.settings) {
          if (state.settings.groqApiKey?.startsWith('gsk_')) {
            state.settings.groqApiKey = 'USE_BACKEND'
          }
          if (state.settings.openaiApiKey?.startsWith('sk-') || state.settings.openaiApiKey === '') {
            state.settings.openaiApiKey = 'USE_BACKEND'
          }
        }
        return state as AppState
      },
    }
  )
)
