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
  setActiveStandard: (std: string) => void;
  setDimensions: (dims: { L: number; W: number; H: number }) => void;
  setMaterial: (material: Material | null) => void;
}

export const useCadStore = create<CADState>((set) => ({
  activeStandard: 'ecma-a2020',
  dimensions: { L: 60, W: 40, H: 100 },
  material: null,
  setActiveStandard: (std) => set({ activeStandard: std }),
  setDimensions: (dims) => set({ dimensions: dims }),
  setMaterial: (mat) => set({ material: mat })
}));
