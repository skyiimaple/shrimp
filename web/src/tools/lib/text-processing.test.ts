import { describe, expect, it } from 'vitest';
import { convertTextCase, processList } from './text-processing';

describe('文本大小写转换', () => {
  it.each([
    ['camel', 'helloWorld'],
    ['pascal', 'HelloWorld'],
    ['snake', 'hello_world'],
    ['kebab', 'hello-world'],
    ['title', 'Hello World'],
    ['upper', 'HELLO WORLD'],
    ['lower', 'hello world'],
  ] as const)('转换为 %s', (mode, expected) => {
    expect(convertTextCase('  hello_world  ', mode)).toBe(expected);
  });

  it('识别 camelCase、缩写和数字边界', () => {
    expect(convertTextCase('parseHTTPResponse2XX', 'snake')).toBe('parse_http_response_2_xx');
  });
});

describe('列表处理', () => {
  it('按行清理、去重并排序', () => {
    expect(
      processList(' banana \napple\nbanana\n\npear', { deduplicate: true, sort: 'asc' }),
    ).toEqual({
      lines: ['apple', 'banana', 'pear'],
      output: 'apple\nbanana\npear',
      inputCount: 5,
      outputCount: 3,
      duplicateCount: 1,
      emptyCount: 1,
    });
  });

  it('可保留重复项并按降序排序', () => {
    expect(processList('b\na\nb', { deduplicate: false, sort: 'desc' }).output).toBe('b\nb\na');
  });
});
