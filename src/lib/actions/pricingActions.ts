
'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp } from 'firebase-admin/firestore';

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

export async function getPricingPlans(): Promise<PricingPlans> {
  try {
    const { firestore } = initializeAdminApp();
    const plansRef = firestore.collection('pricing_plans');
    
    const [businessDoc, enterpriseDoc, advertiserDoc, storefrontDoc] = await Promise.all([
      plansRef.doc('business').get(),
      plansRef.doc('enterprise').get(),
      plansRef.doc('advertiser').get(),
      plansRef.doc('storefront').get(),
    ]);

    const processDoc = (doc: FirebaseFirestore.DocumentSnapshot, defaultPlan: any) => {
        if (!doc.exists) return defaultPlan;
        const data = doc.data();
        if (data && data.updatedAt) {
            delete data.updatedAt;
        }
        return { ...defaultPlan, ...data };
    };

    return {
      business: processDoc(businessDoc, DEFAULT_BUSINESS_PLAN) as Plan,
      enterprise: processDoc(enterpriseDoc, DEFAULT_ENTERPRISE_PLAN) as Plan,
      advertiser: processDoc(advertiserDoc, DEFAULT_ADVERTISER_PLAN) as AdvertiserPlan,
      storefront: processDoc(storefrontDoc, DEFAULT_STOREFRONT_PLAN) as StorefrontPlan,
    };
  } catch (error: any) {
    console.error("Error fetching pricing plans from admin SDK, using default fallbacks:", error);
    return DEFAULT_PRICING_PLANS;
  }
}


export async function savePricingPlan(
  planName: 'business' | 'enterprise' | 'advertiser' | 'storefront',
  data: Plan | AdvertiserPlan | StorefrontPlan
): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = initializeAdminApp();
    const planRef = firestore.collection('pricing_plans').doc(planName);
    
    await planRef.set({
      ...data,
      updatedAt: Timestamp.now(),
    }, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error(`Error saving ${planName} pricing plan:`, error);
    return { success: false, error: error.message };
  }
}

  