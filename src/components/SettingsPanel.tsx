import { useState, useEffect } from 'react'
import { Save, Plus, X, Key, Tags, Clock, Ban, CheckCircle, Brain, Activity, Trash2, Zap, Search, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { behaviorAgent } from '../services/behaviorAgent'
import { memoryAgent } from '../services/memoryAgent'
import { openaiService } from '../services/openai'
import { vectorStore } from '../services/vectorStore'

export function SettingsPanel() {
  const { settings, updateSettings, articles } = useStore()

  const [groqKey, setGroqKey] = useState(settings.groqApiKey)
  const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey)
  const [newInterest, setNewInterest] = useState('')
  const [newIgnored, setNewIgnored] = useState('')
  const [savedGroq, setSavedGroq] = useState(false)
  const [savedOpenai, setSavedOpenai] = useState(false)
  const [isEmbedding, setIsEmbedding] = useState(false)
  const [embeddingStatus, setEmbeddingStatus] = useState('')

  // Set OpenAI key in service when it changes
  useEffect(() => {
    if (settings.openaiApiKey) {
      openaiService.setApiKey(settings.openaiApiKey)
    }
  }, [settings.openaiApiKey])

  const handleSaveGroq = () => {
    updateSettings({ groqApiKey: groqKey })
    setSavedGroq(true)
    setTimeout(() => setSavedGroq(false), 2000)
  }

  const handleSaveOpenai = async () => {
    updateSettings({ openaiApiKey: openaiKey })
    openaiService.setApiKey(openaiKey)
    setSavedOpenai(true)
    setTimeout(() => setSavedOpenai(false), 2000)

    // If key is valid, offer to embed existing data
    if (openaiKey && openaiKey.startsWith('sk-')) {
      setEmbeddingStatus('OpenAI connected! Embedding existing data...')
      setIsEmbedding(true)

      try {
        const memoryCount = await memoryAgent.embedAllMemories()
        const articleCount = await behaviorAgent.embedAllInteractions(articles)
        setEmbeddingStatus(`Embedded ${memoryCount} memories and ${articleCount} articles`)
      } catch (_error) {
        setEmbeddingStatus('Failed to embed existing data')
      }

      setTimeout(() => {
        setIsEmbedding(false)
        setEmbeddingStatus('')
      }, 3000)
    }
  }

  const addInterest = () => {
    if (newInterest.trim() && !settings.interests.includes(newInterest.trim())) {
      updateSettings({ interests: [...settings.interests, newInterest.trim()] })
      setNewInterest('')
    }
  }

  const removeInterest = (interest: string) => {
    updateSettings({ interests: settings.interests.filter(i => i !== interest) })
  }

  const addIgnored = () => {
    if (newIgnored.trim() && !settings.ignoredKeywords.includes(newIgnored.trim())) {
      updateSettings({ ignoredKeywords: [...settings.ignoredKeywords, newIgnored.trim()] })
      setNewIgnored('')
    }
  }

  const removeIgnored = (keyword: string) => {
    updateSettings({ ignoredKeywords: settings.ignoredKeywords.filter(k => k !== keyword) })
  }

  const clearBehaviorData = () => {
    if (confirm('Clear all behavior tracking data? This will reset your personalized recommendations.')) {
      localStorage.removeItem('news-intel-behavior')
      localStorage.removeItem('news-intel-preferences')
      window.location.reload()
    }
  }

  const clearMemoryData = () => {
    if (confirm('Clear all memory data? This will erase conversation history and learned preferences.')) {
      localStorage.removeItem('news-intel-memory')
      localStorage.removeItem('news-intel-user-profile')
      window.location.reload()
    }
  }

  const clearVectorData = () => {
    if (confirm('Clear all embeddings? This will remove semantic search data.')) {
      vectorStore.clear()
      window.location.reload()
    }
  }

  const behaviorStatus = behaviorAgent.getStatus()
  const memoryStatus = memoryAgent.getStatus()
  const userProfile = memoryAgent.getProfile()
  const vectorStats = vectorStore.getStats()
  const hasOpenAI = openaiService.hasApiKey()

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-in">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="icon-container">
            <Sparkles className="w-5 h-5 text-[--gray-11]" />
          </div>
          <h2 className="text-[22px] font-semibold text-[--gray-white]">Settings</h2>
        </div>
        <p className="text-[14px] text-[--gray-9] ml-[52px]">Configure your news intelligence preferences</p>
      </div>

      <div className="space-y-5 stagger-in">
        {/* Groq API Key */}
        <section className="section-card">
          <div className="flex items-center gap-4 mb-5">
            <div className="icon-container-accent">
              <Key className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-[--gray-white]">Groq API Key</h3>
              <p className="text-[13px] text-[--gray-9]">Required for AI summarization (Free tier available)</p>
            </div>
          </div>

          <div className="flex gap-3">
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="input flex-1"
            />
            <button
              onClick={handleSaveGroq}
              className={`btn ${savedGroq ? 'btn-accent' : 'btn-primary'} min-w-[100px]`}
            >
              {savedGroq ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savedGroq ? 'Saved' : 'Save'}
            </button>
          </div>

          <p className="text-[12px] text-[--gray-8] mt-4">
            Get your free API key at{' '}
            <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="link-accent">
              console.groq.com
            </a>
          </p>
        </section>

        {/* OpenAI API Key */}
        <section className="section-card relative overflow-hidden">
          {hasOpenAI && (
            <div className="absolute top-4 right-4">
              <span className="badge badge-green">
                <span className="status-dot active mr-1.5"></span>
                Active
              </span>
            </div>
          )}

          <div className="flex items-center gap-4 mb-5">
            <div className="icon-container-warning">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-[--gray-white]">OpenAI API Key</h3>
              <p className="text-[13px] text-[--gray-9]">Enables semantic search & voice input</p>
            </div>
          </div>

          <div className="flex gap-3">
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="input flex-1"
            />
            <button
              onClick={handleSaveOpenai}
              disabled={isEmbedding}
              className={`btn ${savedOpenai ? 'btn-accent' : isEmbedding ? 'btn-secondary' : 'btn-primary'} min-w-[100px]`}
            >
              {savedOpenai ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savedOpenai ? 'Saved' : isEmbedding ? 'Embedding...' : 'Save'}
            </button>
          </div>

          {embeddingStatus && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-[--success-subtle] border border-[--success-subtle]">
              <Zap className="w-4 h-4 text-[--success]" />
              <p className="text-[13px] text-[--success]">{embeddingStatus}</p>
            </div>
          )}

          <p className="text-[12px] text-[--gray-8] mt-4">
            Get API key at{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="link-accent">
              platform.openai.com
            </a>
            {' '}· Embeddings ~$0.02/million tokens
          </p>

          {/* What OpenAI enables */}
          {!hasOpenAI && (
            <div className="mt-6 pt-5 border-t border-[--border-subtle]">
              <p className="text-[12px] font-medium text-[--gray-10] mb-3 uppercase tracking-wide">Unlocks Premium Features</p>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[--gray-3] border border-[--border-subtle]">
                  <div className="w-8 h-8 rounded-md bg-[--success-muted] flex items-center justify-center">
                    <Search className="w-4 h-4 text-[--success]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[--gray-12]">Semantic Search</p>
                    <p className="text-[11px] text-[--gray-8]">Find by meaning, not just keywords</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[--gray-3] border border-[--border-subtle]">
                  <div className="w-8 h-8 rounded-md bg-[--accent-muted] flex items-center justify-center">
                    <Brain className="w-4 h-4 text-[--accent-lighter]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[--gray-12]">Smart Recommendations</p>
                    <p className="text-[11px] text-[--gray-8]">Content similarity analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[--gray-3] border border-[--border-subtle]">
                  <div className="w-8 h-8 rounded-md bg-[--warning-muted] flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[--warning]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[--gray-12]">Voice Input</p>
                    <p className="text-[11px] text-[--gray-8]">Whisper transcription</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Feature Toggles */}
        {hasOpenAI && (
          <section className="section-card">
            <h3 className="text-[15px] font-semibold text-[--gray-white] mb-5">AI Features</h3>

            <div className="space-y-3">
              <label className="feature-row cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-[--success-muted] flex items-center justify-center">
                    <Search className="w-4 h-4 text-[--success]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[--gray-12]">Semantic Search</p>
                    <p className="text-[12px] text-[--gray-8]">Find memories and articles by meaning</p>
                  </div>
                </div>
                <div className={`toggle ${settings.enableSemanticSearch ? 'active' : ''}`} onClick={(e) => {
                  e.preventDefault()
                  updateSettings({ enableSemanticSearch: !settings.enableSemanticSearch })
                }} />
              </label>

              <label className="feature-row cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-[--warning-muted] flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[--warning]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[--gray-12]">Deep Analysis</p>
                    <p className="text-[12px] text-[--gray-8]">Strategic insights with GPT-4o</p>
                  </div>
                </div>
                <div className={`toggle ${settings.enableDeepAnalysis ? 'active' : ''}`} onClick={(e) => {
                  e.preventDefault()
                  updateSettings({ enableDeepAnalysis: !settings.enableDeepAnalysis })
                }} />
              </label>
            </div>
          </section>
        )}

        {/* Interests */}
        <section className="section-card">
          <div className="flex items-center gap-4 mb-5">
            <div className="icon-container-accent">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[--gray-white]">Interests</h3>
              <p className="text-[13px] text-[--gray-9]">Articles matching these topics rank higher</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {settings.interests.map((interest, i) => (
              <span
                key={i}
                className="tag tag-accent group"
              >
                {interest}
                <button
                  onClick={() => removeInterest(interest)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {settings.interests.length === 0 && (
              <span className="text-[13px] text-[--gray-8] italic">No interests added yet</span>
            )}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInterest()}
              placeholder="Add interest..."
              className="input flex-1"
            />
            <button onClick={addInterest} className="btn btn-secondary btn-icon">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Ignored Keywords */}
        <section className="section-card">
          <div className="flex items-center gap-4 mb-5">
            <div className="icon-container" style={{ background: 'linear-gradient(145deg, var(--error-muted) 0%, var(--error-subtle) 100%)' }}>
              <Ban className="w-5 h-5 text-[--error]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[--gray-white]">Ignored Keywords</h3>
              <p className="text-[13px] text-[--gray-9]">Articles with these keywords are filtered out</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {settings.ignoredKeywords.map((keyword, i) => (
              <span
                key={i}
                className="tag tag-error group"
              >
                {keyword}
                <button
                  onClick={() => removeIgnored(keyword)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {settings.ignoredKeywords.length === 0 && (
              <span className="text-[13px] text-[--gray-8] italic">No ignored keywords</span>
            )}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={newIgnored}
              onChange={(e) => setNewIgnored(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIgnored()}
              placeholder="Add keyword to ignore..."
              className="input flex-1"
            />
            <button onClick={addIgnored} className="btn btn-secondary btn-icon">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Fetch Interval */}
        <section className="section-card">
          <div className="flex items-center gap-4 mb-5">
            <div className="icon-container">
              <Clock className="w-5 h-5 text-[--gray-11]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[--gray-white]">Fetch Interval</h3>
              <p className="text-[13px] text-[--gray-9]">How often to auto-fetch new articles</p>
            </div>
          </div>

          <select
            value={settings.fetchIntervalHours}
            onChange={(e) => updateSettings({ fetchIntervalHours: parseInt(e.target.value) })}
            className="input"
          >
            <option value={1}>Every 1 hour</option>
            <option value={2}>Every 2 hours</option>
            <option value={4}>Every 4 hours</option>
            <option value={8}>Every 8 hours</option>
            <option value={12}>Every 12 hours</option>
            <option value={24}>Once a day</option>
          </select>
        </section>

        {/* Agent Status */}
        <section className="section-card">
          <h3 className="text-[15px] font-semibold text-[--gray-white] mb-5">Intelligence Agents</h3>

          <div className="space-y-3">
            {/* Behavior Agent */}
            <div className="feature-row">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-[--accent-muted] flex items-center justify-center">
                  <Brain className="w-4 h-4 text-[--accent-lighter]" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[--gray-12]">Behavior Agent</p>
                  <p className="text-[12px] text-[--gray-8]">
                    {behaviorStatus.actionsTracked} actions · {behaviorStatus.semanticEnabled ? 'Semantic enabled' : 'Keyword mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={clearBehaviorData}
                className="btn btn-ghost text-[--error] hover:bg-[--error-subtle] text-[12px] h-8 px-3"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>

            {/* Memory Agent */}
            <div className="feature-row">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-[--success-muted] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[--success]" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[--gray-12]">Memory Agent</p>
                  <p className="text-[12px] text-[--gray-8]">
                    {memoryStatus.totalMemories} memories · {memoryStatus.semanticSearchEnabled ? 'Semantic search' : 'Keyword search'}
                  </p>
                </div>
              </div>
              <button
                onClick={clearMemoryData}
                className="btn btn-ghost text-[--error] hover:bg-[--error-subtle] text-[12px] h-8 px-3"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>

            {/* Vector Store (if OpenAI enabled) */}
            {hasOpenAI && vectorStats.total > 0 && (
              <div className="feature-row">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-[--warning-muted] flex items-center justify-center">
                    <Search className="w-4 h-4 text-[--warning]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[--gray-12]">Vector Store</p>
                    <p className="text-[12px] text-[--gray-8]">
                      {vectorStats.total} embeddings ({vectorStats.byType.article || 0} articles, {vectorStats.byType.memory || 0} memories)
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearVectorData}
                  className="btn btn-ghost text-[--error] hover:bg-[--error-subtle] text-[12px] h-8 px-3"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* User Profile Summary */}
          {userProfile.interests.length > 0 && (
            <div className="mt-6 pt-5 border-t border-[--border-subtle]">
              <p className="text-[12px] font-medium text-[--gray-10] mb-3 uppercase tracking-wide">Learned Preferences</p>
              <div className="flex flex-wrap gap-2">
                {userProfile.interests.slice(0, 8).map((interest, i) => (
                  <span key={i} className="tag">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-[--border-subtle]">
        <p className="text-[12px] text-[--gray-7] text-center">
          NewsIntel v0.3.0 · Built with React + Groq + {hasOpenAI ? 'OpenAI' : 'AI Agents'}
        </p>
      </div>
    </div>
  )
}
