import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  createHttpClient,
  createMockClient,
  defaultApiBase,
  ShrimpApiError,
  type Agent,
} from './api/index.ts'

const MOCK_KEY = 'shrimp-shell-mock'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type Conversation = {
  conversationId: string | null
  messages: ChatMessage[]
}

function emptyConv(): Conversation {
  return { conversationId: null, messages: [] }
}

function errorMessage(err: unknown): string {
  if (err instanceof ShrimpApiError) return err.message
  if (err instanceof Error) return err.message
  return '请求失败'
}

export default function App() {
  const apiBase = defaultApiBase()
  const [useMock, setUseMock] = useState(() => localStorage.getItem(MOCK_KEY) === '1')
  const client = useMemo(
    () => (useMock ? createMockClient() : createHttpClient(apiBase)),
    [useMock, apiBase],
  )

  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chats, setChats] = useState<Record<string, Conversation>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [persona, setPersona] = useState('')
  const [draft, setDraft] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)

  const selected = agents.find((a) => a.id === selectedId) ?? null
  const conv = selectedId ? (chats[selectedId] ?? emptyConv()) : emptyConv()

  useEffect(() => {
    let cancelled = false
    client
      .listAgents()
      .then((list) => {
        if (cancelled) return
        setAgents(list)
        setSelectedId(list[0]?.id ?? null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [client])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [conv.messages.length, selectedId])

  function toggleMock(next: boolean) {
    localStorage.setItem(MOCK_KEY, next ? '1' : '0')
    setAgents([])
    setSelectedId(null)
    setChats({})
    setLoadError(null)
    setUseMock(next)
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setLoadError(null)
    try {
      const agent = await client.createAgent({ name, persona })
      setAgents((prev) => [...prev, agent])
      setSelectedId(agent.id)
      setName('')
      setPersona('')
      setShowCreate(false)
    } catch (err) {
      setLoadError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    const message = draft.trim()
    if (!message) return
    const agentId = selected.id
    setDraft('')
    setBusy(true)
    setLoadError(null)
    setChats((prev) => {
      const cur = prev[agentId] ?? emptyConv()
      return {
        ...prev,
        [agentId]: { ...cur, messages: [...cur.messages, { role: 'user', content: message }] },
      }
    })
    try {
      const existing = chats[agentId]
      const res = await client.chat(agentId, {
        message,
        ...(existing?.conversationId ? { conversation_id: existing.conversationId } : {}),
      })
      setChats((prev) => {
        const cur = prev[agentId] ?? emptyConv()
        return {
          ...prev,
          [agentId]: {
            conversationId: res.conversation_id,
            messages: [...cur.messages, { role: 'assistant', content: res.message }],
          },
        }
      })
    } catch (err) {
      setLoadError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <header className="brand">
          <div>
            <strong>shrimp</strong>
            <p className="muted">侧栏多机器人 · 草图</p>
          </div>
        </header>

        <label className={`mock-toggle${useMock ? ' on' : ''}`}>
          <input
            type="checkbox"
            checked={useMock}
            onChange={(e) => toggleMock(e.target.checked)}
          />
          本地 Mock（仅本机，不请求 runtime）
        </label>

        <div className="folder">
          <div className="folder-head">
            <span>▾ 智能体</span>
            <button
              type="button"
              className="icon-btn"
              title="新建智能体"
              onClick={() => setShowCreate((v) => !v)}
            >
              +
            </button>
          </div>
          {showCreate && (
            <form className="create" onSubmit={onCreate}>
              <input
                placeholder="名称 name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <textarea
                placeholder="人设 persona"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                rows={3}
                required
              />
              <button type="submit" disabled={busy}>
                创建
              </button>
            </form>
          )}
          <ul className="agent-list">
            {agents.map((agent) => (
              <li key={agent.id}>
                <button
                  type="button"
                  className={agent.id === selectedId ? 'agent active' : 'agent'}
                  onClick={() => setSelectedId(agent.id)}
                >
                  <span className="agent-name">{agent.name}</span>
                  <span className="agent-persona">{agent.persona}</span>
                </button>
              </li>
            ))}
          </ul>
          {agents.length === 0 && !loadError && (
            <p className="muted pad">还没有智能体。点 + 创建。</p>
          )}
        </div>

        {loadError && <p className="error pad">{loadError}</p>}

        <footer className="side-foot muted">
          API {useMock ? 'mock' : apiBase}
          <br />
          不调用 /v1 · compose ui 仍是 Open WebUI
        </footer>
      </aside>

      <main className="chat">
        {selected ? (
          <>
            <header className="chat-head">
              <div>
                <strong>{selected.name}</strong>
                <p className="muted">{selected.persona}</p>
              </div>
              {conv.conversationId && (
                <code className="conv-id">{conv.conversationId}</code>
              )}
            </header>
            <div className="log">
              {conv.messages.length === 0 && (
                <p className="muted empty">发一条消息。每个智能体有独立 conversation。</p>
              )}
              {conv.messages.map((m, i) => (
                <div key={`${i}-${m.role}`} className={`bubble ${m.role}`}>
                  <span className="role">{m.role === 'user' ? '你' : selected.name}</span>
                  <p>{m.content}</p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="composer" onSubmit={onSend}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="发消息…"
                disabled={busy}
              />
              <button type="submit" disabled={busy || !draft.trim()}>
                发送
              </button>
            </form>
          </>
        ) : (
          <div className="empty-main muted">从左侧选择或创建一个智能体。</div>
        )}
      </main>
    </div>
  )
}
