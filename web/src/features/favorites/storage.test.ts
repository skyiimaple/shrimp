import { beforeEach, describe, expect, it } from 'vitest';
import { readFavorites, writeFavorites } from './storage';

describe('收藏存储', () => {
  beforeEach(() => localStorage.clear());
  it('损坏数据返回空数组', () => {
    localStorage.setItem('shrimp:favorites', '{bad');
    expect(readFavorites(new Set(['json']))).toEqual([]);
  });
  it('过滤已不存在的工具与重复项', () => {
    localStorage.setItem('shrimp:favorites', JSON.stringify(['json', 'removed', 'json']));
    expect(readFavorites(new Set(['json']))).toEqual(['json']);
  });
  it('持久化收藏', () => {
    writeFavorites(['jwt']);
    expect(JSON.parse(localStorage.getItem('shrimp:favorites')!)).toEqual(['jwt']);
  });
});
