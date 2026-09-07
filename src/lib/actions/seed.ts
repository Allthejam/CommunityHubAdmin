'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp } from 'firebase-admin/firestore';
import { businesses } from '../mock-data';

type ActionResponse = {
  success: boolean;
  error?: string;
};

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const defaultDropdowns = {
    Users_Roles: [
        { id: 'leader', name: "Leader" },
        { id: 'reporter', name: "Reporter" },
        { id: 'broadcaster', name: "Broadcaster" },
        { id: 'courier', name: "Local Courier" },
        { id: 'moderator', name: "Moderator" }
    ],
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
    ],
    jobCategories: [
        { id: 'retail', name: "Retail" },
        { id: 'hospitality', name: "Hospitality" },
        { id: 'manual-labour', name: "Manual Labour" },
        { id: 'skilled-trade', name: "Skilled Trade" },
        { id: 'professional', name: "Professional" },
        { id: 'remote', name: "Remote" },
        { id: 'other', name: "Other" }
    ],
    reportCategories: [
        { id: 'street-issue', name: "Street Issue (Potholes, Lights)" },
        { id: 'litter-dumping', name: "Litter or Fly-tipping" },
        { id: 'safety-concern', name: "Safety Concern" },
        { id: 'community-dispute', name: "Community Dispute" },
        { id: 'suggestion', name: "General Suggestion" },
        { id: 'other', name: "Other" }
    ]
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

export async function getSeedDataAction(): Promise<any> {
    return {
        pricing: {
            business: { monthly: 20, annual: 200 },
            storefront: { monthly: 10, annual: 100 },
            enterprise: { monthly: 50, annual: 500 }
        },
        dropdowns: defaultDropdowns,
        taxonomy: initialTaxonomy,
        businesses: businesses.map(b => ({ name: b.businessName, category: b.businessCategory }))
    };
}

export async function seedDatabase(): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const batch = firestore.batch();

    // Pricing Plans
    const businessPlanRef = firestore.collection('pricing_plans').doc('business');
    batch.set(businessPlanRef, {
      monthlyPrice: 20,
      annualPrice: 200,
      adverts: 5,
      events: 2,
      galleryImages: 10,
      additionalAdvertPrice: 5,
      additionalEventPrice: 10,
      updatedAt: Timestamp.now(),
    });

    const storefrontPlanRef = firestore.collection('pricing_plans').doc('storefront');
    batch.set(storefrontPlanRef, {
        monthlyPrice: 10,
        annualPrice: 100,
        updatedAt: Timestamp.now(),
    });

    const enterprisePlanRef = firestore.collection('pricing_plans').doc('enterprise');
    batch.set(enterprisePlanRef, {
      monthlyPrice: 50,
      annualPrice: 500,
      adverts: 20,
      events: 12,
      galleryImages: 50,
      featuredPartner: true,
      additionalAdvertPrice: 3,
      additionalEventPrice: 8,
      updatedAt: Timestamp.now(),
    });

    const advertiserPlanRef = firestore.collection('pricing_plans').doc('advertiser');
    batch.set(advertiserPlanRef, {
      featuredAdPrice: 1000,
      partnerAdPrice: 500,
      galleryImages: 20,
      updatedAt: Timestamp.now(),
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Error seeding database:', error);
    return { success: false, error: error.message || 'Failed to seed database.' };
  }
}

export async function seedDropdowns(): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = firestore.collection('platform_settings').doc('dropdowns');
        await docRef.set({ ...defaultDropdowns, updatedAt: Timestamp.now() }, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function seedShoppingTaxonomy(): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = firestore.collection('platform_settings').doc('shopping');
        await docRef.set({ categories: initialTaxonomy, updatedAt: Timestamp.now() }, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function seedBusinesses(params: { communityId: string }): Promise<ActionResponse> {
    const { communityId } = params;
    if (!communityId) {
        return { success: false, error: 'Community ID is required.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();

        for (const business of businesses) {
            const docRef = firestore.collection('businesses').doc(); // Auto-generate ID
            batch.set(docRef, {
                businessName: business.businessName,
                businessCategory: business.businessCategory,
                shortDescription: business.shortDescription,
                logoImage: business.logoImage,
                primaryCommunityId: communityId,
                status: 'Subscribed', // Set status to make them appear live
                createdAt: Timestamp.now(),
            });
        }

        await batch.commit();
        return { success: true };

    } catch (error: any) {
        console.error('Error seeding businesses:', error);
        return { success: false, error: error.message || 'Failed to seed businesses.' };
    }
}
