import { Check, Copy, Plus, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, ErrorBox, Field, Input, SecondaryButton, Textarea } from '../../components/ui'
import { copyText } from '../../lib/utils'
import { generateWeeklyReport, parseWeeklyRows, productMap } from '../lib/weekly-report'

const productEntries = Object.entries(productMap)

export function WeeklyReportTool() {
  const [memberDraft, setMemberDraft] = useState('')
  const [memberOptions, setMemberOptions] = useState<string[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>(() => productEntries.map(([key]) => key))
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const addMember = () => {
    const name = memberDraft.trim()
    if (!name) return
    setMemberOptions((current) => current.includes(name) ? current : [...current, name])
    setSelectedMembers((current) => current.includes(name) ? current : [...current, name])
    setMemberDraft('')
    setError('')
  }

  const toggleMember = (name: string) => setSelectedMembers((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])
  const toggleProduct = (product: string) => setSelectedProducts((current) => current.includes(product) ? current.filter((item) => item !== product) : [...current, product])

  const generate = () => {
    setOutput('')
    if (!selectedMembers.length) { setError('请添加并选择团队成员'); return }
    if (!selectedProducts.length) { setError('请选择产品项目'); return }
    const parsed = parseWeeklyRows(input)
    if (!parsed.ok) { setError(parsed.error); return }
    const report = generateWeeklyReport(parsed.value, selectedProducts, selectedMembers)
    if (!report.ok) { setError(report.error); return }
    setOutput(report.value); setError('')
  }

  const reset = () => {
    setMemberDraft(''); setMemberOptions([]); setSelectedMembers([])
    setSelectedProducts(productEntries.map(([key]) => key)); setInput(''); setOutput(''); setError('')
  }

  return <div className="grid gap-5">
    <Card className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid content-start gap-3">
          <div className="grid gap-2 text-sm font-medium">
            <label htmlFor="weekly-member">成员姓名</label>
            <div className="flex gap-2"><Input id="weekly-member" value={memberDraft} onChange={(event) => setMemberDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addMember() } }} placeholder="输入完整姓名后按回车"/><SecondaryButton className="shrink-0 whitespace-nowrap" type="button" onClick={addMember}><Plus size={16}/>添加成员</SecondaryButton></div>
          </div>
          {memberOptions.length ? <div className="grid gap-2 rounded-xl border border-border bg-muted/40 p-3"><span className="text-xs font-medium text-muted-foreground">成员选项（姓名需与表格负责人完全相同）</span><div className="flex flex-wrap gap-2">{memberOptions.map((name) => <div className="relative z-10 flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-sm" key={name}><label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={selectedMembers.includes(name)} onChange={() => toggleMember(name)} />{name}</label><button type="button" aria-label={`删除成员 ${name}`} onClick={() => { setMemberOptions((current) => current.filter((item) => item !== name)); setSelectedMembers((current) => current.filter((item) => item !== name)) }}><X size={14}/></button></div>)}</div></div> : <p className="text-sm text-muted-foreground">尚未添加成员。成员不会预设或自动猜测。</p>}
        </div>
        <fieldset className="grid content-start gap-3"><legend className="mb-3 text-sm font-medium">产品项目</legend><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{productEntries.map(([key, name]) => <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm" key={key}><input type="checkbox" checked={selectedProducts.includes(key)} onChange={() => toggleProduct(key)} /><span><b>{key}</b> · {name}</span></label>)}</div></fieldset>
      </div>
      <Field label="表格数据" hint="列顺序：产品、版本、发布日期、模块、任务、负责人、预计人天、已投入人天、进度、状态、预计产出、备注（可空）"><Textarea aria-label="表格数据" className="min-h-56" value={input} onChange={(event) => setInput(event.target.value)} placeholder="从表格复制后粘贴到这里，各列使用制表符分隔" /></Field>
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={generate}>生成周报</Button><SecondaryButton type="button" onClick={() => setInput('')} disabled={!input}>清空输入</SecondaryButton><SecondaryButton type="button" onClick={reset}><RotateCcw size={16}/>重置全部</SecondaryButton></div>
      {error && <ErrorBox>{error}</ErrorBox>}
    </Card>
    <Card className="grid gap-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">周报结果</span>{output && <SecondaryButton type="button" onClick={() => copyText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) })}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? '已复制' : '复制周报'}</SecondaryButton>}</div><Textarea aria-label="周报结果" className="min-h-96" value={output} onChange={(event) => setOutput(event.target.value)} placeholder="等待生成…" /></Card>
  </div>
}
