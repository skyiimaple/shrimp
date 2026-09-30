import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JevTool } from './jev-tool';

describe('Jev 调用试炼场', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('首次打开要求密钥，保存后再次打开直接进入试炼场', async () => {
    const user = userEvent.setup();
    const view = render(<JevTool />);
    expect(screen.getByLabelText('TypeSafe API Key')).toHaveAttribute('type', 'password');
    expect(screen.queryByRole('button', { name: '调用 Jev' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('TypeSafe API Key'), 'test-key');
    await user.click(screen.getByRole('button', { name: '保存密钥' }));
    expect(screen.getByRole('button', { name: '调用 Jev' })).toBeInTheDocument();
    expect(localStorage.getItem('shrimp:jev-api-key')).toBe('test-key');
    view.unmount();
    render(<JevTool />);
    expect(screen.getByRole('button', { name: '调用 Jev' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清除密钥' }));
    expect(localStorage.getItem('shrimp:jev-api-key')).toBeNull();
    expect(screen.getByLabelText('TypeSafe API Key')).toBeInTheDocument();
  });

  it('可编辑多类问题并预览无密钥的请求', async () => {
    localStorage.setItem('shrimp:jev-api-key', 'secret-key');
    const user = userEvent.setup();
    render(<JevTool />);
    expect(screen.queryByLabelText('请求 JSON 预览')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '添加 Choice 问题' }));
    await user.click(screen.getByRole('button', { name: '添加 Score 问题' }));
    await user.click(screen.getByRole('button', { name: '展开请求 JSON 预览' }));
    const preview = (screen.getByLabelText('请求 JSON 预览') as HTMLTextAreaElement).value;
    expect(preview).toContain('"type": "choice"');
    expect(preview).toContain('"type": "score"');
    expect(preview).not.toContain('secret-key');
  });

  it('表单编辑问题后同步到预览，高级 JSON 可切换回来', async () => {
    localStorage.setItem('shrimp:jev-api-key', 'secret-key');
    const user = userEvent.setup();
    render(<JevTool />);
    expect(screen.queryByLabelText('问题 JSON')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('问题 ID 1'));
    await user.type(screen.getByLabelText('问题 ID 1'), 'needs_reply');
    await user.clear(screen.getByLabelText('问题指令 1'));
    await user.type(screen.getByLabelText('问题指令 1'), '是否需要回复？');
    await user.click(screen.getByRole('button', { name: '展开请求 JSON 预览' }));
    expect((screen.getByLabelText('请求 JSON 预览') as HTMLTextAreaElement).value).toContain(
      '"needs_reply"',
    );
    await user.click(screen.getByRole('button', { name: '高级：编辑 JSON' }));
    expect((screen.getByLabelText('问题 JSON') as HTMLTextAreaElement).value).toContain(
      '"needs_reply"',
    );
    await user.click(screen.getByRole('button', { name: '返回表单编辑' }));
    expect(screen.getByLabelText('问题 ID 1')).toHaveValue('needs_reply');
  });

  it('Choice 选项可以逐项编辑并进入请求预览', async () => {
    localStorage.setItem('shrimp:jev-api-key', 'secret-key');
    const user = userEvent.setup();
    render(<JevTool />);
    await user.click(screen.getByRole('button', { name: '添加 Choice 问题' }));
    await user.clear(screen.getByLabelText('选项 ID 2-1'));
    await user.type(screen.getByLabelText('选项 ID 2-1'), 'support');
    await user.clear(screen.getByLabelText('选项说明 2-1'));
    await user.type(screen.getByLabelText('选项说明 2-1'), '技术支持');
    await user.click(screen.getByRole('button', { name: '展开请求 JSON 预览' }));
    const preview = (screen.getByLabelText('请求 JSON 预览') as HTMLTextAreaElement).value;
    expect(preview).toContain('"support": "技术支持"');
  });

  it('高级 JSON 中无法表单表达的字段不会在切换时丢失', async () => {
    localStorage.setItem('shrimp:jev-api-key', 'secret-key');
    const user = userEvent.setup();
    render(<JevTool />);
    await user.click(screen.getByRole('button', { name: '高级：编辑 JSON' }));
    const json = screen.getByLabelText('问题 JSON');
    fireEvent.change(json, {
      target: { value: '{"urgent":{"type":"noul","instructions":"x","extra":true}}' },
    });
    await user.click(screen.getByRole('button', { name: '返回表单编辑' }));
    expect(screen.getByLabelText('问题 JSON')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('表单无法编辑');
  });

  it('展示答案、概率、置信度、用量和原始响应', async () => {
    localStorage.setItem('shrimp:jev-api-key', 'secret-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          model: 'jev-1.13.0',
          answers: {
            urgent: { type: 'noul', noul: 0.95 },
            team: {
              type: 'choice',
              choice: 'support',
              confidence: 0.82,
              probabilities: { support: 0.9, sales: 0.1 },
            },
          },
          usage: { input_tokens: 20, output_tokens: 8 },
        }),
        { status: 200 },
      ),
    );
    const user = userEvent.setup();
    render(<JevTool />);
    await user.click(screen.getByRole('button', { name: '调用 Jev' }));
    expect(await screen.findByText('95%')).toBeInTheDocument();
    expect(screen.getAllByText('support')).toHaveLength(2);
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText(/输入 20/)).toBeInTheDocument();
    expect((screen.getByLabelText('原始响应 JSON') as HTMLTextAreaElement).value).toContain(
      'jev-1.13.0',
    );
  });

  it('无效问题在本地阻止发送并给出中文错误', async () => {
    localStorage.setItem('shrimp:jev-api-key', 'secret-key');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    render(<JevTool />);
    await user.click(screen.getByRole('button', { name: '高级：编辑 JSON' }));
    await user.clear(screen.getByLabelText('问题 JSON'));
    await user.type(screen.getByLabelText('问题 JSON'), 'bad');
    await user.click(screen.getByRole('button', { name: '调用 Jev' }));
    expect(screen.getByRole('alert')).toHaveTextContent('问题 JSON 格式无效');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
