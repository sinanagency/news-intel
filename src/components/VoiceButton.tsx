import { useState, useEffect } from 'react'
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react'
import { voiceService, type VoiceState } from '../services/voice'
import { useStore } from '../store'

interface VoiceButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  className?: string
}

export function VoiceButton({ onTranscript, disabled, className = '' }: VoiceButtonProps) {
  const { settings } = useStore()
  const [voiceState, setVoiceState] = useState<VoiceState>(voiceService.getState())

  useEffect(() => {
    // Set API key and state change handler
    if (settings.openaiApiKey) {
      voiceService.setApiKey(settings.openaiApiKey)
    }
    voiceService.setOnStateChange(setVoiceState)

    return () => {
      voiceService.cancelListening()
    }
  }, [settings.openaiApiKey])

  const handleClick = async () => {
    if (voiceState.isListening) {
      const transcript = await voiceService.stopListening()
      if (transcript) {
        onTranscript(transcript)
      }
    } else if (!voiceState.isProcessing) {
      await voiceService.startListening()
    }
  }

  const isActive = voiceState.isListening || voiceState.isProcessing
  const hasKey = voiceService.hasApiKey()

  if (!voiceService.isSupported() || !hasKey) {
    return null
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || voiceState.isProcessing}
      className={`
        relative
        btn btn-icon
        ${isActive
          ? 'bg-[--error] text-white'
          : 'btn-ghost'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      title={isActive ? 'Click to stop' : 'Click to speak'}
    >
      {/* Pulse animation when listening */}
      {voiceState.isListening && (
        <span className="absolute inset-0 rounded-lg bg-[--error]/30 animate-ping" />
      )}

      {/* Icon */}
      {voiceState.isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : voiceState.isSpeaking ? (
        <Volume2 className="w-4 h-4 animate-pulse" />
      ) : voiceState.isListening ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}

      {/* Status indicator */}
      {voiceState.isListening && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[--error] pulse" />
      )}
    </button>
  )
}
