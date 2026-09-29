import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { FavoritesProvider, useFavorites } from './favorites/favorites-provider';
import { ThemeProvider, useTheme } from './theme/theme-provider';

function FavoriteProbe() {
  const { favorites, toggle } = useFavorites();
  return (
    <button onClick={() => toggle('json')}>
      {favorites.has('json') ? '取消收藏 JSON' : '收藏 JSON'}
    </button>
  );
}
function ThemeProbe() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme('dark')}>{theme}</button>;
}

describe('本地偏好 Provider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });
  it('收藏切换立即更新界面并持久化', async () => {
    const user = userEvent.setup();
    render(
      <FavoritesProvider>
        <FavoriteProbe />
      </FavoritesProvider>,
    );
    await user.click(screen.getByRole('button', { name: '收藏 JSON' }));
    expect(screen.getByRole('button', { name: '取消收藏 JSON' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('shrimp:favorites')!)).toEqual(['json']);
  });
  it('主题切换写入本地存储并应用 dark class', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'system' }));
    expect(localStorage.getItem('shrimp:theme')).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });
});
