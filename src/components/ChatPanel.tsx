import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Trash2, Bot, User, Volume2, VolumeX, MessageSquare } from 'lucide-react'
import { useStore } from '../store'
import { chatWithContext, generatePersonalizedQuestions } from '../services/groq'
import { memoryAgent } from '../services/memoryAgent'
import { voiceService } from '../services/voice'
import { VoiceButton } from './VoiceButton'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])
  const [speakResponses, setSpeakResponses] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, addMessage, clearMessages, articles, settings } = useStore()

  // Handle voice transcript
  const handleVoiceTranscript = (transcript: string) => {
    setInput(transcript)
    // Auto-submit after a short delay
    setTimeout(() => {
      const form = document.querySelector('form')
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
    }, 100)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input and generate personalized prompts on mount
  useEffect(() => {
    inputRef.current?.focus()

    // Generate personalized questions
    if (articles.length > 0 && settings.groqApiKey) {
      generatePersonalizedQuestions(articles, settings.groqApiKey)
        .then(setSuggestedPrompts)
        .catch(() => {
          setSuggestedPrompts([
            "What are the key AI developments I should know about?",
            "How do these stories affect my business?",
            "What opportunities should I explore?",
            "Summarize today's most important news"
          ])
        })
    }
  }, [articles, settings.groqApiKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    })

    setIsLoading(true)

    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await chatWithContext(
        userMessage,
        articles,
        chatHistory,
        settings.groqApiKey
      )

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        createdAt: new Date().toISOString()
      })

      // Speak the response if enabled
      if (speakResponses && voiceService.isSupported()) {
        voiceService.speak(response)
      }
    } catch (error) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        createdAt: new Date().toISOString()
      })
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSuggestion = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const memoryStatus = memoryAgent.getStatus()

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full animate-in">
            <div className="w-12 h-12 rounded-xl bg-[--gray-4] flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-[--gray-11]" />
            </div>
            <h3 className="text-[17px] font-semibold text-[--gray-12] mb-1">Ask about today's news</h3>
            <p className="text-[13px] text-[--gray-9] text-center max-w-md mb-6">
              I have context from {articles.length} articles and remember our previous conversations.
            </p>

            {/* Suggested prompts */}
            <div className="w-full max-w-md space-y-2">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(prompt)}
                  className="w-full text-left px-4 py-3 card card-interactive text-[13px] text-[--gray-10] hover:text-[--gray-12] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-slide-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-[--gray-4] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-[--gray-11]" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] px-4 py-3 text-[13px] leading-relaxed rounded-xl ${
                    message.role === 'user'
                      ? 'bg-[--gray-12] text-[--gray-1]'
                      : 'bg-[--gray-3] text-[--gray-11] border border-[--border-subtle]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-[--gray-5] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[--gray-10]" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 animate-slide-up">
                <div className="w-8 h-8 rounded-lg bg-[--gray-4] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[--gray-11]" />
                </div>
                <div className="bg-[--gray-3] border border-[--border-subtle] text-[--gray-9] px-4 py-3 rounded-xl flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[13px]">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[--border-subtle] px-6 py-4 bg-[--gray-2]">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          {/* Voice Input Button */}
          <VoiceButton
            onTranscript={handleVoiceTranscript}
            disabled={isLoading}
          />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about today's news..."
            className="input flex-1"
            disabled={isLoading}
          />

          {/* Voice Output Toggle */}
          <button
            type="button"
            onClick={() => {
              if (voiceService.isSupported()) {
                voiceService.stopSpeaking()
              }
              setSpeakResponses(!speakResponses)
            }}
            className={`btn btn-icon ${
              speakResponses
                ? 'bg-[--success-muted] text-[--success] border border-[--success]/30'
                : 'btn-ghost'
            }`}
            title={speakResponses ? 'Voice responses on' : 'Voice responses off'}
          >
            {speakResponses ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn btn-primary btn-icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        <div className="flex items-center justify-between mt-2">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[--gray-8] hover:text-[--gray-11] transition-colors rounded"
            >
              <Trash2 className="w-3 h-3" />
              Clear chat
            </button>
          )}

          <div className="flex items-center gap-2 text-[11px] text-[--gray-8] ml-auto">
            <div className={`status-dot ${memoryStatus.status === 'running' ? 'active' : ''}`} />
            <span>Memory active · {memoryAgent.getAllMemories().length} memories</span>
          </div>
        </div>
      </div>
    </div>
  )
}
