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
  deriveMnemonicSeed,
  generateBcryptHash,
  generateMnemonicPhrase,
  validateMnemonicPhrase,
  verifyBcryptHash,
} from '../lib/parity-crypto-advanced';
import { ToolActions, ToolResult } from './tool-panel-shared';

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : '操作失败';
}

export function BcryptTool() {
  const [password, setPassword] = useState('');
  const [cost, setCost] = useState('10');
  const [hash, setHash] = useState('');
  const [verificationHash, setVerificationHash] = useState('');
  const [match, setMatch] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const clear = () => {
    generation.current++;
    setHash('');
    setMatch(null);
    setError('');
    setBusy(false);
  };
  const run = async (mode: 'hash' | 'verify') => {
    const current = ++generation.current;
    setBusy(true);
    setError('');
    setMatch(null);
    try {
      if (mode === 'hash') {
        const result = await generateBcryptHash(password, Number(cost));
        if (generation.current === current) {
          setHash(result);
          setVerificationHash(result);
        }
      } else {
        const result = await verifyBcryptHash(password, verificationHash);
        if (generation.current === current) setMatch(result);
      }
    } catch (reason) {
      if (generation.current === current) {
        setError(errorMessage(reason));
        if (mode === 'hash') setHash('');
      }
    } finally {
      if (generation.current === current) setBusy(false);
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="密码">
          <Input
            aria-label="密码"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clear();
            }}
          />
        </Field>
        <Field label="成本">
          <Input
            aria-label="成本"
            type="number"
            min="4"
            max="12"
            step="1"
            value={cost}
            onChange={(event) => {
              setCost(event.target.value);
              clear();
            }}
          />
        </Field>
        <Field label="待验证哈希">
          <Textarea
            aria-label="待验证哈希"
            value={verificationHash}
            onChange={(event) => {
              setVerificationHash(event.target.value);
              setMatch(null);
              setError('');
              generation.current++;
              setBusy(false);
            }}
            spellCheck={false}
          />
        </Field>
        <ToolActions>
          <Button disabled={busy} onClick={() => void run('hash')}>
            {busy ? '计算中…' : '生成哈希'}
          </Button>
          <SecondaryButton disabled={busy} onClick={() => void run('verify')}>
            验证密码
          </SecondaryButton>
        </ToolActions>
        {match !== null && <p role="status">{match ? '密码匹配' : '密码不匹配'}</p>}
        {error && <ErrorBox>{error}</ErrorBox>}
        <p className="text-muted-foreground text-xs">
          仅在本页计算；成本限制为 4–12。Bcrypt 只处理密码前 72 字节，本工具拒绝更长的输入。
        </p>
      </Card>
      <Card>
        <ToolResult value={hash} label="Bcrypt 哈希" />
      </Card>
    </div>
  );
}

export function Bip39MnemonicTool() {
  const [phrase, setPhrase] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [seed, setSeed] = useState('');
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const clear = () => {
    generation.current++;
    setSeed('');
    setValid(null);
    setError('');
    setBusy(false);
  };
  const generate = (count: 12 | 24) => {
    clear();
    try {
      setPhrase(generateMnemonicPhrase(count));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  const validate = () => {
    setSeed('');
    setError('');
    setValid(validateMnemonicPhrase(phrase));
  };
  const derive = async () => {
    const current = ++generation.current;
    setBusy(true);
    setSeed('');
    setError('');
    try {
      const result = await deriveMnemonicSeed(phrase, passphrase);
      if (generation.current === current) {
        setSeed(result);
        setValid(true);
      }
    } catch (reason) {
      if (generation.current === current) {
        setError(errorMessage(reason));
        setValid(false);
      }
    } finally {
      if (generation.current === current) setBusy(false);
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="助记词">
          <Textarea
            aria-label="助记词"
            className="min-h-32"
            value={phrase}
            onChange={(event) => {
              setPhrase(event.target.value);
              clear();
            }}
            spellCheck={false}
            autoComplete="off"
          />
        </Field>
        <Field label="附加口令（可选）">
          <Input
            aria-label="附加口令（可选）"
            type="password"
            value={passphrase}
            onChange={(event) => {
              setPassphrase(event.target.value);
              clear();
            }}
            autoComplete="off"
          />
        </Field>
        <ToolActions>
          <Button disabled={busy} onClick={() => generate(12)}>
            生成 12 词助记词
          </Button>
          <SecondaryButton disabled={busy} onClick={() => generate(24)}>
            生成 24 词助记词
          </SecondaryButton>
          <SecondaryButton disabled={busy} onClick={validate}>
            验证助记词
          </SecondaryButton>
          <SecondaryButton disabled={busy} onClick={() => void derive()}>
            {busy ? '派生中…' : '派生种子'}
          </SecondaryButton>
        </ToolActions>
        {valid !== null && <p role="status">{valid ? '助记词有效' : '助记词无效'}</p>}
        {error && <ErrorBox>{error}</ErrorBox>}
        <p className="text-muted-foreground text-xs">
          使用 BIP39
          英文词表；助记词、附加口令和种子仅在本页内存中处理。真实资产请使用可信的离线钱包设备，切勿分享或截图。
        </p>
      </Card>
      <Card>
        <ToolResult value={seed} label="种子（十六进制）" />
      </Card>
    </div>
  );
}
