import { useState } from 'react';
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  OptionSelect,
  SecondaryButton,
  Textarea,
} from '../../components/ui';
import {
  basicAuthHeader,
  chmodInfo,
  decodeHtmlEntities,
  diffTextLines,
  encodeHtmlEntities,
  hmacHex,
  integerToRoman,
  numeronym,
  romanToInteger,
  textStats,
  type TextDiffLine,
} from '../lib/parity-basics';
import { ToolActions, ToolResult } from './tool-panel-shared';

type Action = { label: string; run: (input: string) => string };

export function SingleInputTool({
  initial,
  label,
  actions,
  multiline = false,
}: {
  initial: string;
  label: string;
  actions: Action[];
  multiline?: boolean;
}) {
  const [input, setInput] = useState(initial);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const change = (value: string) => {
    setInput(value);
    setOutput('');
    setError('');
  };
  const run = (action: Action) => {
    try {
      setOutput(action.run(input));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '转换失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label={label}>
          {multiline ? (
            <Textarea
              aria-label={label}
              value={input}
              onChange={(event) => change(event.target.value)}
              spellCheck={false}
            />
          ) : (
            <Input
              aria-label={label}
              value={input}
              onChange={(event) => change(event.target.value)}
            />
          )}
        </Field>
        <ToolActions>
          {actions.map((action, index) => {
            const Control = index === 0 ? Button : SecondaryButton;
            return (
              <Control key={action.label} onClick={() => run(action)}>
                {action.label}
              </Control>
            );
          })}
        </ToolActions>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}

export function HtmlEntitiesTool() {
  return (
    <SingleInputTool
      initial={'<span title="A & B">Hello</span>'}
      label="输入文本"
      multiline
      actions={[
        { label: '转义', run: encodeHtmlEntities },
        { label: '还原', run: decodeHtmlEntities },
      ]}
    />
  );
}

export function ChmodTool() {
  return (
    <SingleInputTool
      initial="755"
      label="八进制权限"
      actions={[
        {
          label: '计算权限',
          run: (input) => {
            const { octal, symbolic } = chmodInfo(input.trim());
            return `${octal}\n${symbolic}\nchmod ${octal} <file>`;
          },
        },
      ]}
    />
  );
}

export function RomanNumeralTool() {
  return (
    <SingleInputTool
      initial="1994"
      label="整数或罗马数字"
      actions={[
        { label: '转为罗马数字', run: (input) => integerToRoman(Number(input.trim())) },
        { label: '转为整数', run: (input) => String(romanToInteger(input)) },
      ]}
    />
  );
}

export function TextStatsTool() {
  return (
    <SingleInputTool
      initial="Hello world"
      label="输入文本"
      multiline
      actions={[
        {
          label: '统计文本',
          run: (input) => {
            const { characters, words, lines, bytes } = textStats(input);
            return `字符：${characters}\n词语：${words}\n行数：${lines}\nUTF-8 字节：${bytes}`;
          },
        },
      ]}
    />
  );
}

export function NumeronymTool() {
  return (
    <SingleInputTool
      initial="internationalization"
      label="单词或短语"
      actions={[{ label: '生成缩写', run: numeronym }]}
    />
  );
}

export function BasicAuthTool() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const clear = () => {
    setOutput('');
    setError('');
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="用户名">
          <Input
            aria-label="用户名"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              clear();
            }}
          />
        </Field>
        <Field label="密码">
          <Input
            aria-label="密码"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clear();
            }}
          />
        </Field>
        <Button
          onClick={() => {
            try {
              setOutput(basicAuthHeader(username, password));
              setError('');
            } catch (reason) {
              setOutput('');
              setError(reason instanceof Error ? reason.message : '生成失败');
            }
          }}
        >
          生成请求头
        </Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} label="Authorization 请求头" />
      </Card>
    </div>
  );
}

export function HmacTool() {
  const [key, setKey] = useState('');
  const [message, setMessage] = useState('');
  const [algorithm, setAlgorithm] = useState<'SHA-256' | 'SHA-384' | 'SHA-512'>('SHA-256');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const clear = () => {
    setOutput('');
    setError('');
  };
  const run = async () => {
    try {
      setOutput(await hmacHex(key, message, algorithm));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '计算失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="密钥">
          <Input
            aria-label="密钥"
            type="password"
            value={key}
            onChange={(event) => {
              setKey(event.target.value);
              clear();
            }}
          />
        </Field>
        <Field label="正文">
          <Textarea
            aria-label="正文"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              clear();
            }}
          />
        </Field>
        <Field label="哈希算法">
          <OptionSelect
            aria-label="哈希算法"
            value={algorithm}
            onValueChange={(value) => {
              setAlgorithm(value as typeof algorithm);
              clear();
            }}
            options={['SHA-256', 'SHA-384', 'SHA-512'].map((value) => ({ value, label: value }))}
          />
        </Field>
        <Button onClick={run}>计算 HMAC</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} label="HMAC 摘要" />
      </Card>
    </div>
  );
}

function DiffRow({ line }: { line: TextDiffLine }) {
  const prefix = line.kind === 'added' ? '+ ' : line.kind === 'removed' ? '− ' : '  ';
  const color =
    line.kind === 'added' ? 'bg-emerald-500/10' : line.kind === 'removed' ? 'bg-rose-500/10' : '';
  return (
    <div className={`px-3 font-mono text-sm break-all whitespace-pre-wrap ${color}`}>
      {prefix}
      {line.value || ' '}
    </div>
  );
}

export function TextDiffTool() {
  const [before, setBefore] = useState('line one\nline two');
  const [after, setAfter] = useState('line one\nline three');
  const [lines, setLines] = useState<TextDiffLine[] | null>(null);
  const [error, setError] = useState('');
  const clear = () => {
    setLines(null);
    setError('');
  };
  const run = () => {
    try {
      setLines(diffTextLines(before, after));
      setError('');
    } catch (reason) {
      setLines(null);
      setError(reason instanceof Error ? reason.message : '比较失败');
    }
  };
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Field label="原文本">
            <Textarea
              aria-label="原文本"
              className="min-h-52"
              value={before}
              onChange={(event) => {
                setBefore(event.target.value);
                clear();
              }}
              spellCheck={false}
            />
          </Field>
        </Card>
        <Card>
          <Field label="新文本">
            <Textarea
              aria-label="新文本"
              className="min-h-52"
              value={after}
              onChange={(event) => {
                setAfter(event.target.value);
                clear();
              }}
              spellCheck={false}
            />
          </Field>
        </Card>
      </div>
      <Button className="w-fit" onClick={run}>
        比较文本
      </Button>
      {error && <ErrorBox>{error}</ErrorBox>}
      {lines && (
        <Card className="grid gap-3">
          <h2 className="font-semibold">差异结果</h2>
          <div className="border-border overflow-auto rounded-lg border py-2">
            {lines.map((line, index) => (
              <DiffRow key={index} line={line} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
