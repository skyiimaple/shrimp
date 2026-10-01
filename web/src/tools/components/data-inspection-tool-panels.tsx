import { useState } from 'react';
import { Button, Card, ErrorBox, Field, SecondaryButton, Textarea } from '../../components/ui';
import { delimitedToJson, jsonToDelimited } from '../lib/delimited';
import { diffJson, type JsonChange } from '../lib/json-diff';
import { ToolActions, ToolResult } from './tool-panel-shared';

const initialLeft = '{\n  "name": "Shrimp",\n  "version": 1\n}';
const initialRight = '{\n  "name": "Shrimp",\n  "version": 2\n}';

function ChangeRow({ change }: { change: JsonChange }) {
  const label = { added: '新增', removed: '删除', changed: '修改' }[change.kind];
  return (
    <div className="border-border grid gap-2 rounded-xl border p-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-primary font-semibold">{label}</span>
        <code className="min-w-0 break-all">{change.path || '（根）'}</code>
      </div>
      <div className="text-muted-foreground grid gap-1 font-mono text-xs">
        {change.kind !== 'added' && (
          <div className="break-all">原值：{JSON.stringify(change.before)}</div>
        )}
        {change.kind !== 'removed' && (
          <div className="break-all">新值：{JSON.stringify(change.after)}</div>
        )}
      </div>
    </div>
  );
}

export function JsonDiffTool() {
  const [left, setLeft] = useState(initialLeft);
  const [right, setRight] = useState(initialRight);
  const [changes, setChanges] = useState<JsonChange[] | null>(null);
  const [patch, setPatch] = useState('');
  const [error, setError] = useState('');
  const clear = () => {
    setChanges(null);
    setPatch('');
    setError('');
  };
  const compare = () => {
    const result = diffJson(left, right);
    if (!result.ok) {
      clear();
      setError(result.error);
      return;
    }
    setChanges(result.value.changes);
    setPatch(JSON.stringify(result.value.patch, null, 2));
    setError('');
  };
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Field label="左侧 JSON">
            <Textarea
              aria-label="左侧 JSON"
              className="min-h-60"
              value={left}
              onChange={(event) => {
                setLeft(event.target.value);
                clear();
              }}
              spellCheck={false}
            />
          </Field>
        </Card>
        <Card>
          <Field label="右侧 JSON">
            <Textarea
              aria-label="右侧 JSON"
              className="min-h-60"
              value={right}
              onChange={(event) => {
                setRight(event.target.value);
                clear();
              }}
              spellCheck={false}
            />
          </Field>
        </Card>
      </div>
      <ToolActions>
        <Button onClick={compare}>比较差异</Button>
      </ToolActions>
      {error && <ErrorBox>{error}</ErrorBox>}
      {changes && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="grid content-start gap-3">
            <h2 className="font-semibold">差异 {changes.length} 处</h2>
            {changes.length ? (
              changes.map((change, index) => (
                <ChangeRow key={`${change.path}-${index}`} change={change} />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">两份 JSON 完全一致</p>
            )}
          </Card>
          <Card>
            <ToolResult value={patch} label="JSON Patch" />
          </Card>
        </div>
      )}
    </div>
  );
}

export function CsvJsonTool() {
  const [input, setInput] = useState('id,name\n001,Ada');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const convert = (direction: 'to-json' | 'from-json', delimiter: ',' | '\t') => {
    const result =
      direction === 'to-json'
        ? delimitedToJson(input, delimiter)
        : jsonToDelimited(input, delimiter);
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
        <Field
          label="输入内容"
          hint="转为 JSON 时首行作为表头，所有单元格保留为文本；转出时请输入对象数组。"
        >
          <Textarea
            aria-label="输入内容"
            className="min-h-60"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput('');
              setError('');
            }}
            spellCheck={false}
          />
        </Field>
        <ToolActions>
          <Button onClick={() => convert('to-json', ',')}>CSV → JSON</Button>
          <SecondaryButton onClick={() => convert('to-json', '\t')}>TSV → JSON</SecondaryButton>
          <SecondaryButton onClick={() => convert('from-json', ',')}>JSON → CSV</SecondaryButton>
          <SecondaryButton onClick={() => convert('from-json', '\t')}>JSON → TSV</SecondaryButton>
        </ToolActions>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}
