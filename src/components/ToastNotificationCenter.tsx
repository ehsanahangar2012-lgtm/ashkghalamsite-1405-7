import React from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

export const ToastNotificationCenter: React.FC<any> = () => {
  return null;
};
