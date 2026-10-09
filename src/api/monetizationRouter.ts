import { Router } from 'express';
import { MonetizationService } from './monetizationService';
import { PLAN_CONFIGS, SubscriptionTier } from './monetizationTypes';

const router = Router();
const monetizationService = MonetizationService.getInstance();

// -------------------------------------------------------------
// API Key Gatekeeper Middleware
// -------------------------------------------------------------
export const apiGatekeeper = (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    // Let unauthenticated calls pass as "anonymous" with a fallback demo user
    req.userId = 'usr_free_123';
    req.plan = 'FREE';
    req.apiKey = null;
    return next();
  }

  const keyRecord = monetizationService.validateApiKey(apiKey);
  if (!keyRecord) {
    return res.status(401).json({ error: 'INVALID_OR_REVOKED_API_KEY', message: 'The provided API key is invalid or has been revoked.' });
  }

  // Rate Limiting Check
  const rateLimit = PLAN_CONFIGS[keyRecord.plan].rateLimitMin;
  const rateCheck = monetizationService.checkRateLimit(apiKey, rateLimit);
  if (!rateCheck.allowed) {
    res.setHeader('X-RateLimit-Limit', rateLimit);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', rateCheck.resetTime);
    return res.status(429).json({ 
      error: 'RATE_LIMIT_EXCEEDED', 
      message: `You have exceeded the rate limit of ${rateLimit} requests/min for your ${keyRecord.plan} tier.` 
    });
  }

  // Set response rate limit headers
  res.setHeader('X-RateLimit-Limit', rateLimit);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
  res.setHeader('X-RateLimit-Reset', rateCheck.resetTime);

  req.userId = keyRecord.userId;
  req.plan = keyRecord.plan;
  req.apiKey = apiKey;
  next();
};

// -------------------------------------------------------------
// Billing & Credit Systems Endpoints
// -------------------------------------------------------------

/**
 * POST /billing/subscribe
 * Change user's subscription tier
 */
router.post('/billing/subscribe', (req, res) => {
  try {
    const { userId, plan } = req.body;
    if (!userId || !plan) {
      return res.status(400).json({ error: 'Missing required parameters: userId and plan.' });
    }

    const tier = plan.toUpperCase() as SubscriptionTier;
    if (!PLAN_CONFIGS[tier]) {
      return res.status(400).json({ error: 'Invalid subscription plan. Choose FREE, PRO, or ENTERPRISE.' });
    }

    const subscription = monetizationService.subscribeToPlan(userId, tier);
    res.json({
      success: true,
      message: `Successfully upgraded user to ${tier} subscription plan. Initial invoice created.`,
      subscription
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /billing/webhook
 * Stripe Checkout Hook Simulator.
 * Triggers asynchronous manual invoice payments or account syncs.
 */
router.post('/billing/webhook', (req, res) => {
  try {
    const { event, data } = req.body;
    if (!event) {
      return res.status(400).json({ error: 'Event parameter required.' });
    }

    // Simulate different Stripe Hooks
    switch (event) {
      case 'checkout.session.completed':
        const userId = data.userId || 'usr_pro_456';
        const plan = (data.plan || 'PRO').toUpperCase() as SubscriptionTier;
        monetizationService.subscribeToPlan(userId, plan);
        return res.json({ success: true, message: `Webhook processed successfully: Subscription provisioned for ${userId}.` });
        
      case 'invoice.payment_succeeded':
        return res.json({ success: true, message: 'Webhook invoice.payment_succeeded processed cleanly.' });

      default:
        return res.json({ success: true, message: `Webhook received unknown event: ${event}. Logged and dismissed.` });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /billing/invoice
 * Retrieve all user bills and invoices
 */
router.get('/billing/invoice', (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'usr_free_123';
    const list = monetizationService.getUserInvoices(userId);
    res.json({ success: true, userId, invoices: list });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /billing/topup
 * Add manual funds/credits to balance
 */
router.post('/billing/topup', (req, res) => {
  try {
    const { userId, creditsCount } = req.body;
    if (!userId || !creditsCount || isNaN(Number(creditsCount))) {
      return res.status(400).json({ error: 'Missing parameters: userId and numeric creditsCount.' });
    }

    const updatedCredits = monetizationService.topupCredits(userId, Number(creditsCount));
    res.json({
      success: true,
      message: `Deposited ${creditsCount} credits. Balance updated.`,
      credits: updatedCredits
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// -------------------------------------------------------------
// Keys & Developer Management Endpoints
// -------------------------------------------------------------

/**
 * POST /keys
 * Create developers API key
 */
router.post('/keys', (req, res) => {
  try {
    const { userId, plan } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter.' });
    }

    const tier = (plan || 'FREE').toUpperCase() as SubscriptionTier;
    const newKey = monetizationService.registerApiKey(userId, tier);
    res.json({ success: true, apiKey: newKey });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /keys
 * List active API Keys
 */
router.get('/keys', (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'usr_free_123';
    const keys = monetizationService.listUserKeys(userId);
    res.json({ success: true, userId, keys });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /keys/:key
 * Revoke developer credential
 */
router.delete('/keys/:key', (req, res) => {
  try {
    const { key } = req.params;
    const success = monetizationService.revokeApiKey(key);
    if (!success) {
      return res.status(404).json({ error: 'KEY_NOT_FOUND', message: 'API key could not be found to revoke.' });
    }
    res.json({ success: true, message: 'API credential has been successfully revoked.' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// -------------------------------------------------------------
// Cost calculation calculator endpoint
// -------------------------------------------------------------
router.get('/cost', (req, res) => {
  try {
    const { action, templateId, format } = req.query;
    const act = (action as string || 'GENERATE').toUpperCase() as 'GENERATE' | 'BOOLEAN' | 'EXPORT';
    const tempId = templateId as string;
    const fmt = format as string;

    const estimatedCost = monetizationService.calculateCost(act, tempId, fmt);
    res.json({
      success: true,
      parameters: { action: act, templateId: tempId, format: fmt },
      estimatedCostCredits: estimatedCost,
      details: 'Calculated using standardized base, complexity factor, and format weight modifiers.'
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// -------------------------------------------------------------
// Analytics & Pricing Advisory
// -------------------------------------------------------------
router.get('/analytics', (req, res) => {
  try {
    const data = monetizationService.getAnalytics();
    res.json({ success: true, analytics: data });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/pricing-optimization', (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'usr_free_123';
    const advisory = monetizationService.getPricingOptimizationAdvisory(userId);
    res.json({ success: true, advisory });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// -------------------------------------------------------------
// User Credits Profile Information
// -------------------------------------------------------------
router.get('/credits', (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'usr_free_123';
    const credits = monetizationService.getUserCredits(userId);
    res.json({ success: true, credits });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
