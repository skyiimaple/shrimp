import {
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

export type PhoneInspection =
  | {
      valid: true;
      country: string;
      e164: string;
      international: string;
      national: string;
    }
  | { valid: false; error: string };

export function inspectPhoneNumber(input: string, region: string): PhoneInspection {
  const country = region.trim().toUpperCase();
  if (!isSupportedCountry(country)) {
    return { valid: false, error: '无效的地区代码。请输入两位 ISO 地区代码，例如 US 或 GB。' };
  }
  const number = parsePhoneNumberFromString(input.trim(), country as CountryCode);
  if (!number?.isValid()) {
    return { valid: false, error: '无效的电话号码。请检查号码和地区代码。' };
  }
  return {
    valid: true,
    country: number.country ?? country,
    e164: number.number,
    international: number.formatInternational(),
    national: number.formatNational(),
  };
}
