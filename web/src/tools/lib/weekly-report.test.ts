import { describe, expect, it } from 'vitest';
import { generateWeeklyReport, parseWeeklyRows } from './weekly-report';

const zhang =
  'CRM\t1.2.0\t2026-09-30\t订单\t完成开票页\t张三\t2\t1.5\t100%\t已完成\t降低开票耗时\t已上线';
const li = 'CRM\t1.2.0\t2026-09-30\t客户\t优化客户列表\t李四\t3\t1\t50%\t进行中\t提升查询效率\t';
const wang = 'CRM\t1.2.0\t2026-09-30\t结算\t重构结算页\t王五\t8\t4\t25%\t进行中\t减少维护成本\t';

describe('周报数据解析', () => {
  it('解析 11 个必填列和可选备注列', () => {
    expect(parseWeeklyRows(`${zhang}\n${li}`)).toMatchObject({
      ok: true,
      value: [
        { product: 'CRM', task: '完成开票页', person: '张三', remark: '已上线' },
        { product: 'CRM', task: '优化客户列表', person: '李四', remark: '' },
      ],
    });
  });

  it('报告缺失必填列所在的行和字段', () => {
    expect(parseWeeklyRows('CRM\t1.2.0')).toEqual({
      ok: false,
      error:
        '第 1 行缺少必填字段：发布日期、涉及模块、任务名称、负责人、预计消耗时间、已投入时间、进度、状态、预计产出',
    });
    expect(parseWeeklyRows('\nCRM\t1.2.0')).toEqual({
      ok: false,
      error:
        '第 2 行缺少必填字段：发布日期、涉及模块、任务名称、负责人、预计消耗时间、已投入时间、进度、状态、预计产出',
    });
  });

  it('拒绝非法人天和超范围进度', () => {
    expect(parseWeeklyRows(zhang.replace('\t2\t1.5\t100%', '\t两天\t1.5\t100%'))).toEqual({
      ok: false,
      error: '第 1 行“预计消耗时间”必须是非负数字',
    });
    expect(parseWeeklyRows(zhang.replace('\t100%\t', '\t120%\t'))).toEqual({
      ok: false,
      error: '第 1 行“进度”必须是 0 到 100 的百分比',
    });
  });
});

describe('周报生成', () => {
  it('负责人只做完整姓名精确匹配', () => {
    const parsed = parseWeeklyRows(zhang);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(generateWeeklyReport(parsed.value, ['CRM'], ['张'])).toEqual({
      ok: false,
      error: '未找到负责人完全匹配的成员：张',
    });
    const exact = generateWeeklyReport(parsed.value, ['CRM'], ['张三']);
    expect(exact.ok).toBe(true);
    if (exact.ok) expect(exact.value).toContain('完成开票页：已完成（100%）');
  });

  it('多人时生成团队汇总和每位成员周报', () => {
    const parsed = parseWeeklyRows(`${zhang}\n${li}\n${wang}`);
    if (!parsed.ok) throw new Error(parsed.error);
    const result = generateWeeklyReport(parsed.value, ['CRM'], ['张三', '李四']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toContain('业财前端部：');
    expect(result.value).toContain('CRM（慧算账运营平台）：');
    expect(result.value).toContain(
      '- v1.2.0（2026-09-30）：订单、客户（已完成（75%），预计 5 人天，已投入 2.5 人天）',
    );
    expect(result.value).toContain(
      '完成开票页：已完成（100%），ROI：预计 2 人天，已投入 1.5 人天，预计产出：降低开票耗时 // 已上线',
    );
    expect(result.value).toContain('\n张三：\n');
    expect(result.value).toContain('\n李四：\n');
    expect(result.value).not.toContain('重构结算页');
  });

  it('要求至少选择一个产品和成员', () => {
    expect(generateWeeklyReport([], [], ['张三'])).toEqual({ ok: false, error: '请选择产品项目' });
    expect(generateWeeklyReport([], ['CRM'], [])).toEqual({
      ok: false,
      error: '请添加并选择团队成员',
    });
  });
});
