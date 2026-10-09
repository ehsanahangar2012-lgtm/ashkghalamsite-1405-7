import React from 'react';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface LibrarySidebarProps {
  customTemplates: any[];
  selectedModel: any;
  onModelSelect: (model: any) => void;
  onClose: () => void;
}

export const LibrarySidebar: React.FC<LibrarySidebarProps> = ({ customTemplates, selectedModel, onModelSelect, onClose }) => {
  return (
    <div className="w-80 bg-[#0b0e14] border-l border-slate-700 flex flex-col h-full overflow-hidden" dir="rtl">
      <div className="p-4 border-b border-slate-800 bg-[#07090d]">
        <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-slate-100">مخزن الگوها</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
         {/* Template list here, adapted from the original modal code */}
      </div>
    </div>
  );
};
