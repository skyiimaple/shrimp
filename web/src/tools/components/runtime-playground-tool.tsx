import { useEffect, useMemo, useState } from 'react';
import { Play, RotateCcw, Square } from 'lucide-react';
import { Button, Card, ErrorBox, OptionSelect, Textarea } from '../../components/ui';
import { RuntimeRunner, type RuntimeRunnerEvent } from '../runtime-playground-runner';
import type { RuntimeLanguage } from '../runtime-playground-protocol';

const examples: Record<RuntimeLanguage, string> = {
  javascript: `console.log(1 + 1);`,
  python: `print(1 + 1)`,
};

export function RuntimePlaygroundTool() {
  const [language, setLanguage] = useState<RuntimeLanguage>('javascript');
  const [code, setCode] = useState(examples.javascript);
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'initializing' | 'done' | 'error'>(
    'idle',
  );
  const [running, setRunning] = useState(false);
  const runner = useMemo(() => new RuntimeRunner(), []);

  useEffect(() => () => runner.dispose(), [runner]);

  const handleEvent = (event: RuntimeRunnerEvent) => {
    if (event.type === 'stdout') setStdout((current) => current + event.text);
    if (event.type === 'stderr') setStderr((current) => current + event.text);
    if (event.type === 'status')
      setStatus(event.status === 'initializing' ? 'initializing' : 'running');
    if (event.type === 'done') {
      setRunning(false);
      setStatus('done');
    }
    if (event.type === 'error') {
      setRunning(false);
      setStatus('error');
      setError(event.error);
    }
  };

  const run = () => {
    setStdout('');
    setStderr('');
    setError('');
    setRunning(true);
    setStatus('running');
    runner.run(language, code, handleEvent);
  };

  const stop = () => runner.stop('已停止运行');

  const reset = () => {
    runner.stop('已停止运行');
    setCode(examples[language]);
    setStdout('');
    setStderr('');
    setError('');
    setRunning(false);
    setStatus('idle');
  };

  const changeLanguage = (nextLanguage: string) => {
    const next = nextLanguage as RuntimeLanguage;
    runner.stop('已停止运行');
    setLanguage(next);
    setCode(examples[next]);
    setStdout('');
    setStderr('');
    setError('');
    setRunning(false);
    setStatus('idle');
  };

  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">代码</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              在隔离 Worker 中执行，不访问网页、网络或本地文件。
            </p>
          </div>
          <OptionSelect
            aria-label="运行语言"
            value={language}
            onValueChange={changeLanguage}
            options={[
              { value: 'javascript', label: 'JavaScript' },
              { value: 'python', label: 'Python' },
            ]}
          />
        </div>
        <Textarea
          aria-label="代码编辑器"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="min-h-80"
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={running}>
            <Play size={16} />
            运行
          </Button>
          <Button variant="outline" onClick={stop} disabled={!running}>
            <Square size={16} />
            停止
          </Button>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw size={16} />
            重置
          </Button>
        </div>
        <p role="status" className="text-muted-foreground text-xs">
          状态：{statusLabel(status)} · 单次最多运行 3 秒，输出最多 20,000 字符
        </p>
      </Card>
      <Card className="grid content-start gap-4">
        <div>
          <h2 className="text-base font-bold">运行结果</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            标准输出、标准错误和运行异常会分别展示。
          </p>
        </div>
        <OutputBlock label="stdout" value={stdout} placeholder="标准输出会显示在这里" />
        <OutputBlock label="stderr" value={stderr} placeholder="标准错误会显示在这里" />
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
    </div>
  );
}

function OutputBlock({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <Textarea
        aria-label={label}
        value={value}
        readOnly
        placeholder={placeholder}
        className="min-h-28"
      />
    </label>
  );
}

function statusLabel(status: 'idle' | 'running' | 'initializing' | 'done' | 'error') {
  if (status === 'running') return '运行中';
  if (status === 'initializing') return '正在加载 Python 运行时';
  if (status === 'done') return '已完成';
  if (status === 'error') return '执行失败';
  return '就绪';
}
