import { Link, useParams } from '@tanstack/react-router';
import { ChevronLeft, Heart } from 'lucide-react';
import { Button } from '../components/ui';
import { useFavorites } from '../features/favorites/favorites-provider';
import { findTool } from '../tools/registry';
export function ToolPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const tool = findTool(slug);
  const favorites = useFavorites();
  if (!tool)
    return (
      <div className="empty-panel">
        <h1>未找到这个工具</h1>
        <p>工具可能已移动，返回首页继续探索。</p>
        <Link
          to="/"
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          返回工具箱
        </Link>
      </div>
    );
  const Icon = tool.icon;
  const Component = tool.component;
  const active = favorites.favorites.has(tool.slug);
  return (
    <div className="grid gap-7">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft size={16} />
        返回所有工具
      </Link>
      <header className="tool-header">
        <div className="flex items-start gap-4">
          <span className="bg-primary text-primary-foreground shadow-primary/20 grid size-12 shrink-0 place-items-center rounded-2xl shadow-lg">
            <Icon size={24} />
          </span>
          <div>
            <p>{tool.category}</p>
            <h1>{tool.name}</h1>
            <span>{tool.description}</span>
          </div>
        </div>
        <Button
          className="bg-card text-foreground ring-border hover:bg-muted ring-1"
          onClick={() => favorites.toggle(tool.slug)}
        >
          <Heart size={17} className={active ? 'fill-current text-rose-500' : ''} />
          {active ? '已收藏' : '收藏工具'}
        </Button>
      </header>
      <Component />
    </div>
  );
}
