import React from 'react';

export interface LayerState {
  id: string;
  name: string;
  color: string;
  visible?: boolean;
  locked?: boolean;
  isVisible?: boolean;
  isLocked?: boolean;
  type?: string;
}

export const LayerManager: React.FC<any> = () => {
  return null;
};
