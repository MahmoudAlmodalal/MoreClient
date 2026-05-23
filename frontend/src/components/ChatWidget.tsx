import { useCallback, useEffect, useRef, useState } from 'react'

type Role = 'user' | 'bot'

interface ChatMessage {
  role: Role
  text: string
}

interface BotReply {
  reply: string
  sender?: string
  escalate?: boolean
  confidence?: number
  language?: string
}

/** Stable per-browser session id so a reload continues the same conversation. */
function useSessionId(): string {
  const [id] = useState<string>(() => {
    const key = 'chat_session_id'
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(key, fresh)
    return fresh
  })
  return id
}

function wsUrl(sessionId: string): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws/chat/${sessionId}`
}

export default function ChatWidget() {
  const sessionId = useSessionId()
  const [open, setOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)

  // Open the socket the first time the panel is opened; keep it for the session.
  useEffect(() => {
    if (!open || wsRef.current) return

    const socket = new WebSocket(wsUrl(sessionId))
    wsRef.current = socket
    socket.onopen = () => setConnected(true)
    socket.onclose = () => setConnected(false)
    socket.onerror = () => setConnected(false)
    socket.onmessage = (event) => {
      try {
        const data: BotReply = JSON.parse(event.data)
        setMessages((prev) => [...prev, { role: 'bot', text: data.reply }])
      } catch {
        setMessages((prev) => [...prev, { role: 'bot', text: String(event.data) }])
      }
    }

    return () => {
      socket.close()
      wsRef.current = null
    }
  }, [open, sessionId])

  // Auto-scroll to the newest message.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages])

  const send = useCallback(() => {
    const text = input.trim()
    const socket = wsRef.current
    if (!text || !socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ message: text }))
    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
  }, [input])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-800 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-400'}`}
              />
              <span className="text-sm font-medium">
                {connected ? 'Connected' : 'Connecting…'}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-300 hover:text-white"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div ref={threadRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
            {messages.length === 0 && (
              <p className="mt-8 text-center text-sm text-slate-400">
                Ask me anything to get started.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-800 shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
              }}
              placeholder="Type a message…"
              className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={!connected}
              className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-2xl text-white shadow-lg transition hover:bg-slate-700"
        aria-label={open ? 'Minimize chat' : 'Open chat'}
      >
        {open ? '▾' : '💬'}
      </button>
    </div>
  )
}
