import { useEffect, useRef, useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, OptionSelect } from '../../components/ui';
import { calculateEtaSeconds, evaluateMathExpression, formatElapsedTime } from '../lib/parity-math';
import { ToolResult } from './tool-panel-shared';

export function MathExpressionTool() {
  const [input, setInput] = useState('2 + 3 * (4 - 1)');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const run = () => {
    try {
      setOutput(String(evaluateMathExpression(input)));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '计算失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="数学表达式">
          <Input
            aria-label="数学表达式"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput('');
              setError('');
            }}
          />
        </Field>
        <p className="text-muted-foreground text-sm">
          支持 + − × ÷ ^、括号及 sqrt、sin、cos、abs；三角函数使用弧度。
        </p>
        <Button onClick={run}>计算表达式</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult label="计算结果" value={output} />
      </Card>
    </div>
  );
}

function formatEta(seconds: number): string {
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remaining = rounded % 60;
  return (
    [hours && `${hours} 小时`, minutes && `${minutes} 分钟`, remaining && `${remaining} 秒`]
      .filter(Boolean)
      .join(' ') || '0 秒'
  );
}

export function EtaTool() {
  const [distance, setDistance] = useState('120');
  const [speed, setSpeed] = useState('60');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const clear = () => {
    setOutput('');
    setError('');
  };
  const run = () => {
    try {
      if (!distance.trim() || !speed.trim()) throw new Error('请输入距离和速度');
      setOutput(formatEta(calculateEtaSeconds(Number(distance), Number(speed))));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '计算失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="距离（公里）">
          <Input
            aria-label="距离（公里）"
            type="number"
            min="0"
            value={distance}
            onChange={(event) => {
              setDistance(event.target.value);
              clear();
            }}
          />
        </Field>
        <Field label="速度（公里/小时）">
          <Input
            aria-label="速度（公里/小时）"
            type="number"
            min="0"
            value={speed}
            onChange={(event) => {
              setSpeed(event.target.value);
              clear();
            }}
          />
        </Field>
        <Button onClick={run}>计算耗时</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult label="预计耗时" value={output} />
      </Card>
    </div>
  );
}

export function StopwatchTool() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const accumulated = useRef(0);
  const startedAt = useRef(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => setElapsed(accumulated.current + Date.now() - startedAt.current),
      10,
    );
    return () => window.clearInterval(timer);
  }, [running]);
  const toggle = () => {
    if (running) {
      accumulated.current += Date.now() - startedAt.current;
      setElapsed(accumulated.current);
      setRunning(false);
    } else {
      startedAt.current = Date.now();
      setStarted(true);
      setRunning(true);
    }
  };
  const reset = () => {
    setRunning(false);
    setStarted(false);
    accumulated.current = 0;
    setElapsed(0);
  };
  return (
    <Card className="grid gap-4">
      <output aria-label="秒表时间" className="font-mono text-4xl tabular-nums">
        {formatElapsedTime(elapsed)}
      </output>
      <div className="flex gap-2">
        <Button onClick={toggle}>{running ? '暂停' : started ? '继续' : '开始'}</Button>
        <Button onClick={reset}>重置</Button>
      </div>
    </Card>
  );
}

type BenchmarkScenario = 'sort' | 'json';
export function BenchmarkTool() {
  const [scenario, setScenario] = useState<BenchmarkScenario>('sort');
  const [output, setOutput] = useState('');
  const run = () => {
    const start = performance.now();
    if (scenario === 'sort')
      Array.from({ length: 1000 }, (_, index) => 1000 - index).sort((a, b) => a - b);
    else
      JSON.stringify(
        Array.from({ length: 1000 }, (_, index) => ({ index, label: `item-${index}` })),
      );
    setOutput(
      `${scenario === 'sort' ? '1000 个数字排序' : '1000 个对象 JSON 序列化'}：${(performance.now() - start).toFixed(3)} 毫秒`,
    );
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          固定基准场景；测量结果受浏览器和设备状态影响，仅供参考。
        </p>
        <Field label="基准场景">
          <OptionSelect
            aria-label="基准场景"
            value={scenario}
            onValueChange={(value) => {
              setScenario(value as BenchmarkScenario);
              setOutput('');
            }}
            options={[
              { value: 'sort', label: '1000 个数字排序' },
              { value: 'json', label: '1000 个对象 JSON 序列化' },
            ]}
          />
        </Field>
        <Button onClick={run}>运行基准测试</Button>
      </Card>
      <Card>
        <ToolResult label="基准测试结果" value={output} />
      </Card>
    </div>
  );
}
