import { Bot } from 'lucide-react';
import { useRef, useState } from 'react';
import { AgentDialog } from './agent-dialog';
import { Button } from '../../components/ui';

export function AgentLauncher() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        ref={triggerRef}
        variant="outline"
        className="border-border bg-card hover:bg-muted flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium"
        aria-label="打开 Agent 聊天"
        onClick={() => setOpen(true)}
      >
        <Bot size={18} />
        <span className="hidden sm:inline">Agent 聊天</span>
      </Button>
      {open && (
        <AgentDialog
          onClose={() => {
            setOpen(false);
            window.setTimeout(() => triggerRef.current?.focus(), 0);
          }}
        />
      )}
    </>
  );
}
