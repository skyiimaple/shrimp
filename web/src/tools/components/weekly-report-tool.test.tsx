import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { WeeklyReportTool } from './weekly-report-tool';

const row =
  'CRM\t1.2.0\t2026-09-30\t订单\t完成开票页\t张三\t2\t1.5\t100%\t已完成\t降低开票耗时\t已上线';

describe('周报生成工具', () => {
  beforeEach(() => localStorage.clear());

  it('成员初始为空，可手动输入并作为选中的可选项', async () => {
    const user = userEvent.setup();
    render(<WeeklyReportTool />);
    expect(screen.queryByRole('checkbox', { name: '张三' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('成员姓名'), '张三');
    await user.click(screen.getByRole('button', { name: '添加成员' }));
    expect(screen.queryByRole('checkbox', { name: '张三' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '选择团队成员' }));
    expect(screen.getByRole('checkbox', { name: '张三' })).toBeChecked();
  });

  it('记住已添加的成员，下次打开可直接勾选', async () => {
    const user = userEvent.setup();
    const view = render(<WeeklyReportTool />);
    await user.type(screen.getByLabelText('成员姓名'), '张三{Enter}');
    await user.click(screen.getByRole('button', { name: '重置全部' }));
    await user.click(screen.getByRole('button', { name: '选择团队成员' }));
    expect(screen.getByRole('checkbox', { name: '张三' })).toBeInTheDocument();
    view.unmount();

    const again = render(<WeeklyReportTool />);
    await user.click(screen.getByRole('button', { name: '选择团队成员' }));
    const saved = screen.getByRole('checkbox', { name: '张三' });
    expect(saved).not.toBeChecked();
    await user.click(saved);
    expect(saved).toBeChecked();
    await user.click(screen.getByRole('button', { name: '删除成员 张三' }));
    again.unmount();
    render(<WeeklyReportTool />);
    await user.click(screen.getByRole('button', { name: '选择团队成员' }));
    expect(screen.queryByRole('checkbox', { name: '张三' })).not.toBeInTheDocument();
  });
  it('多选下拉可用 Escape 关闭，并保留选中的成员', async () => {
    const user = userEvent.setup();
    render(<WeeklyReportTool />);
    await user.type(screen.getByLabelText('成员姓名'), '张三{Enter}李四{Enter}');
    const trigger = screen.getByRole('button', { name: '选择团队成员' });
    expect(trigger).toHaveTextContent('张三、李四');
    await user.click(trigger);
    expect(screen.getByRole('checkbox', { name: '张三' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: '李四' }));
    expect(trigger).toHaveTextContent('张三');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('checkbox', { name: '张三' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('使用精确匹配的成员生成周报', async () => {
    const user = userEvent.setup();
    render(<WeeklyReportTool />);
    await user.type(screen.getByLabelText('成员姓名'), '张三{Enter}');
    fireEvent.change(screen.getByLabelText('表格数据'), { target: { value: row } });
    await user.click(screen.getByRole('button', { name: '生成周报' }));
    const report = (screen.getByLabelText('周报结果') as HTMLTextAreaElement).value;
    expect(report).toContain('张三：');
    expect(report).toContain('完成开票页：已完成（100%）');
  });

  it('未添加成员时显示中文错误', async () => {
    const user = userEvent.setup();
    render(<WeeklyReportTool />);
    fireEvent.change(screen.getByLabelText('表格数据'), { target: { value: row } });
    await user.click(screen.getByRole('button', { name: '生成周报' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请添加并选择团队成员');
  });

  it('可添加自定义项目，并与内置项目一起写入周报', async () => {
    const user = userEvent.setup();
    const view = render(<WeeklyReportTool />);
    expect(screen.getByRole('checkbox', { name: 'CRM · 慧算账运营平台' })).toBeChecked();
    expect(screen.queryByRole('button', { name: '删除项目 CRM' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('项目代号'), '  OPS  ');
    await user.type(screen.getByLabelText('项目名称'), '运维平台{Enter}');
    const custom = screen.getByRole('checkbox', { name: 'OPS · 运维平台' });
    expect(custom).toBeChecked();
    expect(screen.getByLabelText('项目代号')).toHaveValue('');
    expect(screen.getByLabelText('项目名称')).toHaveValue('');

    await user.type(screen.getByLabelText('成员姓名'), '张三{Enter}');
    fireEvent.change(screen.getByLabelText('表格数据'), {
      target: {
        value: [
          row,
          'OPS\t1.0.0\t2026-10-16\t监控\t上线告警\t张三\t1\t1\t80%\t进行中\t及时发现故障\t',
        ].join('\n'),
      },
    });
    await user.click(screen.getByRole('button', { name: '生成周报' }));
    const report = () => (screen.getByLabelText('周报结果') as HTMLTextAreaElement).value;
    expect(report()).toContain('CRM（慧算账运营平台）：');
    expect(report()).toContain('OPS（运维平台）：');
    expect(report()).toContain('上线告警：进行中（80%）');

    await user.click(custom);
    expect(custom).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: '生成周报' }));
    expect(report()).not.toContain('上线告警');
    expect(report()).toContain('完成开票页：已完成（100%）');

    await user.click(screen.getByRole('button', { name: '重置全部' }));
    expect(screen.getByRole('checkbox', { name: 'OPS · 运维平台' })).toBeChecked();
    expect(screen.getByLabelText('项目代号')).toHaveValue('');
    view.unmount();

    const saved = render(<WeeklyReportTool />);
    expect(screen.getByRole('checkbox', { name: 'OPS · 运维平台' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '删除项目 OPS' }));
    expect(screen.queryByRole('checkbox', { name: 'OPS · 运维平台' })).not.toBeInTheDocument();
    saved.unmount();
    render(<WeeklyReportTool />);
    expect(screen.queryByRole('checkbox', { name: 'OPS · 运维平台' })).not.toBeInTheDocument();
  });

  it('拒绝空项目和重复代号，并忽略与内置项目冲突的已存数据', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'shrimp:weekly-projects',
      JSON.stringify([
        { key: 'CRM', name: '覆盖内置' },
        { key: 'OPS', name: '运维平台' },
      ]),
    );
    render(<WeeklyReportTool />);
    expect(screen.getAllByRole('checkbox', { name: /CRM/ })).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'CRM · 慧算账运营平台' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'OPS · 运维平台' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: '添加项目' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请填写项目代号和名称');

    await user.type(screen.getByLabelText('项目代号'), 'CRM');
    await user.type(screen.getByLabelText('项目名称'), '另一个名称');
    await user.click(screen.getByRole('button', { name: '添加项目' }));
    expect(screen.getByRole('alert')).toHaveTextContent('项目代号已存在');

    await user.clear(screen.getByLabelText('项目代号'));
    await user.type(screen.getByLabelText('项目代号'), 'OPS');
    await user.click(screen.getByRole('button', { name: '添加项目' }));
    expect(screen.getByRole('alert')).toHaveTextContent('项目代号已存在');
    expect(screen.getAllByRole('checkbox', { name: /OPS/ })).toHaveLength(1);
  });

  it('重新生成失败时清空旧结果，避免复制过期周报', async () => {
    const user = userEvent.setup();
    render(<WeeklyReportTool />);
    await user.type(screen.getByLabelText('成员姓名'), '张三{Enter}');
    fireEvent.change(screen.getByLabelText('表格数据'), { target: { value: row } });
    await user.click(screen.getByRole('button', { name: '生成周报' }));
    expect(screen.getByLabelText('周报结果')).not.toHaveValue('');
    fireEvent.change(screen.getByLabelText('表格数据'), { target: { value: 'CRM\t1.2.0' } });
    await user.click(screen.getByRole('button', { name: '生成周报' }));
    expect(screen.getByLabelText('周报结果')).toHaveValue('');
    expect(screen.queryByRole('button', { name: '复制周报' })).not.toBeInTheDocument();
  });
});
