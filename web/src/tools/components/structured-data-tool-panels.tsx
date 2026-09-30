import { useState } from 'react';
import { Button, Card, ErrorBox, Field, SecondaryButton, Textarea } from '../../components/ui';
import { jsonToToml, jsonToYaml, tomlToJson, yamlToJson } from '../lib/structured-data';
import { ToolActions, ToolResult } from './tool-panel-shared';

function acceptResult(
  result: ReturnType<typeof yamlToJson>,
  setOutput: (value: string) => void,
  setError: (value: string) => void,
) {
  if (result.ok) {
    setOutput(result.value);
    setError('');
  } else {
    setOutput('');
    setError(result.error);
  }
}

export function YamlJsonTool() {
  const [input, setInput] = useState('name: Shrimp\nready: true\ntags:\n  - frontend\n  - tools');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="YAML 或 JSON 输入">
          <Textarea
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
          <Button onClick={() => acceptResult(yamlToJson(input), setOutput, setError)}>
            转为 JSON
          </Button>
          <SecondaryButton onClick={() => acceptResult(jsonToYaml(input), setOutput, setError)}>
            转为 YAML
          </SecondaryButton>
        </ToolActions>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}

export function JsonTomlTool() {
  const [input, setInput] = useState('{\n  "title": "Shrimp",\n  "server": { "port": 8080 }\n}');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="JSON 或 TOML 输入">
          <Textarea
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
          <Button onClick={() => acceptResult(jsonToToml(input), setOutput, setError)}>
            转为 TOML
          </Button>
          <SecondaryButton onClick={() => acceptResult(tomlToJson(input), setOutput, setError)}>
            转为 JSON
          </SecondaryButton>
        </ToolActions>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}
