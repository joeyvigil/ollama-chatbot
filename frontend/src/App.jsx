import { useEffect, useRef, useState } from 'react'
import { checkHealth, streamChat } from './api/chat'
import './App.css'

const SYSTEM_PROMPT = {
  role: 'system',
  content: 'You are a helpful assistant. Be concise and friendly.',
}

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modelInfo, setModelInfo] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    checkHealth()
      .then(setModelInfo)
      .catch(() => setError('Cannot reach backend. Start the API on port 8000.'))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setError('')
    setInput('')

    const userMessage = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setLoading(true)

    const apiMessages = [SYSTEM_PROMPT, ...nextMessages]
    let assistantText = ''

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      await streamChat(
        apiMessages,
        (token) => {
          assistantText += token
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              role: 'assistant',
              content: assistantText,
            }
            return updated
          })
        },
        (message) => setError(message),
      )
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setMessages([])
    setError('')
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Ollama Chat</h1>
          <p className="subtitle">
            {modelInfo
              ? `Model: ${modelInfo.model}`
              : 'Connecting to backend...'}
          </p>
        </div>
        <button
          type="button"
          className="clear-btn"
          onClick={handleClear}
          disabled={loading || messages.length === 0}
        >
          Clear chat
        </button>
      </header>

      <main className="chat">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>Ask anything. Responses stream from your local Ollama model.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role === 'user' ? 'user' : 'assistant'}`}
          >
            <span className="role">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <div className="bubble">{message.content || '...'}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {error && <div className="error">{error}</div>}

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type your message..."
          rows={2}
          disabled={loading}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSubmit(event)
            }
          }}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default App
