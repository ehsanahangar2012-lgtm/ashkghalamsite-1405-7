import { create } from 'zustand';

export interface WorkflowState {
  currentStatus: 'Inquiry_Received' | 'Priced_Request' | 'Awaiting_Design' | 'Pending_structural_check' | 'Production_Queue' | 'Dispatched';
  activeOrders: any[];
  setWorkflowStatus: (status: 'Inquiry_Received' | 'Priced_Request' | 'Awaiting_Design' | 'Pending_structural_check' | 'Production_Queue' | 'Dispatched') => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  currentStatus: 'Inquiry_Received',
  activeOrders: [],
  setWorkflowStatus: (status) => set({ currentStatus: status })
}));
