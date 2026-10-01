import { describe, expect, it } from 'vitest';
import { formatXml, jsonToXml, validateXml, xmlToJson } from './parity-xml';

describe('XML tools', () => {
  it('validates and indents well formed XML', () => {
    expect(validateXml('<root><item id="1">A &amp; B</item></root>')).toEqual({
      ok: true,
      value: 'XML 格式有效',
    });
    expect(formatXml('<root><item id="1">A &amp; B</item></root>')).toEqual({
      ok: true,
      value: '<root>\n  <item id="1">A &amp; B</item>\n</root>',
    });
  });

  it('rejects malformed XML and declarations that could introduce external entities', () => {
    expect(validateXml('<root><item></root>').ok).toBe(false);
    expect(formatXml('<!DOCTYPE root SYSTEM "file:///etc/passwd"><root/>').ok).toBe(false);
    expect(
      xmlToJson('<!DOCTYPE root [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>').ok,
    ).toBe(false);
  });

  it('maps attributes, text, and repeated children to JSON', () => {
    expect(
      xmlToJson(
        '<catalog version="1"><item id="a">First</item><item id="b">Second</item><empty/></catalog>',
      ),
    ).toEqual({
      ok: true,
      value: JSON.stringify(
        {
          catalog: {
            '@version': '1',
            item: [
              { '@id': 'a', '#text': 'First' },
              { '@id': 'b', '#text': 'Second' },
            ],
            empty: '',
          },
        },
        null,
        2,
      ),
    });
  });

  it('converts the documented JSON mapping back to XML and escapes content', () => {
    expect(
      jsonToXml(
        JSON.stringify({
          catalog: {
            '@version': '1',
            item: [
              { '@id': 'a', '#text': 'A & B' },
              { '@id': 'b', '#text': 'Second' },
            ],
            empty: '',
          },
        }),
      ),
    ).toEqual({
      ok: true,
      value:
        '<catalog version="1">\n  <item id="a">A &amp; B</item>\n  <item id="b">Second</item>\n  <empty/>\n</catalog>',
    });
  });

  it('rejects lossy mixed content and invalid JSON document shapes', () => {
    expect(xmlToJson('<p>Hello <b>world</b>!</p>').ok).toBe(false);
    expect(jsonToXml('{"first":1,"second":2}').ok).toBe(false);
    expect(jsonToXml('{"root":{"bad name":"x"}}').ok).toBe(false);
  });

  it('keeps XML comments while formatting', () => {
    expect(formatXml('<root><!-- note --><item>A</item></root>')).toEqual({
      ok: true,
      value: '<root>\n  <!-- note -->\n  <item>A</item>\n</root>',
    });
    expect(formatXml('<root><!-- note --></root>')).toEqual({
      ok: true,
      value: '<root>\n  <!-- note -->\n</root>',
    });
  });

  it('keeps a single XML declaration when formatting', () => {
    expect(formatXml('<?xml version="1.0"?><root><item>A</item></root>')).toEqual({
      ok: true,
      value: '<?xml version="1.0"?>\n<root>\n  <item>A</item>\n</root>',
    });
  });

  it('rejects JSON mappings that produce unbound namespace prefixes', () => {
    expect(jsonToXml('{"p:root":"value"}').ok).toBe(false);
  });
});
