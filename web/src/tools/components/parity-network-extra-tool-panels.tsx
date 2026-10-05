import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Input } from '../../components/ui';
import { expandIpv4Range, generateIpv6Ula } from '../lib/parity-network-extra';
import { ToolResult } from './tool-panel-shared';

export function Ipv4RangeTool() {
  const [start, setStart] = useState('192.168.1.10');
  const [end, setEnd] = useState('192.168.1.20');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const clear = () => {
    setOutput('');
    setError('');
  };
  const run = () => {
    try {
      setOutput(expandIpv4Range(start, end).join('\n'));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '展开失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="起始 IPv4">
          <Input
            aria-label="起始 IPv4"
            value={start}
            onChange={(event) => {
              setStart(event.target.value);
              clear();
            }}
          />
        </Field>
        <Field label="结束 IPv4">
          <Input
            aria-label="结束 IPv4"
            value={end}
            onChange={(event) => {
              setEnd(event.target.value);
              clear();
            }}
          />
        </Field>
        <Button onClick={run}>展开范围</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} label="CIDR 列表" />
      </Card>
    </div>
  );
}

export function Ipv6UlaTool() {
  const [output, setOutput] = useState('');
  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <Button onClick={() => setOutput(generateIpv6Ula())}>生成 ULA 前缀</Button>
      </Card>
      <Card>
        <ToolResult value={output} label="ULA 前缀" />
      </Card>
    </div>
  );
}
