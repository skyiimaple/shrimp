import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Textarea } from '../../components/ui';
import { dockerRunToCompose } from '../lib/parity-docker-compose';
import { ToolResult } from './tool-panel-shared';

export function DockerComposeTool() {
  const [input, setInput] = useState('docker run -d --name web -p 8080:80 nginx:alpine');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const convert = () => {
    try {
      setOutput(dockerRunToCompose(input));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : 'Conversion failed');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <Field label="Docker run 命令">
          <Textarea
            aria-label="Docker run 命令"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput('');
              setError('');
            }}
          />
        </Field>
        <Button onClick={convert}>转换</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} label="Docker Compose YAML" />
      </Card>
    </div>
  );
}
