'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { scanAndFlagAction } from "./moderationActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type MarketplaceItemData = {
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  communityId: string;
  title: string;
  description: string;
  listingType: 'For Sale' | 'To Swap' | 'Free' | 'Looking For';
  price?: number;
  image?: string | null;
};

export async function createMarketplaceListingAction(data: MarketplaceItemData): Promise<ActionResponse> {
  const { firestore } = initializeAdminApp();
  try {
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + 21);

    const itemRef = firestore.collection(`communities/${data.communityId}/marketplace`).doc();
    
    await itemRef.set({
      ...data,
      price: data.price ? Number(data.price) : 0,
      status: 'active',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
    });

    // Moderation Scan - passing absolute path
    await scanAndFlagAction({
        text: `${data.title} ${data.description}`,
        contentType: "Marketplace Listing",
        authorId: data.ownerId,
        authorName: data.ownerName,
        contentId: itemRef.id,
        contentPath: itemRef.path
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error creating marketplace listing:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteMarketplaceListingAction(params: { communityId: string, itemId: string, userId: string }): Promise<ActionResponse> {
  const { communityId, itemId, userId } = params;
  try {
    const { firestore } = initializeAdminApp();
    const itemRef = firestore.doc(`communities/${communityId}/marketplace/${itemId}`);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      throw new Error("Item not found.");
    }
    if (itemDoc.data()?.ownerId !== userId) {
      throw new Error("You do not have permission to delete this item.");
    }

    await itemRef.delete();
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting marketplace item:", error);
    return { success: false, error: error.message };
  }
}