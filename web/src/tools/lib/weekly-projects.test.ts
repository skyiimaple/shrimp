import { beforeEach, describe, expect, it } from 'vitest';
import { readWeeklyProjects, writeWeeklyProjects } from './weekly-projects';

describe('自定义周报项目', () => {
  beforeEach(() => localStorage.clear());

  it('忽略损坏数据和空字段，并按代号去重', () => {
    localStorage.setItem(
      'shrimp:weekly-projects',
      JSON.stringify([
        { key: ' OPS ', name: ' 运维平台 ' },
        { key: 'OPS', name: '重复' },
        { key: '', name: '空代号' },
        { key: 'NONAME', name: '   ' },
        { key: 'BAD' },
        'bad',
        null,
      ]),
    );
    expect(readWeeklyProjects()).toEqual([{ key: 'OPS', name: '运维平台' }]);
  });

  it('写入时整理项目', () => {
    writeWeeklyProjects([
      { key: ' A ', name: ' 甲 ' },
      { key: 'A', name: '乙' },
    ]);
    expect(JSON.parse(localStorage.getItem('shrimp:weekly-projects') ?? '[]')).toEqual([
      { key: 'A', name: '甲' },
    ]);
    expect(readWeeklyProjects()).toEqual([{ key: 'A', name: '甲' }]);
  });

  it('存储损坏或不是列表时返回空列表', () => {
    localStorage.setItem('shrimp:weekly-projects', '{');
    expect(readWeeklyProjects()).toEqual([]);
    localStorage.setItem('shrimp:weekly-projects', '"nope"');
    expect(readWeeklyProjects()).toEqual([]);
  });
});
