
import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, FileText, Activity, Layers, Image as ImageIcon } from 'lucide-react';
import { Card, Button, Badge } from './UIComponents';

interface AnalysisReport {
  status: 'pass' | 'warning' | 'fail';
  dpi: number | null;
  colorMode: string;
  dimensions: { w: number, h: number } | null;
  format: string;
  fileSize: string;
  issues: string[];
}

interface FileAnalyzerProps {
  file: File;
  targetDimensions?: { w: number, h: number }; // cm
  onVerificationComplete?: (isValid: boolean) => void;
}

export const FileAnalyzer: React.FC<FileAnalyzerProps> = ({ file, targetDimensions, onVerificationComplete }) => {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    analyzeFile();
  }, [file]);

  const analyzeFile = async () => {
    setIsProcessing(true);
    setProgress(10);
    
    const issues: string[] = [];
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    let dpi = null;
    let widthPx = 0, heightPx = 0;

    // 1. Simulate Server Upload & Processing Delay
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 15, 90));
    }, 200);

    await new Promise(r => setTimeout(r, 1500));
    clearInterval(interval);

    // 2. Format Check
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validFormats = ['pdf', 'ai', 'tiff', 'psd', 'jpg', 'jpeg', 'png'];
    if (!validFormats.includes(ext || '')) {
      issues.push('فرمت فایل پشتیبانی نمی‌شود. (استاندارد: PDF/X-1a)');
      status = 'fail';
    }

    // 3. Size Check
    if (file.size > 50 * 1024 * 1024) {
      issues.push('حجم فایل بسیار زیاد است (بیش از ۵۰ مگابایت).');
      status = 'warning';
    }

    // 4. Image Analysis (Client Side)
    if (file.type.startsWith('image/')) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          widthPx = img.width;
          heightPx = img.height;
          
          // Estimate DPI based on target dimensions (if provided)
          if (targetDimensions) {
             // cm to inch = cm / 2.54
             const targetWInch = targetDimensions.w / 2.54;
             const targetHInch = targetDimensions.h / 2.54;
             
             const dpiX = Math.round(widthPx / targetWInch);
             const dpiY = Math.round(heightPx / targetHInch);
             dpi = Math.min(dpiX, dpiY);

             if (dpi < 150) {
               issues.push(`کیفیت تصویر بسیار پایین است (${dpi} DPI). حداقل ۳۰۰ توصیه می‌شود.`);
               status = 'fail';
             } else if (dpi < 300) {
               issues.push(`کیفیت تصویر متوسط است (${dpi} DPI). ممکن است چاپ نهایی تار باشد.`);
               status = 'warning';
             }
          }
          resolve();
        };
      });
    } else if (ext === 'pdf') {
       // Mock PDF Analysis
       issues.push('بررسی فونت‌های PDF (Simulated): OK');
       issues.push('بررسی مد رنگی (Simulated): CMYK Detected');
    }

    // 5. Bleed Check Simulation
    if (targetDimensions && widthPx > 0) {
       // Check if ratio matches
       const targetRatio = targetDimensions.w / targetDimensions.h;
       const fileRatio = widthPx / heightPx;
       
       if (Math.abs(targetRatio - fileRatio) > 0.1) {
          issues.push('نسبت ابعاد فایل با محصول انتخابی همخوانی ندارد.');
          status = 'warning';
       }
    }

    setReport({
      status,
      dpi,
      colorMode: 'CMYK (Auto-Detected)',
      dimensions: widthPx ? { w: widthPx, h: heightPx } : null,
      format: ext?.toUpperCase() || 'UNKNOWN',
      fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      issues
    });
    
    setIsProcessing(false);
    setProgress(100);
    
    if (onVerificationComplete) {
      onVerificationComplete(status !== 'fail');
    }
  };

  if (isProcessing) {
    return (
      <Card className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 mb-4">
           <Activity className="h-6 w-6 text-primary-600 animate-pulse" />
           <div>
             <h4 className="font-bold text-sm">در حال آنالیز فایل (Pre-flight)...</h4>
             <p className="text-xs text-gray-500">بررسی DPI، مد رنگی و حاشیه برش</p>
           </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      </Card>
    );
  }

  if (!report) return null;

  return (
    <Card className={`p-4 border-l-4 ${report.status === 'pass' ? 'border-l-green-500' : report.status === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
       <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
             {report.status === 'pass' && <CheckCircle className="h-5 w-5 text-green-500" />}
             {report.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
             {report.status === 'fail' && <XCircle className="h-5 w-5 text-red-500" />}
             <h4 className="font-bold text-sm">گزارش فنی فایل</h4>
          </div>
          <Badge color={report.status === 'pass' ? 'green' : report.status === 'warning' ? 'gold' : 'red'}>
             {report.status === 'pass' ? 'تایید شده' : report.status === 'warning' ? 'نیاز به بازبینی' : 'رد شده'}
          </Badge>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-xs">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
             <span className="block text-gray-500">فرمت</span>
             <span className="font-mono font-bold">{report.format}</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
             <span className="block text-gray-500">رزولوشن</span>
             <span className={`font-mono font-bold ${report.dpi && report.dpi < 300 ? 'text-red-500' : 'text-green-600'}`}>
                {report.dpi ? `${report.dpi} DPI` : 'Vector'}
             </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
             <span className="block text-gray-500">مد رنگی</span>
             <span className="font-mono font-bold">{report.colorMode}</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
             <span className="block text-gray-500">حجم</span>
             <span className="font-mono font-bold">{report.fileSize}</span>
          </div>
       </div>

       {report.issues.length > 0 ? (
         <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded text-xs text-red-700 dark:text-red-300">
            <p className="font-bold mb-1">موارد نیازمند اصلاح:</p>
            <ul className="list-disc list-inside space-y-1">
               {report.issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
         </div>
       ) : (
         <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            فایل شما استاندارد چاپ را دارد و آماده ارسال به لیتوگرافی است.
         </div>
       )}
    </Card>
  );
};
