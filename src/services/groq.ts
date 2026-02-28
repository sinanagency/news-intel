import type { Article, FetchResult } from '../types'
import { memoryAgent } from './memoryAgent'
import { searchWeb, isSearchQuery, extractSearchTopic, type SearchResult } from './webSearch'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

async function callGroq(
  messages: GroqMessage[],
  apiKey: string,
  maxTokens: number = 1000
): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${error}`)
  }

  const data: GroqResponse = await response.json()
  return data.choices[0]?.message?.content || ''
}

// Summarize a single article
export async function summarizeArticle(
  article: FetchResult,
  apiKey: string,
  interests: string[]
): Promise<{
  summary: string
  keyPoints: string[]
  relevanceScore: number
  autoQuestions: string[]
  categories: string[]
}> {
  const prompt = `Analyze this article for a tech founder/agency owner interested in: ${interests.join(', ')}.

Title: ${article.title}
Source: ${article.source}
Content: ${article.content || article.title}

Respond with valid JSON only (no markdown, no code blocks):
{
  "summary": "2-3 sentence summary focusing on what matters to the reader",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "relevanceScore": 0.0 to 1.0 based on how relevant to their interests,
  "autoQuestions": ["question they might want to ask about this", "another question"],
  "categories": ["AI", "Business", etc. - pick 1-3 relevant categories]
}`

  try {
    const response = await callGroq([
      { role: 'system', content: 'You are a news analyst. Always respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ], apiKey, 500)

    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      summary: parsed.summary || article.title,
      keyPoints: parsed.keyPoints || [],
      relevanceScore: Math.min(1, Math.max(0, parsed.relevanceScore || 0.5)),
      autoQuestions: parsed.autoQuestions || [],
      categories: parsed.categories || ['General']
    }
  } catch (error) {
    console.error('Failed to summarize article:', error)
    return {
      summary: article.title,
      keyPoints: [],
      relevanceScore: 0.5,
      autoQuestions: [],
      categories: ['General']
    }
  }
}

// Batch summarize articles
export async function summarizeArticles(
  articles: FetchResult[],
  apiKey: string,
  interests: string[]
): Promise<Article[]> {
  const results: Article[] = []

  for (let i = 0; i < articles.length; i += 5) {
    const batch = articles.slice(i, i + 5)

    const batchResults = await Promise.all(
      batch.map(async (article) => {
        const summary = await summarizeArticle(article, apiKey, interests)
        const now = new Date().toISOString()

        return {
          id: crypto.randomUUID(),
          title: article.title,
          source: article.source,
          url: article.link,
          content: article.content || '',
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          categories: summary.categories,
          relevanceScore: summary.relevanceScore,
          autoQuestions: summary.autoQuestions,
          publishedAt: article.pubDate || now,
          createdAt: now,
          saved: false
        }
      })
    )

    results.push(...batchResults)

    if (i + 5 < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  return results
}

// Chat with context from articles AND memory, with real-time web search
export async function chatWithContext(
  userMessage: string,
  articles: Article[],
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>,
  apiKey: string
): Promise<string> {
  // Get memory context
  const memoryContext = memoryAgent.buildContextString(userMessage)
  const userProfile = memoryAgent.getProfile()

  // Check if this looks like a search query for a specific topic
  let webSearchResults: SearchResult[] = []
  let searchTopic = ''

  if (isSearchQuery(userMessage)) {
    searchTopic = extractSearchTopic(userMessage)
    if (searchTopic.length >= 3) {
      try {
        webSearchResults = await searchWeb(searchTopic)
      } catch (error) {
        console.error('Web search failed:', error)
      }
    }
  }

  // Build context from web search results (if any)
  const webSearchContext = webSearchResults.length > 0
    ? `\n\nWEB SEARCH RESULTS for "${searchTopic}":\n${webSearchResults.map((r, i) =>
        `${i + 1}. ${r.title} (${r.source})\n   ${r.snippet}\n   URL: ${r.url}`
      ).join('\n\n')}`
    : ''

  // Build context from recent/relevant articles
  const topArticles = articles
    .slice(0, 10)
    .map(a => `- ${a.title} (${a.source}): ${a.summary}`)
    .join('\n')

  const systemPrompt = `You are an AI news analyst assistant. You have access to real-time web search and pre-loaded news feeds.

User interests: ${userProfile.interests.join(', ') || 'AI, startups, technology'}

PRE-LOADED NEWS:
${topArticles}
${webSearchContext}
${memoryContext}

INSTRUCTIONS:
- If web search results are provided, USE THEM to answer the user's question
- Summarize the key news findings from the search results
- Include relevant URLs so the user can read more
- Suggest 2-3 related topics they might want to explore
- If no relevant results found, be honest and suggest alternative search terms
- Be concise but thorough. Reference specific sources.`

  const messages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ]

  const response = await callGroq(messages, apiKey, 1500)

  // Store conversation in memory agent
  memoryAgent.storeConversation(userMessage, response)

  return response
}

// Generate personalized questions based on user profile
export async function generatePersonalizedQuestions(
  articles: Article[],
  apiKey: string
): Promise<string[]> {
  const userProfile = memoryAgent.getProfile()

  const prompt = `Based on these news articles and user interests, generate 4 thought-provoking questions they might want to explore:

User interests: ${userProfile.interests.join(', ') || 'AI, technology, business'}

Recent articles:
${articles.slice(0, 5).map(a => `- ${a.title}`).join('\n')}

Respond with JSON array only: ["question1", "question2", "question3", "question4"]`

  try {
    const response = await callGroq([
      { role: 'system', content: 'Respond with JSON array only.' },
      { role: 'user', content: prompt }
    ], apiKey, 300)

    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return [
      "What are the key AI developments I should know about?",
      "How do these news items affect my business?",
      "What opportunities should I explore?",
      "What trends are emerging?"
    ]
  }
}
