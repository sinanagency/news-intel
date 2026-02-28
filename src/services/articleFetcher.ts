/**
 * Article Fetcher Service
 * Fetches and extracts full article content for in-app reading.
 * Uses multiple CORS proxies for reliability.
 */

export interface FullArticle {
  title: string
  content: string
  author?: string
  publishedDate?: string
  imageUrl?: string
  wordCount: number
  readTimeMinutes: number
}

// Multiple CORS proxies for reliability
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

// Extract readable content from HTML
function extractContent(html: string): { content: string; title?: string; author?: string; imageUrl?: string } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Remove unwanted elements
  const removeSelectors = [
    'script', 'style', 'noscript', 'svg', 'iframe',
    'nav', 'footer', 'header:not(article header)', 'aside',
    '.ad', '.ads', '.advertisement', '.sidebar', '.comments',
    '.social-share', '.related-posts', '.newsletter', '.subscription',
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
    '.cookie-banner', '.popup', '.modal', '.overlay',
    '.share-buttons', '.author-bio', '.tags', '.categories',
    '.breadcrumb', '.pagination', '.nav', '.menu',
    '[data-ad]', '[data-advertisement]', '.sponsored',
    '.promo', '.cta', '.call-to-action'
  ]

  removeSelectors.forEach(sel => {
    try {
      doc.querySelectorAll(sel).forEach(el => el.remove())
    } catch {
      // Ignore invalid selectors
    }
  })

  // Try to find the main content with priority order
  const contentSelectors = [
    'article .post-content',
    'article .article-content',
    'article .entry-content',
    'article .content-body',
    'article .story-body',
    'article .article-body',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.story-content',
    '.article-body',
    '.post-body',
    'article',
    '[role="main"] article',
    '[role="main"]',
    'main article',
    'main',
    '.content',
    '#content',
    '.story-body',
    '#article-body'
  ]

  let mainContent: Element | null = null
  for (const selector of contentSelectors) {
    mainContent = doc.querySelector(selector)
    if (mainContent && mainContent.textContent && mainContent.textContent.trim().length > 200) {
      break
    }
  }

  // Fallback to body if nothing found
  if (!mainContent || !mainContent.textContent || mainContent.textContent.trim().length < 200) {
    mainContent = doc.body
  }

  // Extract title
  const title = doc.querySelector('h1.article-title')?.textContent?.trim() ||
                doc.querySelector('h1.post-title')?.textContent?.trim() ||
                doc.querySelector('article h1')?.textContent?.trim() ||
                doc.querySelector('h1')?.textContent?.trim() ||
                doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                doc.querySelector('title')?.textContent?.trim()

  // Extract author
  const authorSelectors = [
    '.author-name', '.byline-name', '.author a',
    '[rel="author"]', '.byline', '.post-author',
    '.article-author', 'meta[name="author"]'
  ]
  let author: string | undefined
  for (const sel of authorSelectors) {
    const el = doc.querySelector(sel)
    if (el) {
      author = el.getAttribute('content') || el.textContent?.trim()
      if (author && author.length > 2 && author.length < 100) break
    }
  }

  // Extract main image
  const imageUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                   doc.querySelector('article img')?.getAttribute('src')

  // Extract paragraphs with better filtering
  const paragraphs = mainContent?.querySelectorAll('p')
  let content = ''

  if (paragraphs && paragraphs.length > 0) {
    const validParagraphs = Array.from(paragraphs)
      .map(p => p.textContent?.trim() || '')
      .filter(text => {
        // Filter out short paragraphs, ads, and boilerplate
        if (text.length < 40) return false
        if (text.toLowerCase().includes('subscribe')) return false
        if (text.toLowerCase().includes('sign up for')) return false
        if (text.toLowerCase().includes('newsletter')) return false
        if (text.toLowerCase().includes('cookie')) return false
        if (text.toLowerCase().includes('advertisement')) return false
        if (text.match(/^(share|tweet|email|print|comment)/i)) return false
        return true
      })

    content = validParagraphs.join('\n\n')
  }

  // Fallback to all text content if paragraphs didn't work
  if (!content || content.length < 200) {
    content = mainContent?.textContent || ''
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()
  }

  // Clean up content
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/Advertisement/gi, '')
    .replace(/Subscribe to.*/gi, '')
    .replace(/Sign up for.*/gi, '')
    .trim()

  return { content, title, author, imageUrl: imageUrl || undefined }
}

// Calculate read time
function calculateReadTime(wordCount: number): number {
  const wordsPerMinute = 200
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}

// Try fetching with a specific proxy
async function tryFetch(proxyFn: (url: string) => string, url: string): Promise<string | null> {
  try {
    const proxyUrl = proxyFn(url)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return null
    }

    return await response.text()
  } catch (error) {
    console.warn(`Proxy failed:`, error)
    return null
  }
}

// Fetch full article content with fallbacks
export async function fetchFullArticle(url: string): Promise<FullArticle | null> {
  let html: string | null = null

  // Try each proxy until one works
  for (const proxyFn of CORS_PROXIES) {
    html = await tryFetch(proxyFn, url)
    if (html && html.length > 500) {
      break
    }
  }

  if (!html) {
    console.error('All proxies failed for:', url)
    return null
  }

  try {
    const { content, title, author, imageUrl } = extractContent(html)

    // Validate content quality
    if (!content || content.length < 100) {
      console.warn('Extracted content too short:', content?.length)
      return null
    }

    // Check if it's actually article content (not error page)
    const lowerContent = content.toLowerCase()
    if (lowerContent.includes('403 forbidden') ||
        lowerContent.includes('404 not found') ||
        lowerContent.includes('access denied') ||
        lowerContent.includes('please enable javascript')) {
      console.warn('Content appears to be an error page')
      return null
    }

    const wordCount = content.split(/\s+/).length
    const readTimeMinutes = calculateReadTime(wordCount)

    return {
      title: title || 'Article',
      content,
      author,
      imageUrl,
      wordCount,
      readTimeMinutes
    }
  } catch (error) {
    console.error('Failed to extract article content:', error)
    return null
  }
}

// Alternative using a different extraction strategy
export async function fetchViaReadability(url: string): Promise<FullArticle | null> {
  // Try the standard method first
  return fetchFullArticle(url)
}
