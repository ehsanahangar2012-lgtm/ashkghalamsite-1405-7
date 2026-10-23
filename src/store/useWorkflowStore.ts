import { useState } from 'react';

export const useWorkflowStore = () => {
  const [currentStatus, setCurrentStatus] = useState<string>('IN_DESIGN');

  const setWorkflowStatus = (status: string) => {
    setCurrentStatus(status);
  };

  return {
    currentStatus,
    setWorkflowStatus,
  };
};
