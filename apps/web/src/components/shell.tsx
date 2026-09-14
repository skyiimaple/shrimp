"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  createHttpClient,
  createMockClient,
  defaultApiBase,
  ShrimpApiError,
  type Agent,
} from "@/lib/api";

const MOCK_KEY = "shrimp-shell-mock";
const mockListeners = new Set<() => void>();

function subscribeMockFlag(cb: () => void) {
  mockListeners.add(cb);
  return () => {
    mockListeners.delete(cb);
  };
}

function getMockFlag(): boolean {
  return localStorage.getItem(MOCK_KEY) === "1";
}

function getMockFlagServer(): boolean {
  return false;
}

function writeMockFlag(next: boolean) {
  localStorage.setItem(MOCK_KEY, next ? "1" : "0");
  mockListeners.forEach((cb) => {
    cb();
  });
}

type ChatMessage = { role: "user" | "assistant"; content: string };

type Conversation = {
  conversationId: string | null;
  messages: ChatMessage[];
};

function emptyConv(): Conversation {
  return { conversationId: null, messages: [] };
}

function errorMessage(err: unknown): string {
  if (err instanceof ShrimpApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "请求失败";
}

export function Shell() {
  const apiBase = defaultApiBase();
  const useMock = useSyncExternalStore(
    subscribeMockFlag,
    getMockFlag,
    getMockFlagServer,
  );
  const client = useMemo(
    () => (useMock ? createMockClient() : createHttpClient(apiBase)),
    [useMock, apiBase],
  );

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chats, setChats] = useState<Record<string, Conversation>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [draft, setDraft] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = agents.find((a) => a.id === selectedId) ?? null;
  const conv = selectedId ? (chats[selectedId] ?? emptyConv()) : emptyConv();

  useEffect(() => {
    let cancelled = false;
    client
      .listAgents()
      .then((list) => {
        if (cancelled) return;
        setAgents(list);
        setSelectedId(list[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conv.messages.length, selectedId]);

  function toggleMock(next: boolean) {
    setAgents([]);
    setSelectedId(null);
    setChats({});
    setLoadError(null);
    writeMockFlag(next);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLoadError(null);
    try {
      const agent = await client.createAgent({ name, persona });
      setAgents((prev) => [...prev, agent]);
      setSelectedId(agent.id);
      setName("");
      setPersona("");
      setShowCreate(false);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const message = draft.trim();
    if (!message) return;
    const agentId = selected.id;
    setDraft("");
    setBusy(true);
    setLoadError(null);
    setChats((prev) => {
      const cur = prev[agentId] ?? emptyConv();
      return {
        ...prev,
        [agentId]: {
          ...cur,
          messages: [...cur.messages, { role: "user", content: message }],
        },
      };
    });
    try {
      const existing = chats[agentId];
      const res = await client.chat(agentId, {
        message,
        ...(existing?.conversationId
          ? { conversation_id: existing.conversationId }
          : {}),
      });
      setChats((prev) => {
        const cur = prev[agentId] ?? emptyConv();
        return {
          ...prev,
          [agentId]: {
            conversationId: res.conversation_id,
            messages: [
              ...cur.messages,
              { role: "assistant", content: res.message },
            ],
          },
        };
      });
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex h-full w-68 shrink-0 flex-col border-r border-line bg-sidebar">
        <header className="px-4 pt-4 pb-2">
          <strong className="text-[15px] tracking-wide">shrimp</strong>
          <p className="mt-1 text-xs leading-snug text-muted">
            侧栏多机器人 · 草图
          </p>
        </header>

        <label
          className={`mx-3 mb-3 flex cursor-pointer items-start gap-2 rounded-lg border border-dashed px-2.5 py-2 text-xs ${
            useMock
              ? "border-accent bg-accent-dim text-[#f3d2bc]"
              : "border-line text-muted"
          }`}
        >
          <input
            type="checkbox"
            className="mt-0.5"
            checked={useMock}
            onChange={(e) => toggleMock(e.target.checked)}
          />
          本地 Mock（仅本机，不请求 runtime）
        </label>

        <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
          <div className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
            <span>▾ 智能体</span>
            <button
              type="button"
              title="新建智能体"
              className="h-6 w-6 rounded-md border border-line bg-panel leading-none hover:border-accent hover:text-accent"
              onClick={() => setShowCreate((v) => !v)}
            >
              +
            </button>
          </div>
          {showCreate && (
            <form className="flex flex-col gap-1.5 px-2 pb-2.5" onSubmit={onCreate}>
              <input
                placeholder="名称 name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 outline-none"
              />
              <textarea
                placeholder="人设 persona"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                rows={3}
                required
                className="w-full resize-y rounded-lg border border-line bg-bg px-2.5 py-2 outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-accent px-3 py-2 font-semibold text-[#1a1008] disabled:cursor-default disabled:opacity-50"
              >
                创建
              </button>
            </form>
          )}
          <ul>
            {agents.map((agent) => (
              <li key={agent.id}>
                <button
                  type="button"
                  className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left ${
                    agent.id === selectedId
                      ? "bg-accent-dim"
                      : "hover:bg-[#1e222b]"
                  }`}
                  onClick={() => setSelectedId(agent.id)}
                >
                  <span className="text-sm">{agent.name}</span>
                  <span className="max-w-full truncate text-xs text-muted">
                    {agent.persona}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {agents.length === 0 && !loadError && (
            <p className="px-4 py-2 text-xs text-muted">
              还没有智能体。点 + 创建。
            </p>
          )}
        </div>

        {loadError && (
          <p className="px-4 py-2 text-xs text-danger">{loadError}</p>
        )}

        <footer className="border-t border-line px-4 pt-3 pb-4 text-xs leading-relaxed text-muted">
          API {useMock ? "mock" : apiBase}
          <br />
          不调用 /v1 · compose ui 仍是 Open WebUI
        </footer>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <strong>{selected.name}</strong>
                <p className="mt-1 text-xs text-muted">{selected.persona}</p>
              </div>
              {conv.conversationId && (
                <code className="rounded-md bg-panel px-2 py-1 text-[11px] text-muted">
                  {conv.conversationId}
                </code>
              )}
            </header>
            <div className="flex flex-1 flex-col gap-3 overflow-auto p-5">
              {conv.messages.length === 0 && (
                <p className="m-auto text-xs text-muted">
                  发一条消息。每个智能体有独立 conversation。
                </p>
              )}
              {conv.messages.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={`max-w-[720px] rounded-[10px] px-3 py-2.5 ${
                    m.role === "user"
                      ? "self-end bg-user"
                      : "self-start bg-panel"
                  }`}
                >
                  <span className="mb-1 block text-[11px] text-muted">
                    {m.role === "user" ? "你" : selected.name}
                  </span>
                  <p className="m-0 leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form
              className="flex gap-2 border-t border-line px-4 pt-3 pb-4"
              onSubmit={onSend}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="发消息…"
                disabled={busy}
                className="flex-1 rounded-lg border border-line bg-bg px-2.5 py-2 outline-none"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="rounded-lg bg-accent px-3 py-2 font-semibold text-[#1a1008] disabled:cursor-default disabled:opacity-50"
              >
                发送
              </button>
            </form>
          </>
        ) : (
          <div className="m-auto text-xs text-muted">
            从左侧选择或创建一个智能体。
          </div>
        )}
      </main>
    </div>
  );
}
