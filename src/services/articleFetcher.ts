/**
 * Article Fetcher Service
 * Fetches and extracts full article content for in-app reading.
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

// Extract readable content from HTML
function extractContent(html: string): { content: string; title?: string; author?: string } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Remove unwanted elements
  const removeSelectors = [
    'script', 'style', 'nav', 'footer', 'header', 'aside',
    '.ad', '.ads', '.advertisement', '.sidebar', '.comments',
    '.social-share', '.related-posts', '.newsletter',
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
    '.cookie-banner', '.popup', '.modal'
  ]

  removeSelectors.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove())
  })

  // Try to find the main content
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '.post-body',
    '.article-body',
    '#content',
    '.story-body'
  ]

  let mainContent: Element | null = null
  for (const selector of contentSelectors) {
    mainContent = doc.querySelector(selector)
    if (mainContent) break
  }

  // Fallback to body
  if (!mainContent) {
    mainContent = doc.body
  }

  // Extract title
  const title = doc.querySelector('h1')?.textContent?.trim() ||
                doc.querySelector('title')?.textContent?.trim()

  // Extract author
  const authorSelectors = ['.author', '.byline', '[rel="author"]', '.post-author']
  let author: string | undefined
  for (const sel of authorSelectors) {
    const el = doc.querySelector(sel)
    if (el?.textContent) {
      author = el.textContent.trim()
      break
    }
  }

  // Get text content and clean it up
  let content = mainContent?.textContent || ''

  // Clean up whitespace
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()

  // Try to preserve some structure by finding paragraphs
  const paragraphs = mainContent?.querySelectorAll('p')
  if (paragraphs && paragraphs.length > 3) {
    content = Array.from(paragraphs)
      .map(p => p.textContent?.trim())
      .filter(t => t && t.length > 50)
      .join('\n\n')
  }

  return { content, title, author }
}

// Calculate read time
function calculateReadTime(wordCount: number): number {
  const wordsPerMinute = 200
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}

// Fetch full article content
export async function fetchFullArticle(url: string): Promise<FullArticle | null> {
  try {
    // Use CORS proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`

    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const { content, title, author } = extractContent(html)

    // Basic content validation
    if (!content || content.length < 100) {
      return null
    }

    const wordCount = content.split(/\s+/).length
    const readTimeMinutes = calculateReadTime(wordCount)

    return {
      title: title || 'Article',
      content,
      author,
      wordCount,
      readTimeMinutes
    }
  } catch (error) {
    console.error('Failed to fetch full article:', error)
    return null
  }
}

// Alternative: Use a readability API (if CORS proxy fails)
export async function fetchViaReadability(url: string): Promise<FullArticle | null> {
  try {
    // Mercury Parser API (free, but needs API key)
    // For now, fall back to basic extraction
    return fetchFullArticle(url)
  } catch {
    return null
  }
}
