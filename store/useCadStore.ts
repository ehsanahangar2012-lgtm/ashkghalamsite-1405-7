import { create } from 'zustand';

// CAD Specific Domain Store for replacing Context and local states in DielineGenerator
export interface Material {
  id: string;
  name: string;
  thickness: number;
  compensationFactor: number;
}

export interface CADState {
  activeStandard: string;
  dimensions: { L: number; W: number; H: number };
  material: Material | null;
  refTemplateUrl: string | null;
  refTemplateOpacity: number;
  refTemplateScale: number;
  refTemplateOffsetX: number;
  refTemplateOffsetY: number;
  refTemplateRotation: number;
  isRefTemplateVisible: boolean;
  setActiveStandard: (std: string) => void;
  setDimensions: (dims: { L: number; W: number; H: number }) => void;
  setMaterial: (material: Material | null) => void;
  setRefTemplateUrl: (url: string | null) => void;
  setRefTemplateOpacity: (opacity: number) => void;
  setRefTemplateScale: (scale: number) => void;
  setRefTemplateOffsetX: (x: number) => void;
  setRefTemplateOffsetY: (y: number) => void;
  setRefTemplateRotation: (rotation: number) => void;
  setIsRefTemplateVisible: (visible: boolean) => void;
}

export const useCadStore = create<CADState>((set) => ({
  activeStandard: 'ecma-a2020',
  dimensions: { L: 60, W: 40, H: 100 },
  material: null,
  refTemplateUrl: null,
  refTemplateOpacity: 0.5,
  refTemplateScale: 1.0,
  refTemplateOffsetX: 0,
  refTemplateOffsetY: 0,
  refTemplateRotation: 0,
  isRefTemplateVisible: true,
  setActiveStandard: (std) => set({ activeStandard: std }),
  setDimensions: (dims) => set({ dimensions: dims }),
  setMaterial: (mat) => set({ material: mat }),
  setRefTemplateUrl: (url) => set({ refTemplateUrl: url }),
  setRefTemplateOpacity: (opacity) => set({ refTemplateOpacity: opacity }),
  setRefTemplateScale: (scale) => set({ refTemplateScale: scale }),
  setRefTemplateOffsetX: (x) => set({ refTemplateOffsetX: x }),
  setRefTemplateOffsetY: (y) => set({ refTemplateOffsetY: y }),
  setRefTemplateRotation: (rotation) => set({ refTemplateRotation: rotation }),
  setIsRefTemplateVisible: (visible) => set({ isRefTemplateVisible: visible })
}));
