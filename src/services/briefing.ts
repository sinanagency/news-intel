/**
 * Daily Briefing Service
 * Generates AI-powered daily news briefings with audio
 */

import type { Article } from '../types'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export interface DailyBriefing {
  id: string
  date: string
  title: string
  summary: string
  sections: BriefingSection[]
  topStories: string[]
  keyInsights: string[]
  generatedAt: string
  audioUrl?: string
}

interface BriefingSection {
  topic: string
  summary: string
  articles: string[]
}

class BriefingService {
  private groqKey: string | null = null
  private openaiKey: string | null = null

  setGroqKey(key: string) {
    this.groqKey = key
  }

  setOpenAIKey(key: string) {
    this.openaiKey = key
  }

  async generateBriefing(articles: Article[], interests: string[]): Promise<DailyBriefing> {
    if (!this.groqKey) {
      throw new Error('Groq API key not set')
    }

    // Get top articles sorted by relevance
    const topArticles = [...articles]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10)

    if (topArticles.length === 0) {
      throw new Error('No articles available for briefing')
    }

    const articlesContext = topArticles
      .map((a, i) => `${i + 1}. [${a.source}] ${a.title}\n   Summary: ${a.summary}`)
      .join('\n\n')

    const prompt = `You are a professional news analyst creating a daily briefing for a busy executive.

The reader is interested in: ${interests.join(', ')}

Today's top stories:
${articlesContext}

Create a concise daily briefing in this exact JSON format:
{
  "title": "Morning Briefing: [Key Theme]",
  "summary": "A 2-3 sentence executive summary of today's most important developments.",
  "sections": [
    {
      "topic": "Topic Name",
      "summary": "2-3 sentences covering this topic area",
      "articles": ["Article title 1", "Article title 2"]
    }
  ],
  "topStories": ["One-liner about story 1", "One-liner about story 2", "One-liner about story 3"],
  "keyInsights": ["Strategic insight 1", "Strategic insight 2"]
}

Requirements:
- Maximum 3 sections
- Each section should group related stories
- topStories should be the 3 most important headlines in brief
- keyInsights should be actionable strategic takeaways
- Keep everything concise - this is for quick consumption
- Write in a professional, authoritative tone

Return ONLY the JSON object, no markdown or explanation.`

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1500
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Groq API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || '{}'

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse briefing response')
      }

      const briefingData = JSON.parse(jsonMatch[0])

      const briefing: DailyBriefing = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        title: briefingData.title || 'Daily Briefing',
        summary: briefingData.summary || '',
        sections: briefingData.sections || [],
        topStories: briefingData.topStories || [],
        keyInsights: briefingData.keyInsights || [],
        generatedAt: new Date().toISOString()
      }

      return briefing
    } catch (error) {
      console.error('Failed to generate briefing:', error)
      throw error
    }
  }

  // Generate text for TTS
  getBriefingScript(briefing: DailyBriefing): string {
    const lines: string[] = []

    lines.push(briefing.title)
    lines.push('')
    lines.push(briefing.summary)
    lines.push('')

    if (briefing.topStories.length > 0) {
      lines.push('Top Stories.')
      briefing.topStories.forEach((story, i) => {
        lines.push(`${i + 1}. ${story}`)
      })
      lines.push('')
    }

    if (briefing.sections.length > 0) {
      briefing.sections.forEach(section => {
        lines.push(`${section.topic}.`)
        lines.push(section.summary)
        lines.push('')
      })
    }

    if (briefing.keyInsights.length > 0) {
      lines.push('Key Insights.')
      briefing.keyInsights.forEach((insight, i) => {
        lines.push(`${i + 1}. ${insight}`)
      })
    }

    return lines.join(' ')
  }

  // Generate audio with OpenAI TTS (optional, higher quality)
  async generateAudio(text: string): Promise<string | null> {
    if (!this.openaiKey) {
      return null
    }

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'alloy',
          input: text.slice(0, 4096) // TTS has a limit
        })
      })

      if (!response.ok) {
        console.error('TTS API error:', response.status)
        return null
      }

      const audioBlob = await response.blob()
      return URL.createObjectURL(audioBlob)
    } catch (error) {
      console.error('Failed to generate audio:', error)
      return null
    }
  }
}

export const briefingService = new BriefingService()
