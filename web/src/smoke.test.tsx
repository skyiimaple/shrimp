import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './app'

describe('App', () => {
  it('显示中文产品名', async () => {
    render(<App />)
    expect(await screen.findByText('Shrimp 工具箱')).toBeInTheDocument()
  })

  it('把搜索放在顶部栏，并用分类标签筛选工具', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByRole('heading', { name: '把零散的小工具，收进一个清爽工作台。' })).toBeInTheDocument()
    expect(screen.queryByText(/个日常开发工具/)).not.toBeInTheDocument()
    expect(screen.getByText(/转换、检查、生成和调试都在这里/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '全部' })).toHaveAttribute('aria-checked', 'true')
    expect(within(screen.getByRole('banner')).getByRole('textbox', { name: '搜索工具' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'JSON' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'HTTP 请求' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '网络工具' }))
    expect(screen.getByRole('radio', { name: '网络工具' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('heading', { name: 'HTTP 请求' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'JSON' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '全部' }))
    expect(screen.getByRole('heading', { name: 'JSON' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: '搜索工具' }), '周报')
    expect(screen.getByRole('heading', { name: '周报生成' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'JSON' })).not.toBeInTheDocument()
  })
})
