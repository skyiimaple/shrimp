import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GithubLookupTool,
  NpmLookupTool,
  RdapLookupTool,
  HttpHeadersTool,
} from './public-lookup-tool-panels';
afterEach(() => vi.unstubAllGlobals());
describe('public lookup cards', () => {
  it.each([
    [GithubLookupTool, '仓库', 'octocat/Hello-World', 'github'],
    [NpmLookupTool, '包名', 'react', 'npm'],
    [RdapLookupTool, '域名', 'example.com', 'rdap'],
    [HttpHeadersTool, '网址', 'https://example.com', 'headers'],
  ] as const)(
    'queries only after submission and clears stale results for %s',
    async (Component, label, input, mode) => {
      const fetcher = vi.fn(async (url: string) => {
        expect(url).toContain(`mode=${mode}`);
        return new Response(JSON.stringify({ version: 'test-result' }));
      });
      vi.stubGlobal('fetch', fetcher);
      render(<Component />);
      expect(fetcher).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText(label), { target: { value: input } });
      fireEvent.click(screen.getByRole('button', { name: '查询' }));
      expect(await screen.findByText('test-result')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(label), { target: { value: input + 'x' } });
      expect(screen.queryByText('test-result')).not.toBeInTheDocument();
    },
  );
  it('shows a rate limit error without rendering a result', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response(JSON.stringify({ message: '查询服务限流' }), { status: 429 }),
    );
    render(<GithubLookupTool />);
    fireEvent.change(screen.getByLabelText('仓库'), { target: { value: 'a/b' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByText('查询服务限流')).toBeInTheDocument();
  });
});
