'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  data?: any;
};

const initialTaxonomy = [
    { id: '1', name: 'Animals & Pet Supplies', subcategories: [{ id: '1-1', name: 'Live Animals', tags: [] }, { id: '1-2', name: 'Pet Supplies', tags: ['Food', 'Toys', 'Beds'] }] },
    { id: '2', name: 'Apparel & Accessories', subcategories: [{ id: '2-1', name: 'Clothing', tags: [] }, { id: '2-2', name: 'Clothing Accessories', tags: [] }, { id: '2-3', name: 'Costumes & Accessories', tags: [] }, { id: '2-4', name: 'Handbags, Wallets & Cases', tags: [] }, { id: '2-5', name: 'Jewellery', tags: [] }, { id: '2-6', name: 'Shoes', tags: [] }] },
    { id: '3', name: 'Arts & Entertainment', subcategories: [{ id: '3-1', name: 'Hobbies & Creative Arts', tags: [] }, { id: '3-2', name: 'Party & Celebration', tags: [] }, { id: '3-3', name: 'Musical Instruments', tags: [] }] },
    { id: '4', name: 'Baby & Toddler', subcategories: [{ id: '4-1', name: 'Baby Transport', tags: ['Prams', 'Buggies'] }, { id: '4-2', name: 'Baby Safety', tags: [] }, { id: '4-3', name: 'Nappies & Diapering', tags: [] }, { id: '4-4', name: 'Nursing & Feeding', tags: [] }] },
    { id: '5', name: 'Business & Industrial', subcategories: [{ id: '5-1', name: 'Construction', tags: [] }, { id: '5-2', name: 'Healthcare & Lab', tags: [] }, { id: '5-3', name: 'Retail & Signage', tags: [] }, { id: '5-4', name: 'Work Safety', tags: [] }] },
    { id: '6', name: 'Cameras & Optics', subcategories: [{ id: '6-1', name: 'Cameras', tags: [] }, { id: '6-2', name: 'Optics', tags: ['Binoculars', 'Scopes'] }, { id: '6-3', name: 'Photography Accessories', tags: [] }] },
    { id: '7', name: 'Electronics', subcategories: [{ id: '7-1', name: 'Audio', tags: [] }, { id: '7-2', name: 'Communications', tags: ['Phones'] }, { id: '7-3', name: 'Computers', tags: [] }, { id: '7-4', name: 'Components', tags: [] }, { id: '7-5', name: 'Video & TV', tags: [] }, { id: '7-6', name: 'Smart Home Tech', tags: [] }] },
    { id: '8', name: 'Food, Beverages & Tobacco', subcategories: [{ id: '8-1', name: 'Beverages', tags: ['Soft drinks', 'Alcohol'] }, { id: '8-2', name: 'Food Items', tags: [] }, { id: '8-3', name: 'Tobacco Products', tags: [] }] },
    { id: '9', name: 'Furniture', subcategories: [{ id: '9-1', name: 'Baby & Toddler Furniture', tags: [] }, { id: '9-2', name: 'Beds & Accessories', tags: [] }, { id: '9-3', name: 'Chairs & Tables', tags: [] }, { id: '9-4', name: 'Storage & Shelving', tags: [] }] },
    { id: '10', name: 'Hardware', subcategories: [{ id: '10-1', name: 'Building Materials', tags: [] }, { id: '10-2', name: 'Hardware Accessories', tags: [] }, { id: '10-3', name: 'Tools', tags: [] }, { id: '10-4', name: 'Plumbing & Electrical', tags: [] }] },
    { id: '11', name: 'Health & Beauty', subcategories: [{ id: '11-1', name: 'Cosmetics & Makeup', tags: [] }, { id: '11-2', name: 'Health Care', tags: [] }, { id: '11-3', name: 'Personal Care', tags: ['Skin', 'Hair'] }, { id: '11-4', name: 'Fragrance', tags: [] }] },
    { id: '12', name: 'Home & Garden', subcategories: [{ id: '12-1', name: 'Decor', tags: [] }, { id: '12-2', name: 'Household Appliances', tags: [] }, { id: '12-3', name: 'Household Supplies', tags: [] }, { id: '12-4', name: 'Kitchen & Dining', tags: [] }, { id: '12-5', name: 'Linens & Bedding', tags: [] }, { id: '12-6', name: 'Garden & Patio', tags: [] }] },
    { id: '13', name: 'Luggage & Bags', subcategories: [{ id: '13-1', name: 'Backpacks', tags: [] }, { id: '13-2', name: 'Suitcases', tags: [] }, { id: '13-3', name: 'Travel Accessories', tags: [] }] },
    { id: '14', name: 'Mature Content', subcategories: [{ id: '14-1', name: 'Erotica', tags: [] }, { id: '14-2', name: 'Weaponry', tags: ['Collectors'] }] },
    { id: '15', name: 'Media', subcategories: [{ id: '15-1', name: 'Books', tags: [] }, { id: '15-2', name: 'Magazines', tags: [] }, { id: '15-3', name: 'Music & Movies', tags: [] }] },
    { id: '16', name: 'Office Supplies', subcategories: [{ id: '16-1', name: 'Stationery', tags: [] }, { id: '16-2', name: 'Filing & Organisation', tags: [] }, { id: '16-3', name: 'Presentation Supplies', tags: [] }] },
    { id: '17', name: 'Religious & Ceremonial', subcategories: [{ id: '17-1', name: 'Religious Items', tags: [] }, { id: '17-2', name: 'Wedding & Ceremony', tags: [] }] },
    { id: '18', name: 'Software', subcategories: [{ id: '18-1', name: 'Computer Software', tags: [] }, { id: '18-2', name: 'Video Games', tags: [] }, { id: '18-3', name: 'Digital Licenses', tags: [] }] },
    { id: '19', name: 'Sporting Goods', subcategories: [{ id: '19-1', name: 'Athletics', tags: [] }, { id: '19-2', name: 'Exercise & Fitness', tags: [] }, { id: '19-3', name: 'Outdoor Recreation', tags: [] }] },
    { id: '20', name: 'Toys & Games', subcategories: [{ id: '20-1', name: 'Action Figures', tags: [] }, { id: '20-2', name: 'Dolls & Puppets', tags: [] }, { id: '20-3', name: 'Puzzles & Board Games', tags: [] }, { id: '20-4', name: 'Outdoor Play', tags: [] }] },
    { id: '21', name: 'Vehicles & Parts', subcategories: [{ id: '21-1', name: 'Vehicle Parts', tags: [] }, { id: '21-2', name: 'Automotive Accessories', tags: [] }, { id: '21-3', name: 'Car Care', tags: [] }] },
    { id: '22', name: 'Bundles', subcategories: [{ id: '22-1', name: 'Gift Baskets', tags: [] }, { id: '22-2', name: 'Product Bundles', tags: [] }] },
    { id: '23', name: 'Services', subcategories: [{ id: '23-1', name: 'Consulting', tags: [] }, { id: '23-2', name: 'Maintenance', tags: [] }, { id: '23-3', name: 'Custom Labour', tags: [] }] },
    { id: '24', name: 'Digital Products', subcategories: [{ id: '24-1', name: 'NFTs', tags: [] }, { id: '24-2', name: 'Music Downloads', tags: [] }, { id: '24-3', name: 'E-books', tags: [] }] },
    { id: '25', name: 'Miscellaneous', subcategories: [] },
    { id: '26', name: 'Events & Tickets', subcategories: [{ id: '26-1', name: 'Concerts', tags: [] }, { id: '26-2', name: 'Workshops', tags: [] }, { id: '26-3', name: 'Admission Tickets', tags: [] }] },
];

