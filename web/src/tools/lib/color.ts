import { failure, type Result } from './result';

export interface ColorValues {
  hex: string;
  rgb: string;
  hsl: string;
}
type Channels = [number, number, number];

function fromHsl(h: number, s: number, l: number): Channels {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const secondary = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const base: Channels =
    h < 60
      ? [chroma, secondary, 0]
      : h < 120
        ? [secondary, chroma, 0]
        : h < 180
          ? [0, chroma, secondary]
          : h < 240
            ? [0, secondary, chroma]
            : h < 300
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const offset = l - chroma / 2;
  return base.map((part) => Math.round((part + offset) * 255)) as Channels;
}

function toHsl([r, g, b]: Channels): string {
  const [red, green, blue] = [r, g, b].map((part) => part / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  if (delta) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  return `hsl(${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
}

export function convertColor(input: string): Result<ColorValues> {
  const value = input.trim();
  let channels: Channels;
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value);
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(value);
  const hsl = /^hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i.exec(
    value,
  );
  if (hex) {
    const expanded =
      hex[1].length === 3 ? [...hex[1]].map((digit) => digit + digit).join('') : hex[1];
    channels = [0, 2, 4].map((index) => parseInt(expanded.slice(index, index + 2), 16)) as Channels;
  } else if (rgb) {
    channels = rgb.slice(1).map(Number) as Channels;
    if (channels.some((part) => part > 255)) return failure('RGB 数值须在 0 到 255 之间');
  } else if (hsl) {
    const [h, s, l] = hsl.slice(1).map(Number);
    if (h > 360 || s > 100 || l > 100) return failure('HSL 色相须在 0 到 360，百分比须在 0 到 100');
    channels = fromHsl(h === 360 ? 0 : h, s / 100, l / 100);
  } else return failure('请输入 HEX、rgb(...) 或 hsl(...) 颜色');
  return {
    ok: true,
    value: {
      hex: `#${channels
        .map((part) => part.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()}`,
      rgb: `rgb(${channels.join(', ')})`,
      hsl: toHsl(channels),
    },
  };
}
