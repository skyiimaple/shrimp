import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Moon, Monitor, Search, Shrimp, Sun } from 'lucide-react'
import { CatalogProvider, useCatalog } from '../features/catalog/catalog-provider'
import { useTheme } from '../features/theme/theme-provider'

export function AppShell() {
  return <CatalogProvider><ShellFrame /></CatalogProvider>
}

function ShellFrame() {
  const { theme, setTheme } = useTheme()
  const { query, setQuery } = useCatalog()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  const updateQuery = (value: string) => {
    setQuery(value)
    if (pathname !== '/') navigate({ to: '/' })
  }

  return <div className="min-h-screen">
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="container topbar">
        <Link to="/" className="flex items-center gap-3 font-bold"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Shrimp size={20}/></span><span className="hidden sm:inline">Shrimp 工具箱</span></Link>
        <label className="header-search">
          <Search size={16} aria-hidden="true" />
          <input aria-label="搜索工具" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="搜索 JSON、时间戳、周报…" />
        </label>
        <nav className="flex items-center gap-2">
          <a href="/#favorites" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground md:block">我的收藏</a>
          <button className="icon-button" aria-label={`切换主题，当前为${theme}`} title={`主题：${theme}`} onClick={() => setTheme(next)}><Icon size={18}/></button>
        </nav>
      </div>
    </header>
    <main className="container py-5 sm:py-6"><Outlet /></main>
    <footer className="container border-t border-border py-8 text-sm text-muted-foreground"><p>本地优先 · 数据转换只在你的浏览器中完成</p></footer>
  </div>
}
