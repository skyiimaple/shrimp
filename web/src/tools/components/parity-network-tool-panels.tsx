import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Input } from '../../components/ui';
import { calculateIpv4Subnet, convertIpv4Address, generateMacAddress } from '../lib/parity-network';
import { ToolResult } from './tool-panel-shared';

function useCalculation(initial: string, calculate: (input: string) => string) {
  const [input, setInput] = useState(initial);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const change = (value: string) => {
    setInput(value);
    setOutput('');
    setError('');
  };
  const run = () => {
    try {
      setOutput(calculate(input));
      setError('');
    } catch (reason) {
      setOutput('');
      setError(reason instanceof Error ? reason.message : '计算失败');
    }
  };
  return { input, output, error, change, run };
}

export function Ipv4SubnetTool() {
  const state = useCalculation('192.168.1.130/26', (input) => {
    const result = calculateIpv4Subnet(input);
    return [
      `网络地址：${result.network}/${result.prefix}`,
      `广播地址：${result.broadcast}`,
      `子网掩码：${result.subnetMask}`,
      `反掩码：${result.wildcardMask}`,
      `首个可用地址：${result.firstHost}`,
      `最后可用地址：${result.lastHost}`,
      `地址总数：${result.totalAddresses}`,
      `可用主机数：${result.usableHosts}`,
    ].join('\n');
  });
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="IPv4 CIDR" hint="例如 192.168.1.130/26；/31 按点对点网络计算">
          <Input aria-label="IPv4 CIDR" value={state.input} onChange={(event) => state.change(event.target.value)} />
        </Field>
        <Button onClick={state.run}>计算子网</Button>
        {state.error && <ErrorBox>{state.error}</ErrorBox>}
      </Card>
      <Card><ToolResult value={state.output} label="子网计算结果" /></Card>
    </div>
  );
}

export function Ipv4AddressTool() {
  const state = useCalculation('192.168.1.1', (input) => {
    const result = convertIpv4Address(input);
    return [
      `IPv4：${result.address}`,
      `十进制：${result.decimal}`,
      `十六进制：0x${result.hexadecimal}`,
      `二进制：0b${result.binary}`,
    ].join('\n');
  });
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="IPv4 地址或整数" hint="支持点分十进制、无符号十进制、0x 十六进制和 0b 二进制">
          <Input aria-label="IPv4 地址或整数" value={state.input} onChange={(event) => state.change(event.target.value)} />
        </Field>
        <Button onClick={state.run}>转换地址</Button>
        {state.error && <ErrorBox>{state.error}</ErrorBox>}
      </Card>
      <Card><ToolResult value={state.output} label="地址转换结果" /></Card>
    </div>
  );
}

export function MacAddressTool() {
  const [output, setOutput] = useState('');
  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <p className="text-sm text-muted-foreground">使用浏览器安全随机数生成本地管理的单播 MAC 地址。</p>
        <Button onClick={() => setOutput(generateMacAddress())}>生成 MAC 地址</Button>
      </Card>
      <Card><ToolResult value={output} label="MAC 地址" /></Card>
    </div>
  );
}
