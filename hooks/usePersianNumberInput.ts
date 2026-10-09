import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { convertPersianDigitsToEnglish, parsePersianFloat } from '../services/numberUtils';

export interface UsePersianNumberInputProps {
  value: number;
  onChange: (val: number) => void;
}

export const formatNumberWithCommas = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/,/g, '');
  const englishDigits = convertPersianDigitsToEnglish(clean);
  
  // Verify it is a valid numeric pattern
  const num = parseFloat(englishDigits);
  if (isNaN(num)) return '';
  
  // Format with commas by working on the string representation directly
  const parts = englishDigits.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const getNewCursorPos = (rawInput: string, formattedInput: string, rawCursorPos: number): number => {
  // Pure digit matching to calculate cursor position flawlessly
  let digitCountBeforeCursor = 0;
  for (let i = 0; i < rawCursorPos && i < rawInput.length; i++) {
    if (/[0-9۰-۹٠-٩]/.test(rawInput[i])) {
      digitCountBeforeCursor++;
    }
  }
  
  let newCursorPos = 0;
  let digitsSeen = 0;
  while (newCursorPos < formattedInput.length && digitsSeen < digitCountBeforeCursor) {
    if (/[0-9]/.test(formattedInput[newCursorPos])) {
      digitsSeen++;
    }
    newCursorPos++;
  }
  return newCursorPos;
};

export const usePersianNumberInput = ({ value, onChange }: UsePersianNumberInputProps) => {
  // Store internal string value to keep controlled input completely isolated during typing
  const [inputValue, setInputValue] = useState<string>(() => {
    const valInt = Math.floor(value || 0);
    return valInt === 0 ? '' : formatNumberWithCommas(valInt);
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorPosRef = useRef<number | null>(null);

  // Keep internal state in sync only when external value really diverges from parsed value (integer check)
  useEffect(() => {
    const currentParsed = parsePersianFloat(inputValue);
    const valInt = Math.floor(value || 0);
    const textInt = Math.floor(currentParsed || 0);
    
    if (valInt !== textInt) {
      if (valInt === 0) {
        setInputValue('');
      } else {
        setInputValue(formatNumberWithCommas(valInt));
      }
    }
  }, [value]);

  // Synchronously adjust selection range after DOM update
  useLayoutEffect(() => {
    if (inputRef.current && cursorPosRef.current !== null) {
      inputRef.current.setSelectionRange(cursorPosRef.current, cursorPosRef.current);
      cursorPosRef.current = null;
    }
  }, [inputValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const rawCursor = e.target.selectionStart || 0;
    
    // 1. Convert Persian/Arabic digits to English
    const englishDigits = convertPersianDigitsToEnglish(rawInput);
    
    // 2. Extract digits only to store values as integers (positive integer filter)
    const digitsOnly = englishDigits.replace(/\D/g, '');
    
    if (digitsOnly === '') {
      cursorPosRef.current = 0;
      setInputValue('');
      onChange(0);
    } else {
      const finalValue = parseInt(digitsOnly, 10);
      const formatted = formatNumberWithCommas(finalValue);
      
      const newPos = getNewCursorPos(rawInput, formatted, rawCursor);
      cursorPosRef.current = newPos;
      
      setInputValue(formatted);
      onChange(finalValue);
    }
  };

  const handleFocus = () => {
    const valInt = Math.floor(value || 0);
    if (valInt === 0) {
      setInputValue('');
    } else {
      setInputValue(formatNumberWithCommas(valInt));
    }
  };

  const handleBlur = () => {
    const valInt = Math.floor(value || 0);
    if (valInt === 0) {
      setInputValue('');
    } else {
      setInputValue(formatNumberWithCommas(valInt));
    }
  };

  return {
    inputValue,
    inputRef,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    setInputValue
  };
};
