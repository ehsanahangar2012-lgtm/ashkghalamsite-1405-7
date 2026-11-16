export type PostStatus = 'draft' | 'published' | 'rejected';

export interface AgentBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  createdAtIso: string;
  updatedAtIso?: string;
  imageUrl?: string;
  tags: string[];
  readTime: number;
  status: PostStatus;
  language: 'fa' | 'en';
  source?: 'ai-auto' | 'manual-web-llm' | 'admin';
  seo: {
    metaTitle: string;
    metaDescription: string;
    focusKeyword: string;
    canonicalPath: string;
    jsonLd: Record<string, unknown>;
  };
  qualityReport: {
    score: number;
    wordCount: number;
    maxContentSimilarity: number;
    maxTitleSimilarity: number;
    passed: boolean;
    notes: string[];
    providerUsed?: string;
  };
}

export interface PageAuditIssue {
  path: string;
  severity: 'critical' | 'warning' | 'info';
  code: string;
  message: string;
  suggestedFix?: string;
}

export interface TechnicalSeoReport {
  generatedAt: string;
  baseUrl: string;
  pagesAudited: number;
  averageScore: number;
  sitemapUrlCount: number;
  brokenInternalLinks: Array<{ source: string; target: string; status: number | string }>;
  issues: PageAuditIssue[];
}
