const API_BASE = import.meta.env.VITE_API_URL || ''

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/api/health`)
  if (!response.ok) {
    throw new Error('Backend is not reachable')
  }
  return response.json()
}

export async function streamChat(messages, onToken, onError) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Chat request failed')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) {
          onError?.(parsed.error)
          return
        }
        if (parsed.content) {
          onToken(parsed.content)
        }
      } catch {
        // Ignore malformed SSE chunks
      }
    }
  }
}
