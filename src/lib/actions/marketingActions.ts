
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  campaignId?: string;
};

type CampaignData = {
    id?: string;
    audience: string;
    feature: string;
    headline: string;
    body: string;
    socialMediaPost: string;
    coverImageUrl?: string;
}

export async function saveMarketingCampaignAction(data: CampaignData): Promise<ActionResponse> {
    if (!data.audience || !data.feature || !data.headline || !data.body || !data.socialMediaPost) {
        return { success: false, error: 'All content fields are required.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const campaignsCollection = firestore.collection('marketing_campaigns');
        const { id, ...dataToSave } = data;

        if (id) {
            // Update existing campaign
            const campaignRef = campaignsCollection.doc(id);
            await campaignRef.update({
                ...dataToSave,
                updatedAt: Timestamp.now(),
            });
            return { success: true, campaignId: id };
        } else {
            // Create new campaign
            const newCampaignRef = await campaignsCollection.add({
                ...dataToSave,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return { success: true, campaignId: newCampaignRef.id };
        }
    } catch (error: any) {
        console.error("Error saving marketing campaign:", error);
        return { success: false, error: error.message || 'Failed to save campaign.' };
    }
}

export async function deleteMarketingCampaignAction(campaignId: string): Promise<ActionResponse> {
    if (!campaignId) {
        return { success: false, error: "Campaign ID is required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('marketing_campaigns').doc(campaignId).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting marketing campaign:", error);
        return { success: false, error: error.message || 'Failed to delete campaign.' };
    }
}
