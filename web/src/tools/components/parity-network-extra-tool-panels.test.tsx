import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Ipv4RangeTool, Ipv6UlaTool } from './parity-network-extra-tool-panels';

describe('网络扩展卡片', () => {
  it('IPv4 范围生成 CIDR 列表', async () => {
    const user = userEvent.setup();
    render(<Ipv4RangeTool />);
    fireEvent.change(screen.getByLabelText('起始 IPv4'), { target: { value: '192.168.1.10' } });
    fireEvent.change(screen.getByLabelText('结束 IPv4'), { target: { value: '192.168.1.20' } });
    await user.click(screen.getByRole('button', { name: '展开范围' }));
    expect((screen.getByLabelText('CIDR 列表') as HTMLTextAreaElement).value).toContain(
      '192.168.1.16/30',
    );
  });

  it('IPv6 ULA 生成可复制前缀', async () => {
    const user = userEvent.setup();
    render(<Ipv6UlaTool />);
    await user.click(screen.getByRole('button', { name: '生成 ULA 前缀' }));
    expect((screen.getByLabelText('ULA 前缀') as HTMLTextAreaElement).value).toMatch(
      /^fd[0-9a-f]{2}:/,
    );
  });
});
