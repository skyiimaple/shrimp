import { useMutation } from '@tanstack/react-query'
import { Check, Copy, LoaderCircle, Plus, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, ErrorBox, Field, Input, SecondaryButton, Select, Textarea } from '../../components/ui'
import { sendHttpRequest } from '../../features/http/client'
import type { HttpMethod } from '../../features/http/types'
import { copyText } from '../../lib/utils'
import { decodeBase64Utf8, encodeBase64Utf8 } from '../lib/base64'
import { analyzeCron } from '../lib/cron'
import { hashText, type HashAlgorithm } from '../lib/hash'
import { formatJson, minifyJson } from '../lib/json'
import { decodeJwt } from '../lib/jwt'
import { runRegex, type RegexMatch } from '../lib/regex'
import { fromIso, parseTimestamp, type TimeResult } from '../lib/timestamp'
import { generateUuidBatch } from '../lib/uuid'

function Actions({ children }: { children: React.ReactNode }) { return <div className="flex flex-wrap gap-2">{children}</div> }
function CopyButton({ value, label = '复制结果' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false)
  return <SecondaryButton type="button" onClick={() => copyText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1200) })}>{done ? <Check size={16} /> : <Copy size={16} />}{done ? '已复制' : label}</SecondaryButton>
}
function ResultArea({ value, label = '输出结果' }: { value: string; label?: string }) { return <div className="grid gap-2"><div className="flex items-center justify-between"><span className="text-sm font-medium">{label}</span>{value && <CopyButton value={value} />}</div><Textarea aria-label={label} value={value} readOnly placeholder="结果会显示在这里" /></div> }

