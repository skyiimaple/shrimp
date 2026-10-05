import { useRef, useState } from 'react';
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  SecondaryButton,
  Textarea,
} from '../../components/ui';
import {
  decryptText,
  encryptText,
  generateRsaKeyPair,
  generateTotpSecret,
  totp,
} from '../lib/parity-crypto';
import { ToolActions, ToolResult } from './tool-panel-shared';

export function EncryptTextTool() {
  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const generation = useRef(0);
  const clear = () => {
    generation.current++;
    setOutput('');
    setError('');
  };
  const run = async (mode: 'encrypt' | 'decrypt') => {
    const current = ++generation.current;
    try {
      const result =
        mode === 'encrypt'
          ? await encryptText(input, password)
          : await decryptText(input.trim(), password);
      if (generation.current === current) {
        setOutput(result);
        setError('');
      }
    } catch (reason) {
      if (generation.current === current) {
        setOutput('');
        setError(reason instanceof Error ? reason.message : '操作失败');
      }
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="输入文本或密文">
          <Textarea
            aria-label="输入文本或密文"
            className="min-h-48"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              clear();
            }}
            spellCheck={false}
          />
        </Field>
        <Field label="口令">
          <Input
            aria-label="口令"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clear();
            }}
          />
        </Field>
        <ToolActions>
          <Button onClick={() => run('encrypt')}>加密文本</Button>
          <SecondaryButton onClick={() => run('decrypt')}>解密文本</SecondaryButton>
        </ToolActions>
        {error && <ErrorBox>{error}</ErrorBox>}
        <p className="text-muted-foreground text-xs">
          AES-GCM；本工具密文格式仅与 Shrimp 互通。请自行妥善保管口令。
        </p>
      </Card>
      <Card>
        <ToolResult value={output} />
      </Card>
    </div>
  );
}

export function TotpTool() {
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const generation = useRef(0);
  const run = async () => {
    const current = ++generation.current;
    try {
      const value = await totp(secret);
      if (generation.current === current) {
        setCode(value);
        setError('');
      }
    } catch (reason) {
      if (generation.current === current) {
        setCode('');
        setError(reason instanceof Error ? reason.message : '生成失败');
      }
    }
  };
  const change = (value: string) => {
    generation.current++;
    setSecret(value);
    setCode('');
    setError('');
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="Base32 密钥">
          <Input
            aria-label="Base32 密钥"
            value={secret}
            onChange={(event) => change(event.target.value)}
            spellCheck={false}
          />
        </Field>
        <ToolActions>
          <Button onClick={run}>生成验证码</Button>
          <SecondaryButton onClick={() => change(generateTotpSecret())}>生成密钥</SecondaryButton>
        </ToolActions>
        {error && <ErrorBox>{error}</ErrorBox>}
        <p className="text-muted-foreground text-xs">
          验证码每 30 秒变化；密钥仅保留在当前页面，请勿分享。
        </p>
      </Card>
      <Card>
        <ToolResult value={code} label="验证码" />
      </Card>
    </div>
  );
}

export function RsaKeyPairTool() {
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setPublicKey('');
    setPrivateKey('');
    setError('');
    try {
      const result = await generateRsaKeyPair();
      setPublicKey(result.publicKey);
      setPrivateKey(result.privateKey);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '生成失败');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <Button className="w-fit" disabled={busy} onClick={run}>
          {busy ? '生成中…' : '生成 RSA 密钥对'}
        </Button>
        <p className="text-muted-foreground text-xs">
          RSA-OAEP 2048 位；私钥仅显示在当前页面，请立即妥善保存。
        </p>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <ToolResult value={publicKey} label="公钥 PEM" />
        </Card>
        <Card>
          <ToolResult value={privateKey} label="私钥 PEM" />
        </Card>
      </div>
    </div>
  );
}
