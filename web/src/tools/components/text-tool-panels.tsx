import { useMemo, useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, Select, Textarea } from '../../components/ui';
import {
  decodeUrlComponent,
  encodeUrlComponent,
  parseQueryParameters,
  type QueryParameter,
} from '../lib/encoding';
import {
  convertTextCase,
  processList,
  type ListSort,
  type TextCaseMode,
} from '../lib/text-processing';
import { ToolActions, ToolResult } from './tool-panel-shared';

export function UrlTool() {
  const [input, setInput] = useState('虾米 tools?');
  const [output, setOutput] = useState('');
  const [parameters, setParameters] = useState<QueryParameter[]>([]);
  const [error, setError] = useState('');
  const accept = (result: ReturnType<typeof decodeUrlComponent>) => {
    if (result.ok) {
      setOutput(result.value);
      setParameters([]);
      setError('');
    } else {
      setOutput('');
      setParameters([]);
      setError(result.error);
    }
  };
  const parse = () => {
    const result = parseQueryParameters(input);
    if (result.ok) {
      setParameters(result.value);
      setOutput('');
      setError('');
    } else {
      setOutput('');
      setParameters([]);
      setError(result.error);
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="URL 或文本">
          <Textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput('');
              setParameters([]);
              setError('');
            }}
          />
        </Field>
        <ToolActions>
          <Button onClick={() => accept({ ok: true, value: encodeUrlComponent(input) })}>
            编码组件
          </Button>
          <Button onClick={() => accept(decodeUrlComponent(input))}>解码组件</Button>
          <Button onClick={parse}>解析查询参数</Button>
        </ToolActions>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <span className="sr-only" role="status">
          {parameters.length ? `查询参数已更新，共 ${parameters.length} 项` : ''}
        </span>
        {parameters.length ? (
          <div className="grid gap-3">
            <div className="text-muted-foreground text-sm">
              共 {parameters.length} 个参数，重复键会保留。
            </div>
            <dl className="result-list">
              {parameters.map((item, index) => (
                <div key={`${item.key}-${index}`}>
                  <dt>{item.key || '（空键）'}</dt>
                  <dd>{item.value || '（空值）'}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <ToolResult value={output} label="处理结果" />
        )}
      </Card>
    </div>
  );
}

export function TextCaseTool() {
  const [input, setInput] = useState('hello_world');
  const [mode, setMode] = useState<TextCaseMode>('camel');
  const output = useMemo(() => convertTextCase(input, mode), [input, mode]);
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="待转换文本">
          <Textarea value={input} onChange={(event) => setInput(event.target.value)} />
        </Field>
        <Field label="目标格式">
          <Select
            aria-label="目标格式"
            value={mode}
            onChange={(event) => setMode(event.target.value as TextCaseMode)}
          >
            <option value="camel">camelCase</option>
            <option value="pascal">PascalCase</option>
            <option value="snake">snake_case</option>
            <option value="kebab">kebab-case</option>
            <option value="title">Title Case</option>
            <option value="upper">大写单词</option>
            <option value="lower">小写单词</option>
          </Select>
        </Field>
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}

export function ListTool() {
  const [input, setInput] = useState('banana\napple\nbanana\n\npear');
  const [deduplicate, setDeduplicate] = useState(true);
  const [sort, setSort] = useState<ListSort>('asc');
  const [result, setResult] = useState<ReturnType<typeof processList> | null>(null);
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="每行一项">
          <Textarea value={input} onChange={(event) => setInput(event.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem] sm:items-end">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Input
              className="min-h-0 w-4"
              type="checkbox"
              checked={deduplicate}
              onChange={(event) => setDeduplicate(event.target.checked)}
            />
            去除重复项
          </label>
          <Field label="排序">
            <Select value={sort} onChange={(event) => setSort(event.target.value as ListSort)}>
              <option value="none">保持顺序</option>
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </Select>
          </Field>
        </div>
        <Button onClick={() => setResult(processList(input, { deduplicate, sort }))}>
          处理列表
        </Button>
      </Card>
      <Card className="grid gap-4">
        <ToolResult value={result?.output ?? ''} label="处理结果" />
        {result && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip">输入 {result.inputCount} 行</span>
            <span className="chip">输出 {result.outputCount} 项</span>
            <span className="chip">发现重复 {result.duplicateCount} 项</span>
            <span className="chip">忽略空行 {result.emptyCount} 行</span>
          </div>
        )}
      </Card>
    </div>
  );
}
