/**
 * Voice Service
 * OpenAI Whisper for speech-to-text + browser TTS for responses.
 */

export interface VoiceState {
  isListening: boolean
  isProcessing: boolean
  isSpeaking: boolean
  error: string | null
}

class VoiceService {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private apiKey: string | null = null
  private onStateChange: ((state: VoiceState) => void) | null = null
  private synthesis: SpeechSynthesis | null = null
  private preferredVoice: SpeechSynthesisVoice | null = null

  private state: VoiceState = {
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    error: null
  }

  constructor() {
    // Initialize speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synthesis = window.speechSynthesis
      // Load voices
      this.loadVoices()
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices()
    }
  }

  private loadVoices() {
    if (!this.synthesis) return
    const voices = this.synthesis.getVoices()
    // Prefer a natural-sounding English voice
    this.preferredVoice = voices.find(v =>
      v.name.includes('Samantha') ||
      v.name.includes('Karen') ||
      v.name.includes('Daniel') ||
      (v.lang.startsWith('en') && v.localService)
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0]
  }

  setApiKey(key: string) {
    this.apiKey = key
  }

  setOnStateChange(callback: (state: VoiceState) => void) {
    this.onStateChange = callback
  }

  private updateState(updates: Partial<VoiceState>) {
    this.state = { ...this.state, ...updates }
    this.onStateChange?.(this.state)
  }

  getState(): VoiceState {
    return this.state
  }

  hasApiKey(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-')
  }

  // Start recording
  async startListening(): Promise<void> {
    if (!this.hasApiKey()) {
      this.updateState({ error: 'OpenAI API key required for voice input' })
      return
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      })

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      this.audioChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100) // Collect data every 100ms
      this.updateState({ isListening: true, error: null })

    } catch (error) {
      console.error('Failed to start recording:', error)
      this.updateState({
        error: error instanceof Error ? error.message : 'Microphone access denied'
      })
    }
  }

  // Stop recording and transcribe
  async stopListening(): Promise<string | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return null
    }

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        this.updateState({ isListening: false, isProcessing: true })

        // Stop all tracks
        this.stream?.getTracks().forEach(track => track.stop())

        try {
          // Create audio blob
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })

          // Convert to file for API
          const audioFile = new File([audioBlob], 'recording.webm', {
            type: 'audio/webm'
          })

          // Transcribe with Whisper
          const transcript = await this.transcribe(audioFile)
          this.updateState({ isProcessing: false })
          resolve(transcript)

        } catch (error) {
          console.error('Transcription failed:', error)
          this.updateState({
            isProcessing: false,
            error: 'Failed to transcribe audio'
          })
          resolve(null)
        }
      }

      this.mediaRecorder!.stop()
    })
  }

  // Cancel recording
  cancelListening(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    this.stream?.getTracks().forEach(track => track.stop())
    this.audioChunks = []
    this.updateState({ isListening: false, isProcessing: false })
  }

  // Transcribe audio with Whisper API
  private async transcribe(audioFile: File): Promise<string | null> {
    if (!this.apiKey) return null

    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Transcription failed')
      }

      const data = await response.json()
      return data.text || null

    } catch (error) {
      console.error('Whisper API error:', error)
      throw error
    }
  }

  // Speak text using browser TTS
  speak(text: string, onEnd?: () => void): void {
    if (!this.synthesis) {
      onEnd?.()
      return
    }

    // Cancel any ongoing speech
    this.synthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = this.preferredVoice
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      this.updateState({ isSpeaking: true })
    }

    utterance.onend = () => {
      this.updateState({ isSpeaking: false })
      onEnd?.()
    }

    utterance.onerror = () => {
      this.updateState({ isSpeaking: false })
      onEnd?.()
    }

    this.synthesis.speak(utterance)
  }

  // Stop speaking
  stopSpeaking(): void {
    this.synthesis?.cancel()
    this.updateState({ isSpeaking: false })
  }

  // Check if browser supports voice
  isSupported(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      window.speechSynthesis
    )
  }
}

export const voiceService = new VoiceService()
