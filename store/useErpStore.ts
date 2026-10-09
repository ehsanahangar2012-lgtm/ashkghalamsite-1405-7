import { create } from 'zustand';

export interface ERPState {
  ledgers: any[];
  addLedgerEntry: (entry: any) => void;
  // TODO: Add other ERP specific global state
}

export const useErpStore = create<ERPState>((set) => ({
  ledgers: [],
  addLedgerEntry: (entry) => set((state) => ({ ledgers: [...state.ledgers, entry] }))
}));
