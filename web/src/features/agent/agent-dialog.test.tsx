import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentDialog } from './agent-dialog';
import * as storage from './storage';
import { appendMessage, clearMessages, readSettings, writeSettings } from './storage';

describe('Agent dialog', () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(async () => {
    localStorage.clear();
    await clearMessages();
  });

  it('presents a general chat welcome with a compact model switcher', async () => {
    render(<AgentDialog onClose={() => {}} />);
    expect(await screen.findByText(/任何问题/)).toBeInTheDocument();
    const switcher = screen.getByRole('combobox', { name: '模型服务商' });
    expect(switcher.tagName).toBe('BUTTON');
    expect(switcher.closest('header')).not.toBeNull();
    expect(screen.queryByText('单一会话')).not.toBeInTheDocument();
    expect(screen.queryByText('deepseek-chat')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: '消息输入区' })).toBeInTheDocument();
  });

  it('does not use the heavy form focus ring on the header model switcher', () => {
    render(<AgentDialog onClose={() => {}} />);
    const switcher = screen.getByLabelText('模型服务商');
    expect(switcher.tagName).toBe('BUTTON');
    expect(switcher.className).not.toMatch(/(?:^|\s)focus:ring-2(?:\s|$)/);
  });

  it('shows one transcript and does not allow sending without the selected key', async () => {
    await appendMessage({
      id: 'm1',
      role: 'user',
      content: '之前的问题',
      createdAt: 1,
      status: 'complete',
    });
    render(<AgentDialog onClose={() => {}} />);
    expect((await screen.findByText('之前的问题')).closest('article')).toHaveTextContent(
      /^之前的问题$/,
    );
    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled();
    expect(screen.getByText(/本地保存/)).toBeInTheDocument();
  });

  it('saves the GLM key separately and closes without clearing transcript', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(<AgentDialog onClose={close} />);
    await user.click(screen.getByRole('combobox', { name: '模型服务商' }));
    await user.click(screen.getByRole('option', { name: 'GLM' }));
    await user.click(screen.getByRole('button', { name: '设置 API Key' }));
    await user.type(screen.getByLabelText('当前服务商 API Key'), 'glm-secret');
    await user.click(screen.getByRole('button', { name: '保存 Key' }));
    expect(readSettings().keys).toEqual({ deepseek: '', glm: 'glm-secret' });
    await user.click(screen.getByRole('button', { name: '关闭聊天' }));
    expect(close).toHaveBeenCalledOnce();
  });

  it('requires confirmation to clear history but keeps API keys', async () => {
    const user = userEvent.setup();
    writeSettings({
      provider: 'deepseek',
      models: { deepseek: 'deepseek-chat', glm: 'glm-4.5' },
      keys: { deepseek: 'secret', glm: '' },
    });
    await appendMessage({
      id: 'm2',
      role: 'user',
      content: '要删除的消息',
      createdAt: 2,
      status: 'complete',
    });
    render(<AgentDialog onClose={() => {}} />);
    expect(await screen.findByText('要删除的消息')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清空聊天记录' }));
    expect(screen.getByText('要删除的消息')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认清空' }));
    await waitFor(() => expect(screen.queryByText('要删除的消息')).not.toBeInTheDocument());
    expect(readSettings().keys.deepseek).toBe('secret');
  });

  it('blocks further sends when local history cannot be saved', async () => {
    const user = userEvent.setup();
    writeSettings({
      provider: 'deepseek',
      models: { deepseek: 'deepseek-chat', glm: 'glm-4.5' },
      keys: { deepseek: 'test-key', glm: '' },
    });
    vi.spyOn(storage, 'appendMessage').mockRejectedValue(new Error('disk full'));
    render(<AgentDialog onClose={() => {}} />);
    const input = screen.getByLabelText('聊天输入');
    await waitFor(() => expect(input).toBeEnabled());
    await user.type(input, '你好');
    await waitFor(() => expect(screen.getByRole('button', { name: '发送' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('聊天记录保存失败');
    await user.type(screen.getByLabelText('聊天输入'), '下一条');
    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled();
    await user.click(screen.getByRole('combobox', { name: '模型服务商' }));
    await user.click(screen.getByRole('option', { name: 'GLM' }));
    expect(screen.getByRole('alert')).toHaveTextContent('聊天记录保存失败');
  });

  it('discards an unsaved key draft when switching providers', async () => {
    const user = userEvent.setup();
    render(<AgentDialog onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: '设置 API Key' }));
    await user.type(screen.getByLabelText('当前服务商 API Key'), 'deepseek-draft');
    await user.click(screen.getByRole('combobox', { name: '模型服务商' }));
    await user.click(screen.getByRole('option', { name: 'GLM' }));
    expect(screen.getByLabelText('当前服务商 API Key')).toHaveValue('');
    expect(screen.getByRole('button', { name: '保存 Key' })).toBeDisabled();
  });
});
