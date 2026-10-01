import { Bot, KeyRound, Send, Square, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, ErrorBox, Input, SecondaryButton, Textarea } from '../../components/ui';
import { Label } from '../../components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../../components/ui/sheet';
import {
  Select as ModelSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { runAgentTurn } from './agent';
import { appendMessage, clearMessages, listMessages, readSettings, writeSettings } from './storage';
import type { AgentSettings, ChatMessage, ProviderId } from './types';

const label = (provider: ProviderId) => (provider === 'glm' ? 'GLM' : 'DeepSeek');

export function AgentDialog({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AgentSettings>(readSettings);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const persistRef = useRef<Promise<void>>(Promise.resolve());
  const storageFailedRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    listMessages()
      .then((stored) => {
        if (active) {
          setMessages(stored);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setError('无法读取本地聊天记录，请检查浏览器存储权限');
      });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const updateSettings = (next: AgentSettings) => {
    try {
      writeSettings(next);
      setSettings(next);
      if (!storageFailedRef.current) setError('');
    } catch {
      setError('无法保存设置，请检查浏览器存储权限');
    }
  };

  const rememberMessage = (message: ChatMessage) => {
    const snapshot = structuredClone(message);
    setMessages((current) => {
      const index = current.findIndex((item) => item.id === snapshot.id);
      if (index < 0) return [...current, snapshot];
      const next = [...current];
      next[index] = snapshot;
      return next;
    });
    if (storageFailedRef.current) return;
    persistRef.current = persistRef.current
      .then(() => appendMessage(snapshot))
      .catch(() => {
        storageFailedRef.current = true;
        setStorageFailed(true);
        abortRef.current?.abort();
        setError('聊天记录保存失败，请检查浏览器存储空间');
      });
  };

  const send = async () => {
    if (
      !loaded ||
      busy ||
      storageFailedRef.current ||
      !draft.trim() ||
      !settings.keys[settings.provider]
    )
      return;
    const text = draft;
    setDraft('');
    setError('');
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await runAgentTurn({
        history: messages,
        userText: text,
        settings,
        signal: controller.signal,
        onMessage: rememberMessage,
        beforeRequest: async () => {
          await persistRef.current;
          if (storageFailedRef.current) throw new Error('聊天记录保存失败，请检查浏览器存储空间');
        },
      });
      await persistRef.current;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '发送失败');
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const clear = async () => {
    try {
      await persistRef.current;
      await clearMessages();
      setMessages([]);
      setConfirmClear(false);
      storageFailedRef.current = false;
      setStorageFailed(false);
      setError('');
    } catch {
      setError('清空聊天记录失败');
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="bg-background border-border inset-y-0 right-0 flex h-full w-full max-w-none flex-col gap-0 overflow-hidden border-l p-0 shadow-2xl sm:inset-y-4 sm:right-4 sm:h-[calc(100%-2rem)] sm:w-[640px] sm:max-w-[640px] sm:rounded-3xl sm:border"
      >
        <SheetTitle className="sr-only">Agent 聊天</SheetTitle>
        <SheetDescription className="sr-only">与 Shrimp AI 助手聊天</SheetDescription>
        <header className="border-border grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-b bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:rounded-t-3xl sm:px-5">
          <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-2xl sm:size-10">
              <Bot size={21} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold sm:text-base">Shrimp AI 助手</div>
              <div className="text-muted-foreground hidden text-xs sm:block">
                随时提问，按需调用工具
              </div>
            </div>
          </div>
          <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <ModelSelect
              value={settings.provider}
              onValueChange={(provider) => {
                setKeyDraft('');
                updateSettings({ ...settings, provider: provider as ProviderId });
              }}
              disabled={busy}
            >
              <SelectTrigger aria-label="模型服务商" className="w-full rounded-lg text-xs sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="glm">GLM</SelectItem>
              </SelectContent>
            </ModelSelect>
          </div>
          <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-1 sm:col-start-3">
            <Button
              variant="ghost"
              size="icon"
              className="icon-button"
              aria-label="设置 API Key"
              title="设置 API Key"
              onClick={() => {
                setKeyDraft('');
                setShowSettings((value) => !value);
              }}
            >
              <KeyRound size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="icon-button"
              aria-label="关闭聊天"
              title="关闭聊天"
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>
        </header>

        {showSettings && (
          <section className="border-border bg-muted/40 grid gap-3 border-b p-4 text-sm">
            <p>当前：{label(settings.provider)}</p>
            <Label className="grid gap-1">
              模型名称
              <Input
                value={settings.models[settings.provider]}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    models: { ...settings.models, [settings.provider]: event.target.value },
                  })
                }
              />
            </Label>
            <Label className="grid gap-1">
              当前服务商 API Key
              <Input
                aria-label="当前服务商 API Key"
                type="password"
                autoComplete="off"
                value={keyDraft}
                placeholder={
                  settings.keys[settings.provider] ? '已保存，输入新 Key 可替换' : '输入 API Key'
                }
                onChange={(event) => setKeyDraft(event.target.value)}
              />
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (keyDraft.trim()) {
                    updateSettings({
                      ...settings,
                      keys: { ...settings.keys, [settings.provider]: keyDraft.trim() },
                    });
                    setKeyDraft('');
                  }
                }}
                disabled={!keyDraft.trim()}
              >
                保存 Key
              </Button>
              <SecondaryButton
                onClick={() =>
                  updateSettings({
                    ...settings,
                    keys: { ...settings.keys, [settings.provider]: '' },
                  })
                }
                disabled={!settings.keys[settings.provider]}
              >
                删除当前 Key
              </SecondaryButton>
            </div>
            <p className="text-muted-foreground text-xs">
              Key 在此浏览器本地保存；同源脚本和浏览器扩展可能读取它。聊天请求由浏览器直连模型服务。
            </p>
          </section>
        )}

        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-gradient-to-b from-transparent to-slate-500/[0.03] px-4 py-6 sm:px-6"
          aria-live="polite"
        >
          {!messages.length && loaded && (
            <div className="mx-auto flex max-w-sm flex-col items-center py-14 text-center">
              <span className="bg-primary/10 text-primary mb-5 flex size-16 items-center justify-center rounded-3xl shadow-sm">
                <Bot size={30} />
              </span>
              <h2 className="text-foreground text-lg font-semibold">今天想聊些什么？</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                可以问我任何问题、讨论想法；需要时我也能借助工具处理数据。
              </p>
            </div>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground ml-auto rounded-br-md' : message.role === 'tool' ? 'bg-muted border-border rounded-bl-md border' : 'bg-card border-border rounded-bl-md border'}`}
            >
              {message.role !== 'user' && (
                <div className="mb-1 text-xs opacity-70">
                  {message.role === 'tool'
                    ? `工具：${message.toolName ?? '未知'}`
                    : `Agent · ${message.provider === 'glm' ? 'GLM' : 'DeepSeek'}`}
                  {message.status === 'interrupted'
                    ? ' · 已中断'
                    : message.status === 'error'
                      ? ' · 出错'
                      : ''}
                </div>
              )}
              <div className="break-words whitespace-pre-wrap">
                {message.content ||
                  (message.status === 'streaming'
                    ? '正在思考…'
                    : message.toolCalls?.length
                      ? '已调用工具'
                      : '')}
              </div>
              {message.toolCalls?.length ? (
                <div className="mt-2 text-xs opacity-70">
                  调用：{message.toolCalls.map((call) => call.name).join('、')}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {error && (
          <div className="px-4 pb-2">
            <ErrorBox>{error}</ErrorBox>
          </div>
        )}
        <div className="border-border bg-background border-t px-4 py-4 sm:rounded-b-3xl sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">
              聊天记录保存在本机 · 仅发送近期消息
            </span>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-xs"
              aria-label="清空聊天记录"
              onClick={() => setConfirmClear(true)}
              disabled={busy || !messages.length}
            >
              <Trash2 size={14} />
              清空
            </Button>
          </div>
          {confirmClear && (
            <div className="border-border bg-muted mb-3 rounded-xl border p-3 text-sm">
              <p>确定清空全部聊天记录？此操作无法撤销，API Key 不会删除。</p>
              <div className="mt-3 flex gap-2">
                <Button onClick={clear}>确认清空</Button>
                <SecondaryButton onClick={() => setConfirmClear(false)}>取消</SecondaryButton>
              </div>
            </div>
          )}
          <div
            role="group"
            aria-label="消息输入区"
            className="border-border bg-card rounded-2xl border p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20"
          >
            <Textarea
              aria-label="聊天输入"
              className="min-h-20 resize-none border-0 bg-transparent font-sans shadow-none focus:border-0 focus:ring-0"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              maxLength={4000}
              placeholder={
                settings.keys[settings.provider]
                  ? '发送消息，聊聊你的想法…'
                  : '请先设置当前服务商的 API Key'
              }
              disabled={!loaded || busy}
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-1">
              <span className="text-muted-foreground text-xs">Enter 发送 · Shift+Enter 换行</span>
              {busy ? (
                <SecondaryButton onClick={() => abortRef.current?.abort()}>
                  <Square size={16} />
                  停止生成
                </SecondaryButton>
              ) : (
                <Button
                  onClick={() => void send()}
                  disabled={
                    !loaded || storageFailed || !draft.trim() || !settings.keys[settings.provider]
                  }
                >
                  <Send size={16} />
                  发送
                </Button>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            API Key 仅在此浏览器本地保存，请在可信设备使用。
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
