import { useEffect, useRef, useState } from 'react';
import { Button, Card, ErrorBox, Field, Input } from '../../components/ui';
import { ToolResult } from './tool-panel-shared';
const labels: Record<string, string> = {
  repository: '仓库',
  description: '描述',
  stars: 'Stars',
  forks: 'Forks',
  openIssues: '未关闭 Issue / PR',
  license: '许可证',
  language: '主要语言',
  defaultBranch: '默认分支',
  updatedAt: '更新时间',
  archived: '已归档',
  release: '最新 Release',
  version: '最新版本',
  dependencies: '依赖',
  peerDependencies: 'Peer 依赖',
  engines: '运行环境',
  downloadsLastWeek: '上周下载量',
  domain: '域名',
  registrar: '注册商',
  status: '状态',
  events: '注册 / 到期事件',
  nameservers: '域名服务器',
  notices: '注册局说明',
  method: '请求方法',
  url: '最终 URL',
  redirects: '跳转链',
  headers: '响应头',
  name: '名称',
};
function PublicLookup({
  mode,
  label,
  placeholder,
  note,
}: {
  mode: string;
  label: string;
  placeholder: string;
  note: string;
}) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );
  const clear = () => {
    request.current?.abort();
    request.current = null;
    setResult(null);
    setError('');
    setBusy(false);
  };
  const run = async () => {
    clear();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/network/public-tools?${new URLSearchParams({ mode, input: input.trim() })}`,
        { signal: controller.signal },
      );
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
            ? data.message
            : '查询服务暂时不可用',
        );
      if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new Error('查询服务返回了无效数据');
      if (request.current === controller) setResult(data as Record<string, unknown>);
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
  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (input.trim() && !busy) void run();
          }}
        >
          <Field label={label}>
            <Input
              aria-label={label}
              value={input}
              placeholder={placeholder}
              onChange={(event) => {
                setInput(event.target.value);
                clear();
              }}
            />
          </Field>
          <Button disabled={busy || !input.trim()} type="submit">
            {busy ? '查询中…' : '查询'}
          </Button>
        </form>
        <p className="text-muted-foreground text-xs">{note}</p>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid content-start gap-4">
        {result ? (
          <>
            <dl className="grid gap-4">
              {Object.entries(result).map(([key, value]) => (
                <div key={key} className="grid gap-1 text-sm">
                  <dt className="text-muted-foreground">{labels[key] ?? key}</dt>
                  <dd className="break-all whitespace-pre-wrap">
                    {value === null ? (
                      '暂无数据'
                    ) : typeof value === 'object' ? (
                      <code>{JSON.stringify(value, null, 2)}</code>
                    ) : typeof value === 'boolean' ? (
                      value ? (
                        '是'
                      ) : (
                        '否'
                      )
                    ) : (
                      String(value) || '—'
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <ToolResult label="结果 JSON" value={JSON.stringify(result, null, 2)} />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">查询结果会显示在这里。</p>
        )}
      </Card>
    </div>
  );
}
export function GithubLookupTool() {
  return (
    <PublicLookup
      mode="github"
      label="仓库"
      placeholder="facebook/react"
      note="查询 GitHub 公开仓库，无需 Token；匿名查询可能受共享额度限制。"
    />
  );
}
export function NpmLookupTool() {
  return (
    <PublicLookup
      mode="npm"
      label="包名"
      placeholder="react 或 @types/node"
      note="数据来自 npm Registry；下载统计不可用时仍显示包信息。"
    />
  );
}
export function RdapLookupTool() {
  return (
    <PublicLookup
      mode="rdap"
      label="域名"
      placeholder="example.com"
      note="通过 RDAP 查询注册信息；部分域名不受支持，隐私字段可能隐藏。"
    />
  );
}
export function HttpHeadersTool() {
  return (
    <PublicLookup
      mode="headers"
      label="网址"
      placeholder="https://example.com"
      note="只查询公网 HTTPS 默认端口，使用 HEAD；不发送凭据，不显示 Set-Cookie。结果是代理所在网络的响应。"
    />
  );
}
