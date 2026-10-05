import { useEffect, useState } from 'react';
import { Card, Field, Input } from '../../components/ui';
import { findHttpStatuses, findMimeTypes } from '../lib/parity-web-reference';

export function MimeTypeTool() {
  const [query, setQuery] = useState('');
  const matches = findMimeTypes(query);
  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <Field label="扩展名或 MIME 类型" hint="输入 .png、json 或 application/json">
          <Input
            aria-label="扩展名或 MIME 类型"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <p className="text-muted-foreground text-sm">
          仅收录常见类型，不代表完整的 IANA MIME 注册表。
        </p>
      </Card>
      <Card className="grid gap-3">
        <p className="text-sm font-medium">{matches.length} 个匹配项</p>
        {matches.length ? (
          <div className="grid gap-2">
            {matches.map((entry) => (
              <div
                key={entry.mime}
                className="border-border grid gap-1 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
              >
                <div className="min-w-0 font-mono text-sm break-all">{entry.mime}</div>
                <div className="text-muted-foreground text-sm">
                  <span>{entry.extensions.map((extension) => `.${extension}`).join(', ')}</span>
                  <span className="ml-2">{entry.description}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">没有找到匹配的常见类型。</p>
        )}
      </Card>
    </div>
  );
}

export function HttpStatusTool() {
  const [query, setQuery] = useState('');
  const matches = findHttpStatuses(query);
  return (
    <div className="grid gap-4">
      <Card>
        <Field label="状态码或名称" hint="输入 404、Not Found 或中文描述">
          <Input
            aria-label="状态码或名称"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
      </Card>
      <Card className="grid gap-3">
        <p className="text-sm font-medium">{matches.length} 个匹配项</p>
        {matches.length ? (
          matches.map((entry) => (
            <div
              key={entry.code}
              className="border-border grid gap-1 rounded-lg border p-3 sm:grid-cols-[4rem_minmax(0,1fr)]"
            >
              <strong className="font-mono">{entry.code}</strong>
              <div>
                <p className="font-medium">{entry.name}</p>
                <p className="text-muted-foreground text-sm">{entry.description}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">没有找到匹配的常见状态码。</p>
        )}
      </Card>
    </div>
  );
}

function deviceRows(): [string, string][] {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return [];
  const deviceNavigator = navigator as Navigator & { deviceMemory?: number };
  return [
    ['用户代理', navigator.userAgent || '不可用'],
    ['语言', navigator.language || '不可用'],
    ['平台', navigator.platform || '不可用'],
    ['在线状态', navigator.onLine ? '在线' : '离线'],
    ['Cookie', navigator.cookieEnabled ? '已启用' : '已禁用'],
    [
      '逻辑处理器',
      navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : '不可用',
    ],
    [
      '设备内存',
      deviceNavigator.deviceMemory ? `${deviceNavigator.deviceMemory} GB（近似值）` : '不可用',
    ],
    ['屏幕尺寸', typeof screen !== 'undefined' ? `${screen.width} × ${screen.height}` : '不可用'],
    ['视口尺寸', `${window.innerWidth} × ${window.innerHeight}`],
    ['设备像素比', String(window.devicePixelRatio || 1)],
    ['时区', Intl.DateTimeFormat().resolvedOptions().timeZone || '不可用'],
  ];
}

export function DeviceInformationTool() {
  const rows = deviceRows();
  return (
    <Card className="grid gap-3">
      <p className="text-muted-foreground text-sm">
        以下信息来自当前浏览器；部分字段可能因浏览器隐私设置而不可用或被简化。
      </p>
      <dl className="grid gap-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="border-border grid gap-1 rounded-lg border p-3 sm:grid-cols-[9rem_minmax(0,1fr)]"
          >
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="min-w-0 text-sm break-all">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

type KeyEventInfo = { key: string; code: string; keyCode: number; modifiers: string };

export function KeycodeTool() {
  const [latest, setLatest] = useState<KeyEventInfo | null>(null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      setLatest({
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
        modifiers:
          [
            event.ctrlKey && 'Ctrl',
            event.altKey && 'Alt',
            event.shiftKey && 'Shift',
            event.metaKey && 'Meta',
          ]
            .filter(Boolean)
            .join(' + ') || '无',
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return (
    <Card className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        按下任意按键以查看键盘事件信息。页面中输入时也会更新。
      </p>
      {latest ? (
        <dl className="grid gap-2">
          {(
            [
              ['key', latest.key],
              ['code', latest.code],
              ['keyCode（旧版）', String(latest.keyCode)],
              ['修饰键', latest.modifiers],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="border-border grid grid-cols-[7rem_minmax(0,1fr)] gap-2 rounded-lg border p-3"
            >
              <dt className="text-muted-foreground text-sm">{label}</dt>
              <dd className="font-mono text-sm break-all">{value || '（空）'}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm">等待按键…</p>
      )}
    </Card>
  );
}
