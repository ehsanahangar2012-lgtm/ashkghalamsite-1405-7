import { 
  SubscriptionTier, 
  UsageEvent, 
  UserCredits, 
  ApiKeyRecord, 
  InvoiceRecord, 
  PLAN_CONFIGS 
} from './monetizationTypes';

export class MonetizationService {
  private static instance: MonetizationService;

  // In-Memory Database Stores (Persistent for container lifetime)
  private apiKeys: Map<string, ApiKeyRecord> = new Map();
  private userCredits: Map<string, UserCredits> = new Map();
  private usageEvents: UsageEvent[] = [];
  private invoices: Map<string, InvoiceRecord[]> = new Map();
  private userPlans: Map<string, SubscriptionTier> = new Map();

  // Simple Rate Limiting Store: Map<key, { count: number, resetTime: number }>
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();

  private constructor() {
    this.seedInitialData();
  }

  public static getInstance(): MonetizationService {
    if (!MonetizationService.instance) {
      MonetizationService.instance = new MonetizationService();
    }
    return MonetizationService.instance;
  }

  /**
   * Seed mock enterprise users and API keys to ensure instant out-of-the-box system demo.
   */
  private seedInitialData() {
    const demoUsers = [
      { id: 'usr_free_123', email: 'free@ashkghalam.com', plan: 'FREE' as const, balance: 10 },
      { id: 'usr_pro_456', email: 'pro@ashkghalam.com', plan: 'PRO' as const, balance: 500 },
      { id: 'usr_ent_789', email: 'enterprise@ashkghalam.com', plan: 'ENTERPRISE' as const, balance: 5000 }
    ];

    for (const u of demoUsers) {
      this.userPlans.set(u.id, u.plan);
      this.userCredits.set(u.id, { userId: u.id, balance: u.balance, used: 0 });
      
      const key = `key_${u.plan.toLowerCase()}_${u.id.split('_')[2]}`;
      this.apiKeys.set(key, {
        apiKey: key,
        userId: u.id,
        plan: u.plan,
        isActive: true,
        createdAt: new Date().toISOString()
      });

      // Seed mock historical usage events
      const count = u.plan === 'FREE' ? 3 : u.plan === 'PRO' ? 45 : 320;
      for (let i = 0; i < count; i++) {
        const action = i % 3 === 0 ? 'GENERATE' : i % 3 === 1 ? 'EXPORT' : 'BOOLEAN';
        const cost = this.calculateCost(action, 'fefco-0427', i % 2 === 0 ? 'dxf' : 'svg');
        this.usageEvents.push({
          id: `evt_${Math.random().toString(36).substr(2, 9)}`,
          userId: u.id,
          action,
          templateId: i % 2 === 0 ? 'fefco-0427' : 'fefco-0201',
          cost,
          timestamp: Date.now() - (count - i) * 60 * 60 * 1000, // staggered in past hours
          details: `Seeded ${action} test activity.`
        });
      }

      // Generate a mock initial invoice for billing history
      const invItems = [
        { description: `${PLAN_CONFIGS[u.plan].name} Monthly Subscription`, quantity: 1, unitPrice: PLAN_CONFIGS[u.plan].priceMonthly, total: PLAN_CONFIGS[u.plan].priceMonthly }
      ];
      const totalAmount = PLAN_CONFIGS[u.plan].priceMonthly;
      this.invoices.set(u.id, [{
        id: `inv_${Math.random().toString(36).substr(2, 9)}`,
        userId: u.id,
        plan: u.plan,
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: totalAmount,
        currency: 'USD',
        status: totalAmount > 0 ? 'paid' : 'unpaid',
        items: invItems
      }]);
    }
  }

