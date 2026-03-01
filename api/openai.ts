import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  }

  const { endpoint, ...body } = req.body

  // Allowed endpoints
  const allowedEndpoints = [
    'https://api.openai.com/v1/embeddings',
    'https://api.openai.com/v1/chat/completions',
    'https://api.openai.com/v1/audio/transcriptions'
  ]

  if (!endpoint || !allowedEndpoints.includes(endpoint)) {
    return res.status(400).json({ error: 'Invalid endpoint' })
  }

  try {
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }

    // Handle FormData for audio transcription
    if (body.formData) {
      // For multipart, we pass through the body directly
      fetchOptions.body = body.formData
    } else {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Content-Type': 'application/json',
      }
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(endpoint, fetchOptions)
    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('OpenAI API error:', error)
    return res.status(500).json({ error: 'Failed to call OpenAI API' })
  }
}
