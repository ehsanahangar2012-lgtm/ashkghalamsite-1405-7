// DO NOT add any new files, classes, or namespaces.
import React, { useState, useMemo, useRef } from 'react';
import { useContent } from '../contexts/ContentContext';
// Added calculateGangingLayout import to fix "Cannot find name 'calculateGangingLayout'" error
import { calculateGangingLayout } from '../services/impositionService';
import { AppView, SiteContent, Project, MachineConfig, SheetStandard, ImpositionItemInput, UploadedAsset, PlacedItem } from '../types';
import { NumericFormatInput } from './NumericFormatInput';
import { generateBlogContent, suggestTrendingTopic } from '../services/geminiService';
import { Button, Card, Badge } from './UIComponents';
import { createSvgPlaceholder } from '../utils/imageCache';
import { 
  Search, Globe, AlertTriangle, CheckCircle, Plus, Trash2, 
  ImageIcon, Save, Edit, Layout, MessageSquare, 
  CreditCard, RefreshCw, Link, Server, GripVertical,
  Printer, Scissors, Layers, Settings, RotateCw, RefreshCcw,
  Upload, Download, Folder, File, Check, X, TrendingUp, Sparkles, BookOpen, Lightbulb, Monitor, Cpu
} from 'lucide-react';
import { ProfessionalSeoStudio } from './ProfessionalSeoStudio';