  // -------------------------------------------------------------
  // API Key Management Engine
  // -------------------------------------------------------------
  public registerApiKey(userId: string, plan: SubscriptionTier = 'FREE'): ApiKeyRecord {
    const key = `key_${Math.random().toString(36).substr(2, 16)}_${userId.replace('usr_', '')}`;
    const keyRecord: ApiKeyRecord = {
      apiKey: key,
      userId,
      plan,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.apiKeys.set(key, keyRecord);
    this.userPlans.set(userId, plan);
    if (!this.userCredits.has(userId)) {
      this.userCredits.set(userId, { userId, balance: PLAN_CONFIGS[plan].creditQuota, used: 0 });
    }
    return keyRecord;
  }

  public validateApiKey(key: string): ApiKeyRecord | null {
    const record = this.apiKeys.get(key);
    if (record && record.isActive) {
      return record;
    }
    return null;
  }

  public revokeApiKey(key: string): boolean {
    const record = this.apiKeys.get(key);
    if (record) {
      record.isActive = false;
      this.apiKeys.set(key, record);
      return true;
    }
    return false;
  }

  public listUserKeys(userId: string): ApiKeyRecord[] {
    return Array.from(this.apiKeys.values()).filter(k => k.userId === userId);
  }

  // -------------------------------------------------------------
  // Cost Calculation Engine
  // -------------------------------------------------------------
  public calculateCost(action: 'GENERATE' | 'BOOLEAN' | 'EXPORT', templateId?: string, format?: string): number {
    let baseCost = 0.0;
    
    // 1. Base Operation Cost
    switch (action) {
      case 'GENERATE':
        baseCost = 1.0;
        break;
      case 'BOOLEAN':
        baseCost = 0.2;
        break;
      case 'EXPORT':
        baseCost = 0.3;
        break;
    }

    // 2. Geometry Complexity Factor
    let complexityFactor = 1.0;
    if (templateId) {
      switch (templateId) {
        case 'fefco-0201':
        case 'fefco-pizza':
          complexityFactor = 1.0; // simple standard box
          break;
        case 'fefco-0427':
        case 'ecma-a2020':
          complexityFactor = 1.5; // folding carton complexity
          break;
        case 'fefco-0215':
          complexityFactor = 2.0; // nested lock-bottom mechanics
          break;
        case 'ecma-a30':
          complexityFactor = 1.6; // hanging box
          break;
        default:
          complexityFactor = 1.2;
          break;
      }
    }

    // 3. Export Weight Factor
    let exportFactor = 0.0;
    if (format) {
      switch (format.toLowerCase()) {
        case 'svg':
          exportFactor = 0.0;
          break;
        case 'json':
          exportFactor = 0.1;
          break;
        case 'pdf':
          exportFactor = 0.3;
          break;
        case 'dxf':
          exportFactor = 0.5; // expensive industrial CNC export
          break;
      }
    }

    return Number((baseCost * complexityFactor + exportFactor).toFixed(2));
  }

  // -------------------------------------------------------------
  // Credit & Ledger System
  // -------------------------------------------------------------
  public getUserCredits(userId: string): UserCredits {
    let credits = this.userCredits.get(userId);
    if (!credits) {
      credits = { userId, balance: 10, used: 0 };
      this.userCredits.set(userId, credits);
    }
    return credits;
  }

  public checkAndDeductCredits(userId: string, action: 'GENERATE' | 'BOOLEAN' | 'EXPORT', templateId?: string, format?: string): { success: boolean; cost: number; balance: number } {
    const cost = this.calculateCost(action, templateId, format);
    const credits = this.getUserCredits(userId);

    if (credits.balance < cost) {
      return { success: false, cost, balance: credits.balance };
    }

    credits.balance = Number((credits.balance - cost).toFixed(2));
    credits.used = Number((credits.used + cost).toFixed(2));
    this.userCredits.set(userId, credits);

    // Record usage log
    this.usageEvents.push({
      id: `evt_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      templateId,
      cost,
      timestamp: Date.now(),
      details: `Processed operation ${action} for ${templateId || 'N/A'}${format ? ` [${format}]` : ''}.`
    });

    return { success: true, cost, balance: credits.balance };
  }

  public refundCredits(userId: string, cost: number, reason: string) {
    const credits = this.getUserCredits(userId);
    credits.balance = Number((credits.balance + cost).toFixed(2));
    credits.used = Math.max(0, Number((credits.used - cost).toFixed(2)));
    this.userCredits.set(userId, credits);

    this.usageEvents.push({
      id: `evt_ref_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action: 'BOOLEAN', // generic category
      cost: -cost,
      timestamp: Date.now(),
      details: `REFUND: ${reason}`
    });
  }

  public topupCredits(userId: string, amount: number): UserCredits {
    const credits = this.getUserCredits(userId);
    credits.balance = Number((credits.balance + amount).toFixed(2));
    this.userCredits.set(userId, credits);
    return credits;
  }

  // -------------------------------------------------------------
  // Billing & Subscription System
  // -------------------------------------------------------------
  public subscribeToPlan(userId: string, plan: SubscriptionTier): { success: boolean; plan: SubscriptionTier; invoice: InvoiceRecord } {
    this.userPlans.set(userId, plan);
    
    // Provision credits corresponding to subscription tier
    const config = PLAN_CONFIGS[plan];
    const credits = this.getUserCredits(userId);
    credits.balance = Number((credits.balance + config.creditQuota).toFixed(2));
    this.userCredits.set(userId, credits);

    // Create immediate invoice
    const invId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newInvoice: InvoiceRecord = {
      id: invId,
      userId,
      plan,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: config.priceMonthly,
      currency: 'USD',
      status: config.priceMonthly > 0 ? 'paid' : 'unpaid',
      items: [
        {
          description: `${config.name} - Monthly Subscription`,
          quantity: 1,
          unitPrice: config.priceMonthly,
          total: config.priceMonthly
        },
        {
          description: `Includes high-velocity CAD pipeline allocation (${config.creditQuota} credits)`,
          quantity: 1,
          unitPrice: 0,
          total: 0
        }
      ]
    };

    const userInvoices = this.invoices.get(userId) || [];
    userInvoices.push(newInvoice);
    this.invoices.set(userId, userInvoices);

    // If changing plan, update API keys plan
    const userKeys = this.listUserKeys(userId);
    for (const key of userKeys) {
      key.plan = plan;
      this.apiKeys.set(key.apiKey, key);
    }

    return { success: true, plan, invoice: newInvoice };
  }

  public getUserInvoices(userId: string): InvoiceRecord[] {
    return this.invoices.get(userId) || [];
  }

  // -------------------------------------------------------------
  // Rate Limiter Engine
  // -------------------------------------------------------------
  public checkRateLimit(key: string, limitPerMin: number): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    let client = this.rateLimits.get(key);

    if (!client || now > client.resetTime) {
      client = {
        count: 0,
        resetTime: now + 60000 // Reset after 1 minute
      };
    }

    if (client.count >= limitPerMin) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: client.resetTime
      };
    }

    client.count++;
    this.rateLimits.set(key, client);

    return {
      allowed: true,
      remaining: limitPerMin - client.count,
      resetTime: client.resetTime
    };
  }

  // -------------------------------------------------------------
  // Analytics Dashboard Generator
  // -------------------------------------------------------------
  public getAnalytics(): any {
    const totalRequests = this.usageEvents.length;
    const totalCreditsSpent = this.usageEvents.reduce((acc, evt) => acc + (evt.cost > 0 ? evt.cost : 0), 0);

    // Calculate revenue (Seeded active subscriptions + topups)
    const allInvoices = Array.from(this.invoices.values()).flat();
    const totalRevenue = allInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((acc, inv) => acc + inv.amount, 0);

    // Usage by Template
    const templateCounts: Record<string, number> = {};
    const formatCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};

    this.usageEvents.forEach(evt => {
      if (evt.templateId) {
        templateCounts[evt.templateId] = (templateCounts[evt.templateId] || 0) + 1;
      }
      actionCounts[evt.action] = (actionCounts[evt.action] || 0) + 1;
      
      // Parse format from detail notes if possible
      const formatMatch = evt.details?.match(/\[(svg|dxf|pdf|json)\]/i);
      if (formatMatch) {
        const fmt = formatMatch[1].toLowerCase();
        formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
      } else {
        formatCounts['svg'] = (formatCounts['svg'] || 0) + 1;
      }
    });

    const activePlans = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
    Array.from(this.userPlans.values()).forEach(plan => {
      activePlans[plan] = (activePlans[plan] || 0) + 1;
    });

    return {
      overview: {
        totalRequests,
        totalCreditsSpent: Number(totalCreditsSpent.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        activeKeysCount: Array.from(this.apiKeys.values()).filter(k => k.isActive).length,
        systemHealthStatus: '100% OPERATIONAL'
      },
      metrics: {
        templatePopularity: Object.entries(templateCounts).map(([id, count]) => ({ id, count })),
        formatPopularity: Object.entries(formatCounts).map(([fmt, count]) => ({ format: fmt, count })),
        actionDistribution: Object.entries(actionCounts).map(([act, count]) => ({ action: act, count })),
        activePlansDistribution: activePlans
      }
    };
  }

  // -------------------------------------------------------------
  // Pricing Optimization & Upsell Advisory Engine
  // -------------------------------------------------------------
  public getPricingOptimizationAdvisory(userId: string): any {
    const credits = this.getUserCredits(userId);
    const plan = this.userPlans.get(userId) || 'FREE';
    const recentActivity = this.usageEvents.filter(evt => evt.userId === userId);
    
    const countThisMonth = recentActivity.length;
    const limit = PLAN_CONFIGS[plan].creditQuota;
    const usageRatio = limit > 0 ? (credits.used / limit) : 1.0;

    let recommendation = '';
    let upsellTrigger = false;
    let savingsEstimate = 0;

    if (plan === 'FREE' && countThisMonth >= 8) {
      recommendation = 'You are reaching 80% of your Free Plan quota. We recommend upgrading to our Pro Plan to get unlimited DXF export features and 60x higher request capacity.';
      upsellTrigger = true;
      savingsEstimate = 120; // Estimated cost saved by subscription vs individual credits purchase
    } else if (plan === 'PRO' && usageRatio > 0.85) {
      recommendation = 'Your industrial usage footprint shows rapid integration scales. Migrate seamlessly to Enterprise Plan for infinite scale pipeline priority, 500 RPM rate limit, and dedicated template engineering support.';
      upsellTrigger = true;
      savingsEstimate = 650;
    } else {
      recommendation = 'Your current operational volume remains safe and optimized inside your subscription tier bounds. Keep up the high-precision production!';
    }

    return {
      userId,
      currentPlan: plan,
      usageThisPeriod: credits.used,
      periodLimit: limit,
      usagePercentage: Number((usageRatio * 100).toFixed(1)),
      optimizationAdvice: {
        recommendation,
        upsellTrigger,
        savingsEstimate,
        suggestedAlternative: plan === 'FREE' ? 'PRO' : plan === 'PRO' ? 'ENTERPRISE' : 'CUSTOM_ENTERPRISE'
      }
    };
  }
}
