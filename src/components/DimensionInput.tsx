import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { normalizePersianNumbers } from '../utils/numberUtils';

interface DimensionInputProps {
  id?: string;
  label: string;
  value: number;
  unit: 'mm' | 'cm' | 'inches';
  onChange: (valInMm: number) => void;
  convertMmToUnit: (v: number, u: 'mm' | 'cm' | 'inches') => number;
  convertUnitToMm: (v: number, u: 'mm' | 'cm' | 'inches') => number;
  className?: string;
  inputClassName?: string;
  tooltip?: string;
  minMm?: number;
  maxMm?: number;
  onRangeWarning?: (message: string | null) => void;
  hideInlineWarning?: boolean;
  wrapperClassName?: string;
}

export const DimensionInput: React.FC<DimensionInputProps> = ({
  id,
  label,
  value,
  unit,
  onChange,
  convertMmToUnit,
  convertUnitToMm,
  className = 'flex items-center justify-between gap-4',
  inputClassName = 'w-24 bg-[#070a0e] border border-slate-800 rounded-lg py-1.5 px-3 text-center text-xs font-mono text-sky-400 outline-none focus:ring-1 focus:ring-sky-500 transition-all font-bold',
  tooltip,
  minMm = 15,
  maxMm = 2500,
  onRangeWarning,
  hideInlineWarning = false,
  wrapperClassName = 'w-full',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localVal, setLocalVal] = useState<string>(String(convertMmToUnit(value, unit)));
  const [inlineWarning, setInlineWarning] = useState<string | null>(null);

  const justFocusedRef = useRef(false);
  const hasTypedSinceFocusRef = useRef(false);
  const warningTimerRef = useRef<number | null>(null);

  const unitLabel = unit === 'mm' ? 'mm' : unit === 'cm' ? 'cm' : 'in';

  const setWarning = (msg: string | null, autoClearMs?: number) => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    setInlineWarning(msg);
    onRangeWarning?.(msg);
    if (msg && autoClearMs) {
      warningTimerRef.current = window.setTimeout(() => {
        setInlineWarning(null);
        onRangeWarning?.(null);
      }, autoClearMs);
    }
  };

  useEffect(() => {
    return () => {
      if (warningTimerRef.current) {
        window.clearTimeout(warningTimerRef.current);
      }
    };
  }, []);

  // Only sync from parent props when NOT actively editing so typing never gets overwritten
  useEffect(() => {
    if (isFocused) return;
    const newParsed = convertMmToUnit(value, unit);
    setLocalVal(String(newParsed));
  }, [value, unit, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    justFocusedRef.current = true;
    hasTypedSinceFocusRef.current = false;
    const input = e.currentTarget;
    input.select();
    requestAnimationFrame(() => {
      if (document.activeElement === input && !hasTypedSinceFocusRef.current) {
        input.select();
      }
    });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    // Prevent first mouseup after focus (and any click before typing) from collapsing full-text selection
    if (justFocusedRef.current || !hasTypedSinceFocusRef.current) {
      e.preventDefault();
      justFocusedRef.current = false;
      e.currentTarget.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    hasTypedSinceFocusRef.current = true;
    justFocusedRef.current = false;

    const rawVal = e.target.value;
    const normalized = normalizePersianNumbers(rawVal).replace(/[٫/]/g, '.');

    // Input Mask: Only allow numbers and single decimal point
    if (!/^[\d]*\.?[\d]*$/.test(normalized)) {
      return;
    }

    setLocalVal(normalized);

    if (normalized === '' || normalized === '.') {
      setWarning(null);
      return;
    }

    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) return;

    const mmVal = convertUnitToMm(parsed, unit);
    if (mmVal < minMm) {
      const minDisplay = convertMmToUnit(minMm, unit);
      setWarning(`کوچکتر از حداقل مجاز (${minDisplay} ${unitLabel}) است`);
    } else if (mmVal > maxMm) {
      const maxDisplay = convertMmToUnit(maxMm, unit);
      setWarning(`بزرگتر از حداکثر مجاز (${maxDisplay} ${unitLabel}) است`);
    } else {
      setWarning(null);
      onChange(mmVal);
    }
  };

  const commitValue = () => {
    const englishVal = normalizePersianNumbers(localVal).replace(/[٫/]/g, '.');
    const parsed = parseFloat(englishVal);

    if (isNaN(parsed) || englishVal === '' || englishVal === '.') {
      setLocalVal(String(convertMmToUnit(value, unit)));
      setWarning(null);
      return;
    }

    const mmVal = convertUnitToMm(parsed, unit);

    if (mmVal < minMm) {
      const minDisplay = convertMmToUnit(minMm, unit);
      setLocalVal(String(minDisplay));
      onChange(minMm);
      setWarning(
        `مقدار واردشده (${parsed} ${unitLabel}) کمتر از حداقل مجاز (${minDisplay} ${unitLabel}) بود و روی ${minDisplay} ${unitLabel} تنظیم شد.`,
        4500
      );
      return;
    }

    if (mmVal > maxMm) {
      const maxDisplay = convertMmToUnit(maxMm, unit);
      setLocalVal(String(maxDisplay));
      onChange(maxMm);
      setWarning(
        `مقدار واردشده (${parsed} ${unitLabel}) بیشتر از حداکثر مجاز (${maxDisplay} ${unitLabel}) بود و روی ${maxDisplay} ${unitLabel} تنظیم شد.`,
        4500
      );
      return;
    }

    const cleanUnitVal = convertMmToUnit(mmVal, unit);
    setLocalVal(String(cleanUnitVal));
    setWarning(null);
    onChange(mmVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
      setIsFocused(false);
      e.currentTarget.blur();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setLocalVal(String(convertMmToUnit(value, unit)));
      setWarning(null);
      setIsFocused(false);
      e.currentTarget.blur();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      hasTypedSinceFocusRef.current = true;
      const current = parseFloat(normalizePersianNumbers(localVal));
      const baseUnitVal = isNaN(current) ? convertMmToUnit(value, unit) : current;
      const step = unit === 'mm' ? 1 : unit === 'cm' ? 0.1 : 0.05;
      const direction = e.key === 'ArrowUp' ? 1 : -1;

      const minUnit = convertMmToUnit(minMm, unit);
      const maxUnit = convertMmToUnit(maxMm, unit);
      const nextRaw = parseFloat((baseUnitVal + step * direction).toFixed(2));
      const nextClamped = Math.max(minUnit, Math.min(maxUnit, nextRaw));

      if (nextRaw < minUnit) {
        setWarning(`حداقل مجاز ${minUnit} ${unitLabel} است`, 3000);
      } else if (nextRaw > maxUnit) {
        setWarning(`حداکثر مجاز ${maxUnit} ${unitLabel} است`, 3000);
      } else {
        setWarning(null);
      }

      setLocalVal(String(nextClamped));
      onChange(convertUnitToMm(nextClamped, unit));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    justFocusedRef.current = false;
    hasTypedSinceFocusRef.current = false;
    commitValue();
  };

  return (
    <div className={wrapperClassName}>
      <div className={className} title={tooltip}>
        {label && (
          <span className="text-[11px] text-slate-400 flex-1 flex items-center gap-1">
            {label}
            {tooltip && (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 cursor-help"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            )}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={localVal}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onMouseUp={handleMouseUp}
          onKeyDown={handleKeyDown}
          dir="ltr"
          className={`${inputClassName} ${inlineWarning ? 'border-amber-500/80 ring-1 ring-amber-500/40' : ''}`}
        />
      </div>
      {!hideInlineWarning && inlineWarning && (
        <div className="mt-1 flex items-center gap-1 text-[9.5px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-0.5">
          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
          <span>{inlineWarning}</span>
        </div>
      )}
    </div>
  );
};
