import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  OptionSelect,
  SecondaryButton,
} from '../../components/ui';
import {
  queryNetwork,
  type DnsLookupResult,
  type IpLookupResult,
} from '../../features/network/client';
import { ToolResult } from './tool-panel-shared';

function useLookup<T>(mode: 'ip' | 'dns') {
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const clear = () => {
    request.current?.abort();
    request.current = null;
    setResult(null);
    setError('');
    setBusy(false);
  };
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );
  const run = async (input: string, type = 'A') => {
    clear();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const data = await queryNetwork<T>(mode, input, type, controller.signal);
      if (request.current === controller) setResult(data);
    } catch (reason) {
      if (request.current === controller)
        setError(reason instanceof Error ? reason.message : '查询失败');
    } finally {
      if (request.current === controller) {
        setBusy(false);
        request.current = null;
      }
    }
  };
  return { result, error, busy, clear, run };
}

export function IpLookupTool() {
  const [input, setInput] = useState('');
  const { result, error, busy, clear, run } = useLookup<IpLookupResult>('ip');
  const entries = result
    ? [
        ['IP', result.ip],
        ['类型', result.type],
        ['国家 / 地区', result.country],
        ['省 / 州', result.region],
        ['城市', result.city],
        ['运营商', result.isp],
        ['组织', result.organization],
        ['ASN', result.asn],
        ['时区', result.timezone],
        ['UTC 偏移', result.utc],
      ]
    : [];
  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <Field label="IP 地址" hint="支持 IPv4 和 IPv6，例如 8.8.8.8。">
          <Input
            aria-label="IP 地址"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              clear();
            }}
            placeholder="8.8.8.8"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !input.trim()} onClick={() => void run(input)}>
            {busy ? '查询中…' : '查询 IP'}
          </Button>
          <SecondaryButton
            disabled={busy}
            onClick={() => {
              setInput('');
              void run('');
            }}
          >
            查询当前 IP
          </SecondaryButton>
        </div>
        <p className="text-muted-foreground text-xs">
          数据来源：IPWhois。查询时会将 IP 发送至该服务，归属地是网络位置估算。
        </p>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid content-start gap-4">
        {result ? (
          <dl className="grid gap-3">
            {entries.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-all">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">查询结果会显示在这里。</p>
        )}
        {result && <ToolResult label="结果 JSON" value={JSON.stringify(result, null, 2)} />}
      </Card>
    </div>
  );
}

export function DnsLookupTool() {
  const [name, setName] = useState('');
  const [type, setType] = useState('A');
  const { result, error, busy, clear, run } = useLookup<DnsLookupResult>('dns');
  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <Field label="域名">
          <Input
            aria-label="域名"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clear();
            }}
            placeholder="example.com"
          />
        </Field>
        <Field label="记录类型">
          <OptionSelect
            aria-label="记录类型"
            value={type}
            onValueChange={(value) => {
              setType(value);
              clear();
            }}
            options={['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA'].map((value) => ({
              value,
              label: value,
            }))}
          />
        </Field>
        <Button disabled={busy || !name.trim()} onClick={() => void run(name, type)}>
          {busy ? '查询中…' : '查询 DNS'}
        </Button>
        <p className="text-muted-foreground text-xs">
          通过 Cloudflare 公共 DNS 查询，结果可能受 DNS 缓存影响。
        </p>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid content-start gap-4">
        {result ? (
          <>
            <p role="status" className="text-sm">
              {result.status === 3
                ? '域名不存在（NXDOMAIN）'
                : result.status !== 0
                  ? `DNS 查询返回错误：${result.status}`
                  : !result.records.length
                    ? '没有查询到该类型的记录'
                    : `${result.records.length} 条记录`}
            </p>
            {result.records.map((item, index) => (
              <div key={index} className="border-border grid gap-2 rounded-xl border p-3 text-sm">
                <span className="text-muted-foreground">
                  {item.name} · {item.type} · <span>{item.ttl} 秒</span>
                </span>
                <code className="break-all whitespace-pre-wrap">{item.value}</code>
              </div>
            ))}
            <ToolResult label="结果 JSON" value={JSON.stringify(result, null, 2)} />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">查询结果会显示在这里。</p>
        )}
      </Card>
    </div>
  );
}
