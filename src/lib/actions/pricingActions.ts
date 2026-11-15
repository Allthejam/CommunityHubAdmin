
'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp } from 'firebase-admin/firestore';
import {
  type Plan,
  type AdvertiserPlan,
  type StorefrontPlan,
  type PricingPlans,
  DEFAULT_BUSINESS_PLAN,
  DEFAULT_STOREFRONT_PLAN,
  DEFAULT_ENTERPRISE_PLAN,
  DEFAULT_ADVERTISER_PLAN,
  DEFAULT_PRICING_PLANS,
} from '@/lib/types/pricing';

export type { Plan, AdvertiserPlan, StorefrontPlan, PricingPlans };
export {
  DEFAULT_BUSINESS_PLAN,
  DEFAULT_STOREFRONT_PLAN,
  DEFAULT_ENTERPRISE_PLAN,
  DEFAULT_ADVERTISER_PLAN,
  DEFAULT_PRICING_PLANS,
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

  