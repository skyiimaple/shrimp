import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { SecondaryButton, Textarea } from '../../components/ui';
import { copyText } from '../../lib/utils';

export function ToolActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function ToolResult({ value, label = '转换结果' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {value && (
          <SecondaryButton
            type="button"
            className="min-h-8 px-3 py-1 text-xs"
            onClick={() =>
              copyText(value).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              })
            }
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制结果'}
          </SecondaryButton>
        )}
      </div>
      <Textarea aria-label={label} value={value} readOnly placeholder="结果会显示在这里" />
      <span className="sr-only" role="status">
        {value ? `${label}已更新，共 ${value.length} 个字符` : ''}
      </span>
    </div>
  );
}
