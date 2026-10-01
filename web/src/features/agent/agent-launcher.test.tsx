import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AgentLauncher } from './agent-launcher';

describe('global Agent entry', () => {
  it('opens and closes the dialog without routing away', async () => {
    const user = userEvent.setup();
    render(<AgentLauncher />);
    await user.click(screen.getByRole('button', { name: '打开 Agent 聊天' }));
    expect(screen.getByRole('dialog', { name: 'Agent 聊天' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Agent 聊天' }).parentElement).toBe(document.body);
    expect(screen.getByRole('dialog', { name: 'Agent 聊天' })).toContainElement(
      document.activeElement as HTMLElement,
    );
    await user.click(screen.getByRole('button', { name: '关闭聊天' }));
    expect(screen.queryByRole('dialog', { name: 'Agent 聊天' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '打开 Agent 聊天' })).toHaveFocus(),
    );
  });

  it('returns focus to the launcher after Escape closes the dialog', async () => {
    const user = userEvent.setup();
    render(<AgentLauncher />);
    const launcher = screen.getByRole('button', { name: '打开 Agent 聊天' });
    await user.click(launcher);
    expect(screen.getByRole('dialog', { name: 'Agent 聊天' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Agent 聊天' })).toBeNull());
    await waitFor(() => expect(launcher).toHaveFocus());
  });
});
