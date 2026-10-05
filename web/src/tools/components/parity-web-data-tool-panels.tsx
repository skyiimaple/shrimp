import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, SecondaryButton } from '../../components/ui';
import {
  formatYaml,
  generateOgTags,
  generateSvgPlaceholder,
  percentOf,
  percentShare,
  tomlToYaml,
  yamlToToml,
} from '../lib/parity-web-data';
import type { Result } from '../lib/result';
import { ToolActions, ToolResult } from './tool-panel-shared';
import { SingleInputTool } from './parity-basics-tool-panels';

function unwrap(result: Result<string>) {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

export function YamlTomlTool() {
  return (
    <SingleInputTool
      initial="name: Shrimp\nready: true"
      label="输入内容"
      multiline
      actions={[
        { label: 'YAML → TOML', run: (input) => unwrap(yamlToToml(input)) },
        { label: 'TOML → YAML', run: (input) => unwrap(tomlToYaml(input)) },
      ]}
    />
  );
}

export function YamlFormatTool() {
  return (
    <SingleInputTool
      initial="# config\nname:  Shrimp"
      label="YAML 输入"
      multiline
      actions={[{ label: '格式化 YAML', run: (input) => unwrap(formatYaml(input)) }]}
    />
  );
}

export function OgMetaTool() {
  const [title, setTitle] = useState('Shrimp 工具箱');
  const [description, setDescription] = useState('浏览器里的开发工具');
  const [url, setUrl] = useState('https://example.com');
  const [image, setImage] = useState('');
  const [output, setOutput] = useState('');
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="标题">
          <Input
            aria-label="标题"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setOutput('');
            }}
          />
        </Field>
        <Field label="描述">
          <Input
            aria-label="描述"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setOutput('');
            }}
          />
        </Field>
        <Field label="页面 URL">
          <Input
            aria-label="页面 URL"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setOutput('');
            }}
          />
        </Field>
        <Field label="图片 URL（可选）">
          <Input
            aria-label="图片 URL"
            value={image}
            onChange={(event) => {
              setImage(event.target.value);
              setOutput('');
            }}
          />
        </Field>
        <Button onClick={() => setOutput(generateOgTags({ title, description, url, image }))}>
          生成标签
        </Button>
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}

export function SvgPlaceholderTool() {
  const [width, setWidth] = useState('320');
  const [height, setHeight] = useState('180');
  const [color, setColor] = useState('#007f6d');
  const [label, setLabel] = useState('320 × 180');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const clear = () => {
    setOutput('');
    setError('');
  };
  const run = () => {
    try {
      setOutput(generateSvgPlaceholder(Number(width), Number(height), color, label));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '生成失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="宽度">
            <Input
              aria-label="宽度"
              type="number"
              value={width}
              onChange={(event) => {
                setWidth(event.target.value);
                clear();
              }}
            />
          </Field>
          <Field label="高度">
            <Input
              aria-label="高度"
              type="number"
              value={height}
              onChange={(event) => {
                setHeight(event.target.value);
                clear();
              }}
            />
          </Field>
        </div>
        <Field label="背景色">
          <Input
            aria-label="背景色"
            value={color}
            onChange={(event) => {
              setColor(event.target.value);
              clear();
            }}
          />
        </Field>
        <Field label="标签文本">
          <Input
            aria-label="标签文本"
            value={label}
            onChange={(event) => {
              setLabel(event.target.value);
              clear();
            }}
          />
        </Field>
        <Button onClick={run}>生成 SVG</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid content-start gap-4">
        {output && (
          <img
            alt="SVG 占位图预览"
            className="border-border max-h-52 max-w-full rounded-lg border"
            src={`data:image/svg+xml,${encodeURIComponent(output)}`}
          />
        )}
        <ToolResult value={output} />
      </Card>
    </div>
  );
}

export function PercentageTool() {
  const [a, setA] = useState('20');
  const [b, setB] = useState('80');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const clear = () => {
    setOutput('');
    setError('');
  };
  const run = (mode: 'of' | 'share') => {
    try {
      if (!a.trim() || !b.trim()) throw new Error('请输入两个数字');
      setOutput(
        mode === 'of'
          ? String(percentOf(Number(a), Number(b)))
          : `${percentShare(Number(a), Number(b))}%`,
      );
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '计算失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="数值 A">
          <Input
            aria-label="数值 A"
            type="number"
            value={a}
            onChange={(event) => {
              setA(event.target.value);
              clear();
            }}
          />
        </Field>
        <Field label="数值 B">
          <Input
            aria-label="数值 B"
            type="number"
            value={b}
            onChange={(event) => {
              setB(event.target.value);
              clear();
            }}
          />
        </Field>
        <ToolActions>
          <Button onClick={() => run('share')}>A 是 B 的百分之几</Button>
          <SecondaryButton onClick={() => run('of')}>B 的 A% 是多少</SecondaryButton>
        </ToolActions>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}
