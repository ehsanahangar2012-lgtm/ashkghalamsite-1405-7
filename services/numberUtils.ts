/**
 * Utility functions for handling Persian digits and formatting Solar Hijri (Jalali/Shamsi) dates.
 */

/**
 * Converts Persian (۰-۹) and Arabic (٠-٩) numeral characters to standard English (0-9) digits.
 */
export function convertPersianDigitsToEnglish(str: string | number | undefined | null): string {
  if (str === null || str === undefined) return "";
  const farsiDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  
  let result = String(str);
  for (let i = 0; i < 10; ++i) {
    result = result.replace(farsiDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  return result
    .replace(/٫/g, '.')
    .replace(/،/g, '.')
    .replace(/\//g, '.')
    .replace(/[\u200C\u200B\s]/g, '');
}

/**
 * Parses a string containing English or Persian digits into a float or 0 as fallback.
 */
export function parsePersianFloat(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const englishStr = convertPersianDigitsToEnglish(val);
  // Remove formatting commas if present (e.g. 1,000,000)
  const cleanedStr = englishStr.replace(/,/g, '');
  const parsed = parseFloat(cleanedStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Strips non-digits except dot. Good for decimal entries.
 */
export function cleanPersianNumberString(val: string): string {
  const english = convertPersianDigitsToEnglish(val);
  return english.replace(/[^0-9.]/g, '');
}

/**
 * Formats a javascript Date or string/timestamp into Jalali (Solar Hijri) Date String.
 * e.g., "۱۴۰۲/۰۷/۱۵"
 */
export function formatToJalaliDate(dateSource: Date | string | number | undefined | null): string {
  if (!dateSource) return "";
  try {
    const d = new Date(dateSource);
    if (isNaN(d.getTime())) return String(dateSource);
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(d);
  } catch (e) {
    return String(dateSource);
  }
}

/**
 * Formats a javascript Date into an elegant Jalali date with Month words
 * e.g., "۱۵ مهر ۱۴۰۲"
 */
export function formatToJalaliLong(dateSource: Date | string | number | undefined | null): string {
  if (!dateSource) return "";
  try {
    const d = new Date(dateSource);
    if (isNaN(d.getTime())) return String(dateSource);
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(d);
  } catch (e) {
    return String(dateSource);
  }
}

/**
 * Formats a javascript Date into Jalali Date + Time.
 * e.g., "۱۴۰۲/۰۷/۱۵ - ۱۸:۳۰"
 */
export function formatToJalaliDateTime(dateSource: Date | string | number | undefined | null): string {
  if (!dateSource) return "";
  try {
    const d = new Date(dateSource);
    if (isNaN(d.getTime())) return String(dateSource);
    const datePart = new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(d);
    
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    // Convert time digits to Persian
    const timeEnglish = `${h}:${m}`;
    const timePersian = convertEnglishDigitsToPersian(timeEnglish);
    
    return `${datePart} - ${timePersian}`;
  } catch (e) {
    return String(dateSource);
  }
}

/**
 * Helper to convert English digits to Persian. Useful for formatting outputs.
 */
export function convertEnglishDigitsToPersian(str: string | number | undefined | null): string {
  if (str === null || str === undefined) return "";
  const persianNumbers = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(str).replace(/[0-9]/g, (w) => persianNumbers[parseInt(w, 10)]);
}
