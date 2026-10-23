import { useState } from 'react';

export interface CadDimensions {
  length: number;
  width: number;
  height: number;
  thickness: number;
}

export const useCadStore = () => {
  const [activeStandard, setActiveStandard] = useState<string>('fefco-0201');
  const [dimensions, setDimensions] = useState<CadDimensions>({
    length: 300,
    width: 200,
    height: 150,
    thickness: 3,
  });
  const [refTemplateUrl, setRefTemplateUrl] = useState<string | null>(null);
  const [refTemplateOpacity, setRefTemplateOpacity] = useState<number>(0.5);
  const [refTemplateScale, setRefTemplateScale] = useState<number>(1);
  const [refTemplateOffsetX, setRefTemplateOffsetX] = useState<number>(0);
  const [refTemplateOffsetY, setRefTemplateOffsetY] = useState<number>(0);
  const [refTemplateRotation, setRefTemplateRotation] = useState<number>(0);
  const [isRefTemplateVisible, setIsRefTemplateVisible] = useState<boolean>(true);

  return {
    activeStandard,
    setActiveStandard,
    dimensions,
    setDimensions,
    refTemplateUrl,
    setRefTemplateUrl,
    refTemplateOpacity,
    setRefTemplateOpacity,
    refTemplateScale,
    setRefTemplateScale,
    refTemplateOffsetX,
    setRefTemplateOffsetX,
    refTemplateOffsetY,
    setRefTemplateOffsetY,
    refTemplateRotation,
    setRefTemplateRotation,
    isRefTemplateVisible,
    setIsRefTemplateVisible,
  };
};
