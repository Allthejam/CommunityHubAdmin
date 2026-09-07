'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  count?: number;
};

type PushNotificationPayload = {
    audience: {
        type: 'users' | 'topic';
        value: string[];
    };
    notification: {
        title: string;
        body: string;
        tag?: string;
    };
}

export async function sendPushNotificationAction(params: PushNotificationPayload): Promise<ActionResponse> {
  console.log("Sending push notification with params:", params);
  // In a real app, you'd integrate with a push notification service like FCM (Firebase Cloud Messaging)
  try {
    // Mock success
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateNotificationStatusAction(params: {
  notificationId: string;
  status: string;
  actor?: string;
  assignedTo?: { id: string; name: string };
}): Promise<ActionResponse> {
  const { notificationId, status, actor, assignedTo } = params;
  if (!notificationId || !status) {
    return { success: false, error: 'Notification ID and status are required.' };
  }
  
  try {
    const { firestore } = initializeAdminApp();
    const notificationRef = firestore.collection('notifications').doc(notificationId);
    
    const updateData: { [key: string]: any } = { 
        status: status,
        updatedAt: Timestamp.now()
    };

    if(actor) {
        updateData.history = FieldValue.arrayUnion({
            action: status,
            actor: actor,
            timestamp: Timestamp.now()
        })
    }

    if (status === 'Assigned' && assignedTo) {
        updateData.assignedTo = assignedTo;
    }

    await notificationRef.update(updateData);
    
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating notification ${notificationId} to status ${status}:`, error);
    return { success: false, error: error.message || 'Failed to update notification status.' };
  }
}

/**
 * Performs a bulk status update using Firestore Batches for maximum efficiency.
 */
export async function bulkUpdateNotificationStatusAction(params: {
  notificationIds: string[];
  status: string;
  actor?: string;
}): Promise<ActionResponse> {
  const { notificationIds, status, actor } = params;
  if (!notificationIds || notificationIds.length === 0) return { success: true, count: 0 };

  try {
    const { firestore } = initializeAdminApp();
    const batchSize = 450;
    let totalUpdated = 0;

    for (let i = 0; i < notificationIds.length; i += batchSize) {
      const chunk = notificationIds.slice(i, i + batchSize);
      const batch = firestore.batch();

      chunk.forEach(id => {
        const ref = firestore.collection('notifications').doc(id);
        const updateData: any = { status, updatedAt: Timestamp.now() };
        if (actor) {
          updateData.history = FieldValue.arrayUnion({
            action: status,
            actor: actor,
            timestamp: Timestamp.now()
          });
        }
        batch.update(ref, updateData);
      });

      await batch.commit();
      totalUpdated += chunk.length;
    }

    return { success: true, count: totalUpdated };
  } catch (error: any) {
    console.error("Bulk update failed:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteNotificationAction(params: {
  notificationId: string;
}): Promise<ActionResponse> {
  const { notificationId } = params;
  if (!notificationId) {
    return { success: false, error: 'Notification ID is required.' };
  }
  
  try {
    const { firestore } = initializeAdminApp();
    const notificationRef = firestore.collection('notifications').doc(notificationId);
    await notificationRef.delete();
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting notification ${notificationId}:`, error);
    return { success: false, error: error.message || 'Failed to delete notification.' };
  }
}

/**
 * Performs a bulk deletion using Firestore Batches.
 */
export async function bulkDeleteNotificationsAction(params: {
  notificationIds: string[];
}): Promise<ActionResponse> {
  const { notificationIds } = params;
  if (!notificationIds || notificationIds.length === 0) return { success: true, count: 0 };

  try {
    const { firestore } = initializeAdminApp();
    const batchSize = 450;
    let totalDeleted = 0;

    for (let i = 0; i < notificationIds.length; i += batchSize) {
      const chunk = notificationIds.slice(i, i + batchSize);
      const batch = firestore.batch();
      chunk.forEach(id => batch.delete(firestore.collection('notifications').doc(id)));
      await batch.commit();
      totalDeleted += chunk.length;
    }

    return { success: true, count: totalDeleted };
  } catch (error: any) {
    console.error("Bulk deletion failed:", error);
    return { success: false, error: error.message };
  }
}
