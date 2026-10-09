/**
 * Industrial CAD SaaS Monetization Types
 * Defines subscription plans, pricing tiers, usage events, and API key configurations.
 */

export type SubscriptionTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface SubscriptionPlanConfig {
  name: string;
  priceMonthly: number;
  creditQuota: number;
  rateLimitMin: number; // requests per minute
  supportedFormats: string[];
  watermark: boolean;
  allTemplates: boolean;
}

export const PLAN_CONFIGS: Record<SubscriptionTier, SubscriptionPlanConfig> = {
  FREE: {
    name: 'Free Plan',
    priceMonthly: 0,
    creditQuota: 10,
    rateLimitMin: 5,
    supportedFormats: ['svg'],
    watermark: true,
    allTemplates: false
  },
  PRO: {
    name: 'Pro Developer Plan',
    priceMonthly: 49,
    creditQuota: 1000,
    rateLimitMin: 60,
    supportedFormats: ['svg', 'dxf', 'pdf', 'json'],
    watermark: false,
    allTemplates: true
  },
  ENTERPRISE: {
    name: 'Enterprise Industrial Plan',
    priceMonthly: 499,
    creditQuota: 100000,
    rateLimitMin: 500,
    supportedFormats: ['svg', 'dxf', 'pdf', 'json'],
    watermark: false,
    allTemplates: true
  }
};

export interface UsageEvent {
  id: string;
  userId: string;
  action: 'GENERATE' | 'BOOLEAN' | 'EXPORT';
  templateId?: string;
  cost: number;
  timestamp: number;
  details?: string;
}

export interface UserCredits {
  userId: string;
  balance: number;
  used: number;
}

export interface ApiKeyRecord {
  apiKey: string;
  userId: string;
  plan: SubscriptionTier;
  isActive: boolean;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  userId: string;
  plan: SubscriptionTier;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'void';
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
}
