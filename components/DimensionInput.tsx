import React, { useState, useEffect } from 'react';
import { normalizePersianNumbers } from '../utils/numberUtils';

interface DimensionInputProps {
  label: string;
  value: number;
  unit: 'mm' | 'cm' | 'inches';
  onChange: (valInMm: number) => void;
  convertMmToUnit: (v: number, u: 'mm' | 'cm' | 'inches') => number;
  convertUnitToMm: (v: number, u: 'mm' | 'cm' | 'inches') => number;
  className?: string;
  inputClassName?: string;
  tooltip?: string;
}

export const DimensionInput: React.FC<DimensionInputProps> = ({ 
  label, 
  value, 
  unit, 
  onChange, 
  convertMmToUnit, 
  convertUnitToMm,
  className = "flex items-center justify-between gap-4",
  inputClassName = "w-24 bg-[#070a0e] border border-slate-800 rounded-lg py-1.5 px-3 text-center text-xs font-mono text-sky-400 outline-none focus:ring-1 focus:ring-sky-500 transition-all font-bold",
  tooltip
}) => {
  const [localVal, setLocalVal] = useState<string>(String(convertMmToUnit(value, unit)));

  useEffect(() => {
    const newParsed = convertMmToUnit(value, unit);
    const currentParsed = parseFloat(normalizePersianNumbers(localVal));
    if (isNaN(currentParsed) || currentParsed !== newParsed) {
      setLocalVal(String(newParsed));
    }
  }, [value, unit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const englishVal = normalizePersianNumbers(rawVal);
    
    // Input Mask: Only allow numbers and decimal point
    if (!/^[\d]*\.?[\d]*$/.test(englishVal) && englishVal !== '-') {
      return;
    }

    setLocalVal(rawVal);
    
    if (englishVal === '' || englishVal === '-') {
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const current = parseFloat(normalizePersianNumbers(localVal));
      if (isNaN(current)) return;
      const step = unit === 'mm' ? 1 : (unit === 'cm' ? 0.1 : 0.05);
      const direction = e.key === 'ArrowUp' ? 1 : -1;
      
      const newVal = Math.max(0, current + (step * direction));
      // Format cleanly to 2 decimal places max to avoid floats like 1.100000000001
      const cleanVal = parseFloat(newVal.toFixed(2));
      
      setLocalVal(String(cleanVal));
      onChange(convertUnitToMm(cleanVal, unit));
    }
  };

  const handleBlur = () => {
    const englishVal = normalizePersianNumbers(localVal);
    let parsed = parseFloat(englishVal);
    if (isNaN(parsed)) {
      parsed = convertMmToUnit(value, unit);
    }
    const clamped = Math.max(10, convertUnitToMm(parsed, unit));
    setLocalVal(String(convertMmToUnit(clamped, unit)));
    onChange(clamped);
  };

  return (
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
        type="text"
        inputMode="decimal"
        value={localVal}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={(e) => e.target.select()}
        onKeyDown={handleKeyDown}
        dir="ltr"
        className={inputClassName}
      />
    </div>
  );
};
