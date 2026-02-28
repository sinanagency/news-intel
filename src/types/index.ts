export interface Article {
  id: string
  title: string
  source: string
  url: string
  content: string
  summary: string
  keyPoints: string[]
  categories: string[]
  relevanceScore: number
  autoQuestions: string[]
  publishedAt: string
  createdAt: string
  saved: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  articleIds?: string[]
  createdAt: string
}

export interface Settings {
  groqApiKey: string
  openaiApiKey: string
  interests: string[]
  ignoredKeywords: string[]
  fetchIntervalHours: number
  maxArticlesPerFetch: number
  enableSemanticSearch: boolean
  enableDeepAnalysis: boolean
}

export interface FetchResult {
  title: string
  link: string
  source: string
  pubDate?: string
  content?: string
}
