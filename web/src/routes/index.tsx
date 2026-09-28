import { Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Input } from '../components/ui'
import { ToolCard } from '../components/tool-card'
import { useFavorites } from '../features/favorites/favorites-provider'
import { groupToolsByCategory, searchTools } from '../tools/registry'
export function HomePage() {
  const [query, setQuery] = useState(''); const results = searchTools(query); const groups = groupToolsByCategory(results); const { favorites } = useFavorites(); const favoriteTools = searchTools('').filter((tool) => favorites.has(tool.slug) && results.includes(tool))
  return <div className="grid gap-12"><section className="hero"><div className="eyebrow"><Sparkles size={14}/> {searchTools('').length} 个日常开发工具</div><h1>把零散的小工具，<br/><span>收进一个清爽工作台。</span></h1><p>转换、检查、生成和调试都在这里。纯前端工具本地运行，收藏和主题只保存在你的浏览器中。</p><div className="search-box"><Search size={20}/><Input aria-label="搜索工具" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索 JSON、时间戳、周报…" /></div></section>{favoriteTools.length > 0 && <section id="favorites" className="section-block scroll-mt-24"><div className="section-heading"><div><span className="section-kicker">PINNED</span><h2>我的收藏</h2></div><span>{favoriteTools.length} 个工具</span></div><div className="tool-cards">{favoriteTools.map((tool) => <ToolCard key={tool.slug} tool={tool}/>)}</div></section>}{results.length ? [...groups].map(([category, items]) => <section className="section-block" key={category}><div className="section-heading"><div><span className="section-kicker">TOOLBOX</span><h2>{category}</h2></div><span>{items.length} 个工具</span></div><div className="tool-cards">{items.map((tool) => <ToolCard key={tool.slug} tool={tool}/>)}</div></section>) : <div className="empty-panel"><Search size={26}/><h2>没有找到相关工具</h2><p>试试搜索“编码”“时间”或“HTTP”。</p></div>}</div>
}
