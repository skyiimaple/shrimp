import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Moon, Monitor, Search, Shrimp, Sun } from 'lucide-react';
import { CatalogProvider, useCatalog } from '../features/catalog/catalog-provider';
import { AgentLauncher } from '../features/agent/agent-launcher';
import { useTheme } from '../features/theme/theme-provider';
import { Button, Input } from './ui';
import { Label } from './ui/label';

export function AppShell() {
  return (
    <CatalogProvider>
      <ShellFrame />
    </CatalogProvider>
  );
}

function ShellFrame() {
  const { theme, setTheme } = useTheme();
  const { query, setQuery } = useCatalog();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  const updateQuery = (value: string) => {
    setQuery(value);
    if (pathname !== '/') navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen">
      <header className="border-border/80 bg-background/85 sticky top-0 z-30 border-b backdrop-blur-xl">
        <div className="topbar container">
          <Link to="/" className="flex items-center gap-3 font-bold">
            <span className="bg-primary text-primary-foreground shadow-primary/20 grid size-9 shrink-0 place-items-center rounded-xl shadow-lg">
              <Shrimp size={20} />
            </span>
            <span className="hidden sm:inline">Shrimp 工具箱</span>
          </Link>
          <Label className="header-search">
            <Search size={16} aria-hidden="true" />
            <Input
              className="h-full min-h-0 border-0 bg-transparent p-0 shadow-none focus-visible:border-0 focus-visible:ring-0"
              aria-label="搜索工具"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="搜索 JSON、时间戳、周报…"
            />
          </Label>
          <nav className="flex items-center gap-2">
            <AgentLauncher />
            <a
              href="/#favorites"
              className="text-muted-foreground hover:bg-muted hover:text-foreground hidden rounded-lg px-3 py-2 text-sm font-medium md:block"
            >
              我的收藏
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="icon-button"
              aria-label={`切换主题，当前为${theme}`}
              title={`主题：${theme}`}
              onClick={() => setTheme(next)}
            >
              <Icon size={18} />
            </Button>
          </nav>
        </div>
      </header>
      <main className="container py-5 sm:py-6">
        <Outlet />
      </main>
      <footer className="border-border text-muted-foreground container border-t py-8 text-sm">
        <p>本地优先 · 数据转换只在你的浏览器中完成</p>
      </footer>
    </div>
  );
}
