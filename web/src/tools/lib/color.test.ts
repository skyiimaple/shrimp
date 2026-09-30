import { describe, expect, it } from 'vitest';
import { convertColor } from './color';

describe('颜色转换', () => {
  it('把短 HEX 转换为 RGB 与 HSL', () => {
    expect(convertColor('#f00')).toEqual({
      ok: true,
      value: { hex: '#FF0000', rgb: 'rgb(255, 0, 0)', hsl: 'hsl(0, 100%, 50%)' },
    });
  });
  it('把 RGB 与 HSL 转换为标准 HEX', () => {
    expect(convertColor('rgb(0, 128, 255)')).toMatchObject({ ok: true, value: { hex: '#0080FF' } });
    expect(convertColor('hsl(120, 100%, 50%)')).toMatchObject({
      ok: true,
      value: { hex: '#00FF00' },
    });
  });
  it('拒绝越界与非法输入', () => {
    expect(convertColor('rgb(256, 0, 0)')).toMatchObject({ ok: false });
    expect(convertColor('hsl(400, 50%, 50%)')).toMatchObject({ ok: false });
    expect(convertColor('#xyz')).toMatchObject({ ok: false });
  });
});