export async function getShoppingCategories(): Promise<any[]> {
  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('platform_settings').doc('shopping');
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return docSnap.data()?.categories || initialTaxonomy;
    } else {
      return initialTaxonomy;
    }
  } catch (error: any) {
    console.error("Error fetching shopping categories:", error);
    return initialTaxonomy;
  }
}

/**
 * Audit all products platform-wide and return counts grouped by category ID.
 * Normalized mapping: Handles Name-to-ID conversion with trim and case-insensitivity.
 */
export async function getShoppingCategoryCounts(): Promise<Record<string, number>> {
    try {
        const { firestore } = initializeAdminApp();
        
        // 1. Get current taxonomy to build a Normalized Name -> ID mapping
        const categories = await getShoppingCategories();
        const nameToIdMap: Record<string, string> = {};
        
        const normalize = (s: string) => s.trim().toLowerCase();

        categories.forEach((c: any) => {
            nameToIdMap[normalize(c.name)] = c.id;
            if (c.subcategories) {
                c.subcategories.forEach((s: any) => {
                    nameToIdMap[normalize(s.name)] = s.id;
                });
            }
        });

        // 2. Scan all products using collectionGroup
        // Note: We use a broad query to ensure we capture products that might have different status values
        const productsSnap = await firestore.collectionGroup('products').get();
        const counts: Record<string, number> = {};

        productsSnap.docs.forEach(doc => {
            const data = doc.data();
            
            // Only count products that are explicitly 'online' or have no status set (defaulting to active)
            const status = data.status ? normalize(data.status) : 'online';
            if (status !== 'online') return;

            const catIdentifier = data.category;
            const subIdentifier = data.subcategory;

            // Map Category Name or ID to normalized ID
            if (catIdentifier && typeof catIdentifier === 'string') {
                const normCat = normalize(catIdentifier);
                const catId = nameToIdMap[normCat] || catIdentifier;
                counts[catId] = (counts[catId] || 0) + 1;
            }

            // Map Sub-Category Name or ID to normalized ID
            if (subIdentifier && typeof subIdentifier === 'string' && subIdentifier !== "") {
                const normSub = normalize(subIdentifier);
                const subId = nameToIdMap[normSub] || subIdentifier;
                counts[subId] = (counts[subId] || 0) + 1;
            }
        });

        return counts;
    } catch (error) {
        console.error("Error counting inventory per category:", error);
        return {};
    }
}

