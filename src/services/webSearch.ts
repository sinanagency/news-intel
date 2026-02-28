/**
 * Web Search Service
 * Searches the web for news on any topic in real-time.
 * Uses DuckDuckGo HTML for free, no-API-key search.
 */

export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

// CORS proxies for web search
const CORS_PROXIES = [
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

// Extract domain name from URL
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
  } catch {
    return 'Web'
  }
}

// Search using DuckDuckGo HTML
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' news')}`

  for (const getProxy of CORS_PROXIES) {
    try {
      const proxyUrl = getProxy(searchUrl)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(proxyUrl, { signal: controller.signal })
      clearTimeout(timeout)

      if (!response.ok) continue

      const html = await response.text()
      return parseDuckDuckGoResults(html)
    } catch {
      continue
    }
  }

  return []
}

// Parse DuckDuckGo HTML results
function parseDuckDuckGoResults(html: string): SearchResult[] {
  const results: SearchResult[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // DuckDuckGo result links
  const resultLinks = doc.querySelectorAll('.result__a')
  const resultSnippets = doc.querySelectorAll('.result__snippet')

  resultLinks.forEach((link, i) => {
    const href = link.getAttribute('href') || ''
    const title = link.textContent?.trim() || ''
    const snippet = resultSnippets[i]?.textContent?.trim() || ''

    // Extract actual URL from DuckDuckGo redirect
    let url = href
    if (href.includes('uddg=')) {
      const match = href.match(/uddg=([^&]+)/)
      if (match) {
        url = decodeURIComponent(match[1])
      }
    }

    if (title && url && url.startsWith('http')) {
      results.push({
        title,
        url,
        snippet,
        source: extractDomain(url)
      })
    }
  })

  return results.slice(0, 10)
}

// Alternative: Search using Bing (as backup)
async function searchBing(query: string): Promise<SearchResult[]> {
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query + ' news')}&format=rss`

  for (const getProxy of CORS_PROXIES) {
    try {
      const proxyUrl = getProxy(searchUrl)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(proxyUrl, { signal: controller.signal })
      clearTimeout(timeout)

      if (!response.ok) continue

      const text = await response.text()

      // Try parsing as RSS
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/xml')
      const items = doc.querySelectorAll('item')

      const results: SearchResult[] = []
      items.forEach((item) => {
        const title = item.querySelector('title')?.textContent || ''
        const url = item.querySelector('link')?.textContent || ''
        const snippet = item.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '') || ''

        if (title && url) {
          results.push({
            title,
            url,
            snippet,
            source: extractDomain(url)
          })
        }
      })

      if (results.length > 0) return results.slice(0, 10)
    } catch {
      continue
    }
  }

  return []
}

// Fetch Google News RSS for a topic
async function searchGoogleNews(query: string): Promise<SearchResult[]> {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`

  for (const getProxy of CORS_PROXIES) {
    try {
      const proxyUrl = getProxy(rssUrl)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(proxyUrl, { signal: controller.signal })
      clearTimeout(timeout)

      if (!response.ok) continue

      const xml = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const items = doc.querySelectorAll('item')

      const results: SearchResult[] = []
      items.forEach((item) => {
        const title = item.querySelector('title')?.textContent || ''
        const link = item.querySelector('link')?.textContent || ''
        const pubDate = item.querySelector('pubDate')?.textContent || ''
        const source = item.querySelector('source')?.textContent || extractDomain(link)

        if (title && link) {
          results.push({
            title,
            url: link,
            snippet: pubDate ? `Published: ${new Date(pubDate).toLocaleDateString()}` : '',
            source
          })
        }
      })

      if (results.length > 0) return results.slice(0, 10)
    } catch {
      continue
    }
  }

  return []
}

// Main search function - tries multiple sources
export async function searchWeb(query: string): Promise<SearchResult[]> {
  // Try Google News first (best for news)
  let results = await searchGoogleNews(query)
  if (results.length > 0) return results

  // Fall back to DuckDuckGo
  results = await searchDuckDuckGo(query)
  if (results.length > 0) return results

  // Fall back to Bing RSS
  results = await searchBing(query)
  return results
}

// Check if a message looks like a search query
export function isSearchQuery(message: string): boolean {
  const searchIndicators = [
    'news about',
    'what is happening',
    'tell me about',
    'search for',
    'find news',
    'latest on',
    'updates on',
    'what happened',
    'any news',
    'search',
    'look up',
    'find'
  ]

  const lowerMessage = message.toLowerCase()

  // Check for search indicators
  if (searchIndicators.some(indicator => lowerMessage.includes(indicator))) {
    return true
  }

  // If it's a topic that doesn't match existing articles, treat as search
  // Short messages (under 50 chars) with no question words are likely topics
  if (message.length < 50 && !message.includes('?')) {
    return true
  }

  return false
}

// Extract search topic from message
export function extractSearchTopic(message: string): string {
  const lowerMessage = message.toLowerCase()

  const prefixes = [
    'news about',
    'what is happening with',
    'what is happening in',
    'tell me about',
    'search for',
    'find news on',
    'find news about',
    'latest on',
    'updates on',
    'what happened with',
    'what happened in',
    'any news on',
    'any news about',
    'search',
    'look up',
    'find'
  ]

  for (const prefix of prefixes) {
    if (lowerMessage.startsWith(prefix)) {
      return message.slice(prefix.length).trim()
    }
    if (lowerMessage.includes(prefix)) {
      const idx = lowerMessage.indexOf(prefix)
      return message.slice(idx + prefix.length).trim()
    }
  }

  // Return the message as-is if no prefix found (it's the topic)
  return message.trim()
}
