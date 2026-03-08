import { useState, useRef, useEffect } from 'react'
import {
  Sparkles, Home, Bookmark, MessageSquare, Settings,
  Mic, MicOff, Loader2, Volume2, VolumeX, Send, X
} from 'lucide-react'
import { useStore } from '../store'
import { voiceService } from '../services/voice'
import { chatWithContext } from '../services/groq'

export function Dock() {
  const { activeTab, setActiveTab, articles, settings } = useStore()
  const [askOpen, setAskOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const savedCount = articles.filter(a => a.saved).length

  // Initialize voice
  useEffect(() => {
    if (settings.openaiApiKey) {
      voiceService.setApiKey(settings.openaiApiKey)
    }
    voiceService.setOnStateChange((state) => {
      setIsListening(state.isListening)
      setIsSpeaking(state.isSpeaking)
    })
  }, [settings.openaiApiKey])

  // Focus input when ask opens
  useEffect(() => {
    if (askOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [askOpen])

  const handleAsk = async () => {
    if (!query.trim() || isLoading) return
    setIsLoading(true)
    setResponse(null)

    try {
      const answer = await chatWithContext(query, articles, [], settings.groqApiKey)
      setResponse(answer)
      voiceService.speak(answer)
    } catch {
      setResponse('Could not process your question.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoice = async () => {
    if (isListening) {
      const transcript = await voiceService.stopListening()
      if (transcript) {
        setQuery(transcript)
        setTimeout(handleAsk, 100)
      }
    } else {
      await voiceService.startListening()
    }
  }

  const closeAsk = () => {
    setAskOpen(false)
    setQuery('')
    setResponse(null)
    voiceService.stopSpeaking()
  }

  const dockItems = [
    { id: 'today', icon: Home, label: 'Feed', action: () => setActiveTab('today') },
    { id: 'saved', icon: Bookmark, label: 'Saved', action: () => setActiveTab('saved'), badge: savedCount },
    { id: 'ask', icon: Sparkles, label: 'Ask AI', action: () => setAskOpen(true), gradient: true },
    { id: 'chat', icon: MessageSquare, label: 'Chat', action: () => setActiveTab('chat') },
    { id: 'settings', icon: Settings, label: 'Settings', action: () => setActiveTab('settings') },
  ]

  return (
    <>
      {/* Dock */}
      <div className="dock">
        <div className="dock-inner">
          {dockItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`dock-item ${item.gradient ? 'dock-item-gradient' : ''} ${
                activeTab === item.id ? 'active' : ''
              }`}
              title={item.label}
            >
              <item.icon className="dock-icon" />
              {item.badge && item.badge > 0 && (
                <span className="dock-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ask Modal */}
      {askOpen && (
        <div className="ask-overlay" onClick={closeAsk}>
          <div className="ask-modal" onClick={(e) => e.stopPropagation()}>
            {/* Input */}
            <div className="ask-input-row">
              <Sparkles className="ask-sparkle" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="Ask anything about the news..."
                className="ask-input"
                disabled={isLoading}
              />
              {voiceService.isSupported() && (
                <button
                  onClick={handleVoice}
                  className={`ask-voice ${isListening ? 'active' : ''}`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
              <button
                onClick={handleAsk}
                disabled={!query.trim() || isLoading}
                className="ask-send"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
              <button onClick={closeAsk} className="ask-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Response */}
            {(isLoading || response) && (
              <div className="ask-response">
                {isLoading ? (
                  <div className="ask-loading">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                ) : response && (
                  <>
                    <div className="ask-answer">{response}</div>
                    <button
                      onClick={() => isSpeaking ? voiceService.stopSpeaking() : voiceService.speak(response)}
                      className="ask-speaker"
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      {isSpeaking ? 'Stop' : 'Read aloud'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