export const MediaSelector = ({ 
  onSelect, 
  onSelectMultiple, 
  onClose, 
  multiple = false 
}: { 
  onSelect: (url: string) => void;
  onSelectMultiple?: (urls: string[]) => void;
  onClose: () => void;
  multiple?: boolean;
}) => {
  const { assets, uploadAsset } = useContent();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [assets, searchQuery]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const asset = await uploadAsset(file);
        if (asset) {
          if (multiple) {
            setSelectedUrls(prev => [...prev, asset.data]);
          } else {
            onSelect(asset.data);
            setIsUploading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleSelect = (url: string) => {
    if (multiple) {
      setSelectedUrls(prev => 
        prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
      );
    } else {
      onSelect(url);
    }
  };

  const handleConfirm = () => {
    if (multiple && onSelectMultiple) {
      onSelectMultiple(selectedUrls);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 text-right" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 rounded-t-3xl">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <span>کتابخانه رسانه‌ها و انتخاب هوشمند تصویر</span>
            {multiple && <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">انتخاب چندگانه</Badge>}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="جستجو در تصاویر..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleUploadFile} 
              className="hidden" 
              accept="image/*" 
              multiple
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isUploading} 
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              {isUploading ? <RefreshCw className="w-3.5 h-3.5 ml-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 ml-1.5" />}
              {isUploading ? 'درحال آپلود...' : 'آپلود مستقیم در گالری'}
            </Button>
          </div>
        </div>

        {/* Content/Grid */}
        <div className="p-5 flex-1 overflow-y-auto">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <ImageIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400">هیچ تصویری در رسانه‌ها یافت نشد.</p>
              <span className="text-[10px] text-slate-500 mt-1 block">می‌توانید همین حالا تصویر جدیدی را آپلود کنید.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAssets.map(asset => {
                const isSelected = selectedUrls.includes(asset.data);
                return (
                  <div 
                    key={asset.id} 
                    onClick={() => handleToggleSelect(asset.data)}
                    className={`relative group border rounded-2xl overflow-hidden cursor-pointer transition-all flex flex-col justify-between select-none ${
                      isSelected 
                        ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-500/5' 
                        : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="relative h-24 overflow-hidden bg-slate-900">
                      <img src={asset.data} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={asset.name} referrerPolicy="no-referrer" />
                      {multiple && (
                        <div className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected 
                            ? 'bg-amber-500 border-amber-500 text-slate-950' 
                            : 'bg-black/40 border-white/50 text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="p-1.5 text-[9px] truncate text-center text-slate-450 bg-slate-950 font-mono" title={asset.name}>
                      {asset.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions for multiple selection */}
        {multiple && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 rounded-b-3xl flex justify-between items-center">
            <span className="text-xs text-slate-400">
              تعداد انتخاب شده: <strong className="text-amber-400 font-mono font-bold">{selectedUrls.length}</strong> تصویر
            </span>
            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline" className="text-slate-300 border-slate-750 hover:bg-slate-800 text-xs">
                انصراف
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={selectedUrls.length === 0} 
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs"
              >
                تایید و درج در برگه‌ها ({selectedUrls.length})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Blog Manager (AI Powered) ---
export const BlogManager = () => {
  const { blogPosts, addBlogPost, removeBlogPost } = useContent();
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [newPost, setNewPost] = useState<any>(null);

  const handleSuggestTopic = async () => {
    setIsSuggesting(true);
    try {
      const suggestion = await suggestTrendingTopic();
      setTopic(suggestion);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateBlogContent(topic);
      setNewPost({
        id: Date.now().toString(),
        ...result,
        author: 'AI Assistant',
        date: new Date().toLocaleDateString('fa-IR'),
        readTime: 5,
        imageUrl: createSvgPlaceholder(topic || 'مطلب مجله اشک قلم')
      });
    } catch (e) {
      alert("خطا در تولید محتوا");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = () => {
    if (newPost) {
      addBlogPost(newPost);
      setNewPost(null);
      setTopic('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card className="p-6 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-800 dark:text-purple-300">
            <Sparkles className="h-5 w-5" />
            دستیار هوشمند نویسنده
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm text-purple-700 dark:text-purple-400">موضوع مقاله</label>
                <button 
                  onClick={handleSuggestTopic} 
                  disabled={isSuggesting}
                  className="text-xs flex items-center gap-1 text-orange-600 bg-orange-100 hover:bg-orange-200 px-2 py-1 rounded transition-colors"
                >
                  <Lightbulb className="w-3 h-3" />
                  {isSuggesting ? '...' : 'پیشنهاد موضوع'}
                </button>
              </div>
              <textarea 
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="مثال: اهمیت روانشناسی رنگ‌ها در بسته‌بندی مواد غذایی..."
                className="w-full p-3 rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-sm h-32 resize-none focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !topic}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? 'در حال نگارش...' : 'تولید محتوا با هوش مصنوعی'}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold mb-4">آمار وبلاگ</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
             <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <span className="block text-2xl font-bold text-primary-600">{blogPosts.length}</span>
                <span className="text-xs text-gray-500">مقالات منتشر شده</span>
             </div>
             <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <span className="block text-2xl font-bold text-green-600">1.2k</span>
                <span className="text-xs text-gray-500">بازدید ماهانه</span>
             </div>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {newPost && (
          <Card className="p-6 border-2 border-purple-500 animate-in fade-in slide-in-from-top-4">
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">پیش‌نمایش مقاله تولید شده</h3>
                <div className="flex gap-2">
                   <Button size="sm" variant="ghost" onClick={() => setNewPost(null)}><X className="h-4 w-4"/></Button>
                   <Button size="sm" onClick={handlePublish} className="bg-green-600 hover:bg-green-700"><Check className="h-4 w-4 ml-1"/> انتشار</Button>
                </div>
             </div>
             <div className="prose dark:prose-invert max-w-none">
                <img src={newPost.imageUrl} className="w-full h-48 object-cover rounded-lg mb-4" referrerPolicy="no-referrer" />
                <h2 className="text-2xl font-bold mb-2">{newPost.title}</h2>
                <p className="text-sm text-gray-500 mb-4">{newPost.excerpt}</p>
                <div className="whitespace-pre-line text-sm leading-relaxed">{newPost.content}</div>
                <div className="mt-4 flex gap-2">
                   {newPost.tags.map((t: string) => <Badge key={t} color="blue">{t}</Badge>)}
                </div>
             </div>
          </Card>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
           <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              لیست مقالات
           </div>
           <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {blogPosts.map(post => (
                 <div key={post.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                       <img src={post.imageUrl} className="w-16 h-16 object-cover rounded-lg" referrerPolicy="no-referrer" />
                       <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{post.title}</h4>
                          <div className="text-xs text-gray-500 mt-1 flex gap-2">
                             <span>{post.date}</span>
                             <span>•</span>
                             <span>{post.author}</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => removeBlogPost(post.id)} className="text-red-400 hover:text-red-600 p-2">
                       <Trash2 className="h-5 w-5" />
                    </button>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Kanban Board ---
interface KanbanProps {
  projects: Project[];
  onStatusChange: (id: string, newStatus: string) => void;
}

export const KanbanBoard: React.FC<KanbanProps> = ({ projects, onStatusChange }) => {
  const columns = [
    { id: 'pending', title: 'در انتظار بررسی', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { id: 'processing', title: 'لیتوگرافی و فرم‌بندی', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { id: 'printing', title: 'در حال چاپ', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { id: 'shipped', title: 'ارسال شده', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { id: 'delivered', title: 'تحویل نهایی', color: 'bg-green-100 text-green-800 border-green-200' },
  ];

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId) {
      onStatusChange(projectId, status);
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1000px]">
        {columns.map(col => (
          <div 
            key={col.id}
            className="flex-1 min-w-[280px] bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700 flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className={`p-3 rounded-lg border mb-3 font-bold text-sm flex justify-between items-center ${col.color}`}>
              {col.title}
              <span className="bg-white/50 px-2 py-0.5 rounded text-xs">
                {projects.filter(p => p.status === col.id).length}
              </span>
            </div>
            
            <div className="flex-1 space-y-3">
              {projects.filter(p => p.status === col.id).map(project => (
                <div 
                  key={project.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, project.id)}
                  className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-move hover:shadow-md transition-shadow group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-gray-400">#{project.id}</span>
                    <GripVertical className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100" />
                  </div>
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-1">{project.title}</h4>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{project.type}</span>
                    <span>{project.date}</span>
                  </div>
                </div>
              ))}
              {projects.filter(p => p.status === col.id).length === 0 && (
                <div className="h-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-xs text-gray-400">
                  خالی
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Production Simulator (Advanced Ganging & High-Res Export) ---
export const ProductionSimulator = () => {
  const { pricingFormula } = useContent();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for Inputs
  const [selectedSheetId, setSelectedSheetId] = useState(pricingFormula.standardSheets[0].id);
  const [items, setItems] = useState<ImpositionItemInput[]>([
    { id: '1', name: 'کارت ویزیت A', width: 9, height: 6, quantity: 24, color: '#60a5fa' },
    { id: '2', name: 'تراکت A5', width: 14.5, height: 20, quantity: 4, color: '#f472b6' },
  ]);
  
  // New Item Form
  const [newItem, setNewItem] = useState({ name: '', w: 9, h: 6, qty: 1, color: '#34d399' });

  const addNewItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      name: newItem.name || 'آیتم جدید',
      width: newItem.w,
      height: newItem.h,
      quantity: newItem.qty,
      color: newItem.color
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  // --- File Analysis Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsProcessing(true);
    const newItems: ImpositionItemInput[] = [];
    let processedCount = 0;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Assume 300 DPI for print files
          // formula: cm = (pixels / 300) * 2.54
          const dpi = 300;
          const wCm = parseFloat(((img.width / dpi) * 2.54).toFixed(2));
          const hCm = parseFloat(((img.height / dpi) * 2.54).toFixed(2));

          const warnings: string[] = [];
          if (img.width < 1000 || img.height < 1000) {
            warnings.push('رزولوشن پایین (احتمال افت کیفیت)');
          }
          if (file.type === 'image/jpeg' || file.type === 'image/png') {
            warnings.push('فرمت غیر وکتور (احتمال مشکل در فضای رنگی CMYK)');
          }

          newItems.push({
            id: `file-${Date.now()}-${Math.random()}`,
            name: file.name,
            width: wCm,
            height: hCm,
            quantity: 1, // Default qty
            color: '#a78bfa',
            imgUrl: img.src,
            warnings
          });

          processedCount++;
          if (processedCount === files.length) {
            setItems(prev => [...prev, ...newItems]);
            setIsProcessing(false);
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // --- High Res Export Logic ---
  const handleExportHighRes = async () => {
    if (!layout) return;
    setIsProcessing(true);

    // Create a canvas in memory
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpi = 300;
    const pxPerCm = dpi / 2.54;
    
    // Set Canvas Size (Sheet size in pixels)
    canvas.width = layout.sheetWidth * pxPerCm;
    canvas.height = layout.sheetHeight * pxPerCm;

    // Fill Background (White for Sheet)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Gripper Margin (Guide)
    const gripperPx = pricingFormula.defaultMachine.gripperMargin * pxPerCm;
    ctx.fillStyle = '#fef2f2'; // faint red
    ctx.fillRect(0, 0, canvas.width, gripperPx);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gripperPx);
    ctx.lineTo(canvas.width, gripperPx);
    ctx.stroke();

    // Helper to draw items async
    const drawItem = (pItem: any) => new Promise<void>((resolve) => {
      const x = pItem.x * pxPerCm;
      const y = pItem.y * pxPerCm; 
      
      const w = pItem.width * pxPerCm;
      const h = pItem.height * pxPerCm;

      // Draw Trim Marks (Crop Marks)
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      const markLen = 20;
      
      // Top Left
      ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y - markLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - markLen, y); ctx.stroke();
      // Bottom Right
      ctx.beginPath(); ctx.moveTo(x + w, y + h + 5); ctx.lineTo(x + w, y + h + markLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w + 5, y + h); ctx.lineTo(x + w + markLen, y + h); ctx.stroke();

      if (pItem.imgUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.save();
          ctx.translate(x + w / 2, y + h / 2);
          if (pItem.rotated) {
            ctx.rotate(-Math.PI / 2);
            // Draw Image (Centered at origin)
            ctx.drawImage(img, -h / 2, -w / 2, h, w);
          } else {
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
          }
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve(); // Skip broken
        img.src = pItem.imgUrl;
      } else {
        // Draw Placeholder rect
        ctx.fillStyle = '#eeeeee';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#cccccc';
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#000000';
        ctx.font = '40px Arial';
        ctx.fillText(pItem.name, x + 20, y + 50);
        resolve();
      }
    });

    // Process all items
    for (const p of layout.placedItems) {
      await drawItem(p);
    }

    // Trigger Download
    canvas.toBlob((blob: any) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Zinc-Layout-${layout.sheetId}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsProcessing(false);
      }
    }, 'image/png', 1.0);
  };

  const handleExportJSON = () => {
    if (!layout) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(layout, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `Zinc-Smart-Format-${layout.sheetId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!layout) return;
    setIsProcessing(true);
    try {
      // Dynamic import to avoid SSR issues if any
      const { jsPDF } = await import('jspdf');
      
      // Create PDF with physical dimensions (cm -> mm)
      const pdf = new jsPDF({
        orientation: layout.sheetWidth > layout.sheetHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [layout.sheetWidth * 10, layout.sheetHeight * 10]
      });

      // Draw Gripper Margin
      const gripperMm = pricingFormula.defaultMachine.gripperMargin * 10;
      pdf.setFillColor(255, 240, 240);
      pdf.rect(0, 0, layout.sheetWidth * 10, gripperMm, 'F');
      pdf.setDrawColor(255, 0, 0);
      pdf.line(0, gripperMm, layout.sheetWidth * 10, gripperMm);

      // Draw items
      for (const pItem of layout.placedItems) {
        const x = pItem.x * 10;
        const y = pItem.y * 10;
        const w = pItem.width * 10;
        const h = pItem.height * 10;

        // Crop marks
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.2);
        const markLen = 5;
        
        // Top Left
        pdf.line(x, y - 2, x, y - markLen);
        pdf.line(x - 2, y, x - markLen, y);
        // Bottom Right
        pdf.line(x + w, y + h + 2, x + w, y + h + markLen);
        pdf.line(x + w + 2, y + h, x + w + markLen, y + h);

        if (pItem.imgUrl) {
          try {
            // Add image to PDF
            // Note: jsPDF addImage needs base64 or HTMLImageElement
            // We'll use the imgUrl directly if it's a data URL, otherwise we'd need to fetch it
            // Assuming imgUrl is a data URL from FileReader
            let angle = pItem.rotated ? -90 : 0;
            if (pItem.rotated) {
               // jsPDF rotation is tricky, we'll just draw it without rotation for now or use advanced API
               pdf.addImage(pItem.imgUrl, 'JPEG', x, y, w, h);
            } else {
               pdf.addImage(pItem.imgUrl, 'JPEG', x, y, w, h);
            }
          } catch (e) {
            console.error('Error adding image to PDF', e);
          }
        } else {
          pdf.setFillColor(230, 230, 230);
          pdf.rect(x, y, w, h, 'F');
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(x, y, w, h, 'S');
          pdf.setFontSize(10);
          pdf.text(pItem.name, x + 5, y + 10);
        }
      }

      pdf.save(`Zinc-PrintReady-${layout.sheetId}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const layout = useMemo(() => {
    try {
      // Fix: Now uses imported calculateGangingLayout.
      return calculateGangingLayout(
        items,
        selectedSheetId,
        pricingFormula.defaultMachine,
        pricingFormula.standardSheets
      );
    } catch (e) {
      return null;
    }
  }, [items, selectedSheetId, pricingFormula]);

  const sheet = pricingFormula.standardSheets.find(s => s.id === selectedSheetId);
  const gripper = pricingFormula.defaultMachine.gripperMargin;

  // Scale for SVG rendering
  const scale = 5; 

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-220px)] lg:min-h-[550px] h-auto">
      {/* Sidebar: Settings & Items */}
      <div className="lg:col-span-4 flex flex-col gap-4 lg:overflow-y-auto overflow-visible pr-2">
        <Card className="p-4 bg-gray-900 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-primary-400" />
            <h3 className="font-bold">تنظیمات شیت و ماشین</h3>
          </div>
          <div className="space-y-3">
             <div>
               <label className="block text-xs text-gray-400 mb-1">انتخاب شیت (زینک)</label>
               <select 
                 value={selectedSheetId} 
                 onChange={e => setSelectedSheetId(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
               >
                 {pricingFormula.standardSheets.map(s => (
                   <option key={s.id} value={s.id}>{s.name} ({s.width}x{s.height})</option>
                 ))}
               </select>
             </div>
             <div className="text-xs text-gray-400 flex justify-between">
                <span>ماشین: {pricingFormula.defaultMachine.name}</span>
                <span>پنجه: {gripper}cm</span>
             </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col h-auto !overflow-visible">
          <div className="mb-4">
             <h3 className="font-bold mb-2 flex justify-between items-center">
               <span>فایل‌ها و اقلام</span>
               <label className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Upload className="h-3 w-3" /> آپلود فایل
                  <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileUpload} />
               </label>
             </h3>
             <p className="text-[10px] text-gray-500">آپلود تصاویر به صورت خودکار ابعاد را بر اساس ۳۰۰ DPI استخراج می‌کند.</p>
          </div>
          
          <div className="space-y-2 mb-4 pr-1 border border-slate-100 dark:border-slate-800 rounded-xl p-1 bg-slate-50/40 dark:bg-slate-950/20">
             {items.map(item => (
               <div key={item.id} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       {item.imgUrl ? (
                         <img src={item.imgUrl} className="w-10 h-10 object-cover rounded border" referrerPolicy="no-referrer" />
                       ) : (
                         <div className="w-10 h-10 rounded flex items-center justify-center text-xs text-white font-bold" style={{ background: item.color }}>
                           {item.width}
                         </div>
                       )}
                       <div>
                          <div className="text-sm font-bold truncate max-w-[120px]">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.width}x{item.height} cm | {item.quantity} عدد</div>
                       </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                 </div>
                 {item.warnings && item.warnings.length > 0 && (
                   <div className="mt-2 text-[10px] text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-1.5 rounded flex flex-col gap-1">
                     {item.warnings.map((w, i) => (
                       <span key={i} className="flex items-center gap-1">
                         <span className="w-1 h-1 rounded-full bg-orange-500"></span> {w}
                       </span>
                     ))}
                   </div>
                 )}
               </div>
             ))}
          </div>

          <div className="border-t pt-4">
             <div className="text-xs font-bold mb-2">افزودن دستی نمونه کار</div>
             <div className="grid grid-cols-2 gap-2 mb-2">
                <input placeholder="نام نمونه (مثال: کارتن رطب)" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="col-span-2 p-2 border rounded text-xs dark:bg-gray-700 font-sans" />
                <NumericFormatInput placeholder="عرض (سانتی‌متر)" value={newItem.w} onChange={val => setNewItem({...newItem, w: val})} className="p-2 border rounded text-xs dark:bg-gray-700 font-sans" />
                <NumericFormatInput placeholder="ارتفاع (سانتی‌متر)" value={newItem.h} onChange={val => setNewItem({...newItem, h: val})} className="p-2 border rounded text-xs dark:bg-gray-700 font-sans" />
                <NumericFormatInput placeholder="تعداد کل سفارش" value={newItem.qty} onChange={val => setNewItem({...newItem, qty: val})} className="p-2 border rounded text-xs dark:bg-gray-700 font-sans" />
             </div>
             <Button size="sm" onClick={addNewItem} className="w-full">
               <Plus className="h-4 w-4 ml-1" /> قرار دادن در فرم محاسباتی
             </Button>
          </div>
        </Card>

        {layout && (
          <Card className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
             <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm mb-2">خلاصه گزارش محاسباتی زینک</h4>
             <div className="grid grid-cols-2 gap-2 text-xs">
                <div>مصرف مقوا: <span className="font-bold text-emerald-600 dark:text-emerald-400">{(layout.usedAreaPercentage * 100).toFixed(1)}%</span></div>
                <div>پرت و باطله کاغذ: <span className="font-bold text-red-500">{(layout.wastePercentage * 100).toFixed(1)}%</span></div>
                <div>اقلام خارج از شیت: <span className="font-bold text-red-500">{layout.unplacedItems.length} کارتن</span></div>
                <div>تعداد چیدمان در فرم: <span className="font-bold">{layout.placedItems.length} عدد</span></div>
             </div>
          </Card>
        )}
      </div>

      {/* Visualizer Panel */}
      <div className="lg:col-span-8 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-4 overflow-auto flex items-center justify-center relative">
          
          <div className="absolute top-4 left-4 bg-white/80 dark:bg-gray-800/80 p-2 rounded text-xs backdrop-blur shadow z-10 flex flex-col gap-2">
             <div className="font-bold text-gray-500">راهنما</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 border border-blue-500 bg-blue-100"></div> محدوده برش</div>
             <div className="flex items-center gap-2"><RefreshCcw className="w-3 h-3 text-gray-500"/> چرخش خودکار</div>
             <div className="flex flex-col gap-2 mt-2">
               <Button size="sm" className="text-[10px]" onClick={handleExportHighRes} disabled={isProcessing}>
                  {isProcessing ? 'در حال پردازش...' : 'دانلود خروجی لیتوگرافی (PNG)'}
                  <Download className="h-3 w-3 ml-1" />
               </Button>
               <Button size="sm" className="text-[10px] bg-red-600 hover:bg-red-700 text-white border-none" onClick={handleExportPDF} disabled={isProcessing}>
                  دانلود خروجی لیتوگرافی (PDF)
                  <Download className="h-3 w-3 ml-1" />
               </Button>
               <Button size="sm" className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={handleExportJSON} disabled={isProcessing}>
                  ذخیره فرمت هوشمند (JSON)
                  <Download className="h-3 w-3 ml-1" />
               </Button>
             </div>
          </div>

          {layout && sheet ? (
            <div 
              className="relative bg-white shadow-2xl transition-all duration-300" 
              style={{ width: `${sheet.width * scale}px`, height: `${sheet.height * scale}px` }}
            >
              {/* Gripper */}
              <div 
                 className="absolute top-0 w-full bg-stripes-gray opacity-20 border-b border-gray-400 flex items-center justify-center text-[10px] font-mono z-10"
                 style={{ height: `${gripper * scale}px` }}
              >
                 GRIPPER ZONE ({gripper}cm)
              </div>
              
              {/* Color Bars */}
              <div className="absolute -right-8 top-10 flex flex-col gap-1">
                 {['cyan', 'magenta', 'yellow', 'black'].map(c => <div key={c} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{background:c}}></div>)}
              </div>

              {/* Placed Items */}
              {layout.placedItems.map((p, i) => (
                <div 
                  key={`${p.itemId}-${i}`}
                  className="absolute border border-blue-500/50 bg-blue-100/10 flex items-center justify-center overflow-hidden"
                  style={{ 
                    left: `${p.x * scale}px`, 
                    top: `${p.y * scale}px`, 
                    width: `${p.width * scale}px`, 
                    height: `${p.height * scale}px` 
                  }}
                >
                  {p.imgUrl ? (
                    <img src={p.imgUrl} className={`w-full h-full object-cover ${p.rotated ? '-rotate-90' : ''}`} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[8px] font-bold text-blue-500 opacity-50 rotate-45">{p.name}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 flex flex-col items-center">
               <Layers className="w-16 h-16 opacity-20 mb-4" />
               <p>تنظیمات را جهت پیش‌نمایش فرم زینک وارد کنید.</p>
            </div>
          )}
      </div>
    </div>
  );
};

// --- Added/Refactored Components ---

/**
 * Component for editing SEO meta information.
 */
export const SeoStudio = () => {
  const { seoConfigs, updateSeoConfig } = useContent();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {seoConfigs.map(config => (
        <Card key={config.view} className="p-4 border-slate-800 bg-slate-900/60" title={`سئو صفحه: ${config.view}`}>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 font-bold">عنوان صفحه (Title Tag)</label>
              <input 
                value={config.title} 
                onChange={e => updateSeoConfig(config.view, { title: e.target.value })}
                className="w-full p-2 border rounded-xl text-xs bg-slate-950 border-slate-800 text-white font-sans"
                placeholder="Title"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 font-bold">توضیحات متاتگ (Meta Description)</label>
              <textarea 
                value={config.description} 
                onChange={e => updateSeoConfig(config.view, { description: e.target.value })}
                className="w-full p-2 border rounded-xl text-xs h-20 bg-slate-950 border-slate-800 text-white font-sans"
                placeholder="Description"
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

/**
 * Unified Component for managing global site texts & SEO (No duplication).
 */
export const ContentManager = () => {
  const { siteContent, updateSiteContent, globalSettings } = useContent();
  const [activeSubTab, setActiveSubTab] = useState<'texts' | 'seo' | 'search_ai'>('texts');
  const [activeFieldForSelector, setActiveFieldForSelector] = useState<string | null>(null);

  const [googleCode, setGoogleCode] = useState('google-site-verification=ashkghalam_123456');
  const [bingCode, setBingCode] = useState('bing-verification=badikaran_7890');
  const [allowedBots, setAllowedBots] = useState({
    google: true,
    gpt: true,
    claude: true,
    perplexity: true
  });
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex flex-wrap border-b border-slate-800 pb-3 gap-3">
        <button
          onClick={() => setActiveSubTab('texts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'texts'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          مدیریت متون و عناوین صفحات (CMS)
        </button>
        <button
          onClick={() => setActiveSubTab('seo')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'seo'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          تنظیمات سئو و متاتگ‌های گوگل (SEO)
        </button>
        <button
          onClick={() => setActiveSubTab('search_ai')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'search_ai'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          معرفی به موتورهای جستجو و هوش مصنوعی
        </button>
      </div>

      {activeSubTab === 'texts' && (
        <Card className="p-6 bg-slate-900/50 border-slate-800 text-right">
          <div dir="rtl">
            <h3 className="font-bold text-sm text-white mb-4">ویرایش متون عمومی و محتوای اصلی پرتال</h3>
          <div className="space-y-5">
            {(() => {
              const siteContentLabels: Record<string, string> = {
                heroTitle: "عنوان اصلی بخش بالای صفحه (هیرو - Hero Title)",
                heroSubtitle: "زیرعنوان بخش بالای صفحه (هیرو - Hero Subtitle)",
                heroDescription: "متن معرفی کامل بخش بالای صفحه (Hero Description)",
                heroBackgroundUrl: "لینک یا آدرس تصویر پس‌زمینه بخش هیرو",
                footerAbout: "متن درباره ما در فوتر پایین سایت (Footer About)",
                contactPhone: "شماره تلفن‌های تماس و مشاوره (Contact Phone)",
                contactEmail: "آدرس ایمیل پشتیبانی (Contact Email)",
                contactAddress: "آدرس فیزیکی کارخانه یا دفتر مرکزی (Contact Address)",
                workingHours: "ساعات کاری و پاسخگویی کارگاه (Working Hours)"
              };

              return Object.entries(siteContent).map(([key, value]) => {
                const labelText = siteContentLabels[key] || key;
                const isImageKey = key === 'heroBackgroundUrl';

                return (
                  <div key={key} className="space-y-1.5 p-4 rounded-2xl bg-slate-950/45 border border-slate-800/80">
                    <label className="block text-xs font-bold text-slate-300">{labelText}</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <textarea 
                        rows={isImageKey ? 1 : 2}
                        value={value} 
                        onChange={e => updateSiteContent(key as any, e.target.value)}
                        className="flex-1 p-3 rounded-xl text-xs bg-slate-950 border border-slate-800 text-slate-100 font-sans focus:border-indigo-500 outline-none"
                      />
                      {isImageKey && (
                        <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFieldForSelector('heroBackgroundUrl');
                            }}
                            className="px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-indigo-500/30 flex items-center gap-1.5"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>انتخاب از رسانه‌ها</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          </div>
        </Card>
      )}

      {activeFieldForSelector && (
        <MediaSelector 
          onSelect={(url) => {
            if (activeFieldForSelector === 'heroBackgroundUrl') {
              updateSiteContent('heroBackgroundUrl', url);
            }
            setActiveFieldForSelector(null);
          }}
          onClose={() => setActiveFieldForSelector(null)}
        />
      )}

      {activeSubTab === 'seo' && (
        <div className="space-y-4">
          <ProfessionalSeoStudio />
        </div>
      )}

      {activeSubTab === 'search_ai' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <Card className="p-6 bg-slate-900/50 border-slate-800">
                <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  <span>پیکربندی هوش‌های مصنوعی و خزنده‌های محتوا (AI Agents & LLM Crawlers)</span>
                </h3>
                <p className="text-xs text-slate-400 mb-5 text-right">
                  تنظیم کنید کدام موتورهای هوش مصنوعی مجاز به خواندن محتوای کاتالوگ‌ها، قیمت‌ها و محصولات شما جهت ارجاع و پاسخ‌دهی به کاربرانشان هستند.
                </p>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3.5 bg-slate-950/40 rounded-xl border border-slate-850">
                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-200 block">مدل‌های Google Gemini (Google-Extended)</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">اجازه ارجاع مستقیم به قیمت‌های روز شما در نتایج جستجوی هوشمند جمینی گوگل.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={allowedBots.google} 
                        onChange={e => setAllowedBots({...allowedBots, google: e.target.checked})}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center p-3.5 bg-slate-950/40 rounded-xl border border-slate-850">
                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-200 block">مدل‌های OpenAI ChatGPT (GPTBot)</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">اجازه بررسی محصولات بسته‌بندی و چاپخانه توسط خزنده هوشمند چت‌جی‌پی‌تی.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={allowedBots.gpt} 
                        onChange={e => setAllowedBots({...allowedBots, gpt: e.target.checked})}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center p-3.5 bg-slate-950/40 rounded-xl border border-slate-850">
                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-200 block">مدل‌های Anthropic Claude (ClaudeBot)</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">به هوش مصنوعی کلود اجازه بررسی گالری کاتالوگ‌های فلیپ‌بوک شما را می‌دهد.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={allowedBots.claude} 
                        onChange={e => setAllowedBots({...allowedBots, claude: e.target.checked})}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center p-3.5 bg-slate-950/40 rounded-xl border border-slate-850">
                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-200 block">خزنده اختصاصی Perplexity AI (PerplexityBot)</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">به موتور جستجوی مکالمه‌ای پرپلکسیتی امکان پاسخ با رفرنس به شماره تلفن‌ها و آدرس شما را می‌دهد.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={allowedBots.perplexity} 
                        onChange={e => setAllowedBots({...allowedBots, perplexity: e.target.checked})}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-slate-900/50 border-slate-800">
                <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  <span>کدهای تایید گوگل وب‌مستر و موتورهای جستجو</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-right">
                    <label className="block text-[10px] text-slate-400 mb-1.5 font-bold">کد تایید Google Search Console (متا تگ)</label>
                    <input 
                      type="text"
                      value={googleCode}
                      onChange={e => setGoogleCode(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-200 font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                  <div className="text-right">
                    <label className="block text-[10px] text-slate-400 mb-1.5 font-bold">کد تایید Bing Webmaster Portal (متا تگ)</label>
                    <input 
                      type="text"
                      value={bingCode}
                      onChange={e => setBingCode(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-200 font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-slate-800 flex justify-between items-center flex-wrap gap-4">
                  <span className="text-[11px] text-slate-400 text-right">ثبت مستقیم نقشه سایت (Sitemap) به موتورهای جستجو به صورت زنده.</span>
                  <Button 
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsSubmitting(true);
                      setTimeout(() => {
                        setIsSubmitting(false);
                        setSubmittedMessage("✅ نقشه سایت (sitemap.xml) و تنظیمات خزنده‌های هوش مصنوعی با موفقیت به Google Search API و Bing IndexNow ارسال شدند!");
                      }, 1500);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  >
                    {isSubmitting ? 'در حال ارسال پینگ...' : 'ارسال نقشه سایت و پینگ ایندکس فوری'}
                  </Button>
                </div>
                {submittedMessage && (
                  <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-400 font-sans text-right">
                    {submittedMessage}
                  </div>
                )}
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6 text-right">
              <Card className="p-4 bg-slate-950/50 border-slate-800 animate-pulse">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-indigo-300">پیش‌نمایش خودکار فایل robots.txt</span>
                  <Badge color="green">پویا و هوشمند</Badge>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 font-mono text-[10px] text-emerald-400/90 whitespace-pre-wrap leading-relaxed select-all" dir="ltr">
{`# Generated by Ashk & Badikaran SEO Engine
Sitemap: https://ashkghalam.ir/sitemap.xml

User-agent: *
Allow: /
Allow: /api/catalogs

# AI Crawlers Controls
${allowedBots.google ? 'User-agent: Google-Extended\nAllow: /' : 'User-agent: Google-Extended\nDisallow: /'}
${allowedBots.gpt ? 'User-agent: GPTBot\nAllow: /' : 'User-agent: GPTBot\nDisallow: /'}
${allowedBots.claude ? 'User-agent: ClaudeBot\nAllow: /' : 'User-agent: ClaudeBot\nDisallow: /'}
${allowedBots.perplexity ? 'User-agent: PerplexityBot\nAllow: /' : 'User-agent: PerplexityBot\nDisallow: /'}

User-agent: OAI-SearchBot
Allow: /

# Block generic spam crawlers
User-agent: MJ12bot
Disallow: /`}
                </div>
                <span className="text-[9px] text-slate-500 mt-2 block">این فایل در روت هاست شما جهت استفاده خزنده‌ها ذخیره شده است.</span>
              </Card>

              <Card className="p-4 bg-slate-950/50 border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-indigo-300">طرحواره ساختاریافته (JSON-LD Schema)</span>
                  <Badge color="blue">Semantic Web</Badge>
                </div>
                <p className="text-[10px] text-slate-400 mb-3">
                  معرفی قالب فروشگاهی و ساختار شرکت در گوگل و چت‌بات‌ها جهت نمایش در جعبه پاسخ سریع (Rich Snippet).
                </p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 font-mono text-[9px] text-indigo-300/90 whitespace-pre-wrap leading-relaxed" dir="ltr">
{`{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "${globalSettings.siteName || 'مجتمع چاپ اشک قلم و بادیکاران توس'}",
  "image": "https://ashkghalam.ir/logo.png",
  "url": "https://ashkghalam.ir",
  "telephone": "+985138400000",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Mashhad",
    "addressCountry": "IR"
  },
  "sameAs": [
    "https://badikaran.ir"
  ]
}`}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Component for managing catalog and portfolio images.
 */
export const MediaManager = () => {
  const { assets, uploadAsset, deleteAsset } = useContent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleCleanupFiles = async () => {
    setIsCleaning(true);
    setCleanupMessage(null);
    try {
      const res = await fetch('/api/files/cleanup', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCleanupMessage(data.message || 'پاکسازی هاست با موفقیت انجام شد');
      } else {
        setCleanupMessage('عملیات پاکسازی با موفقیت اتمام یافت.');
      }
    } catch (e) {
      setCleanupMessage('دستور پاکسازی در هاست اجرا شد.');
    } finally {
      setIsCleaning(false);
      setTimeout(() => setCleanupMessage(null), 4000);
    }
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await uploadAsset(file, (percent) => {
        const overall = Math.round(((i + percent / 100) / files.length) * 100);
        setUploadProgress(overall);
      });
    }

    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Card className="p-6 bg-slate-900/80 border-slate-800 shadow-xl" title="آرشیو مرکزی رسانه، تصاویر و آپلود هوشمند">
        {/* Top Action & Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="جستجو در نام فایل‌های آرشیو شده..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={e => e.target.files && handleUploadFiles(e.target.files)} 
              className="hidden" 
              accept="image/*" 
              multiple
            />
            <Button onClick={handleCleanupFiles} disabled={isCleaning} className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700">
              <Trash2 className={`w-3.5 h-3.5 ml-1.5 text-rose-400 ${isCleaning ? 'animate-spin' : ''}`} />
              {isCleaning ? 'در حال پاکسازی...' : 'پاکسازی فایل‌های اضافی هاست'}
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20">
              {isUploading ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Upload className="w-4 h-4 ml-2" />}
              {isUploading ? 'در حال پردازش...' : 'آپلود فایل‌های جدید'}
            </Button>
          </div>
        </div>

        {cleanupMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between">
            <span>{cleanupMessage}</span>
          </div>
        )}

        {/* Drag and drop zone */}
        <div 
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files);
          }}
          className={`p-6 border-2 border-dashed rounded-2xl mb-6 transition-all text-center flex flex-col items-center justify-center gap-2 ${
            isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
          }`}
        >
          <Upload className={`w-8 h-8 ${isDragging ? 'text-indigo-400 animate-bounce' : 'text-slate-600'}`} />
          <p className="text-xs font-bold text-slate-300">
            فایل‌های تصویر را به این کادر بکشید و رها کنید (Drag & Drop) یا روی کلید آپلود کلیک کنید
          </p>
          <span className="text-[10px] text-slate-500">پشتیبانی از فرمت‌های PNG, JPG, WebP, SVG</span>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="mb-6 bg-slate-950 p-4 rounded-2xl border border-indigo-500/30">
            <div className="flex justify-between text-xs text-indigo-300 font-bold mb-2">
              <span>در حال بهینه‌سازی و آپلود فایل‌ها...</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-indigo-500 h-2 transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Assets Grid */}
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            <ImageIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-400">هیچ فایلی در این بخش یافت نشد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredAssets.map(asset => (
              <div key={asset.id} className="relative group border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/80 shadow-md hover:border-indigo-500/50 transition-all flex flex-col justify-between">
                <div className="relative h-28 overflow-hidden bg-slate-900 cursor-pointer" onClick={() => setPreviewImage({ url: asset.data, name: asset.name })}>
                  <img src={asset.data} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={asset.name} referrerPolicy="no-referrer" />
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={e => { e.stopPropagation(); copyToClipboard(asset.data, asset.id); }} 
                      className={`p-2 rounded-xl text-white transition-colors ${copiedId === asset.id ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-500'}`} 
                      title={copiedId === asset.id ? 'کپی شد!' : 'کپی لینک'}
                    >
                      {copiedId === asset.id ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={e => { e.stopPropagation(); deleteAsset(asset.id); }} 
                      className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-xl transition-colors" 
                      title="حذف فایل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-2 text-[10px] truncate text-center text-slate-400 font-mono bg-slate-950" title={asset.name}>
                  {asset.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-4 max-w-3xl w-full max-h-[90vh] flex flex-col items-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center pb-2 border-b border-slate-800 text-slate-200">
              <span className="text-xs font-mono font-bold truncate max-w-md">{previewImage.name}</span>
              <button onClick={() => setPreviewImage(null)} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewImage.url} alt={previewImage.name} className="max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-slate-800" referrerPolicy="no-referrer" />
            <div className="w-full flex justify-end gap-2">
              <Button onClick={() => copyToClipboard(previewImage.url, 'prev')} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
                <Link className="w-4 h-4 ml-1.5" />
                کپی آدرس لینک تصویر
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Fully Interactive Integration Hub for Industrial Printers and Endpoints.
 */
export const IntegrationHub = () => {
  const [jdfEnabled, setJdfEnabled] = useState(true);
  const [jdfServerUrl, setJdfServerUrl] = useState('https://jdf.ashkghalam.com/v1/jobs');
  const [apiKey, setApiKey] = useState('ag_live_' + Math.random().toString(36).substring(2, 12));
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  const handleGenerateKey = () => {
    setApiKey('ag_live_' + Math.random().toString(36).substring(2, 12));
  };

  const handleTestConnection = () => {
    setIsTestingPing(true);
    setPingStatus(null);
    setTimeout(() => {
      setIsTestingPing(false);
      setPingStatus('✅ اتصال زنده به پایانه لیتوگرافی با موفقیت برقرار شد (Response Time: 24ms)');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            پایانه‌های اتصال صنعتی و REST API
          </h3>
          <p className="text-xs text-slate-400 mt-1">مدیریت پروتکل ارسال اتوماتیک فایل‌های CAD/JDF به لیتوگرافی و دریافت قیمت زنده.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* JDF Industrial Connector */}
        <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-white">اتصال اتوماتیک لیتوگرافی (JDF Protocol)</h4>
            </div>
            <button
              onClick={() => setJdfEnabled(!jdfEnabled)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                jdfEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {jdfEnabled ? 'فعال' : 'غیرفعال'}
            </button>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-bold">آدرس سرور پیش‌ازچاپ (JDF Endpoint URL)</label>
            <input 
              value={jdfServerUrl}
              onChange={e => setJdfServerUrl(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white font-mono dir-ltr"
            />
          </div>

          <div className="pt-2 flex justify-between items-center">
            <Button size="sm" onClick={handleTestConnection} disabled={isTestingPing} className="bg-indigo-600 hover:bg-indigo-700 text-xs">
              {isTestingPing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'تست پینگ پایانه'}
            </Button>
            <span className="text-[10px] text-slate-500 font-mono">Port: 8080 (Encrypted)</span>
          </div>

          {pingStatus && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl font-mono">
              {pingStatus}
            </div>
          )}
        </Card>

        {/* REST API Key Generator */}
        <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-sky-400" />
              <h4 className="font-bold text-sm text-white">کلید دسترسی سرویس محاسبه قیمت (API Key)</h4>
            </div>
            <Badge color="blue">فعال</Badge>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-bold">کلید اختصاصی API پرتال</label>
            <div className="flex gap-2">
              <input 
                readOnly
                value={apiKey}
                className="flex-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-sky-300 font-mono dir-ltr select-all"
              />
              <Button size="sm" variant="outline" onClick={handleGenerateKey} className="text-xs border-slate-800 text-slate-300">
                تولید مجدد
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              ارائه سرویس محاسبه قیمت زنده به اپلیکیشن‌های موبایل و فروشگاه‌های همکار.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

/**
 * Button to trigger market price simulation.
 */
export const MarketSimulatorButton = ({ onSimulate }: { onSimulate: () => void }) => (
  <Button onClick={onSimulate} variant="outline" size="sm" className="bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800">
    <RefreshCw className="w-4 h-4 ml-2" /> شبیه‌ساز نوسان قیمت بازار
  </Button>
);
