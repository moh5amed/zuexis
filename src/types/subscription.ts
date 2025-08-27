// Subscription System TypeScript Interfaces

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number; // Price in cents
  price_yearly: number; // Annual price in cents
  videos_per_month: number;
  features: PlanFeatures;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanFeatures {
  watermark: boolean;
  processing_priority: 'standard' | 'high' | 'highest';
  export_quality: '1080p' | '2K' | '4K';
  ai_features: string[];
  templates: number | 'unlimited';
  support: 'community' | 'email' | 'priority_email' | 'dedicated';
  team_seats?: number;
  white_label?: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  videos_used: number;
  created_at: string;
  updated_at: string;
}

export interface UserCredits {
  id: string;
  user_id: string;
  credits_remaining: number;
  total_credits_purchased: number;
  last_purchase_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditPurchase {
  id: string;
  user_id: string;
  credits_purchased: number;
  amount_paid: number; // Amount in cents
  stripe_payment_intent_id?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface FeatureUsageLog {
  id: string;
  user_id: string;
  feature_name: string;
  project_id?: string;
  clip_id?: string;
  usage_data: Record<string, any>;
  created_at: string;
}

export interface SubscriptionStatus {
  id: string;
  plan_id?: string;
  plan_name: string;
  plan_slug: string;
  status: string;
  videos_per_month: number;
  features: PlanFeatures;
  current_period_start: string;
  current_period_end: string;
  videos_used: number;
  videos_remaining: number;
}

export interface PlanComparison {
  feature: string;
  free: string | boolean | number;
  creatorLite: string | boolean | number;
  creatorPro: string | boolean | number;
  agencyStarter: string | boolean | number;
}

// Subscription plan slugs
export const PLAN_SLUGS = {
  FREE: 'free',
  CREATOR_LITE: 'creator-lite',
  CREATOR_PRO: 'creator-pro',
  AGENCY_STARTER: 'agency-starter',
} as const;

export type PlanSlug = typeof PLAN_SLUGS[keyof typeof PLAN_SLUGS];

// Feature names for usage tracking
export const FEATURE_NAMES = {
  PROJECT_CREATION: 'project_creation',
  CLIP_GENERATION: 'clip_generation',
  AI_OPTIMIZATION: 'ai_optimization',
  CUSTOM_BRANDING: 'custom_branding',
  PRIORITY_PROCESSING: 'priority_processing',
  HIGH_QUALITY_EXPORT: 'high_quality_export',
  WHITE_LABEL: 'white_label',
  TEAM_COLLABORATION: 'team_collaboration',
} as const;

export type FeatureName = typeof FEATURE_NAMES[keyof typeof FEATURE_NAMES];

// Credit system
export const CREDIT_VALUES = {
  EXTRA_VIDEO: 1,
  LARGE_VIDEO_UNLIMITED_CLIPS: 2,
} as const;

// Pricing in dollars (for display)
export const PLAN_PRICES = {
  [PLAN_SLUGS.FREE]: { monthly: 0, yearly: 0 },
  [PLAN_SLUGS.CREATOR_LITE]: { monthly: 19, yearly: 190 },
  [PLAN_SLUGS.CREATOR_PRO]: { monthly: 29, yearly: 290 },
  [PLAN_SLUGS.AGENCY_STARTER]: { monthly: 99, yearly: 990 },
} as const;

// Credit pricing
export const CREDIT_PRICE = 5; // $5 for 2 credits
