import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, Textarea } from '../../components/ui';
import { analyzePasswordStrength, drawAsciiText, generateToken } from '../lib/parity-small-gaps';
import { ToolResult } from './tool-panel-shared';

export function TokenGeneratorTool() {
  const [length, setLength] = useState('32');
  const [alphabet, setAlphabet] = useState(
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  );
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="令牌长度">
          <Input
            aria-label="令牌长度"
            type="number"
            min={1}
            max={4096}
            value={length}
            onChange={(event) => setLength(event.target.value)}
          />
        </Field>
        <Field label="字符集" hint="2 至 256 个不重复字符">
          <Input
            aria-label="字符集"
            value={alphabet}
            onChange={(event) => setAlphabet(event.target.value)}
          />
        </Field>
        <Button
          onClick={() => {
            try {
              setOutput(generateToken(Number(length), alphabet));
              setError('');
            } catch (reason) {
              setOutput('');
              setError(reason instanceof Error ? reason.message : '生成失败');
            }
          }}
        >
          生成令牌
        </Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} label="令牌结果" />
      </Card>
    </div>
  );
}

export function PasswordStrengthTool() {
  const [password, setPassword] = useState('');
  const result = analyzePasswordStrength(password);
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="待分析密码">
          <Input
            aria-label="待分析密码"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <p className="text-sm">仅供参考：此强度估算是启发式判断，不能保证密码安全。</p>
      </Card>
      <Card className="grid gap-2">
        <p>强度：{result.level}</p>
        <p>{result.feedback}</p>
      </Card>
    </div>
  );
}

export function AsciiTextTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="待绘制文字" hint="支持英文字母、数字和空格；其他字符会报错。">
          <Input
            aria-label="待绘制文字"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </Field>
        <Button
          onClick={() => {
            try {
              setOutput(drawAsciiText(input));
              setError('');
            } catch (reason) {
              setOutput('');
              setError(reason instanceof Error ? reason.message : '绘制失败');
            }
          }}
        >
          绘制 ASCII
        </Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <Textarea aria-label="ASCII 结果" value={output} readOnly className="font-mono" />
      </Card>
    </div>
  );
}
