export type Plan = {
  monthlyPrice: number;
  annualPrice: number;
  adverts?: number;
  events?: number;
  galleryImages?: number;
  featuredPartner?: boolean;
  additionalAdvertPrice?: number;
  additionalEventPrice?: number;
};

export type AdvertiserPlan = {
  featuredAdPrice: number;
  partnerAdPrice: number;
  galleryImages: number;
};

export type StorefrontPlan = {
  monthlyPrice: number;
  annualPrice: number;
};

export type PricingPlans = {
  business: Plan | null;
  enterprise: Plan | null;
  advertiser: AdvertiserPlan | null;
  storefront: StorefrontPlan | null;
};

export const DEFAULT_BUSINESS_PLAN: Plan = {
  monthlyPrice: 20,
  annualPrice: 200,
  adverts: 6,
  additionalAdvertPrice: 7,
  events: 6,
  additionalEventPrice: 7,
  galleryImages: 8,
};

export const DEFAULT_STOREFRONT_PLAN: StorefrontPlan = {
  monthlyPrice: 10,
  annualPrice: 100,
};

export const DEFAULT_ENTERPRISE_PLAN: Plan = {
  monthlyPrice: 20,
  annualPrice: 200,
  adverts: 12,
  additionalAdvertPrice: 10,
  events: 12,
  additionalEventPrice: 10,
  galleryImages: 20,
  featuredPartner: false,
};

export const DEFAULT_ADVERTISER_PLAN: AdvertiserPlan = {
  featuredAdPrice: 80,
  partnerAdPrice: 35,
  galleryImages: 10,
};

export const DEFAULT_PRICING_PLANS: PricingPlans = {
  business: DEFAULT_BUSINESS_PLAN,
  enterprise: DEFAULT_ENTERPRISE_PLAN,
  advertiser: DEFAULT_ADVERTISER_PLAN,
  storefront: DEFAULT_STOREFRONT_PLAN,
};
