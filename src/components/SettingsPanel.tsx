import { useState, useEffect } from 'react'
import { Save, Plus, X, Key, Tags, Clock, Ban, CheckCircle, Brain, Activity, Trash2, Zap, Search } from 'lucide-react'
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
      } catch (error) {
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
    <div className="max-w-2xl mx-auto px-6 py-8 animate-in">
      <h2 className="text-[20px] font-semibold text-[--gray-12] mb-1">Settings</h2>
      <p className="text-[13px] text-[--gray-9] mb-8">Configure your news intelligence preferences</p>

      {/* Groq API Key */}
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[--gray-4] flex items-center justify-center">
            <Key className="w-4 h-4 text-[--gray-11]" />
          </div>
          <div>
            <h3 className="text-[14px] font-medium text-[--gray-12]">Groq API Key</h3>
            <p className="text-[12px] text-[--gray-8]">Required for AI summarization (Free)</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="password"
            value={groqKey}
            onChange={(e) => setGroqKey(e.target.value)}
            placeholder="gsk_..."
            className="input flex-1"
          />
          <button
            onClick={handleSaveGroq}
            className={`btn ${savedGroq ? 'bg-[--success-muted] text-[--success]' : 'btn-primary'}`}
          >
            {savedGroq ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedGroq ? 'Saved' : 'Save'}
          </button>
        </div>

        <p className="text-[11px] text-[--gray-8] mt-3">
          Free API key at{' '}
          <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-[--accent] hover:underline">
            console.groq.com
          </a>
        </p>
      </section>

      {/* OpenAI API Key */}
      <section className="card p-5 mb-4 relative overflow-hidden">
        {hasOpenAI && (
          <div className="absolute top-0 right-0 px-2 py-0.5 bg-[--success-muted] text-[--success] text-[10px] font-medium rounded-bl">
            Active
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[--gray-4] flex items-center justify-center">
            <Zap className="w-4 h-4 text-[--gray-11]" />
          </div>
          <div>
            <h3 className="text-[14px] font-medium text-[--gray-12]">OpenAI API Key</h3>
            <p className="text-[12px] text-[--gray-8]">Enables semantic search & voice input (Optional)</p>
          </div>
        </div>

        <div className="flex gap-2">
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
            className={`btn ${savedOpenai ? 'bg-[--success-muted] text-[--success]' : isEmbedding ? 'btn-secondary' : 'btn-primary'}`}
          >
            {savedOpenai ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedOpenai ? 'Saved' : isEmbedding ? 'Embedding...' : 'Save'}
          </button>
        </div>

        {embeddingStatus && (
          <p className="text-[11px] text-[--success] mt-3 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {embeddingStatus}
          </p>
        )}

        <p className="text-[11px] text-[--gray-8] mt-3">
          Get API key at{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[--accent] hover:underline">
            platform.openai.com
          </a>
          {' '}· Embeddings cost ~$0.02/million tokens
        </p>

        {/* What OpenAI enables */}
        {!hasOpenAI && (
          <div className="mt-4 pt-4 border-t border-[--border-subtle]">
            <p className="text-[11px] font-medium text-[--gray-9] mb-2">Adding OpenAI unlocks:</p>
            <ul className="text-[11px] text-[--gray-8] space-y-1">
              <li className="flex items-center gap-2">
                <Search className="w-3 h-3 text-[--success]" />
                Semantic search (find by meaning, not keywords)
              </li>
              <li className="flex items-center gap-2">
                <Brain className="w-3 h-3 text-[--accent]" />
                Smarter recommendations based on content similarity
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-[--warning]" />
                Voice input with Whisper transcription
              </li>
            </ul>
          </div>
        )}
      </section>

      {/* Feature Toggles */}
      {hasOpenAI && (
        <section className="card p-5 mb-4">
          <h3 className="text-[14px] font-medium text-[--gray-12] mb-4">AI Features</h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-[--gray-3] rounded-lg cursor-pointer border border-[--border-subtle] hover:border-[--border-default] transition-colors">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-[--success]" />
                <div>
                  <p className="text-[13px] font-medium text-[--gray-12]">Semantic Search</p>
                  <p className="text-[11px] text-[--gray-8]">Find memories and articles by meaning</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableSemanticSearch}
                onChange={(e) => updateSettings({ enableSemanticSearch: e.target.checked })}
                className="w-4 h-4 rounded accent-[--accent]"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-[--gray-3] rounded-lg cursor-pointer border border-[--border-subtle] hover:border-[--border-default] transition-colors">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-[--warning]" />
                <div>
                  <p className="text-[13px] font-medium text-[--gray-12]">Deep Analysis (GPT-4o)</p>
                  <p className="text-[11px] text-[--gray-8]">Strategic insights on articles</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableDeepAnalysis}
                onChange={(e) => updateSettings({ enableDeepAnalysis: e.target.checked })}
                className="w-4 h-4 rounded accent-[--accent]"
              />
            </label>
          </div>
        </section>
      )}

      {/* Interests */}
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[--gray-4] flex items-center justify-center">
            <Tags className="w-4 h-4 text-[--gray-11]" />
          </div>
          <div>
            <h3 className="text-[14px] font-medium text-[--gray-12]">Interests</h3>
            <p className="text-[12px] text-[--gray-8]">Articles matching these topics rank higher</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {settings.interests.map((interest, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[--accent-muted] text-[--accent] text-[12px] rounded-md font-medium"
            >
              {interest}
              <button
                onClick={() => removeInterest(interest)}
                className="hover:text-[--gray-12] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {settings.interests.length === 0 && (
            <span className="text-[12px] text-[--gray-8] italic">No interests added yet</span>
          )}
        </div>

        <div className="flex gap-2">
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
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[--gray-4] flex items-center justify-center">
            <Ban className="w-4 h-4 text-[--gray-11]" />
          </div>
          <div>
            <h3 className="text-[14px] font-medium text-[--gray-12]">Ignored Keywords</h3>
            <p className="text-[12px] text-[--gray-8]">Articles with these keywords are filtered out</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {settings.ignoredKeywords.map((keyword, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[--error-muted] text-[--error] text-[12px] rounded-md font-medium"
            >
              {keyword}
              <button
                onClick={() => removeIgnored(keyword)}
                className="hover:text-[--gray-12] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {settings.ignoredKeywords.length === 0 && (
            <span className="text-[12px] text-[--gray-8] italic">No ignored keywords</span>
          )}
        </div>

        <div className="flex gap-2">
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
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[--gray-4] flex items-center justify-center">
            <Clock className="w-4 h-4 text-[--gray-11]" />
          </div>
          <div>
            <h3 className="text-[14px] font-medium text-[--gray-12]">Fetch Interval</h3>
            <p className="text-[12px] text-[--gray-8]">How often to auto-fetch new articles</p>
          </div>
        </div>

        <select
          value={settings.fetchIntervalHours}
          onChange={(e) => updateSettings({ fetchIntervalHours: parseInt(e.target.value) })}
          className="input cursor-pointer"
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
      <section className="card p-5 mb-4">
        <h3 className="text-[14px] font-medium text-[--gray-12] mb-4">Intelligence Agents</h3>

        <div className="space-y-3">
          {/* Behavior Agent */}
          <div className="flex items-center justify-between p-3 bg-[--gray-3] rounded-lg border border-[--border-subtle]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[--accent-muted] flex items-center justify-center">
                <Brain className="w-4 h-4 text-[--accent]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[--gray-12]">Behavior Agent</p>
                <p className="text-[11px] text-[--gray-8]">
                  {behaviorStatus.actionsTracked} actions · {behaviorStatus.semanticEnabled ? 'Semantic enabled' : 'Keyword mode'}
                </p>
              </div>
            </div>
            <button
              onClick={clearBehaviorData}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-[--error] hover:bg-[--error-muted] rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          {/* Memory Agent */}
          <div className="flex items-center justify-between p-3 bg-[--gray-3] rounded-lg border border-[--border-subtle]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[--success-muted] flex items-center justify-center">
                <Activity className="w-4 h-4 text-[--success]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[--gray-12]">Memory Agent</p>
                <p className="text-[11px] text-[--gray-8]">
                  {memoryStatus.totalMemories} memories · {memoryStatus.semanticSearchEnabled ? 'Semantic search' : 'Keyword search'}
                </p>
              </div>
            </div>
            <button
              onClick={clearMemoryData}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-[--error] hover:bg-[--error-muted] rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          {/* Vector Store (if OpenAI enabled) */}
          {hasOpenAI && vectorStats.total > 0 && (
            <div className="flex items-center justify-between p-3 bg-[--gray-3] rounded-lg border border-[--border-subtle]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[--warning-muted] flex items-center justify-center">
                  <Search className="w-4 h-4 text-[--warning]" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[--gray-12]">Vector Store</p>
                  <p className="text-[11px] text-[--gray-8]">
                    {vectorStats.total} embeddings ({vectorStats.byType.article || 0} articles, {vectorStats.byType.memory || 0} memories)
                  </p>
                </div>
              </div>
              <button
                onClick={clearVectorData}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-[--error] hover:bg-[--error-muted] rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          )}
        </div>

        {/* User Profile Summary */}
        {userProfile.interests.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[--border-subtle]">
            <p className="text-[11px] font-medium text-[--gray-9] mb-2">Learned about you:</p>
            <div className="flex flex-wrap gap-1">
              {userProfile.interests.slice(0, 8).map((interest, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] bg-[--gray-4] text-[--gray-10] rounded">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="pt-6 border-t border-[--border-subtle]">
        <p className="text-[11px] text-[--gray-7]">
          NewsIntel v0.3.0 · Built with Tauri + React + Groq + {hasOpenAI ? 'OpenAI' : 'AI Agents'}
        </p>
      </div>
    </div>
  )
}
