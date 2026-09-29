import { Binary, Braces, Clock3, Code2, Globe2, LayoutGrid, Search } from 'lucide-react';
import { ToolCard } from '../components/tool-card';
import { useCatalog, type CatalogCategory } from '../features/catalog/catalog-provider';
import { useFavorites } from '../features/favorites/favorites-provider';
import { groupToolsByCategory, searchTools } from '../tools/registry';
import { categories, type ToolCategory } from '../tools/types';

const categoryIcons: Record<ToolCategory, typeof Braces> = {
  编码转换: Binary,
  数据处理: Braces,
  日期时间: Clock3,
  开发辅助: Code2,
  网络工具: Globe2,
};

export function HomePage() {
  const { query, category, setCategory } = useCatalog();
  const { favorites } = useFavorites();
  const matched = searchTools(query).filter(
    (tool) => category === '全部' || tool.category === category,
  );
  const grouped = groupToolsByCategory(matched);
  const groups = categories.flatMap((name) => {
    const items = grouped.get(name);
    return items ? [[name, items] as const] : [];
  });
  const favoriteTools = matched.filter((tool) => favorites.has(tool.slug));
  const tags: CatalogCategory[] = ['全部', ...categories];

  return (
    <div className="grid gap-8">
      <section className="intro">
        <h1>
          把零散的小工具，<span>收进一个清爽工作台。</span>
        </h1>
        <p>转换、检查、生成和调试都在这里。纯前端工具本地运行，收藏和主题只保存在你的浏览器中。</p>
        <div className="category-tags" role="radiogroup" aria-label="工具分类">
          {tags.map((tag) => {
            const Icon = tag === '全部' ? LayoutGrid : categoryIcons[tag];
            return (
              <button
                className="category-tag"
                type="button"
                role="radio"
                aria-checked={category === tag}
                key={tag}
                onClick={() => setCategory(tag)}
              >
                <Icon size={15} aria-hidden="true" />
                {tag}
              </button>
            );
          })}
        </div>
      </section>
      {favoriteTools.length > 0 && (
        <section id="favorites" className="section-block scroll-mt-24">
          <div className="section-heading">
            <div>
              <span className="section-kicker">PINNED</span>
              <h2>我的收藏</h2>
            </div>
            <span>{favoriteTools.length} 个工具</span>
          </div>
          <div className="tool-cards">
            {favoriteTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>
      )}
      {matched.length ? (
        groups.map(([name, items]) => (
          <section className="section-block" key={name}>
            <div className="section-heading">
              <div>
                <span className="section-kicker">TOOLBOX</span>
                <h2>{name}</h2>
              </div>
              <span>{items.length} 个工具</span>
            </div>
            <div className="tool-cards">
              {items.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="empty-panel">
          <Search size={26} />
          <h2>没有找到相关工具</h2>
          <p>试试搜索“编码”“时间”或“HTTP”，或切回“全部”。</p>
        </div>
      )}
    </div>
  );
}
