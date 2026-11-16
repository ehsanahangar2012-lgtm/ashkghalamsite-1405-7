import React, { useState } from 'react';
import { AppView } from '../types';
import { useContent } from '../contexts/ContentContext';
import { AlertTriangle, X, ArrowLeft } from 'lucide-react';

interface EmergencyNotificationBarProps {
  currentView?: AppView;
  onNavigate?: (view: AppView) => void;
}

export const EmergencyNotificationBar: React.FC<EmergencyNotificationBarProps> = ({
  onNavigate,
}) => {
  const { emergencyConfig } = useContent();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !emergencyConfig?.enabled || !emergencyConfig?.message?.trim()) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{emergencyConfig.message}</span>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate(AppView.AUTOCAD_STUDIO)}
              className="font-bold underline hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <span>ورود به استودیو CAD</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-amber-500/20 rounded-md text-amber-300 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
