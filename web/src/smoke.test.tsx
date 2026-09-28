import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './app'

describe('App', () => {
  it('显示中文产品名', async () => {
    render(<App />)
    expect(await screen.findByText('Shrimp 工具箱')).toBeInTheDocument()
  })
})
