import { MediaItem } from '../types';

const MOCK_CATALOGS: MediaItem[] = [
  {
    id: 'mock-catalog-1',
    title: 'کاتالوگ نمونه محصولات ۲۰۲۴',
    img: 'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=600',
    description: 'این یک کاتالوگ آزمایشی برای نمایش محیط توسعه است.',
    date: new Date().toISOString(),
    pages: [
      'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=600'
    ],
    coverImg: 'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=600',
    pageMetadata: [
      { productName: 'جعبه دارویی', dimensions: '10x5x5', material: 'مقوا ایندربرد' },
      { productName: 'جعبه بهداشتی', dimensions: '12x8x6', material: 'گلاسه' }
    ]
  },
  {
    id: 'mock-catalog-2',
    title: 'بروشور خدمات چاپ',
    img: 'https://images.unsplash.com/photo-1616628188859-7a11abb6fcc9?auto=format&fit=crop&q=80&w=600',
    description: 'بروشور نمونه خدمات چاپ و بسته‌بندی',
    date: new Date(Date.now() - 86400000).toISOString(),
    pages: [
      'https://images.unsplash.com/photo-1616628188859-7a11abb6fcc9?auto=format&fit=crop&q=80&w=600'
    ],
    coverImg: 'https://images.unsplash.com/photo-1616628188859-7a11abb6fcc9?auto=format&fit=crop&q=80&w=600'
  }
];

export async function fetchWithMockFallback<T>(
  url: string, 
  options: RequestInit, 
  mockData: T
): Promise<T> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      console.warn(`[MockFallback] API ${url} failed with status ${response.status}. Using mock data.`);
      return mockData;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn(`[MockFallback] API ${url} failed to fetch. Using mock data. Error:`, error);
    return mockData;
  }
}

export const MockService = {
  getMockCatalogs: () => MOCK_CATALOGS,
};
