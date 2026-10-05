import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as httpClient from '../../features/http/client';
import { Base64Tool, HashTool, HttpTool, JsonTool, JwtTool } from './tool-panels';

afterEach(() => vi.restoreAllMocks());

describe('哈希工具', () => {
  it('切换算法时清除旧摘要，避免用新标签展示旧算法结果', async () => {
    const user = userEvent.setup();
    render(<HashTool />);
    await user.type(screen.getAllByRole('textbox')[0], 'abc');
    await user.click(screen.getByRole('button', { name: '计算哈希' }));
    expect(
      await screen.findByDisplayValue(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: '哈希算法' }));
    await user.click(screen.getByRole('option', { name: 'SHA-512' }));
    expect(screen.getByLabelText('SHA-512 摘要')).toHaveValue('');
  });
});

describe('编码工具界面', () => {
  it('格式化 JSON 并展示输出', async () => {
    const user = userEvent.setup();
    render(<JsonTool />);
    await user.click(screen.getByRole('button', { name: '格式化' }));
    expect(screen.getByLabelText('输出结果')).toHaveValue(
      '{\n  "name": "Shrimp",\n  "ready": true\n}',
    );
  });
  it('编码中文 Base64', async () => {
    const user = userEvent.setup();
    render(<Base64Tool />);
    await user.click(screen.getByRole('button', { name: '编码' }));
    expect(screen.getByLabelText('输出结果')).toHaveValue('6Jm+57Gz5bel5YW3566x');
  });
  it('JWT 始终展示不验证签名提示并解码', async () => {
    const user = userEvent.setup();
    render(<JwtTool />);
    expect(screen.getByText(/不验证签名/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('JWT'), 'eyJhbGciOiJub25lIn0.eyJzdWIiOiLmtYvor5UifQ.');
    await user.click(screen.getByRole('button', { name: '解码令牌' }));
    expect((screen.getByLabelText('Header / Payload') as HTMLTextAreaElement).value).toContain(
      '"sub": "测试"',
    );
  });
});

describe('HTTP 工具界面', () => {
  it('把方法、请求头和 Body 交给本地代理客户端', async () => {
    vi.spyOn(httpClient, 'getHttpProxyStatus').mockResolvedValue({
      available: true,
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      timeoutMs: 10000,
      maxResponseBytes: 2097152,
      maxRedirects: 5,
    });
    const send = vi.spyOn(httpClient, 'sendHttpRequest').mockResolvedValue({
      status: 201,
      headers: {},
      body: 'ok',
      bodyEncoding: 'text',
      durationMs: 8,
    });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <HttpTool />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/本地代理已连接/)).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: '方法' }));
    await user.click(screen.getByRole('option', { name: 'POST' }));
    await user.clear(screen.getByLabelText('请求 URL'));
    await user.type(screen.getByLabelText('请求 URL'), 'https://example.com/api');
    await user.clear(screen.getByLabelText('请求头名称'));
    await user.type(screen.getByLabelText('请求头名称'), 'Content-Type');
    await user.clear(screen.getByLabelText('请求头值'));
    await user.type(screen.getByLabelText('请求头值'), 'application/json');
    fireEvent.change(screen.getByLabelText('请求 Body'), { target: { value: '{"ok":true}' } });
    await user.click(screen.getByRole('button', { name: /发送请求/ }));
    expect(await screen.findByText('HTTP 201')).toBeInTheDocument();
    expect(send).toHaveBeenCalledWith({
      url: 'https://example.com/api',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"ok":true}',
    });
  });

  it('代理离线时提示并允许重新检测', async () => {
    const status = vi
      .spyOn(httpClient, 'getHttpProxyStatus')
      .mockRejectedValueOnce(new Error('无法连接本地代理服务'))
      .mockResolvedValueOnce({
        available: true,
        allowedMethods: ['GET'],
        timeoutMs: 2500,
        maxResponseBytes: 4096,
        maxRedirects: 2,
      });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <HttpTool />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/本地代理未连接/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重新检测' }));
    expect(await screen.findByText(/本地代理已连接/)).toBeInTheDocument();
    expect(status).toHaveBeenCalledTimes(2);
  });
});
