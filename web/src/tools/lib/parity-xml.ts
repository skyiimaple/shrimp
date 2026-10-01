import { failure, type Result } from './result';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
const xmlName = /^[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?$/;

function parseXml(input: string): Result<Document> {
  if (!input.trim()) return failure('请输入 XML');
  // Reject DTDs before parsing, including external entity declarations.
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(input)) return failure('不支持 DTD 或实体声明');
  const document = new DOMParser().parseFromString(input, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) return failure('XML 格式无效');
  return { ok: true, value: document };
}

function escapeText(value: string): string {
  if (
    Array.from(value).some((character) => {
      const point = character.codePointAt(0)!;
      return (
        (point < 32 && point !== 9 && point !== 10 && point !== 13) ||
        point === 0xfffe ||
        point === 0xffff
      );
    })
  )
    throw new Error('包含 XML 不支持的字符');
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeText(value)
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#9;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;');
}

function formatElement(element: Element, depth: number): string {
  const pad = '  '.repeat(depth);
  const attributes = Array.from(element.attributes)
    .map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`)
    .join('');
  const opening = `<${element.tagName}${attributes}`;
  const children = Array.from(element.childNodes).filter(
    (node) => node.nodeType !== Node.TEXT_NODE || !!node.textContent?.trim(),
  );
  if (!children.length) return `${pad}${opening}/>`;
  const elementChildren = children.filter((node) => node.nodeType === Node.ELEMENT_NODE);
  if (
    children.every(
      (node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE,
    )
  )
    return `${pad}${opening}>${children.map((node) => (node.nodeType === Node.CDATA_SECTION_NODE ? `<![CDATA[${node.textContent ?? ''}]]>` : escapeText(node.textContent ?? ''))).join('')}</${element.tagName}>`;
  // Indenting mixed content would change its text; serialize it unchanged.
  if (
    elementChildren.length &&
    children.some(
      (node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE,
    )
  )
    return `${pad}${new XMLSerializer().serializeToString(element)}`;
  const body = children
    .map((node) =>
      node.nodeType === Node.ELEMENT_NODE
        ? formatElement(node as Element, depth + 1)
        : `${'  '.repeat(depth + 1)}${new XMLSerializer().serializeToString(node)}`,
    )
    .join('\n');
  return `${pad}${opening}>\n${body}\n${pad}</${element.tagName}>`;
}

export function validateXml(input: string): Result<string> {
  const parsed = parseXml(input);
  return parsed.ok ? { ok: true, value: 'XML 格式有效' } : parsed;
}

export function formatXml(input: string): Result<string> {
  const parsed = parseXml(input);
  if (!parsed.ok) return parsed;
  try {
    const declaration = input.trimStart().match(/^<\?xml\s[^?]*\?>/i)?.[0];
    const body = Array.from(parsed.value.childNodes)
      .filter((node) => node.nodeType !== Node.DOCUMENT_TYPE_NODE)
      .map((node) =>
        node.nodeType === Node.ELEMENT_NODE
          ? formatElement(node as Element, 0)
          : new XMLSerializer().serializeToString(node),
      )
      .join('\n');
    return { ok: true, value: declaration ? `${declaration}\n${body}` : body };
  } catch (reason) {
    return failure(reason instanceof Error ? reason.message : 'XML 格式化失败');
  }
}

function elementToValue(element: Element): JsonValue {
  const value: Record<string, JsonValue> = Object.create(null);
  for (const attribute of Array.from(element.attributes))
    value[`@${attribute.name}`] = attribute.value;
  const children = Array.from(element.children);
  const text = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim();
  if (children.length && text) throw new Error('混合文本与子元素无法无损转换为 JSON');
  if (text && !children.length && !element.attributes.length) return text;
  if (text) value['#text'] = text;
  for (const child of children) {
    const name = child.tagName;
    const next = elementToValue(child);
    if (!Object.hasOwn(value, name)) value[name] = next;
    else if (Array.isArray(value[name])) (value[name] as JsonValue[]).push(next);
    else value[name] = [value[name], next];
  }
  return Object.keys(value).length ? value : '';
}

export function xmlToJson(input: string): Result<string> {
  const parsed = parseXml(input);
  if (!parsed.ok) return parsed;
  try {
    const root = parsed.value.documentElement;
    return { ok: true, value: JSON.stringify({ [root.tagName]: elementToValue(root) }, null, 2) };
  } catch (reason) {
    return failure(reason instanceof Error ? reason.message : 'XML 转 JSON 失败');
  }
}

function scalar(value: JsonValue): string {
  if (value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  throw new Error('属性和文本须为标量值');
}

function renderJsonElement(name: string, value: JsonValue, depth: number): string {
  if (!xmlName.test(name)) throw new Error(`无效的 XML 元素名：${name}`);
  const pad = '  '.repeat(depth);
  if (Array.isArray(value)) throw new Error('根元素不能是数组');
  if (value === null || typeof value !== 'object') {
    const text = escapeText(scalar(value));
    return text ? `${pad}<${name}>${text}</${name}>` : `${pad}<${name}/>`;
  }
  let attributes = '';
  let text: string | undefined;
  const children: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('@')) {
      const attributeName = key.slice(1);
      if (!xmlName.test(attributeName)) throw new Error(`无效的 XML 属性名：${attributeName}`);
      attributes += ` ${attributeName}="${escapeAttribute(scalar(child))}"`;
    } else if (key === '#text') text = escapeText(scalar(child));
    else
      for (const item of Array.isArray(child) ? child : [child])
        children.push(renderJsonElement(key, item, depth + 1));
  }
  if (text && children.length) throw new Error('混合文本与子元素无法无损转换为 XML');
  if (children.length)
    return `${pad}<${name}${attributes}>\n${children.join('\n')}\n${pad}</${name}>`;
  if (text) return `${pad}<${name}${attributes}>${text}</${name}>`;
  return `${pad}<${name}${attributes}/>`;
}

export function jsonToXml(input: string): Result<string> {
  try {
    const parsed: unknown = JSON.parse(input);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return failure('JSON 须为仅含一个根元素的对象');
    const entries = Object.entries(parsed);
    if (entries.length !== 1) return failure('JSON 须为仅含一个根元素的对象');
    const xml = renderJsonElement(entries[0][0], entries[0][1] as JsonValue, 0);
    const checked = parseXml(xml);
    return checked.ok ? { ok: true, value: xml } : checked;
  } catch (reason) {
    return failure(reason instanceof Error ? reason.message : 'JSON 格式无效');
  }
}
