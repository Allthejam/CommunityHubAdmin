
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
}

type PricingPlans = {
  business: Plan | null;
  enterprise: Plan | null;
  advertiser: AdvertiserPlan | null;
  storefront: StorefrontPlan | null;
}

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

    const processDoc = (doc: FirebaseFirestore.DocumentSnapshot) => {
        if (!doc.exists) return null;
        const data = doc.data();
        if (data && data.updatedAt) {
            delete data.updatedAt;
        }
        return data;
    }

    return {
      business: processDoc(businessDoc) as Plan | null,
      enterprise: processDoc(enterpriseDoc) as Plan | null,
      advertiser: processDoc(advertiserDoc) as AdvertiserPlan | null,
      storefront: processDoc(storefrontDoc) as StorefrontPlan | null,
    };
  } catch (error: any) {
    console.error("Error fetching pricing plans:", error);
    return { business: null, enterprise: null, advertiser: null, storefront: null };
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

  