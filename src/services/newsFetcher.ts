import type { FetchResult } from '../types'

// Multiple CORS proxies for reliability (ordered by reliability)
const CORS_PROXIES = [
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]

// RSS feed sources
const RSS_FEEDS = [
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News' },
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', source: 'Ars Technica' },
  { url: 'https://www.wired.com/feed/rss', source: 'Wired' },
  { url: 'https://blog.anthropic.com/rss.xml', source: 'Anthropic' },
  { url: 'https://openai.com/blog/rss.xml', source: 'OpenAI' },
]

// Parse RSS XML to extract items
function parseRSS(xml: string, source: string): FetchResult[] {
  const items: FetchResult[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')

  // Handle both RSS and Atom formats
  const entries = doc.querySelectorAll('item, entry')

  entries.forEach((entry) => {
    const title = entry.querySelector('title')?.textContent?.trim() || ''
    const link = entry.querySelector('link')?.textContent?.trim() ||
                 entry.querySelector('link')?.getAttribute('href') || ''
    const pubDate = entry.querySelector('pubDate, published, updated')?.textContent || ''
    const content = entry.querySelector('description, content, summary')?.textContent?.trim() || ''

    if (title && link) {
      items.push({
        title,
        link,
        source,
        pubDate: pubDate || new Date().toISOString(),
        content: content.replace(/<[^>]*>/g, '').slice(0, 500) // Strip HTML, limit length
      })
    }
  })

  return items
}

// Fetch from Hacker News API (more reliable)
async function fetchHackerNews(): Promise<FetchResult[]> {
  try {
    const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const storyIds: number[] = await response.json()
    const top30 = storyIds.slice(0, 30)

    const stories = await Promise.all(
      top30.map(async (id) => {
        const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        return storyRes.json()
      })
    )

    return stories
      .filter(story => story && story.title && story.url)
      .map(story => ({
        title: story.title,
        link: story.url,
        source: 'Hacker News',
        pubDate: new Date(story.time * 1000).toISOString(),
        content: story.title
      }))
  } catch (error) {
    console.error('Failed to fetch Hacker News:', error)
    return []
  }
}

// Fetch a single RSS feed with proxy fallback
async function fetchRSSFeed(feedUrl: string, source: string): Promise<FetchResult[]> {
  for (const getProxy of CORS_PROXIES) {
    try {
      const proxyUrl = getProxy(feedUrl)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(proxyUrl, {
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) continue

      const xml = await response.text()
      const items = parseRSS(xml, source)
      if (items.length > 0) return items
    } catch {
      continue
    }
  }
  console.warn(`All proxies failed for ${source}`)
  return []
}

// Main fetch function
export async function fetchAllNews(): Promise<FetchResult[]> {
  const results: FetchResult[] = []

  // Fetch HN directly (no CORS issues)
  const hnStories = await fetchHackerNews()
  results.push(...hnStories)

  // Fetch RSS feeds in parallel
  const rssPromises = RSS_FEEDS.map(feed => fetchRSSFeed(feed.url, feed.source))
  const rssResults = await Promise.allSettled(rssPromises)

  rssResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      results.push(...result.value)
    }
  })

  // Deduplicate by URL
  const seen = new Set<string>()
  const unique = results.filter(item => {
    if (seen.has(item.link)) return false
    seen.add(item.link)
    return true
  })

  // Sort by date (newest first)
  unique.sort((a, b) => {
    const dateA = new Date(a.pubDate || 0).getTime()
    const dateB = new Date(b.pubDate || 0).getTime()
    return dateB - dateA
  })

  return unique
}

// Filter articles based on user interests
export function filterByInterests(
  articles: FetchResult[],
  interests: string[],
  ignoredKeywords: string[]
): FetchResult[] {
  const interestLower = interests.map(i => i.toLowerCase())
  const ignoredLower = ignoredKeywords.map(i => i.toLowerCase())

  return articles.filter(article => {
    const text = `${article.title} ${article.content || ''}`.toLowerCase()

    // Exclude if contains ignored keywords
    if (ignoredLower.some(keyword => text.includes(keyword))) {
      return false
    }

    // Include if matches any interest (or include all if no specific interests)
    if (interestLower.length === 0) return true
    return interestLower.some(interest => text.includes(interest))
  })
}
