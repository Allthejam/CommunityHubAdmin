
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type ItemData = {
    communityId: string;
    title: string;
    category: string;
    description: string;
    address: string;
    website: string;
    phone: string;
    email: string;
    social: string;
    openingHours: any;
    image: string | null;
    metaTitle?: string;
    metaDescription?: string;
};

export async function createWhatsonItemAction(data: ItemData): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('whatson').add({
            ...data,
            status: 'Active',
            createdAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error creating 'What's On' item:", error);
        return { success: false, error: error.message };
    }
}

export async function updateWhatsonItemAction(params: { communityId: string, itemId: string, data: Partial<ItemData> }): Promise<ActionResponse> {
    const { communityId, itemId, data } = params;
    try {
        const { firestore } = initializeAdminApp();
        // In a real app, you'd add security to ensure the user has permission to edit this community's items
        const itemRef = firestore.collection('whatson').doc(itemId);
        await itemRef.update({
            ...data,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating 'What's On' item:", error);
        return { success: false, error: error.message };
    }
}

export async function updateWhatsonStatusAction(params: {
  communityId: string;
  itemId: string;
  status: 'Active' | 'Temporarily Closed' | 'Archived';
}): Promise<ActionResponse> {
    const { communityId, itemId, status } = params;
    try {
        const { firestore } = initializeAdminApp();
        const itemRef = firestore.collection('whatson').doc(itemId);
        // Security check would be important here in a real app
        await itemRef.update({ status });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteWhatsonItemAction(params: {
  communityId: string;
  itemId: string;
}): Promise<ActionResponse> {
    const { communityId, itemId } = params;
     try {
        const { firestore } = initializeAdminApp();
        // Security check
        await firestore.collection('whatson').doc(itemId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

    