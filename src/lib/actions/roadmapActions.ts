
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

const initialRoadmapData = [
    { 
        accountType: "Personal Account", 
        icon: 'User', 
        status: 'Live', 
        improvements: [
            { text: 'Community forum access', status: 'Completed', progress: 100, completedAt: '20 Jan 2026' },
            { text: 'Direct messaging with members', status: 'Started', progress: 45 }
        ], 
        order: 0 
    },
    { 
        accountType: "Business Account", 
        icon: 'Building2', 
        status: 'Live', 
        improvements: [
            { text: 'Profile page customization', status: 'Completed', progress: 100, completedAt: '15 Jan 2026' },
            { text: 'Storefront for product sales', status: 'Completed', progress: 100, completedAt: '22 Jan 2026' }
        ], 
        order: 1 
    },
    { 
        accountType: "Community Leader", 
        icon: 'Crown', 
        status: 'Live', 
        improvements: [
            { text: 'Member management tools', status: 'Completed', progress: 100, completedAt: '10 Jan 2026' },
            { text: 'Content moderation queue', status: 'Started', progress: 80 }
        ], 
        order: 2 
    },
    { 
        accountType: "Enterprise Account", 
        icon: 'HeartHandshake', 
        status: 'In Development', 
        improvements: [
            { text: 'Multi-community management', status: 'Started', progress: 30 },
            { text: 'Centralized billing', status: 'Planned', progress: 0 }
        ], 
        order: 3 
    },
    { 
        accountType: "National Advertiser", 
        icon: 'Globe', 
        status: 'Live', 
        improvements: [
            { text: 'Platform-wide ad campaigns', status: 'Completed', progress: 100, completedAt: '05 Jan 2026' },
            { text: 'Performance analytics', status: 'Planned', progress: 0 }
        ], 
        order: 4 
    },
];


export async function seedInitialRoadmapData(): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        const roadmapCollection = firestore.collection('roadmap');

        initialRoadmapData.forEach(item => {
            const docRef = roadmapCollection.doc(); // Auto-generate ID
            batch.set(docRef, item);
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function addRoadmapImprovement(params: {
  roadmapItemId: string;
  improvement: {
      text: string;
      status: string;
      progress: number;
  };
}): Promise<ActionResponse> {
  const { roadmapItemId, improvement } = params;
  if (!roadmapItemId || !improvement.text) {
    return { success: false, error: "Roadmap item ID and improvement text are required." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const itemRef = firestore.collection("roadmap").doc(roadmapItemId);
    await itemRef.update({
      improvements: FieldValue.arrayUnion(improvement),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeRoadmapImprovement(params: {
    roadmapItemId: string;
    improvement: any;
}): Promise<ActionResponse> {
    const { roadmapItemId, improvement } = params;
    if (!roadmapItemId || !improvement) {
        return { success: false, error: "Roadmap item ID and improvement object are required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        const itemRef = firestore.collection("roadmap").doc(roadmapItemId);
        await itemRef.update({
            improvements: FieldValue.arrayRemove(improvement),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateRoadmapImprovements(params: {
    roadmapItemId: string;
    improvements: any[];
    notifier?: {
        recipientId: string;
        taskTitle: string;
        assignerName: string;
    }
}): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        const itemRef = firestore.collection("roadmap").doc(params.roadmapItemId);
        
        batch.update(itemRef, {
            improvements: params.improvements,
        });

        if (params.notifier) {
            const notifRef = firestore.collection('notifications').doc();
            batch.set(notifRef, {
                recipientId: params.notifier.recipientId,
                type: 'Task Assignment',
                subject: `New Development Task: ${params.notifier.taskTitle}`,
                from: params.notifier.assignerName,
                date: Timestamp.now().toDate().toISOString(),
                status: 'New',
                relatedId: params.roadmapItemId,
                details: {
                    message: `You have been assigned to: "${params.notifier.taskTitle}". View and track your progress in the Development Roadmap.`
                }
            });
        }

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addRoadmapItem(params: {
    accountType: string;
    status: string;
    order: number;
}): Promise<ActionResponse> {
    const { accountType, status, order } = params;
    if (!accountType || !status) {
        return { success: false, error: "Account type and status are required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection("roadmap").add({
            accountType,
            status,
            order,
            icon: 'Briefcase', // Default icon
            improvements: [],
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteRoadmapItem(itemId: string): Promise<ActionResponse> {
    if (!itemId) {
        return { success: false, error: "Item ID is required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection("roadmap").doc(itemId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
