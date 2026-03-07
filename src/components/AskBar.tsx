import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2, Volume2, VolumeX, Send, Sparkles } from 'lucide-react'
import { voiceService } from '../services/voice'
import { chatWithContext } from '../services/groq'
import { useStore } from '../store'

interface AskBarProps {
  onResponse?: (question: string, response: string) => void
}

export function AskBar({ onResponse }: AskBarProps) {
  const { articles, settings } = useStore()
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [showResponse, setShowResponse] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize voice service
  useEffect(() => {
    if (settings.openaiApiKey) {
      voiceService.setApiKey(settings.openaiApiKey)
    }
    voiceService.setOnStateChange((state) => {
      setIsListening(state.isListening)
      setIsSpeaking(state.isSpeaking)
    })
  }, [settings.openaiApiKey])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || isLoading) return

    setIsLoading(true)
    setShowResponse(true)
    setResponse(null)

    try {
      const answer = await chatWithContext(
        query,
        articles,
        [],
        settings.groqApiKey
      )
      setResponse(answer)
      onResponse?.(query, answer)

      // Auto-read the response
      voiceService.speak(answer)
    } catch (error) {
      setResponse('Sorry, I could not process your question. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceInput = async () => {
    if (isListening) {
      const transcript = await voiceService.stopListening()
      if (transcript) {
        setQuery(transcript)
        // Auto-submit after voice input
        setTimeout(() => {
          handleSubmit()
        }, 100)
      }
    } else {
      await voiceService.startListening()
    }
  }

  const toggleSpeaking = () => {
    if (isSpeaking) {
      voiceService.stopSpeaking()
    } else if (response) {
      voiceService.speak(response)
    }
  }

  const closeResponse = () => {
    setShowResponse(false)
    setResponse(null)
    setQuery('')
    voiceService.stopSpeaking()
  }

  const hasVoice = voiceService.isSupported()

  return (
    <>
      {/* Ask Bar */}
      <form onSubmit={handleSubmit} className="ask-bar">
        <div className="ask-bar-inner">
          <Sparkles className="ask-bar-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything..."
            className="ask-bar-input"
            disabled={isLoading}
          />

          {/* Voice button */}
          {hasVoice && (
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isLoading}
              className={`ask-bar-btn ${isListening ? 'active' : ''}`}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span className="ask-bar-pulse" />
                </>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="ask-bar-submit"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Response Modal */}
      {showResponse && (
        <div className="ask-response-overlay" onClick={closeResponse}>
          <div className="ask-response-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="ask-response-header">
              <div className="ask-response-question">
                <Sparkles className="w-4 h-4 text-[--accent]" />
                <span>{query}</span>
              </div>
              <div className="ask-response-actions">
                {response && (
                  <button
                    onClick={toggleSpeaking}
                    className={`ask-response-btn ${isSpeaking ? 'active' : ''}`}
                    title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button onClick={closeResponse} className="ask-response-btn">
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="ask-response-content">
              {isLoading ? (
                <div className="ask-response-loading">
                  <Loader2 className="w-6 h-6 animate-spin text-[--accent]" />
                  <span>Thinking...</span>
                </div>
              ) : response ? (
                <div className="ask-response-text">
                  {response.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="ask-response-speaking">
                <div className="speaking-wave">
                  <span /><span /><span /><span /><span />
                </div>
                <span>Speaking...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
