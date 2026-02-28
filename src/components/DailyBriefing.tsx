import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Volume2, Loader2, RefreshCw, X, Headphones, Zap, ArrowRight } from 'lucide-react'
import { useStore } from '../store'
import { briefingService, type DailyBriefing as BriefingType } from '../services/briefing'
import { voiceService } from '../services/voice'

interface DailyBriefingProps {
  onClose: () => void
}

export function DailyBriefing({ onClose }: DailyBriefingProps) {
  const { articles, settings } = useStore()
  const [briefing, setBriefing] = useState<BriefingType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize services
  useEffect(() => {
    if (settings.groqApiKey) {
      briefingService.setGroqKey(settings.groqApiKey)
    }
    if (settings.openaiApiKey) {
      briefingService.setOpenAIKey(settings.openaiApiKey)
    }
  }, [settings.groqApiKey, settings.openaiApiKey])

  // Check for cached briefing on mount
  useEffect(() => {
    const cached = localStorage.getItem('news-intel-daily-briefing')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        const today = new Date().toISOString().split('T')[0]
        if (parsed.date === today) {
          setBriefing(parsed)
        }
      } catch {
        // Invalid cache
      }
    }
  }, [])

  const generateBriefing = async () => {
    if (!settings.groqApiKey) {
      setError('Please set your Groq API key in Settings')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const newBriefing = await briefingService.generateBriefing(
        articles,
        settings.interests
      )

      // Generate audio URL if OpenAI key available
      if (settings.openaiApiKey) {
        const script = briefingService.getBriefingScript(newBriefing)
        const audioUrl = await briefingService.generateAudio(script)
        if (audioUrl) {
          newBriefing.audioUrl = audioUrl
        }
      }

      setBriefing(newBriefing)
      localStorage.setItem('news-intel-daily-briefing', JSON.stringify(newBriefing))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate briefing')
    } finally {
      setIsLoading(false)
    }
  }

  const playBriefing = () => {
    if (!briefing) return

    if (isPlaying) {
      // Stop
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      voiceService.stopSpeaking()
      setIsPlaying(false)
      return
    }

    // Play
    setIsPlaying(true)

    if (briefing.audioUrl) {
      // Use OpenAI TTS audio
      if (!audioRef.current) {
        audioRef.current = new Audio(briefing.audioUrl)
        audioRef.current.onended = () => setIsPlaying(false)
      }
      audioRef.current.play()
    } else {
      // Use browser TTS
      const script = briefingService.getBriefingScript(briefing)
      voiceService.speak(script, () => setIsPlaying(false))
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      voiceService.stopSpeaking()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden bg-[--gray-2] border border-[--border-subtle] rounded-xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[--border-subtle]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[--gray-4] flex items-center justify-center">
              <Headphones className="w-5 h-5 text-[--gray-11]" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[--gray-12]">Daily Briefing</h2>
              <p className="text-[12px] text-[--gray-8]">AI-generated news summary</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {briefing && (
              <button
                onClick={playBriefing}
                className={`btn ${isPlaying ? 'btn-primary' : 'btn-secondary'}`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Stop' : 'Listen'}
              </button>
            )}
            <button onClick={onClose} className="btn btn-ghost btn-icon">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {!briefing && !isLoading && !error && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[--gray-4] flex items-center justify-center">
                <Zap className="w-8 h-8 text-[--gray-9]" />
              </div>
              <h3 className="text-[16px] font-medium text-[--gray-12] mb-2">
                Generate Your Daily Briefing
              </h3>
              <p className="text-[13px] text-[--gray-9] mb-6 max-w-md mx-auto">
                Get a personalized AI summary of today's top {articles.length} stories,
                with optional audio playback.
              </p>
              <button onClick={generateBriefing} className="btn btn-primary">
                <Zap className="w-4 h-4" />
                Generate Briefing
              </button>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-[--gray-9] animate-spin mx-auto mb-4" />
              <p className="text-[13px] text-[--gray-9]">Analyzing {articles.length} articles...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-[13px] text-[--error] mb-4">{error}</p>
              <button onClick={generateBriefing} className="btn btn-secondary">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}

          {briefing && (
            <div className="space-y-6">
              {/* Title & Summary */}
              <div>
                <h3 className="text-[18px] font-semibold text-[--gray-12] mb-2">
                  {briefing.title}
                </h3>
                <p className="text-[14px] text-[--gray-10] leading-relaxed">
                  {briefing.summary}
                </p>
              </div>

              {/* Top Stories */}
              {briefing.topStories.length > 0 && (
                <div className="card p-4">
                  <h4 className="text-[11px] font-semibold text-[--gray-9] uppercase tracking-wide mb-3">
                    Top Stories
                  </h4>
                  <ul className="space-y-2">
                    {briefing.topStories.map((story, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[--gray-11]">
                        <ArrowRight className="w-4 h-4 text-[--gray-7] mt-0.5 shrink-0" />
                        <span>{story}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sections */}
              {briefing.sections.map((section, i) => (
                <div key={i} className="card p-4">
                  <h4 className="text-[13px] font-semibold text-[--gray-12] mb-2">
                    {section.topic}
                  </h4>
                  <p className="text-[13px] text-[--gray-10] leading-relaxed mb-3">
                    {section.summary}
                  </p>
                  {section.articles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {section.articles.map((article, j) => (
                        <span key={j} className="px-2 py-0.5 text-[10px] bg-[--gray-4] text-[--gray-9] rounded">
                          {article}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Key Insights */}
              {briefing.keyInsights.length > 0 && (
                <div className="card p-4 bg-[--accent-muted] border-[--accent]/20">
                  <h4 className="text-[11px] font-semibold text-[--accent] uppercase tracking-wide mb-3">
                    Key Insights
                  </h4>
                  <ul className="space-y-2">
                    {briefing.keyInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[--gray-11]">
                        <Zap className="w-4 h-4 text-[--accent] mt-0.5 shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regenerate */}
              <div className="flex justify-center pt-2">
                <button onClick={generateBriefing} className="btn btn-ghost text-[12px]">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate Briefing
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Audio indicator */}
        {briefing && (
          <div className="p-3 border-t border-[--border-subtle] bg-[--gray-3]">
            <div className="flex items-center justify-center gap-2 text-[11px] text-[--gray-8]">
              <Volume2 className="w-3.5 h-3.5" />
              {briefing.audioUrl
                ? 'High-quality audio available (OpenAI TTS)'
                : 'Browser voice synthesis ready'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
