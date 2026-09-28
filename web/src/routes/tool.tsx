import { Link, useParams } from '@tanstack/react-router'
import { ChevronLeft, Heart } from 'lucide-react'
import { Button } from '../components/ui'
import { useFavorites } from '../features/favorites/favorites-provider'
import { findTool } from '../tools/registry'
export function ToolPage() {
  const { slug } = useParams({ strict: false }) as { slug: string }; const tool = findTool(slug); const favorites = useFavorites()
  if (!tool) return <div className="empty-panel"><h1>未找到这个工具</h1><p>工具可能已移动，返回首页继续探索。</p><Link to="/" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">返回工具箱</Link></div>
  const Icon = tool.icon; const Component = tool.component; const active = favorites.favorites.has(tool.slug)
  return <div className="grid gap-7"><Link to="/" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft size={16}/>返回所有工具</Link><header className="tool-header"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Icon size={24}/></span><div><p>{tool.category}</p><h1>{tool.name}</h1><span>{tool.description}</span></div></div><Button className="bg-card text-foreground ring-1 ring-border hover:bg-muted" onClick={() => favorites.toggle(tool.slug)}><Heart size={17} className={active ? 'fill-current text-rose-500' : ''}/>{active ? '已收藏' : '收藏工具'}</Button></header><Component /></div>
}
