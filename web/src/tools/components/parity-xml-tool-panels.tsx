import { useState } from 'react';
import { Button, Card, ErrorBox, Field, SecondaryButton, Textarea } from '../../components/ui';
import { formatXml, jsonToXml, validateXml, xmlToJson } from '../lib/parity-xml';
import type { Result } from '../lib/result';
import { ToolActions, ToolResult } from './tool-panel-shared';

function XmlPanel({
  initial,
  label,
  actions,
  hint,
}: {
  initial: string;
  label: string;
  hint?: string;
  actions: { label: string; run: (input: string) => Result<string> }[];
}) {
  const [input, setInput] = useState(initial);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const run = (action: (input: string) => Result<string>) => {
    const result = action(input);
    setOutput(result.ok ? result.value : '');
    setError(result.ok ? '' : result.error);
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label={label}>
          <Textarea
            aria-label={label}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput('');
              setError('');
            }}
            spellCheck={false}
          />
        </Field>
        {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
        <ToolActions>
          {actions.map((action, index) => {
            const Control = index === 0 ? Button : SecondaryButton;
            return (
              <Control key={action.label} onClick={() => run(action.run)}>
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

export function XmlFormatTool() {
  return (
    <XmlPanel
      initial="<root><item>Hello</item></root>"
      label="XML 输入"
      actions={[
        { label: '格式化 XML', run: formatXml },
        { label: '校验 XML', run: validateXml },
      ]}
    />
  );
}

export function XmlToJsonTool() {
  return (
    <XmlPanel
      initial={'<root id="1"><item>Hello</item></root>'}
      label="XML 输入"
      hint="根元素成为对象键；@ 表示属性，#text 表示带属性元素的文本，重复子元素成为数组，纯文本叶节点成为字符串。"
      actions={[{ label: 'XML 转 JSON', run: xmlToJson }]}
    />
  );
}

export function JsonToXmlTool() {
  return (
    <XmlPanel
      initial={'{"root":{"@id":"1","item":"Hello"}}'}
      label="JSON 输入"
      hint="根对象只含一个元素；@ 表示属性，#text 表示带属性元素的文本，数组生成同名子元素。"
      actions={[{ label: 'JSON 转 XML', run: jsonToXml }]}
    />
  );
}
