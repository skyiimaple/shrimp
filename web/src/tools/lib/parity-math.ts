const funcs: Record<string, (n: number) => number> = {
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  abs: Math.abs,
};

export function evaluateMathExpression(input: string): number {
  if (!input.trim() || input.length > 256) throw new Error('请输入不超过 256 个字符的表达式');
  const tokens: string[] = [];
  let rest = input;
  while (rest) {
    const space = /^\s+/.exec(rest);
    if (space) {
      rest = rest.slice(space[0].length);
      continue;
    }
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|^[a-zA-Z]+|^[()+\-*/^]/.exec(rest);
    if (!match) throw new Error('表达式包含不支持的字符');
    tokens.push(match[0]);
    if (tokens.length > 256) throw new Error('表达式过长');
    rest = rest.slice(match[0].length);
  }
  let i = 0;
  let depth = 0;
  const parse = (min = 0): number => {
    if (++depth > 32) throw new Error('表达式嵌套过深');
    try {
      const token = tokens[i++];
      let value: number;
      if (token === '+' || token === '-') value = (token === '-' ? -1 : 1) * parse(3);
      else if (token === '(') {
        value = parse();
        if (tokens[i++] !== ')') throw new Error('括号不匹配');
      } else if (token && Object.hasOwn(funcs, token)) {
        if (tokens[i++] !== '(') throw new Error('函数需要括号');
        const arg = parse();
        if (tokens[i++] !== ')') throw new Error('括号不匹配');
        value = funcs[token](arg);
      } else if (token && /^(?:\d|\.)/.test(token)) value = Number(token);
      else throw new Error('表达式语法错误');
      while (true) {
        const op = tokens[i];
        const precedence =
          op === '+' || op === '-' ? 1 : op === '*' || op === '/' ? 2 : op === '^' ? 4 : 0;
        if (!precedence || precedence < min) break;
        i++;
        const rhs = parse(precedence + (op === '^' ? 0 : 1));
        value =
          op === '+'
            ? value + rhs
            : op === '-'
              ? value - rhs
              : op === '*'
                ? value * rhs
                : op === '/'
                  ? value / rhs
                  : value ** rhs;
        if (!Number.isFinite(value)) throw new Error('结果不是有限数字');
      }
      if (!Number.isFinite(value)) throw new Error('结果不是有限数字');
      return value;
    } finally {
      depth--;
    }
  };
  const result = parse();
  if (i !== tokens.length) throw new Error('表达式语法错误');
  return result;
}

export function calculateEtaSeconds(distanceKm: number, speedKmH: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error('距离必须是非负数字');
  if (!Number.isFinite(speedKmH) || speedKmH <= 0) throw new Error('速度必须大于零');
  const seconds = (distanceKm / speedKmH) * 3600;
  if (!Number.isFinite(seconds)) throw new Error('预计耗时超出范围');
  return seconds;
}

export function formatElapsedTime(milliseconds: number): string {
  const centiseconds = Math.floor(Math.max(0, milliseconds) / 10);
  return `${String(Math.floor(centiseconds / 6000)).padStart(2, '0')}:${String(Math.floor(centiseconds / 100) % 60).padStart(2, '0')}.${String(centiseconds % 100).padStart(2, '0')}`;
}
