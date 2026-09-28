import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Heart } from 'lucide-react'
import { useFavorites } from '../features/favorites/favorites-provider'
import type { ToolDefinition } from '../tools/types'
export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const { favorites, toggle } = useFavorites(); const Icon = tool.icon; const active = favorites.has(tool.slug)
  return <article className="group relative flex min-h-52 flex-col rounded-2xl border border-border bg-card p-5 transition duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 focus-within:ring-2 focus-within:ring-ring"><div className="mb-6 flex items-start justify-between"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={22}/></span><button className="icon-button size-9" aria-label={active ? `取消收藏 ${tool.name}` : `收藏 ${tool.name}`} onClick={() => toggle(tool.slug)}><Heart size={17} className={active ? 'fill-current text-rose-500' : ''}/></button></div><Link to="/tools/$slug" params={{ slug: tool.slug }} className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none"><h3 className="flex items-center gap-2 text-lg font-bold">{tool.name}<ArrowUpRight className="opacity-0 transition group-hover:opacity-100" size={16}/></h3></Link><p className="mt-2 text-sm leading-6 text-muted-foreground">{tool.description}</p><span className="mt-auto pt-5 text-xs font-medium text-primary">{tool.category}</span></article>
}
