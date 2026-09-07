'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

export type DropdownOption = {
  id: string;
  name: string;
};

type ActionResponse = {
  success: boolean;
  error?: string;
};

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const defaultDropdowns: Record<string, DropdownOption[]> = {
    eventCategories: [
        { id: 'music', name: "Music" },
        { id: 'food-drink', name: "Food & Drink" },
        { id: 'arts-culture', name: "Arts & Culture" },
        { id: 'charity', name: "Charity" },
        { id: 'sports', name: "Sports" },
        { id: 'family', name: "Family" },
        { id: 'workshop', name: "Workshop" },
        { id: 'other', name: "Other" }
    ],
    whatsonCategories: [
        { id: 'attraction', name: "Attraction" },
        { id: 'venue', name: "Venue" },
        { id: 'park', name: "Park" },
        { id: 'museum', name: "Museum" },
        { id: 'gallery', name: "Gallery" },
        { id: 'point-of-interest', name: "Point of Interest" },
        { id: 'local-sport', name: "Local Sport" },
        { id: 'other', name: "Other" }
    ],
    charityCategories: [
        { id: 'community-support', name: "Community Support" },
        { id: 'animal-welfare', name: "Animal Welfare" },
        { id: 'environment', name: "Environment" },
        { id: 'youth-development', name: "Youth Development" },
        { id: 'health-wellness', name: "Health & Wellness" },
        { id: 'arts-culture', name: "Arts & Culture" },
        { id: 'education', name: "Education" },
        { id: 'other', name: "Other" }
    ],
    newsCategories: [
        { id: 'community-news', name: "Community news" },
        { id: 'local-sports', name: "local sports" },
        { id: 'council-updates', name: "council updates" },
        { id: 'business-spotlight', name: "Business spotlight" },
        { id: 'opinion', name: "opinion" },
        { id: 'other', name: "Other" }
    ],
    businessCategories: [
        { id: 'cafe', name: "Cafe" },
        { id: 'restaurant', name: "Restaurant" },
        { id: 'retail', name: "Retail" },
        { id: 'services', name: "Services" },
        { id: 'trade', name: "Trade" },
        { id: 'health-beauty', name: "Health & Beauty" },
        { id: 'professional-services', name: "Professional Services" },
        { id: 'other', name: "Other" }
    ],
    productCategories: [
        { id: 'clothing', name: "Clothing" },
        { id: 'electronics', name: "Electronics" },
        { id: 'home-garden', name: "Home & Garden" },
        { id: 'health-beauty', name: "Health & Beauty" },
        { id: 'toys-games', name: "Toys & Games" },
        { id: 'food-drink', name: "Food & Drink" },
        { id: 'other', name: "Other" }
    ]
};

/**
 * Fetches the global dropdown options from platform_settings/dropdowns.
 */
export async function getDropdownOptions(): Promise<Record<string, DropdownOption[]>> {
  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('platform_settings').doc('dropdowns');
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data()!;
      const options: Record<string, DropdownOption[]> = {};
      for (const key in data) {
        if (Array.isArray(data[key])) {
          // Verify if it's already the new object format or need migration
          options[key] = data[key].map((item: any) => {
              if (typeof item === 'string') return { id: slugify(item), name: item };
              return item as DropdownOption;
          });
        }
      }
      return options;
    } else {
      return defaultDropdowns;
    }
  } catch (error: any) {
    console.error("Error fetching dropdown options:", error);
    return {};
  }
}

/**
 * Updates the global dropdown options.
 */
export async function updateDropdownOptions(options: Record<string, DropdownOption[]>): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('platform_settings').doc('dropdowns');
    await docRef.set({ ...options, updatedAt: Timestamp.now() }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating dropdown options:", error);
    return { success: false, error: error.message };
  }
}
