import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, Textarea } from '../../components/ui';
import { generateLoremIpsum, maskText, normalizeEmail, searchRegexCheatsheet } from '../lib/parity-text-misc';
import { ToolResult } from './tool-panel-shared';

export function LoremIpsumTool() {
  const [count, setCount] = useState('3');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const generate = () => {
    try {
      setOutput(generateLoremIpsum(Number(count)));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '生成失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="段落数量" hint="1 至 20 段">
          <Input aria-label="段落数量" type="number" min={1} max={20} step={1} value={count} onChange={(event) => { setCount(event.target.value); setOutput(''); setError(''); }} />
        </Field>
        <Button onClick={generate}>生成文本</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card><ToolResult value={output} label="生成结果" /></Card>
    </div>
  );
}

export function TextMaskTool() {
  const [input, setInput] = useState('');
  const [start, setStart] = useState('2');
  const [end, setEnd] = useState('2');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const run = () => {
    try {
      setOutput(maskText(input, Number(start), Number(end)));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '遮蔽失败');
    }
  };
  const clear = () => { setOutput(''); setError(''); };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="原始文本"><Textarea aria-label="原始文本" value={input} onChange={(event) => { setInput(event.target.value); clear(); }} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="保留开头字符"><Input aria-label="保留开头字符" type="number" min={0} step={1} value={start} onChange={(event) => { setStart(event.target.value); clear(); }} /></Field>
          <Field label="保留结尾字符"><Input aria-label="保留结尾字符" type="number" min={0} step={1} value={end} onChange={(event) => { setEnd(event.target.value); clear(); }} /></Field>
        </div>
        <Button onClick={run}>遮蔽文本</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card><ToolResult value={output} label="遮蔽结果" /></Card>
    </div>
  );
}

export function EmailNormalizerTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="Email 地址" hint="仅去掉两端空白并将域名转为小写；本工具不验证邮箱是否有效。">
          <Input aria-label="Email 地址" value={input} onChange={(event) => { setInput(event.target.value); setOutput(''); }} />
        </Field>
        <Button onClick={() => setOutput(normalizeEmail(input))}>标准化 Email</Button>
      </Card>
      <Card><ToolResult value={output} label="标准化结果" /></Card>
    </div>
  );
}

export function RegexCheatsheetTool() {
  const [query, setQuery] = useState('');
  const entries = searchRegexCheatsheet(query);
  return (
    <div className="grid gap-4">
      <Card><Field label="搜索正则语法" hint="JavaScript 正则表达式常用语法；部分特性需要现代浏览器。"><Input aria-label="搜索正则语法" value={query} onChange={(event) => setQuery(event.target.value)} /></Field></Card>
      <Card className="grid gap-3">
        <p className="text-sm font-medium">{entries.length} 个匹配项</p>
        {entries.length ? entries.map((entry) => (
          <div key={entry.syntax} className="border-border grid gap-1 rounded-lg border p-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <code className="font-mono text-sm">{entry.syntax}</code>
            <div><p className="font-medium">{entry.name}</p><p className="text-muted-foreground text-sm">{entry.description}</p></div>
          </div>
        )) : <p className="text-muted-foreground text-sm">没有找到匹配的语法。</p>}
      </Card>
    </div>
  );
}
