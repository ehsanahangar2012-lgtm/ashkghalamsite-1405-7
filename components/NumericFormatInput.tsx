import React from 'react';
import { usePersianNumberInput } from '../hooks/usePersianNumberInput';

interface NumericFormatInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export const NumericFormatInput: React.FC<NumericFormatInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '',
  disabled = false,
  id
}) => {
  const {
    inputValue,
    inputRef,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur
  } = usePersianNumberInput({ value, onChange });

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      value={inputValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={`font-mono text-left dir-ltr ${className}`}
    />
  );
};
