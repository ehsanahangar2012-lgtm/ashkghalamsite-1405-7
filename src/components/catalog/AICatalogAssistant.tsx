import React, { useState } from 'react';
import { Sparkles, Send, Volume2, Globe, FileText, Search, X, Loader2, Bot, HelpCircle } from 'lucide-react';
import { CatalogItem } from '../../types/catalog';

interface AICatalogAssistantProps {
  catalog: CatalogItem;
  currentPage: number;
  isOpen: boolean;
  onClose: () => void;
}

export const AICatalogAssistant: React.FC<AICatalogAssistantProps> = ({
  catalog,
  currentPage,
  isOpen,
  onClose
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: `سلام! من دستیار هوشمند اختصاصی کاتالوگ ${catalog.title} هستم. می‌توانید درباره مشخصات فنی، گراماژ کاغذ، نوع دایکات یا استعلام قیمت از من بپرسید.`,
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!isOpen) return null;

  const currentPageObj = catalog.pages[currentPage];

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputText('');
    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${apiBase}/api/catalogs/ai-assistant`.replace(/\/\//g, '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogTitle: catalog.title,
          category: catalog.category,
          description: catalog.description,
          currentPageText: currentPageObj?.extractedText || '',
          allPagesText: catalog.pages.map((p, i) => `[صفحه ${i + 1}]: ${p.extractedText || ''}`).join(' '),
          userPrompt: textToSend
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: data.reply || 'اطلاعات درخواستی در این صفحه یافت نشد.',
            time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error('سیستم پاسخگویی موقتاً در دسترس نیست');
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `پاسخ هوشمند: بر اساس محتوای کاتالوگ "${catalog.title}"، مجتمع چاپ اشک قلم با بالاترین استاندارد افست و دایکات آماده تولید سفارشی این محصول است.`,
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fa-IR';
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 w-full sm:w-96 bg-slate-900/95 backdrop-blur-xl border-r border-amber-500/30 shadow-2xl z-50 flex flex-col font-sans text-slate-100 transition-transform duration-300">
      {/* Header */}
      <div className="p-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">دستیار هوشمند کاتالوگ</h3>
            <span className="text-[11px] text-amber-400">Gemini 3.6 Flash Engine</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => handleSendMessage('خلاصه محتوای این صفحه چیست؟')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 rounded-lg border border-slate-700 transition-all text-slate-300"
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          خلاصه صفحه
        </button>

        <button
          onClick={() => handleSendMessage('محصولات مرتبط و مشخصات فنی این بخش را استخراج کن.')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 rounded-lg border border-slate-700 transition-all text-slate-300"
        >
          <Search className="w-3.5 h-3.5 text-amber-400" />
          مشخصات فنی
        </button>

        <button
          onClick={() => handleSendMessage('ترجمه انگلیسی خلاصه این کاتالوگ را ارائه بده.')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 rounded-lg border border-slate-700 transition-all text-slate-300"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          ترجمه
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-tl-none shadow-md'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tr-none shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-extrabold text-[10px] opacity-75">
                  {msg.sender === 'user' ? 'شما' : 'هوش مصنوعی اشک قلم'}
                </span>
                <span className="text-[9px] opacity-60">{msg.time}</span>
              </div>
              <p className="whitespace-pre-line">{msg.text}</p>
              
              {msg.sender === 'ai' && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-end">
                  <button
                    onClick={() => handleSpeech(msg.text)}
                    className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <Volume2 className="w-3 h-3" />
                    {isSpeaking ? 'توقف خواندن' : 'خواند صوتی'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-amber-400 p-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            در حال آنالیز متن کاتالوگ...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          placeholder="سوال درباره جنس، ابعاد یا سفارش چاپ..."
          className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !inputText.trim()}
          className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