export function JsonTool() {
  const [input, setInput] = useState('{"name":"Shrimp","ready":true}')
  const [output, setOutput] = useState(''); const [error, setError] = useState('')
  const run = (mode: 'format' | 'minify') => { const result = mode === 'format' ? formatJson(input, 2) : minifyJson(input); result.ok ? (setOutput(result.value), setError('')) : setError(result.error) }
  return <div className="tool-grid"><Card className="grid gap-4"><Field label="JSON 输入"><Textarea value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} /></Field><Actions><Button onClick={() => run('format')}>格式化</Button><SecondaryButton onClick={() => run('minify')}>压缩</SecondaryButton><SecondaryButton onClick={() => { setInput(''); setOutput(''); setError('') }}>清空</SecondaryButton></Actions>{error && <ErrorBox>{error}</ErrorBox>}</Card><Card><ResultArea value={output} /></Card></div>
}
export function Base64Tool() {
  const [input, setInput] = useState('虾米工具箱'); const [output, setOutput] = useState(''); const [error, setError] = useState('')
  const encode = () => { setOutput(encodeBase64Utf8(input)); setError('') }
  const decode = () => { const result = decodeBase64Utf8(input); result.ok ? (setOutput(result.value), setError('')) : setError(result.error) }
  return <div className="tool-grid"><Card className="grid gap-4"><Field label="文本或 Base64"><Textarea value={input} onChange={(e) => setInput(e.target.value)} /></Field><Actions><Button onClick={encode}>编码</Button><SecondaryButton onClick={decode}>解码</SecondaryButton></Actions>{error && <ErrorBox>{error}</ErrorBox>}</Card><Card><ResultArea value={output} /></Card></div>
}
export function JwtTool() {
  const [input, setInput] = useState(''); const [output, setOutput] = useState(''); const [error, setError] = useState('')
  const run = () => { const result = decodeJwt(input); result.ok ? (setOutput(`Header\n${JSON.stringify(result.value.header, null, 2)}\n\nPayload\n${JSON.stringify(result.value.payload, null, 2)}`), setError('')) : setError(result.error) }
  return <div className="grid gap-5"><div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">安全提示：这里只解码内容，不验证签名或令牌可信度。不要把解码结果当作身份校验依据。</div><div className="tool-grid"><Card className="grid gap-4"><Field label="JWT"><Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴三段式 JWT" /></Field><Button onClick={run}>解码令牌</Button>{error && <ErrorBox>{error}</ErrorBox>}</Card><Card><ResultArea value={output} label="Header / Payload" /></Card></div></div>
}
export function HashTool() {
  const [text, setText] = useState(''); const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256'); const [output, setOutput] = useState(''); const [busy, setBusy] = useState(false)
  const run = async () => { setBusy(true); try { setOutput(await hashText(text, algorithm)) } finally { setBusy(false) } }
  return <div className="tool-grid"><Card className="grid gap-4"><Field label="哈希算法"><Select value={algorithm} onChange={(e) => { setAlgorithm(e.target.value as HashAlgorithm); setOutput('') }}>{['SHA-1','SHA-256','SHA-384','SHA-512'].map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="待计算文本" hint="允许计算空文本"><Textarea value={text} onChange={(e) => setText(e.target.value)} /></Field><Button onClick={run} disabled={busy}>{busy && <LoaderCircle className="animate-spin" size={16} />}{busy ? '计算中' : '计算哈希'}</Button></Card><Card><ResultArea value={output} label={`${algorithm} 摘要`} /></Card></div>
}
function TimeResultView({ result }: { result: TimeResult | null }) { if (!result) return <p className="empty-state">转换结果会显示在这里</p>; return <dl className="result-list"><div><dt>ISO / UTC</dt><dd>{result.iso}</dd></div><div><dt>本地时间</dt><dd>{result.local}</dd></div><div><dt>秒</dt><dd>{result.seconds}</dd></div><div><dt>毫秒</dt><dd>{result.milliseconds}</dd></div></dl> }
export function TimestampTool() {
  const [input, setInput] = useState('0'); const [unit, setUnit] = useState<'seconds'|'milliseconds'>('seconds'); const [iso, setIso] = useState('1970-01-01T00:00:00Z'); const [result, setResult] = useState<TimeResult|null>(null); const [error, setError] = useState('')
  const accept = (value: ReturnType<typeof parseTimestamp>) => value.ok ? (setResult(value.value), setError('')) : setError(value.error)
  return <div className="tool-grid"><Card className="grid gap-5"><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Field label="Unix 时间戳"><Input value={input} onChange={(e) => setInput(e.target.value)} /></Field><Field label="单位"><Select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)}><option value="seconds">秒</option><option value="milliseconds">毫秒</option></Select></Field></div><Actions><Button onClick={() => accept(parseTimestamp(input, unit))}>转换时间戳</Button><SecondaryButton onClick={() => { const now = Date.now(); setInput(unit === 'seconds' ? String(Math.floor(now / 1000)) : String(now)) }}>使用当前时间</SecondaryButton></Actions><Field label="ISO 或本地日期时间"><Input value={iso} onChange={(e) => setIso(e.target.value)} /></Field><SecondaryButton onClick={() => accept(fromIso(iso))}>转换日期</SecondaryButton>{error && <ErrorBox>{error}</ErrorBox>}</Card><Card><TimeResultView result={result} /></Card></div>
}
export function UuidTool() {
  const [count, setCount] = useState(5); const [values, setValues] = useState<string[]>([]); const [error, setError] = useState('')
  const run = () => { const result = generateUuidBatch(count); result.ok ? (setValues(result.value), setError('')) : setError(result.error) }
  return <div className="tool-grid"><Card className="grid gap-4"><Field label="生成数量" hint="一次最多 100 个"><Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} /></Field><Button onClick={run}>生成 UUID v4</Button>{error && <ErrorBox>{error}</ErrorBox>}</Card><Card className="grid gap-3"><div className="flex items-center justify-between"><span className="text-sm font-medium">生成结果</span>{values.length > 0 && <CopyButton value={values.join('\n')} label="复制全部" />}</div>{values.length ? <ol className="grid gap-2">{values.map((value, index) => <li className="rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all" key={`${value}-${index}`}>{value}</li>)}</ol> : <p className="empty-state">点击生成即可获得安全随机 UUID</p>}</Card></div>
}
export function CronTool() {
  const [expression, setExpression] = useState('*/15 * * * *'); const [description, setDescription] = useState(''); const [runs, setRuns] = useState<string[]>([]); const [error, setError] = useState('')
  const run = () => { const result = analyzeCron(expression, new Date(), 5); result.ok ? (setDescription(result.value.description), setRuns(result.value.nextRuns), setError('')) : setError(result.error) }
  return <div className="tool-grid"><Card className="grid gap-4"><Field label="五段 Cron 表达式" hint="顺序：分钟 小时 日期 月份 星期；不支持 Quartz 秒/年字段"><Input className="font-mono" value={expression} onChange={(e) => setExpression(e.target.value)} /></Field><div className="flex flex-wrap gap-2">{['*/15 * * * *','0 9 * * 1-5','0 0 1 * *'].map((value) => <button key={value} onClick={() => setExpression(value)} className="chip">{value}</button>)}</div><Button onClick={run}>分析计划</Button>{error && <ErrorBox>{error}</ErrorBox>}</Card><Card>{description ? <div className="grid gap-4"><p className="rounded-xl bg-primary/8 px-4 py-3 text-sm font-medium text-primary">{description}</p><ol className="result-list">{runs.map((value, index) => <li key={value}><span className="text-muted-foreground">第 {index + 1} 次</span><code>{new Date(value).toLocaleString('zh-CN', { hour12: false })}</code></li>)}</ol></div> : <p className="empty-state">输入表达式查看中文含义和未来五次运行时间</p>}</Card></div>
}
export function RegexTool() {
  const [pattern, setPattern] = useState('(虾)(米)'); const [flags, setFlags] = useState('g'); const [text, setText] = useState('虾米工具箱，虾米真好用。'); const [matches, setMatches] = useState<RegexMatch[]>([]); const [error, setError] = useState('')
  const run = () => { const result = runRegex(pattern, flags, text); result.ok ? (setMatches(result.value), setError('')) : setError(result.error) }
  return <div className="tool-grid"><Card className="grid gap-4"><div className="grid gap-3 sm:grid-cols-[1fr_7rem]"><Field label="正则表达式"><Input value={pattern} onChange={(e) => setPattern(e.target.value)} /></Field><Field label="Flags"><Input value={flags} onChange={(e) => setFlags(e.target.value)} /></Field></div><Field label="测试文本"><Textarea value={text} onChange={(e) => setText(e.target.value)} /></Field><Button onClick={run}>开始匹配</Button>{error && <ErrorBox>{error}</ErrorBox>}</Card><Card>{Array.isArray(matches) && matches.length ? <div className="grid gap-3"><p className="text-sm text-muted-foreground">找到 {matches.length} 个匹配</p>{matches.map((item, index) => <div className="rounded-xl bg-muted p-3" key={`${item.index}-${index}`}><div className="flex justify-between gap-3"><code className="break-all text-primary">{item.match || '（空匹配）'}</code><span className="text-xs text-muted-foreground">索引 {item.index}</span></div>{item.groups.length > 0 && <p className="mt-2 text-xs text-muted-foreground">捕获组：{item.groups.map((group, i) => `${i + 1}. ${group}`).join(' · ')}</p>}</div>)}</div> : <p className="empty-state">运行后会列出完整匹配、索引和捕获组</p>}</Card></div>
}
type HeaderRow = { id: number; key: string; value: string }
export function HttpTool() {
  const [url, setUrl] = useState('https://example.com'); const [method, setMethod] = useState<HttpMethod>('GET'); const [body, setBody] = useState(''); const [headers, setHeaders] = useState<HeaderRow[]>([{ id: 1, key: 'Accept', value: 'application/json' }]); const [nextId, setNextId] = useState(2)
  const mutation = useMutation({ mutationFn: () => sendHttpRequest({ url, method, headers: Object.fromEntries(headers.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value])), ...(body && !['GET','HEAD'].includes(method) ? { body } : {}) }) })
  const updateHeader = (id: number, field: 'key'|'value', value: string) => setHeaders((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row))
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]"><Card className="grid gap-5"><div className="grid gap-3 sm:grid-cols-[8rem_1fr]"><Field label="方法"><Select value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)}>{['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="请求 URL"><Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/data" /></Field></div><div className="grid gap-2"><div className="flex items-center justify-between"><span className="text-sm font-medium">请求头</span><SecondaryButton className="min-h-8 px-3 py-1 text-xs" onClick={() => { setHeaders((rows) => [...rows, { id: nextId, key: '', value: '' }]); setNextId((id) => id + 1) }}><Plus size={14}/>添加</SecondaryButton></div>{headers.map((row) => <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={row.id}><Input aria-label="请求头名称" value={row.key} onChange={(e) => updateHeader(row.id, 'key', e.target.value)} placeholder="Header"/><Input aria-label="请求头值" value={row.value} onChange={(e) => updateHeader(row.id, 'value', e.target.value)} placeholder="Value"/><button aria-label="删除请求头" className="icon-button" onClick={() => setHeaders((rows) => rows.filter((item) => item.id !== row.id))}><Trash2 size={16}/></button></div>)}</div>{!['GET','HEAD'].includes(method) && <Field label="请求 Body"><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="文本或 JSON" /></Field>}<Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !url.trim()}>{mutation.isPending ? <LoaderCircle className="animate-spin" size={16}/> : <Send size={16}/>} {mutation.isPending ? '请求中…' : '发送请求'}</Button>{mutation.isError && <ErrorBox>{mutation.error.message}</ErrorBox>}</Card><Card>{mutation.data ? <div className="grid gap-4"><div className="flex flex-wrap items-center gap-2"><span className="status-badge">HTTP {mutation.data.status}</span><span className="text-sm text-muted-foreground">耗时 {mutation.data.durationMs} ms</span>{mutation.data.bodyEncoding === 'base64' && <span className="status-badge secondary">Base64 响应</span>}</div><details><summary className="cursor-pointer text-sm font-medium">响应头（{Object.keys(mutation.data.headers).length}）</summary><pre className="response-code">{JSON.stringify(mutation.data.headers, null, 2)}</pre></details><ResultArea value={mutation.data.body} label="响应 Body" /></div> : <p className="empty-state">响应状态、耗时、Header 和 Body 会显示在这里。请求只通过本机代理发送。</p>}</Card></div>
}
