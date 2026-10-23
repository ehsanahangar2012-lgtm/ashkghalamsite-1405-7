import React, { useState } from 'react';
import { HelpCircle, X, CheckCircle, Lightbulb } from 'lucide-react';

export interface SmartHelpButtonProps {
  sectionTitle?: string;
  sectionKey?: string;
  description?: string;
  tips?: string[];
  className?: string;
}

export const SmartHelpButton: React.FC<SmartHelpButtonProps> = ({
  sectionTitle = 'راهنمای هوشمند',
  description,
  tips = [],
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center transition-all cursor-pointer ${className || 'w-8 h-8 rounded-xl bg-slate-800 text-amber-400 hover:bg-slate-700'}`}
        title={`راهنمای ${sectionTitle}`}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-100">{sectionTitle}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {description && (
              <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-slate-800/40 p-3.5 rounded-2xl border border-slate-800">
                {description}
              </p>
            )}

            {tips.length > 0 && (
              <div className="space-y-2 mb-6">
                <span className="text-[11px] font-bold text-amber-400">نکات و ترفندهای کاربردی:</span>
                {tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};
