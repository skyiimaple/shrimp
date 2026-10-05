import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, OptionSelect, Textarea } from '../../components/ui';
import { buildWifiPayload, generateQrSvg, type WifiQrOptions } from '../lib/parity-qr';
import { ToolResult } from './tool-panel-shared';

function QrResult({ svg, filename }: { svg: string; filename: string }) {
  return (
    <Card className="grid content-start gap-4">
      {svg && (
        <>
          <img
            alt="二维码预览"
            className="border-border max-h-64 max-w-full rounded-lg border bg-white"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
          />
          <Button asChild variant="outline" className="w-fit">
            <a
              href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
              download={filename}
            >
              下载 SVG
            </a>
          </Button>
        </>
      )}
      <ToolResult value={svg} label="SVG 源码" />
    </Card>
  );
}

export function QrCodeTool() {
  const [content, setContent] = useState('');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const generate = () => {
    try {
      setSvg(generateQrSvg(content));
      setError('');
    } catch (reason) {
      setSvg('');
      setError(reason instanceof Error ? reason.message : '生成失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="二维码内容">
          <Textarea
            aria-label="二维码内容"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setSvg('');
              setError('');
            }}
            spellCheck={false}
          />
        </Field>
        <Button onClick={generate}>生成二维码</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <QrResult svg={svg} filename="qr-code.svg" />
    </div>
  );
}

export function WifiQrCodeTool() {
  const [options, setOptions] = useState<WifiQrOptions>({
    ssid: '',
    password: '',
    security: 'WPA',
    hidden: false,
  });
  const [payload, setPayload] = useState('');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const change = (patch: Partial<WifiQrOptions>) => {
    setOptions((current) => ({ ...current, ...patch }));
    setPayload('');
    setSvg('');
    setError('');
  };
  const generate = () => {
    try {
      const value = buildWifiPayload(options);
      setSvg(generateQrSvg(value));
      setPayload(value);
      setError('');
    } catch (reason) {
      setPayload('');
      setSvg('');
      setError(reason instanceof Error ? reason.message : '生成失败');
    }
  };
  return (
    <div className="tool-grid">
      <Card className="grid gap-4">
        <Field label="WiFi 名称（SSID）">
          <Input
            aria-label="WiFi 名称（SSID）"
            value={options.ssid}
            onChange={(event) => change({ ssid: event.target.value })}
            spellCheck={false}
          />
        </Field>
        <Field label="安全类型">
          <OptionSelect
            aria-label="安全类型"
            value={options.security}
            onValueChange={(value) => change({ security: value as WifiQrOptions['security'] })}
            options={[
              { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
              { value: 'WEP', label: 'WEP' },
              { value: 'nopass', label: '无密码' },
            ]}
          />
        </Field>
        {options.security !== 'nopass' && (
          <Field label="WiFi 密码">
            <Input
              aria-label="WiFi 密码"
              type="password"
              value={options.password}
              onChange={(event) => change({ password: event.target.value })}
              spellCheck={false}
            />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={options.hidden}
            onChange={(event) => change({ hidden: event.target.checked })}
          />
          隐藏网络
        </label>
        <Button onClick={generate}>生成 WiFi 二维码</Button>
        {error && <ErrorBox>{error}</ErrorBox>}
        <p className="text-muted-foreground text-xs">
          SSID 和密码仅保留在当前页面。分享二维码即会分享网络凭据。
        </p>
      </Card>
      <div className="grid content-start gap-4">
        <QrResult svg={svg} filename="wifi-qr-code.svg" />
        <Card>
          <ToolResult value={payload} label="WiFi 内容" />
        </Card>
      </div>
    </div>
  );
}
