import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WeeklyReportTool } from './weekly-report-tool'

const row = 'CRM\t1.2.0\t2026-09-30\t订单\t完成开票页\t张三\t2\t1.5\t100%\t已完成\t降低开票耗时\t已上线'

describe('周报生成工具', () => {
  it('成员初始为空，可手动输入并作为选中的可选项', async () => {
    const user = userEvent.setup()
    render(<WeeklyReportTool />)
    expect(screen.queryByRole('checkbox', { name: '张三' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('成员姓名'), '张三')
    await user.click(screen.getByRole('button', { name: '添加成员' }))
    expect(screen.getByRole('checkbox', { name: '张三' })).toBeChecked()
  })

  it('使用精确匹配的成员生成周报', async () => {
    const user = userEvent.setup()
    render(<WeeklyReportTool />)
    await user.type(screen.getByLabelText('成员姓名'), '张三{Enter}')
    fireEvent.change(screen.getByLabelText('表格数据'), { target: { value: row } })
    await user.click(screen.getByRole('button', { name: '生成周报' }))
    const report = (screen.getByLabelText('周报结果') as HTMLTextAreaElement).value
    expect(report).toContain('张三：')
    expect(report).toContain('完成开票页：已完成（100%）')
  })

  it('未添加成员时显示中文错误', async () => {
    const user = userEvent.setup()
    render(<WeeklyReportTool />)
    fireEvent.change(screen.getByLabelText('表格数据'), { target: { value: row } })
    await user.click(screen.getByRole('button', { name: '生成周报' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请添加并选择团队成员')
  })
})
