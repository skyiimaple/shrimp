import { useEffect, useRef, useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, SecondaryButton } from '../../components/ui';
import {
  lookupMacVendor,
  prepareMacVendorOffline,
  macVendorOfflineReady,
} from '../lib/parity-mac-vendor';
import { ToolResult } from './tool-panel-shared';

export function MacVendorTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [offline, setOffline] = useState(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    void macVendorOfflineReady().then((ready) => {
      if (mounted.current) setOffline(ready);
    });
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = async () => {
    const current = ++generation.current;
    setBusy(true);
    setOutput('');
    setError('');
    try {
      const vendor = await lookupMacVendor(input);
      if (current === generation.current && mounted.current)
        setOutput(vendor ?? '未在本地 OUI 数据库中找到厂商');
    } catch (reason) {
      if (current === generation.current && mounted.current)
        setError(reason instanceof Error ? reason.message : '查询失败');
    } finally {
      if (current === generation.current && mounted.current) setBusy(false);
    }
  };
  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      await prepareMacVendorOffline();
      if (mounted.current) setOffline(true);
    } catch (reason) {
      if (mounted.current)
        setError(reason instanceof Error ? reason.message : '离线数据库下载失败');
    } finally {
      if (mounted.current) setDownloading(false);
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <Field label="MAC 地址" hint="查询已分配 OUI 前缀；随机或本地管理地址可能没有厂商。">
          <Input
            aria-label="MAC 地址"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              generation.current++;
              setBusy(false);
              setOutput('');
              setError('');
            }}
          />
        </Field>
        <Button disabled={busy} onClick={() => void run()}>
          {busy ? '查询中…' : '查询厂商'}
        </Button>
        <SecondaryButton disabled={downloading} onClick={() => void download()}>
          {downloading
            ? '下载离线数据库中…'
            : offline
              ? '重新下载完整离线数据库'
              : '下载完整离线数据库'}
        </SecondaryButton>
        <p className="text-muted-foreground text-xs">
          查询只读取本站的本地 OUI 分片，不上传 MAC
          地址。已查分片可缓存；下载完整数据库后，未查过的前缀也可离线查询。浏览器清除缓存后需要重新下载。
        </p>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card>
        <ToolResult value={output} label="厂商信息" />
      </Card>
    </div>
  );
}
