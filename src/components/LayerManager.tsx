import React from 'react';

export interface LayerState {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  isLocked: boolean;
  type?: 'cmyk' | 'offset' | 'system' | 'label' | string;
}

export const LayerManager: React.FC<any> = () => {
  return null;
};
