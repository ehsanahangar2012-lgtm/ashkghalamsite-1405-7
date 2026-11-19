import React, { useEffect, useRef, useState } from 'react';

interface NumericFormatInputProps {
  value: number | string;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export const NumericFormatInput: React.FC<NumericFormatInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '',
  min,
  max,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const justFocusedRef = useRef(false);
  const hasTypedRef = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value ?? ''));
    }
  }, [value, isFocused]);

  const normalizeDigits = (raw: string) =>
    raw
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[٫/]/g, '.');

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    justFocusedRef.current = true;
    hasTypedRef.current = false;
    const input = e.currentTarget;
    input.select();
    requestAnimationFrame(() => {
      if (document.activeElement === input && !hasTypedRef.current) {
        input.select();
      }
    });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (justFocusedRef.current || !hasTypedRef.current) {
      e.preventDefault();
      justFocusedRef.current = false;
      e.currentTarget.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    hasTypedRef.current = true;
    justFocusedRef.current = false;
    const normalized = normalizeDigits(e.target.value);
    if (!/^-?[\d]*\.?[\d]*$/.test(normalized)) return;

    setDraft(normalized);
    if (normalized === '' || normalized === '-' || normalized === '.') return;

    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
      if (min !== undefined && parsed < min) return;
      if (max !== undefined && parsed > max) return;
      onChange(parsed);
    }
  };

  const commit = () => {
    const normalized = normalizeDigits(draft);
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || normalized === '' || normalized === '-' || normalized === '.') {
      setDraft(String(value ?? ''));
      return;
    }
    let next = parsed;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    setDraft(String(next));
    onChange(next);
  };

  const handleBlur = () => {
    setIsFocused(false);
    justFocusedRef.current = false;
    hasTypedRef.current = false;
    commit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
      setIsFocused(false);
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(String(value ?? ''));
      setIsFocused(false);
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={handleChange}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
};
