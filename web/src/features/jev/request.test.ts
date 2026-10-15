import { readJevImages } from './images';
import { describe, expect, it } from 'vitest';
import { buildJevRequest } from './request';

describe('Jev 请求编辑', () => {
  it('支持文本 state 和多个问题，不把 API Key 写入预览', () => {
    const result = buildJevRequest(
      'ticket',
      '文本',
      '{"urgent":{"type":"noul","instructions":"Urgent?"},"team":{"type":"choice","instructions":"Team?","criteria":{"sales":null,"support":null}}}',
    );
    expect(result).toEqual({
      ok: true,
      value: {
        model: 'jev-latest',
        state: 'ticket',
        questions: {
          urgent: { type: 'noul', instructions: 'Urgent?' },
          team: { type: 'choice', instructions: 'Team?', criteria: { sales: null, support: null } },
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain('apiKey');
  });

  it('JSON state 必须有效，问题类型与评分等级须有效', () => {
    expect(buildJevRequest('{', 'JSON', '{"a":{"type":"noul","instructions":"x"}}')).toMatchObject({
      ok: false,
    });
    expect(
      buildJevRequest('x', '文本', '{"a":{"type":"score","instructions":"x","criteria":["low"]}}'),
    ).toMatchObject({ ok: false });
    expect(buildJevRequest('x', '文本', '{"a":{"type":"other","instructions":"x"}}')).toMatchObject(
      { ok: false },
    );
  });
});

it('图片进入 assets 并自动加入 state 引用', () => {
  const image = {
    id: 'image-uuid',
    name: 'cat.png',
    asset: { type: 'image' as const, format: 'png' as const, data_base64: 'iVBORw0KGgo=' },
  };
  expect(
    buildJevRequest('{"ticket":1}', 'JSON', '{"a":{"type":"noul","instructions":"cat?"}}', [image]),
  ).toMatchObject({
    ok: true,
    value: {
      state: { content: { ticket: 1 }, images: [{ name: 'cat.png', image: 'image-uuid' }] },
      assets: { 'image-uuid': image.asset },
    },
  });
});
it('超出请求总大小时本地拒绝', () => {
  expect(
    buildJevRequest('x'.repeat(262144), '文本', '{"a":{"type":"noul","instructions":"x"}}'),
  ).toMatchObject({ ok: false });
});

const png = () =>
  new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'cat.png', { type: 'image/png' });
describe('Jev 图片读取边界', () => {
  it('生成 UUID、裸 base64 并识别 PNG/JPEG，不使用文件名作引用', async () => {
    const images = await readJevImages(
      [png(), new File([new Uint8Array([255, 216, 255, 224])], 'cat.png', { type: 'image/jpeg' })],
      [],
    );
    expect(images[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(images[0].id).not.toBe(images[1].id);
    expect(images[0].asset).toEqual({ type: 'image', format: 'png', data_base64: 'iVBORw0KGgo=' });
    expect(images[1].asset.format).toBe('jpg');
  });
  it('拒绝其他格式、伪装图片、空文件及超大文件', async () => {
    for (const file of [
      new File(['x'], 'x.gif', { type: 'image/gif' }),
      new File(['fake'], 'x.png', { type: 'image/png' }),
      new File([], 'x.png', { type: 'image/png' }),
      new File([new Uint8Array(65537)], 'x.png', { type: 'image/png' }),
    ]) {
      await expect(readJevImages([file], [])).rejects.toThrow();
    }
  });
  it('添加时合并已选图片的数量和大小限制', async () => {
    const existing = await readJevImages([png(), png(), png(), png()], []);
    await expect(readJevImages([png()], existing)).rejects.toThrow('最多');
    const bytes = new Uint8Array(65536);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    const large = new File([bytes], 'large.png', { type: 'image/png' });
    const full = await readJevImages([large, large], []);
    await expect(readJevImages([png()], full)).rejects.toThrow('总大小');
  });
});
