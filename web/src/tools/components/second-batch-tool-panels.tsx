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
import { convertColor, type ColorValues } from '../lib/color';
import { markdownToHtml } from '../lib/markdown';
import { analyzePassword, generatePassword, type PasswordOptions } from '../lib/password';
import { formatSql } from '../lib/sql';
import { parseUserAgent, type UserAgentInfo } from '../lib/user-agent';
import { ToolResult } from './tool-panel-shared';

export function MarkdownTool() {
  const [input, setInput] = useState('# 标题\n\n一段 **Markdown** 文本。');
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const convert = () => {
    const result = markdownToHtml(input);
    setHtml(result.ok ? result.value : '');
    setError(result.ok ? '' : result.error);
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="Markdown 源文本">
          <Textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setHtml('');
              setError('');
            }}
          />
        </Field>
        <Button onClick={convert}>转换 Markdown</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid gap-4">
        <ToolResult value={html} label="生成的 HTML" />
        <div>
          <div className="mb-2 text-sm font-medium">安全预览</div>
          <div
            role="region"
            aria-label="安全预览"
            className="prose prose-sm dark:prose-invert border-border [&_a]:text-primary min-h-24 max-w-none overflow-auto rounded-xl border p-4 [&_h1]:mb-3 [&_h1]:text-2xl [&_p]:my-2"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </Card>
    </div>
  );
}

export function SqlTool() {
  const [input, setInput] = useState('select id, name from users where active = 1 order by name');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const run = () => {
    const result = formatSql(input);
    setOutput(result.ok ? result.value : '');
    setError(result.ok ? '' : result.error);
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="SQL 输入">
          <Textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput('');
              setError('');
            }}
            spellCheck={false}
          />
        </Field>
        <Button onClick={run}>格式化 SQL</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} label="格式化结果" />
      </Card>
    </div>
  );
}

const initialOptions: PasswordOptions = {
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
};
const optionLabels: Array<{ key: keyof Omit<PasswordOptions, 'length'>; label: string }> = [
  { key: 'lower', label: '小写字母' },
  { key: 'upper', label: '大写字母' },
  { key: 'digits', label: '数字' },
  { key: 'symbols', label: '符号' },
];

export function PasswordTool() {
  const [options, setOptions] = useState<PasswordOptions>(initialOptions);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const strength = analyzePassword(password);
  const generate = () => {
    const result = generatePassword(options);
    setPassword(result.ok ? result.value : '');
    setError(result.ok ? '' : result.error);
    setCopied(false);
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="密码长度（4–128）">
          <Input
            type="number"
            min={4}
            max={128}
            value={options.length}
            onChange={(event) => {
              setOptions({ ...options, length: Number(event.target.value) });
              setPassword('');
              setError('');
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {optionLabels.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(event) => {
                  setOptions({ ...options, [key]: event.target.checked });
                  setPassword('');
                  setError('');
                }}
              />
              {label}
            </label>
          ))}
        </div>
        <Button onClick={generate}>生成密码</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid content-start gap-4">
        <Field label="密码（可输入或生成）">
          <Input
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setCopied(false);
            }}
            className="font-mono"
            autoComplete="off"
            placeholder="输入密码分析强度，或点击生成"
          />
        </Field>
        <SecondaryButton
          disabled={!password}
          onClick={() => {
            void copyText(password).then(() => setCopied(true));
          }}
        >
          {copied ? '已复制' : '复制密码'}
        </SecondaryButton>
        {password && (
          <p className="text-muted-foreground text-sm">
            强度：{strength.level}。{strength.feedback}
          </p>
        )}
      </Card>
    </div>
  );
}

const colorRows: Array<{ key: keyof ColorValues; label: string }> = [
  { key: 'hex', label: 'HEX' },
  { key: 'rgb', label: 'RGB' },
  { key: 'hsl', label: 'HSL' },
];

export function ColorTool() {
  const [input, setInput] = useState('#f00');
  const [color, setColor] = useState<ColorValues | null>(null);
  const [error, setError] = useState('');
  const run = () => {
    const result = convertColor(input);
    setColor(result.ok ? result.value : null);
    setError(result.ok ? '' : result.error);
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="颜色值（HEX、RGB 或 HSL）">
          <Input
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setColor(null);
              setError('');
            }}
            placeholder="#FF0000"
          />
        </Field>
        <Button onClick={run}>转换颜色</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid content-start gap-4">
        {color ? (
          <>
            <div
              aria-label="颜色预览"
              className="border-border h-20 rounded-xl border"
              style={{ backgroundColor: color.hex }}
            />
            {colorRows.map(({ key, label }) => (
              <div key={key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{label}</span>
                <code className="font-mono">{color[key]}</code>
                <SecondaryButton
                  className="min-h-8 px-3 py-1 text-xs"
                  onClick={() => {
                    void copyText(color[key]);
                  }}
                >
                  复制 {label}
                </SecondaryButton>
              </div>
            ))}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">转换后显示颜色预览和三种格式。</p>
        )}
      </Card>
    </div>
  );
}

export function UserAgentTool() {
  const [input, setInput] = useState(navigator.userAgent);
  const [info, setInfo] = useState<UserAgentInfo | null>(null);
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="User-Agent 文本">
          <Textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setInfo(null);
            }}
            spellCheck={false}
          />
        </Field>
        <Button onClick={() => setInfo(parseUserAgent(input))}>解析 User-Agent</Button>
      </Card>
      <Card>
        {info ? (
          <dl className="result-list">
            <div>
              <dt>浏览器</dt>
              <dd>{info.browser}</dd>
            </div>
            <div>
              <dt>系统</dt>
              <dd>{info.system}</dd>
            </div>
            <div>
              <dt>设备</dt>
              <dd>{info.device}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">解析后显示浏览器、系统和设备信息。</p>
        )}
      </Card>
    </div>
  );
}
