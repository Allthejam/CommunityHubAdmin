
'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

type ActionResponse = {
  success: boolean;
  error?: string;
  id?: string;
};

export type FaqItem = {
    id: string;
    question: string;
    answer: string;
    order: number;
    showOnHomepage: boolean;
    communityId: string;
};

export async function runCreateFaq(params: {
  communityId: string;
  question: string;
  answer: string;
}): Promise<ActionResponse> {
  const { communityId, question, answer } = params;
  if (!communityId || !question || !answer) {
    return { success: false, error: 'Community ID, question, and answer are required.' };
  }
  try {
    const { firestore } = initializeAdminApp();
    const faqsCollection = firestore.collection(`communities/${communityId}/faqs`);
    
    // Get the current max order
    const snapshot = await faqsCollection.orderBy('order', 'desc').limit(1).get();
    const maxOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order;

    const newFaqRef = faqsCollection.doc();
    await newFaqRef.set({
      question,
      answer,
      showOnHomepage: false,
      order: maxOrder + 1,
      createdAt: Timestamp.now(),
    });
    return { success: true, id: newFaqRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runUpdateFaq(params: Partial<FaqItem> & {id: string, communityId: string}): Promise<ActionResponse> {
    const { id, communityId, ...updateData } = params;
    if (!id || !communityId) {
        return { success: false, error: 'Item ID and Community ID are required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const faqRef = firestore.doc(`communities/${communityId}/faqs/${id}`);
        await faqRef.update({ ...updateData, updatedAt: Timestamp.now() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runDeleteFaq(params: { id: string; communityId: string }): Promise<ActionResponse> {
    const { id, communityId } = params;
    if (!id || !communityId) {
        return { success: false, error: 'Item ID and Community ID are required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.doc(`communities/${communityId}/faqs/${id}`).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runUpdateFaqOrder(params: {
    communityId: string;
    item1: { id: string, order: number };
    item2: { id: string, order: number };
}): Promise<ActionResponse> {
    const { communityId, item1, item2 } = params;
     if (!communityId || !item1 || !item2) {
        return { success: false, error: 'Invalid parameters for reordering.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        const ref1 = firestore.doc(`communities/${communityId}/faqs/${item1.id}`);
        const ref2 = firestore.doc(`communities/${communityId}/faqs/${item2.id}`);
        batch.update(ref1, { order: item1.order });
        batch.update(ref2, { order: item2.order });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runToggleFaqVisibility(params: { communityId: string; isPublished: boolean }): Promise<ActionResponse> {
    const { communityId, isPublished } = params;
    if (!communityId) {
        return { success: false, error: 'Community ID is required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.doc(`communities/${communityId}`);
        await communityRef.update({ faqPublished: isPublished });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
