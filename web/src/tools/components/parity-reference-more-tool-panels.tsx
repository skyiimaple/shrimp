import { useState } from 'react';
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  SecondaryButton,
  Textarea,
} from '../../components/ui';
import { copyText } from '../../lib/utils';
import {
  decodeOutlookSafeLink,
  findCommonEmojis,
  findGitCommands,
  fromNatoAlphabet,
  toNatoAlphabet,
} from '../lib/parity-reference-more';
import { ToolResult } from './tool-panel-shared';

export function NatoAlphabetTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="输入文本" hint="字母按 NATO 拼读词转换；其他字符保留。">
          <Textarea
            aria-label="输入文本"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput('');
            }}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOutput(toNatoAlphabet(input))}>字母 → NATO</Button>
          <SecondaryButton onClick={() => setOutput(fromNatoAlphabet(input))}>
            NATO → 字母
          </SecondaryButton>
        </div>
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}

export function OutlookSafeLinkTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const decode = () => {
    try {
      setOutput(decodeOutlookSafeLink(input));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '解码失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="Outlook SafeLink" hint="仅在本地解析，不访问目标网站。">
          <Textarea
            aria-label="Outlook SafeLink"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput('');
              setError('');
            }}
          />
        </Field>
        <Button onClick={decode}>解码链接</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid gap-3">
        <p className="text-muted-foreground text-sm">
          请自行核对目标域名。结果只显示为文本，不会自动打开。
        </p>
        <ToolResult value={output} label="目标 URL" />
      </Card>
    </div>
  );
}

export function GitCommandsTool() {
  const [query, setQuery] = useState('');
  const commands = findGitCommands(query);
  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <Field label="搜索 Git 命令">
          <Input
            aria-label="搜索 Git 命令"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <p className="text-muted-foreground text-sm">
          常用命令速查；尖括号内容是需要替换的占位符。
        </p>
      </Card>
      <Card className="grid gap-2">
        <p className="text-sm font-medium">{commands.length} 个匹配项</p>
        {commands.map((item) => (
          <div
            key={item.command}
            className="border-border grid gap-1 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
            <code className="text-sm break-all">{item.command}</code>
            <span className="text-muted-foreground text-sm">{item.description}</span>
          </div>
        ))}
        {!commands.length && (
          <p className="text-muted-foreground text-sm">没有找到匹配的常用命令。</p>
        )}
      </Card>
    </div>
  );
}

export function EmojiPickerTool() {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const emojis = findCommonEmojis(query);
  const copyEmoji = async (emoji: string) => {
    try {
      await copyText(emoji);
      setMessage(`已复制 ${emoji}`);
    } catch {
      setMessage('复制失败，请检查剪贴板权限。');
    }
  };
  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <Field label="搜索 Emoji" hint="按英文名称、中文关键词或表情搜索。">
          <Input
            aria-label="搜索 Emoji"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <p className="text-muted-foreground text-sm">常用表情精选，点击即可复制。</p>
      </Card>
      <Card className="grid gap-3">
        <p className="text-sm font-medium">{emojis.length} 个匹配项</p>
        <div className="flex flex-wrap gap-2">
          {emojis.map((item) => (
            <SecondaryButton
              key={item.emoji}
              aria-label={`${item.emoji} ${item.name}`}
              title={`${item.name} · ${item.keywords}`}
              onClick={() => void copyEmoji(item.emoji)}
              className="min-h-12 text-2xl"
            >
              {item.emoji}
            </SecondaryButton>
          ))}
        </div>
        {!emojis.length && (
          <p className="text-muted-foreground text-sm">没有找到匹配的常用表情。</p>
        )}
        <p role="status" className="text-muted-foreground text-sm">
          {message}
        </p>
      </Card>
    </div>
  );
}
