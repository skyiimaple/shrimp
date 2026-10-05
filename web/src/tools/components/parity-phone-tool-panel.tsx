import { useState } from 'react';
import { Button, Card, Field, Input } from '../../components/ui';
import { inspectPhoneNumber } from '../lib/parity-phone';
import { ToolResult } from './tool-panel-shared';

export function PhoneNumberTool() {
  const [input, setInput] = useState('');
  const [region, setRegion] = useState('US');
  const [result, setResult] = useState<ReturnType<typeof inspectPhoneNumber> | null>(null);
  const clearResult = () => setResult(null);

  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <Field label="电话号码" hint="支持带 + 的国际号码，或按地区代码解析本地号码。">
          <Input
            aria-label="电话号码"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              clearResult();
            }}
            placeholder="+1 202 555 0123"
          />
        </Field>
        <Field label="地区代码" hint="两位 ISO 地区代码，例如 US、GB、CN。">
          <Input
            aria-label="地区代码"
            value={region}
            onChange={(event) => {
              setRegion(event.target.value);
              clearResult();
            }}
            maxLength={2}
          />
        </Field>
        <Button onClick={() => setResult(inspectPhoneNumber(input, region))}>解析号码</Button>
      </Card>
      <Card className="grid content-start gap-4">
        {result && !result.valid && <p role="alert">{result.error}</p>}
        {result?.valid && <p role="status">有效号码 · {result.country}</p>}
        <ToolResult label="E.164" value={result?.valid ? result.e164 : ''} />
        <ToolResult label="国际格式" value={result?.valid ? result.international : ''} />
        <ToolResult label="本地格式" value={result?.valid ? result.national : ''} />
      </Card>
    </div>
  );
}
