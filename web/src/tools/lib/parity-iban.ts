export type IbanInspection = {
  valid: boolean;
  normalized: string;
  formatted: string;
  countryCode: string;
};

export function inspectIban(input: string): IbanInspection {
  const normalized = input.replace(/\s/g, '').toUpperCase();
  const formatted = normalized.replace(/.{1,4}/g, (group) => `${group} `).trim();
  const countryCode = normalized.slice(0, 2);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(normalized)) {
    return { valid: false, normalized, formatted, countryCode };
  }

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  let remainder = 0;
  for (const character of rearranged) {
    const code = character.charCodeAt(0);
    const digits = code >= 65 ? String(code - 55) : character;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return { valid: remainder === 1 && isValidIBAN(normalized), normalized, formatted, countryCode };
}
import { isValidIBAN } from 'ibantools';
