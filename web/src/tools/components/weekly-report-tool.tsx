import { Check, ChevronDown, Copy, Plus, RotateCcw, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  SecondaryButton,
  Textarea,
} from '../../components/ui';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { copyText } from '../../lib/utils';
import { generateWeeklyReport, parseWeeklyRows, productMap } from '../lib/weekly-report';
import { readWeeklyMembers, writeWeeklyMembers } from '../lib/weekly-members';
import {
  readWeeklyProjects,
  writeWeeklyProjects,
  type WeeklyProject,
} from '../lib/weekly-projects';

const productEntries = Object.entries(productMap);
const builtinProductKeys = new Set(Object.keys(productMap));

function loadCustomProjects() {
  return readWeeklyProjects().filter((project) => !builtinProductKeys.has(project.key));
}

export function WeeklyReportTool() {
  const [memberDraft, setMemberDraft] = useState('');
  const [memberOptions, setMemberOptions] = useState<string[]>(() => readWeeklyMembers());
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [projectKeyDraft, setProjectKeyDraft] = useState('');
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [customProjects, setCustomProjects] = useState<WeeklyProject[]>(() => loadCustomProjects());
  const [selectedProducts, setSelectedProducts] = useState<string[]>(() => [
    ...productEntries.map(([key]) => key),
    ...loadCustomProjects().map((project) => project.key),
  ]);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const addMember = () => {
    const name = memberDraft.trim();
    if (!name) return;
    setMemberOptions((current) => {
      const next = current.includes(name) ? current : [...current, name];
      writeWeeklyMembers(next);
      return next;
    });
    setSelectedMembers((current) => (current.includes(name) ? current : [...current, name]));
    setMemberDraft('');
    setError('');
  };

  const toggleMember = (name: string) =>
    setSelectedMembers((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  const toggleProduct = (product: string) =>
    setSelectedProducts((current) =>
      current.includes(product)
        ? current.filter((item) => item !== product)
        : [...current, product],
    );

  const addProject = () => {
    const key = projectKeyDraft.trim();
    const name = projectNameDraft.trim();
    if (!key || !name) {
      setError('请填写项目代号和名称');
      return;
    }
    if (builtinProductKeys.has(key) || customProjects.some((project) => project.key === key)) {
      setError('项目代号已存在');
      return;
    }
    const project = { key, name };
    setCustomProjects((current) => {
      const next = current.some((item) => item.key === key) ? current : [...current, project];
      writeWeeklyProjects(next);
      return next;
    });
    setSelectedProducts((current) => (current.includes(key) ? current : [...current, key]));
    setProjectKeyDraft('');
    setProjectNameDraft('');
    setError('');
  };

  const removeProject = (key: string) => {
    setCustomProjects((current) => {
      const next = current.filter((project) => project.key !== key);
      writeWeeklyProjects(next);
      return next;
    });
    setSelectedProducts((current) => current.filter((item) => item !== key));
  };

  const generate = () => {
    setOutput('');
    if (!selectedMembers.length) {
      setError('请添加并选择团队成员');
      return;
    }
    if (!selectedProducts.length) {
      setError('请选择产品项目');
      return;
    }
    const parsed = parseWeeklyRows(input);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const report = generateWeeklyReport(
      parsed.value,
      selectedProducts,
      selectedMembers,
      Object.fromEntries(customProjects.map((project) => [project.key, project.name])),
    );
    if (!report.ok) {
      setError(report.error);
      return;
    }
    setOutput(report.value);
    setError('');
  };

  const removeMember = (name: string) => {
    setMemberOptions((current) => {
      const next = current.filter((item) => item !== name);
      writeWeeklyMembers(next);
      return next;
    });
    setSelectedMembers((current) => current.filter((item) => item !== name));
  };

  const reset = () => {
    setMemberDraft('');
    setProjectKeyDraft('');
    setProjectNameDraft('');
    setSelectedMembers([]);
    setSelectedProducts([
      ...productEntries.map(([key]) => key),
      ...customProjects.map((project) => project.key),
    ]);
    setInput('');
    setOutput('');
    setError('');
  };

  const addProjectOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addProject();
    }
  };

  return (
    <div className="grid gap-5">
      <Card className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="grid min-w-0 content-start gap-3">
            <div className="grid gap-2 text-sm font-medium">
              <Label htmlFor="weekly-member">成员姓名</Label>
              <div className="flex gap-2">
                <Input
                  id="weekly-member"
                  value={memberDraft}
                  onChange={(event) => setMemberDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addMember();
                    }
                  }}
                  placeholder="输入完整姓名后按回车"
                />
                <SecondaryButton
                  className="shrink-0 whitespace-nowrap"
                  type="button"
                  onClick={addMember}
                >
                  <Plus size={16} />
                  添加成员
                </SecondaryButton>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <SecondaryButton
                  type="button"
                  aria-label="选择团队成员"
                  className="min-w-0 justify-between"
                >
                  <span className="min-w-0 truncate text-left">
                    {selectedMembers.length ? selectedMembers.join('、') : '选择团队成员'}
                  </span>
                  <ChevronDown size={16} className="shrink-0" />
                </SecondaryButton>
              </PopoverTrigger>
              <PopoverContent
                aria-label="团队成员选项"
                className="max-h-[min(20rem,var(--radix-popover-content-available-height))] overflow-y-auto"
              >
                {memberOptions.length ? (
                  <div className="grid gap-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      成员选项（姓名需与表格负责人完全相同）
                    </span>
                    <div className="grid gap-2">
                      {memberOptions.map((name) => (
                        <div
                          className="border-border bg-card flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                          key={name}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <Checkbox
                              id={`weekly-member-${name}`}
                              checked={selectedMembers.includes(name)}
                              onCheckedChange={() => toggleMember(name)}
                            />
                            <Label
                              htmlFor={`weekly-member-${name}`}
                              className="min-w-0 cursor-pointer font-normal break-all"
                            >
                              {name}
                            </Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 min-h-0 shrink-0 p-0"
                            type="button"
                            aria-label={`删除成员 ${name}`}
                            onClick={() => removeMember(name)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    尚未添加成员。成员不会预设或自动猜测。
                  </p>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <fieldset className="grid content-start gap-3">
            <legend className="mb-3 text-sm font-medium">产品项目</legend>
            <div className="grid gap-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="weekly-project-key">项目代号</Label>
                  <Input
                    id="weekly-project-key"
                    value={projectKeyDraft}
                    onChange={(event) => setProjectKeyDraft(event.target.value)}
                    onKeyDown={addProjectOnEnter}
                    placeholder="与表格产品列一致"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="weekly-project-name">项目名称</Label>
                  <Input
                    id="weekly-project-name"
                    value={projectNameDraft}
                    onChange={(event) => setProjectNameDraft(event.target.value)}
                    onKeyDown={addProjectOnEnter}
                    placeholder="周报中显示的名称"
                  />
                </div>
              </div>
              <SecondaryButton
                className="justify-self-start whitespace-nowrap"
                type="button"
                onClick={addProject}
              >
                <Plus size={16} />
                添加项目
              </SecondaryButton>
              <p className="text-muted-foreground text-xs">代号需与表格产品列完全相同</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {productEntries.map(([key, name]) => (
                <div
                  className="border-border bg-background flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                  key={key}
                >
                  <Checkbox
                    id={`weekly-product-${key}`}
                    checked={selectedProducts.includes(key)}
                    onCheckedChange={() => toggleProduct(key)}
                  />
                  <Label htmlFor={`weekly-product-${key}`} className="cursor-pointer font-normal">
                    <b>{key}</b> · {name}
                  </Label>
                </div>
              ))}
              {customProjects.map((project) => (
                <div
                  className="border-border bg-background flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                  key={project.key}
                >
                  <Checkbox
                    id={`weekly-product-${project.key}`}
                    checked={selectedProducts.includes(project.key)}
                    onCheckedChange={() => toggleProduct(project.key)}
                  />
                  <Label
                    htmlFor={`weekly-product-${project.key}`}
                    className="min-w-0 flex-1 cursor-pointer font-normal break-all"
                  >
                    <b>{project.key}</b> · {project.name}
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 min-h-0 shrink-0 p-0"
                    type="button"
                    aria-label={`删除项目 ${project.key}`}
                    onClick={() => removeProject(project.key)}
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
        <Field
          label="表格数据"
          hint="列顺序：产品、版本、发布日期、模块、任务、负责人、预计人天、已投入人天、进度、状态、预计产出、备注（可空）"
        >
          <Textarea
            aria-label="表格数据"
            className="min-h-56"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="从表格复制后粘贴到这里，各列使用制表符分隔"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={generate}>
            生成周报
          </Button>
          <SecondaryButton type="button" onClick={() => setInput('')} disabled={!input}>
            清空输入
          </SecondaryButton>
          <SecondaryButton type="button" onClick={reset}>
            <RotateCcw size={16} />
            重置全部
          </SecondaryButton>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">周报结果</span>
          {output && (
            <SecondaryButton
              type="button"
              onClick={() =>
                copyText(output).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                })
              }
            >
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? '已复制' : '复制周报'}
            </SecondaryButton>
          )}
        </div>
        <Textarea
          aria-label="周报结果"
          className="min-h-96"
          value={output}
          onChange={(event) => setOutput(event.target.value)}
          placeholder="等待生成…"
        />
      </Card>
    </div>
  );
}
