import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { searchTools, tools } from './registry';

describe('lazy tool panels', () => {
  it('keeps searchable metadata available and renders the selected panel', async () => {
    expect(tools).toHaveLength(91);
    expect(
      tools.every(
        (tool) =>
          Object.getOwnPropertyDescriptor(tool.component, '$$typeof')?.value ===
          Symbol.for('react.lazy'),
      ),
    ).toBe(true);
    const json = searchTools('格式化、压缩并校验 JSON 数据。').find((tool) => tool.slug === 'json');
    expect(json?.name).toBe('JSON');
    expect(json?.component).toHaveProperty('$$typeof', Symbol.for('react.lazy'));

    const JsonPanel = json!.component;
    render(
      <Suspense fallback={<p>加载工具中…</p>}>
        <JsonPanel />
      </Suspense>,
    );
    expect(await screen.findByText('JSON 输入')).toBeInTheDocument();
  });
});
