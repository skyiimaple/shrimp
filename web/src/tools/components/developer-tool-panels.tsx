import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, OptionSelect } from '../../components/ui';
import { convertRadix, type Radix } from '../lib/encoding';
import { ToolResult } from './tool-panel-shared';

const options: Array<{ value: Radix; label: string }> = [
  { value: 2, label: '二进制' },
  { value: 8, label: '八进制' },
  { value: 10, label: '十进制' },
  { value: 16, label: '十六进制' },
];

export function RadixTool() {
  const [input, setInput] = useState('255');
  const [from, setFrom] = useState<Radix>(10);
  const [to, setTo] = useState<Radix>(16);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const run = () => {
    const result = convertRadix(input, from, to);
    if (result.ok) {
      setOutput(result.value);
      setError('');
    } else {
      setOutput('');
      setError(result.error);
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="待转换整数">
          <Input
            className="font-mono"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput('');
              setError('');
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="来源进制">
            <OptionSelect
              aria-label="来源进制"
              value={String(from)}
              onValueChange={(value) => {
                setFrom(Number(value) as Radix);
                setOutput('');
                setError('');
              }}
              options={options.map((item) => ({ value: String(item.value), label: item.label }))}
            />
          </Field>
          <Field label="目标进制">
            <OptionSelect
              aria-label="目标进制"
              value={String(to)}
              onValueChange={(value) => {
                setTo(Number(value) as Radix);
                setOutput('');
                setError('');
              }}
              options={options.map((item) => ({ value: String(item.value), label: item.label }))}
            />
          </Field>
        </div>
        <Button onClick={run}>转换进制</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}
