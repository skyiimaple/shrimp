import { useState } from 'react';
import { Button, Card, Field, Input } from '../../components/ui';
import { inspectIban } from '../lib/parity-iban';
import { ToolResult } from './tool-panel-shared';

export function IbanTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof inspectIban> | null>(null);
  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <Field label="IBAN" hint="检查国家格式、长度和 MOD 97 校验位，不验证银行或账户是否存在。">
          <Input
            aria-label="IBAN"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setResult(null);
            }}
          />
        </Field>
        <Button onClick={() => setResult(inspectIban(input))}>校验 IBAN</Button>
      </Card>
      <Card className="grid content-start gap-4">
        <p role="status" className="text-sm font-medium">
          {result ? (result.valid ? '校验位有效' : '格式或校验位无效') : '等待输入'}
        </p>
        <ToolResult value={result?.formatted ?? ''} label="格式化 IBAN" />
      </Card>
    </div>
  );
}
