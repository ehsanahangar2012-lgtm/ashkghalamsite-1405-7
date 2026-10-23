export const normalizePersianNumbers = (str: string | number | undefined | null): string => {
  if (str === null || str === undefined) return '';
  const stringStr = typeof str === 'string' ? str : String(str);
  return stringStr
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/٫/g, '.') // Persian decimal separator
    .replace(/،/g, '.') // Arabic comma sometimes used as decimal
    .replace(/,/g, '.') // English comma to dot
    .replace(/\//g, '.') // Forward slash often typed as decimal separator in Farsi
    .replace(/[\u200C\u200B\s]/g, ''); // Remove zero-width non-joiner and other invisible space characters
};

export const formatNumberForInput = (str: string | number | undefined | null): string => {
  return normalizePersianNumbers(str);
};
