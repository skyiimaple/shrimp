import { Link, Outlet } from '@tanstack/react-router'
import { Moon, Shrimp, Sun, Monitor } from 'lucide-react'
import { useTheme } from '../features/theme/theme-provider'

export function AppShell() {
  const { theme, setTheme } = useTheme()
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  return <div className="min-h-screen"><header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl"><div className="container flex h-16 items-center justify-between"><Link to="/" className="flex items-center gap-3 font-bold"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Shrimp size={20}/></span><span>Shrimp 工具箱</span></Link><nav className="flex items-center gap-2"><a href="/#favorites" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:block">我的收藏</a><button className="icon-button" aria-label={`切换主题，当前为${theme}`} title={`主题：${theme}`} onClick={() => setTheme(next)}><Icon size={18}/></button></nav></div></header><main className="container py-8 sm:py-12"><Outlet /></main><footer className="container border-t border-border py-8 text-sm text-muted-foreground"><p>本地优先 · 数据转换只在你的浏览器中完成</p></footer></div>
}
