import React, { useState } from 'react';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { 
  CheckCircle2, Clock, PlayCircle, Settings, ClipboardCheck, 
  Truck, ArrowLeftRight, FileCode2, Info 
} from 'lucide-react';

export const BusinessProcessManager = () => {
  const { currentStatus, setWorkflowStatus } = useWorkflowStore();

  const workflowSteps = [
    { id: 'Inquiry_Received', icon: FileCode2, label: 'دریافت استعلام', desc: 'بررسی مشخصات اولیه و نیازمندی‌های مشتری' },
    { id: 'Priced_Request', icon: Clock, label: 'قیمت‌گذاری و برآورد', desc: 'محاسبه بهای تمام شده لیتوگرافی و مواد اولیه' },
    { id: 'Awaiting_Design', icon: Settings, label: 'در انتظار طراحی', desc: 'عملیات دایکات، چیدمان فرم و زینک' },
    { id: 'Pending_structural_check', icon: ClipboardCheck, label: 'تایید ساختار فنی', desc: 'بررسی مقاومت BCT و تلرانس تا خوردگی' },
    { id: 'Production_Queue', icon: PlayCircle, label: 'صف تولید و چاپ', desc: 'تخصیص به ماشین چاپ و برنامه‌ریزی تولید' },
    { id: 'Dispatched', icon: Truck, label: 'تکمیل و ارسال', desc: 'ترخیص از انبار و تحویل به لاجستیک' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" /> موتور گردش کار سازمانی (BPM)
          </h2>
          <p className="text-xs text-slate-400 mt-1">مدیریت وضعیت ماشین انتقال حالت فرآیند تجاری</p>
        </div>
      </div>

      <div className="relative">
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0" />
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 relative z-10">
          {workflowSteps.map((step, idx) => {
            const isActive = currentStatus === step.id;
            const isCompleted = workflowSteps.findIndex(s => s.id === currentStatus) > idx;
            
            return (
              <div 
                key={step.id}
                onClick={() => setWorkflowStatus(step.id as any)}
                className={`
                  flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all duration-300
                  ${isActive ? 'bg-indigo-600/20 border border-indigo-500/50 scale-105 shadow-xl shadow-indigo-900/20' : 
                    isCompleted ? 'bg-emerald-900/20 border border-emerald-800/30 opacity-70 hover:opacity-100' : 
                    'bg-[#0a0d14] border border-slate-800 hover:border-slate-700 opacity-50 hover:opacity-100'}
                `}
              >
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-inner
                  ${isActive ? 'bg-indigo-500 text-white shadow-indigo-400/50' : 
                    isCompleted ? 'bg-emerald-600 text-white' : 
                    'bg-slate-800 text-slate-400'}
                `}>
                  {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
                </div>
                
                <h3 className={`text-xs font-bold text-center mb-1 ${isActive ? 'text-indigo-300' : isCompleted ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {step.label}
                </h3>
                <p className="text-[9px] text-center text-slate-500 leading-relaxed hidden md:block">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 bg-[#0a0d14] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">ترانزیشن‌های مجاز کورت (Legal Transitions)</h3>
        </div>
        <p className="text-xs text-slate-400 mb-6">در موتور BPM، جهش بین وضعیت‌ها تنها از طریق ترانزیشن‌های تعریف شده امکان‌پذیر است تا از خطاهای سیستمی جلوگیری شود.</p>
        
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-[10px] text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-3 h-3"/> [Inquiry_Received] &rarr; [Priced_Request] (Condition: Cost &gt; 0)</div>
          <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-3 h-3"/> [Priced_Request] &rarr; [Awaiting_Design] (Condition: Client Approved)</div>
          <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-3 h-3"/> [Awaiting_Design] &rarr; [Pending_structural_check] (Condition: CAD Uploaded)</div>
          <div className="flex items-center gap-2 text-rose-400"><Info className="w-3 h-3"/> [Pending_structural_check] &rarr; [Awaiting_Design] (Condition: BCT Failed, Reject)</div>
          <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-3 h-3"/> [Pending_structural_check] &rarr; [Production_Queue] (Condition: Eng Approved)</div>
        </div>
      </div>
    </div>
  );
};
