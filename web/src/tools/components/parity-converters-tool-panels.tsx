import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, OptionSelect } from '../../components/ui';
import {
  binaryToText,
  convertTemperature,
  generateUlid,
  randomPort,
  slugify,
  textToBinary,
  textToUnicode,
  unicodeToText,
  type TemperatureScale,
} from '../lib/parity-converters';
import { ToolResult } from './tool-panel-shared';
import { SingleInputTool } from './parity-basics-tool-panels';

function GeneratorTool({ button, generate }: { button: string; generate: () => string }) {
  const [output, setOutput] = useState('');
  return (
    <div className="tool-grid">
      <Card>
        <Button onClick={() => setOutput(generate())}>{button}</Button>
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}

export function UlidTool() {
  return <GeneratorTool button="生成 ULID" generate={generateUlid} />;
}

export function RandomPortTool() {
  return <GeneratorTool button="生成端口" generate={() => String(randomPort())} />;
}

export function BinaryTextTool() {
  return (
    <SingleInputTool
      initial="Hello"
      label="输入文本"
      multiline
      actions={[
        { label: '转为二进制', run: textToBinary },
        { label: '转为文本', run: binaryToText },
      ]}
    />
  );
}

export function UnicodeTextTool() {
  return (
    <SingleInputTool
      initial="Hello 😀"
      label="输入文本"
      multiline
      actions={[
        { label: '转为 Unicode', run: textToUnicode },
        { label: '转为文本', run: unicodeToText },
      ]}
    />
  );
}

export function SlugifyTool() {
  return (
    <SingleInputTool
      initial="Café & 你好 World"
      label="输入文本"
      actions={[{ label: '生成 Slug', run: slugify }]}
    />
  );
}

const scales: Array<{ value: TemperatureScale; label: string }> = [
  { value: 'C', label: '摄氏度 °C' },
  { value: 'F', label: '华氏度 °F' },
  { value: 'K', label: '开尔文 K' },
];

export function TemperatureTool() {
  const [input, setInput] = useState('0');
  const [from, setFrom] = useState<TemperatureScale>('C');
  const [to, setTo] = useState<TemperatureScale>('F');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const clear = () => {
    setOutput('');
    setError('');
  };
  const run = () => {
    try {
      const value = convertTemperature(Number(input), from, to);
      setOutput(`${value} °${to === 'K' ? '' : to}`.trim());
      if (to === 'K') setOutput(`${value} K`);
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '转换失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="温度值">
          <Input
            aria-label="温度值"
            type="number"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              clear();
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="来源单位">
            <OptionSelect
              aria-label="来源单位"
              value={from}
              onValueChange={(value) => {
                setFrom(value as TemperatureScale);
                clear();
              }}
              options={scales}
            />
          </Field>
          <Field label="目标单位">
            <OptionSelect
              aria-label="目标单位"
              value={to}
              onValueChange={(value) => {
                setTo(value as TemperatureScale);
                clear();
              }}
              options={scales}
            />
          </Field>
        </div>
        <Button onClick={run}>转换温度</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}
