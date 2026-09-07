
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  id?: string;
};

export type LegalDocumentData = {
    title: string;
    description: string;
    content: string;
    version: string;
}

export async function createLegalDocumentAction(data: LegalDocumentData): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = await firestore.collection('legal_documents').add({
            ...data,
            status: 'Draft',
            createdAt: Timestamp.now(),
            lastUpdated: Timestamp.now(),
        });
        return { success: true, id: docRef.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateLegalDocumentAction(id: string, data: Partial<LegalDocumentData>): Promise<ActionResponse> {
     try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('legal_documents').doc(id).update({
            ...data,
            lastUpdated: Timestamp.now(),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateLegalDocumentStatusAction(id: string, status: 'Published' | 'Draft' | 'Archived'): Promise<ActionResponse> {
     try {
        const { firestore } = initializeAdminApp();
        const docRef = firestore.collection('legal_documents').doc(id);
        const updateData: any = { status, lastUpdated: Timestamp.now() };

        if (status === 'Published') {
            const currentDoc = await docRef.get();
            const currentVersion = currentDoc.data()?.version || '1.0';
            const versionParts = currentVersion.split('.').map(Number);
            versionParts[versionParts.length - 1] += 1;
            updateData.version = versionParts.join('.');
        }

        await docRef.update(updateData);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function deleteLegalDocumentAction(id: string): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('legal_documents').doc(id).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
