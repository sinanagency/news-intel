import type { FetchResult } from '../types'

// Multiple CORS proxies for reliability
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

// RSS feed sources - Tested and reliable
const RSS_FEEDS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // AI / ML / LLM - TOP PRIORITY
  // ═══════════════════════════════════════════════════════════════════════════
  { url: 'https://blog.openai.com/rss/', source: 'OpenAI' },
  { url: 'https://www.technologyreview.com/feed/', source: 'MIT Tech Review' },
  { url: 'https://blogs.nvidia.com/feed/', source: 'NVIDIA' },
  { url: 'https://www.marktechpost.com/feed/', source: 'MarkTechPost' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CRYPTO / WEB3 / BLOCKCHAIN
  // ═══════════════════════════════════════════════════════════════════════════
  { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://decrypt.co/feed', source: 'Decrypt' },
  { url: 'https://bitcoinmagazine.com/.rss/full/', source: 'Bitcoin Magazine' },
  { url: 'https://cryptoslate.com/feed/', source: 'CryptoSlate' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TECH GENERAL
  // ═══════════════════════════════════════════════════════════════════════════
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', source: 'Ars Technica' },
  { url: 'https://www.wired.com/feed/rss', source: 'Wired' },
  { url: 'https://www.engadget.com/rss.xml', source: 'Engadget' },
  { url: 'https://venturebeat.com/feed/', source: 'VentureBeat' },
  { url: 'https://www.zdnet.com/news/rss.xml', source: 'ZDNet' },

  // ═══════════════════════════════════════════════════════════════════════════
  // HARDWARE / GPUs
  // ═══════════════════════════════════════════════════════════════════════════
  { url: 'https://www.tomshardware.com/feeds/all', source: "Tom's Hardware" },
  { url: 'https://videocardz.com/feed', source: 'VideoCardz' },
  { url: 'https://www.techpowerup.com/rss/news', source: 'TechPowerUp' },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEV / PROGRAMMING
  // ═══════════════════════════════════════════════════════════════════════════
  { url: 'https://github.blog/feed/', source: 'GitHub' },
  { url: 'https://dev.to/feed', source: 'DEV.to' },
  { url: 'https://blog.cloudflare.com/rss/', source: 'Cloudflare' },
]

// High-priority keywords for AI/LLM/GPU content
const HIGH_PRIORITY_KEYWORDS = [
  // AI & LLM
  'gpt', 'llm', 'chatgpt', 'claude', 'anthropic', 'openai', 'gemini', 'llama', 'mistral',
  'transformer', 'diffusion', 'stable diffusion', 'midjourney', 'dall-e', 'sora',
  'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
  'large language model', 'foundation model', 'generative ai', 'gen ai',
  'reasoning', 'chain of thought', 'agent', 'rag', 'fine-tuning', 'rlhf',
  'multimodal', 'vision model', 'embeddings', 'vector database',

  // GPUs & Hardware
  'nvidia', 'gpu', 'cuda', 'rtx', 'h100', 'h200', 'b100', 'blackwell', 'hopper',
  'amd', 'radeon', 'intel arc', 'tpu', 'tensor core', 'semiconductor', 'chip',
  'inference', 'training', 'compute', 'data center',

  // Crypto
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi', 'web3',
  'solana', 'cardano', 'nft', 'token', 'stablecoin', 'binance', 'coinbase',
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
        content: content.replace(/<[^>]*>/g, '').slice(0, 500)
      })
    }
  })

  return items
}

// Calculate priority score based on keywords
function calculatePriorityScore(article: FetchResult): number {
  const text = `${article.title} ${article.content || ''}`.toLowerCase()
  let score = 0

  for (const keyword of HIGH_PRIORITY_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      score += 10
    }
  }

  return score
}

// Fetch from Hacker News API (most reliable - no CORS issues)
async function fetchHackerNews(): Promise<FetchResult[]> {
  try {
    console.log('Fetching Hacker News...')
    const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const storyIds: number[] = await response.json()
    const top50 = storyIds.slice(0, 50)

    const stories = await Promise.all(
      top50.map(async (id) => {
        const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        return storyRes.json()
      })
    )

    const results = stories
      .filter(story => story && story.title && story.url)
      .map(story => ({
        title: story.title,
        link: story.url,
        source: 'Hacker News',
        pubDate: new Date(story.time * 1000).toISOString(),
        content: story.title
      }))

    console.log(`Hacker News: ${results.length} articles`)
    return results
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
      const timeout = setTimeout(() => controller.abort(), 12000)

      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) {
        console.warn(`${source}: HTTP ${response.status}`)
        continue
      }

      const xml = await response.text()
      const items = parseRSS(xml, source)

      if (items.length > 0) {
        console.log(`${source}: ${items.length} articles`)
        return items
      }
    } catch (e) {
      // Try next proxy
      continue
    }
  }
  console.warn(`${source}: All proxies failed`)
  return []
}

// Main fetch function
export async function fetchAllNews(): Promise<FetchResult[]> {
  console.log('Starting news fetch...')
  const results: FetchResult[] = []

  // Always fetch HN first (most reliable)
  const hnStories = await fetchHackerNews()
  results.push(...hnStories)

  // Fetch RSS feeds in parallel batches
  const batchSize = 5
  for (let i = 0; i < RSS_FEEDS.length; i += batchSize) {
    const batch = RSS_FEEDS.slice(i, i + batchSize)
    const batchPromises = batch.map(feed => fetchRSSFeed(feed.url, feed.source))
    const batchResults = await Promise.allSettled(batchPromises)

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value)
      }
    })
  }

  console.log(`Total raw articles: ${results.length}`)

  // Deduplicate by URL
  const seen = new Set<string>()
  const unique = results.filter(item => {
    const normalizedUrl = item.link.replace(/\/$/, '').toLowerCase()
    if (seen.has(normalizedUrl)) return false
    seen.add(normalizedUrl)
    return true
  })

  console.log(`After dedup: ${unique.length}`)

  // Sort by priority score first, then by date
  unique.sort((a, b) => {
    const scoreA = calculatePriorityScore(a)
    const scoreB = calculatePriorityScore(b)

    if (Math.abs(scoreA - scoreB) >= 10) {
      return scoreB - scoreA
    }

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
  // If no interests set, return all articles
  if (interests.length === 0) {
    console.log('No interests filter, returning all articles')
    return articles
  }

  const interestLower = interests.map(i => i.toLowerCase())
  const ignoredLower = ignoredKeywords.map(i => i.toLowerCase())

  const filtered = articles.filter(article => {
    const text = `${article.title} ${article.content || ''}`.toLowerCase()

    // Exclude if contains ignored keywords
    if (ignoredLower.some(keyword => text.includes(keyword))) {
      return false
    }

    // Include if matches any interest
    return interestLower.some(interest => text.includes(interest))
  })

  console.log(`Filtered from ${articles.length} to ${filtered.length} articles`)

  // If filter is too strict, return top articles anyway
  if (filtered.length < 10 && articles.length > 10) {
    console.log('Filter too strict, returning top 50 articles')
    return articles.slice(0, 50)
  }

  return filtered
}
