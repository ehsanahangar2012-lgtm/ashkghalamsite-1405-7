import { normalizePersianNumbers } from '../utils/numberUtils';

export { normalizePersianNumbers };

export const cleanPersianNumberString = (str: string | number | undefined | null): string => {
  return normalizePersianNumbers(str);
};

export const parsePersianFloat = (str: string | number | undefined | null, fallback = 0): number => {
  if (typeof str === 'number') return isNaN(str) ? fallback : str;
  const cleaned = cleanPersianNumberString(str);
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
};
