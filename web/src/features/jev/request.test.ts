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
