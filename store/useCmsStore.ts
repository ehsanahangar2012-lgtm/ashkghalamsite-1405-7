import { create } from 'zustand';

export interface CMSState {
  entries: any[];
  addEntry: (entry: any) => void;
  // TODO: CMS OS Headless types and elements
}

export const useCmsStore = create<CMSState>((set) => ({
  entries: [],
  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] }))
}));