export async function saveShoppingCategories(categories: any[]): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('platform_settings').doc('shopping');
    await docRef.set({ categories, updatedAt: Timestamp.now() }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error("Error saving shopping categories:", error);
    return { success: false, error: error.message };
  }
}

type FeaturedConfig = {
    selectedIds: string[];
    isAutomated: boolean;
    intervalHours: number;
    lastRotationAt: any;
    updatedAt: any;
};

export async function getShoppingFeaturedConfig(): Promise<FeaturedConfig> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = firestore.collection('platform_settings').doc('shoppingHome_config');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data()!;
            return {
                selectedIds: data.selectedIds || [],
                isAutomated: !!data.isAutomated,
                intervalHours: data.intervalHours || 24,
                // Ensure dates are serializable for Next.js Client Components
                lastRotationAt: data.lastRotationAt ? (data.lastRotationAt.toDate ? data.lastRotationAt.toDate().toISOString() : data.lastRotationAt) : null,
                updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null,
            };
        }
        return { selectedIds: [], isAutomated: false, intervalHours: 24, lastRotationAt: null, updatedAt: null };
    } catch (error) {
        console.error("Error fetching shopping featured config:", error);
        return { selectedIds: [], isAutomated: false, intervalHours: 24, lastRotationAt: null, updatedAt: null };
    }
}

export async function saveShoppingFeaturedConfig(params: {
    selectedIds: string[];
    isAutomated?: boolean;
    intervalHours?: number;
}): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = firestore.collection('platform_settings').doc('shoppingHome_config');
        const updateData: any = {
            selectedIds: params.selectedIds,
            updatedAt: Timestamp.now(),
        };

        if (params.isAutomated !== undefined) updateData.isAutomated = params.isAutomated;
        if (params.intervalHours !== undefined) updateData.intervalHours = params.intervalHours;

        await docRef.set(updateData, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error saving shopping featured config:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Lazy Trigger for Automated Rotation.
 * Checks if rotation is due and performs it if necessary.
 */
export async function checkAndRotateFeaturedCategories(): Promise<ActionResponse & { rotated: boolean }> {
    const { firestore } = initializeAdminApp();
    try {
        const docRef = firestore.collection('platform_settings').doc('shoppingHome_config');
        const docSnap = await docRef.get();

        if (!docSnap.exists) return { success: true, rotated: false };
        
        const data = docSnap.data()!;
        if (!data.isAutomated) return { success: true, rotated: false };

        const intervalMs = (data.intervalHours || 24) * 60 * 60 * 1000;
        const lastRotation = data.lastRotationAt?.toDate().getTime() || 0;
        const now = Date.now();

        if (now - lastRotation >= intervalMs) {
            console.log("[Shopping Rotation] Interval expired. Shuffling categories...");
            
            // Fetch taxonomy to get all IDs
            const taxDoc = await firestore.collection('platform_settings').doc('shopping').get();
            const categories = taxDoc.data()?.categories || initialTaxonomy;
            
            const allIds: string[] = [];
            categories.forEach((c: any) => {
                allIds.push(c.id);
                if (c.subcategories) {
                    c.subcategories.forEach((s: any) => allIds.push(s.id));
                }
            });

            if (allIds.length < 5) return { success: false, error: "Not enough categories in taxonomy to rotate.", rotated: false };

            const shuffled = [...allIds].sort(() => 0.5 - Math.random());
            const newSelection = shuffled.slice(0, 5);

            await docRef.update({
                selectedIds: newSelection,
                lastRotationAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            return { success: true, rotated: true };
        }

        return { success: true, rotated: false };
    } catch (error) {
        console.error("Rotation check failed:", error);
        return { success: false, error: error.message, rotated: false };
    }
}