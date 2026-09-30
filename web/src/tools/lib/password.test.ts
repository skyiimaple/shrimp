import { describe, expect, it, vi } from 'vitest';
import { analyzePassword, generatePassword } from './password';

describe('密码生成与强度', () => {
  it('使用安全随机源并包含所有选定字符类别', () => {
    const random = vi.spyOn(crypto, 'getRandomValues');
    const result = generatePassword({
      length: 24,
      lower: true,
      upper: true,
      digits: true,
      symbols: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(24);
      expect(result.value).toMatch(/[a-z]/);
      expect(result.value).toMatch(/[A-Z]/);
      expect(result.value).toMatch(/[0-9]/);
      expect(result.value).toMatch(/[^a-zA-Z0-9]/);
    }
    expect(random).toHaveBeenCalled();
    random.mockRestore();
  });
  it('拒绝无字符类别和越界长度', () => {
    expect(
      generatePassword({ length: 12, lower: false, upper: false, digits: false, symbols: false }),
    ).toMatchObject({ ok: false });
    expect(
      generatePassword({ length: 3, lower: true, upper: true, digits: true, symbols: true }),
    ).toMatchObject({ ok: false });
    expect(
      generatePassword({ length: 129, lower: true, upper: false, digits: false, symbols: false }),
    ).toMatchObject({ ok: false });
  });
  it('弱密码和长随机式密码给出不同中文建议', () => {
    expect(analyzePassword('password123').level).toBe('弱');
    expect(analyzePassword('A9!q7$Lm2@Pz8#Xv').level).toBe('强');
    expect(analyzePassword('abc').feedback.length).toBeGreaterThan(0);
  });
});
