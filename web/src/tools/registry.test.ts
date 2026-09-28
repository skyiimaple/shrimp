import { describe, expect, it } from 'vitest'
import { groupToolsByCategory, searchTools, tools } from './registry'

describe('工具注册表', () => {
  it('slug 与路径唯一并保持对应', () => {
    expect(new Set(tools.map((tool) => tool.slug)).size).toBe(10)
    expect(new Set(tools.map((tool) => tool.path)).size).toBe(10)
    expect(tools.every((tool) => tool.path === `/tools/${tool.slug}`)).toBe(true)
  })
  it('按名称、关键词、分类和简介检索', () => {
    expect(searchTools('令牌').map((tool) => tool.slug)).toContain('jwt')
    expect(searchTools('编码转换').map((tool) => tool.slug)).toEqual(expect.arrayContaining(['base64', 'jwt']))
    expect(searchTools('周报').map((tool) => tool.slug)).toContain('weekly-report')
  })
  it('按注册顺序分组', () => {
    expect(groupToolsByCategory(tools).get('网络工具')?.[0].slug).toBe('http')
  })
})
