import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { CatalogProject } from '../../types/flipbook';
import { fetchPublishedProject } from '../../services/projectStorageService';
import { FlipbookViewer } from './FlipbookViewer';

export const EmbedViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<CatalogProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('شناسه کاتالوگ نامعتبر است.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPublishedProject(id)
      .then((data) => {
        if (!cancelled) {
          setProject(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'خطا در بارگذاری کاتالوگ');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#111318] text-stone-200 flex flex-col items-center justify-center gap-3" dir="rtl">
        <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
        <span className="text-xs font-semibold">در حال بارگذاری کاتالوگ دیجیتال...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="w-screen h-screen bg-[#111318] text-stone-200 flex flex-col items-center justify-center gap-3 p-6 text-center" dir="rtl">
        <AlertCircle className="w-8 h-8 text-amber-400" />
        <h1 className="text-sm font-extrabold">{error || 'کاتالوگ یافت نشد'}</h1>
        <p className="text-xs text-stone-400 max-w-sm">
          مطمئن شوید کاتالوگ در استودیو ذخیره و منتشر شده است.
        </p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#111318] p-0 m-0 overflow-hidden">
      <FlipbookViewer project={project} compact />
    </div>
  );
};
