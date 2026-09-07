'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logAuditTrailAction } from "./auditActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function updateReportStatusAction(params: {
  reportId: string;
  status: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  reportType: 'community' | 'platform';
}): Promise<ActionResponse> {
  const { reportId, status, resolutionNotes, resolvedBy, reportType } = params;

  if (!reportId || !status) {
    return { success: false, error: 'Report ID and status are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const collectionName = reportType === 'community' ? 'community_reports' : 'platform_reports';
    const reportRef = firestore.collection(collectionName).doc(reportId);
    
    const updateData: any = { status, updatedAt: Timestamp.now() };

    if (status === 'Resolved') {
      updateData.resolvedAt = Timestamp.now();
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes;
      }
      if (resolvedBy) {
        updateData.resolvedBy = resolvedBy;
      }
    }

    await reportRef.update(updateData);
    
    await logAuditTrailAction({
      adminName: resolvedBy || 'Platform Administration',
      action: status === 'Resolved' ? 'report_resolved' : 'report_status_updated',
      category: 'Reports & Moderation',
      details: `Updated ${reportType} report #${reportId} status to "${status}". ${resolutionNotes ? `Notes: ${resolutionNotes}` : ''}`.trim(),
      targetObject: {
        id: reportId,
        name: `${reportType.toUpperCase()} Report #${reportId.substring(0, 6)}`,
        type: `${reportType} Report`
      },
      metadata: { status, resolutionNotes, reportType }
    });

    return { success: true };
  } catch (error: any) {
    console.error(`Error updating report ${reportId}:`, error);
    return { success: false, error: error.message || 'Failed to update report status.' };
  }
}

export async function createReportAction(params: {
    userId: string;
    communityId?: string | null;
    subject: string;
    description: string;
    category: string;
    severity?: 'Low' | 'Moderate' | 'Severe';
    reportType: 'community' | 'platform';
    userName: string;
    image?: string | null;
    contactPreference?: string;
    contactDetail?: string;
}): Promise<ActionResponse> {
    const { userId, communityId, subject, description, category, severity, reportType, userName, image, contactPreference, contactDetail } = params;

    if (!userId || !subject || !description || !category) {
        return { success: false, error: 'Missing required fields.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();

        const collectionName = reportType === 'community' ? 'community_reports' : 'platform_reports';
        const newReportRef = firestore.collection(collectionName).doc();
        
        batch.set(newReportRef, {
            communityId: communityId || null,
            subject,
            reporterName: userName,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            status: 'New',
            description,
            category,
            severity: severity || 'Moderate',
            reporterId: userId,
            image: image || null,
            contactPreference,
            contactDetail,
        });

        // Notify leaders or admins
        let recipientId: string | null = null;
        if (reportType === 'community' && communityId) {
            const usersRef = firestore.collection('users');
            const roleQuery = usersRef.where(`communityRoles.${communityId}.role`, 'in', ['leader', 'president']).limit(1);
            let leaderSnapshot = await roleQuery.get();

            if (leaderSnapshot.empty) {
                const primaryLeaderQuery = usersRef.where('homeCommunityId', '==', communityId).where('role', 'in', ['leader', 'president']).limit(1);
                leaderSnapshot = await primaryLeaderQuery.get();
            }
            if (!leaderSnapshot.empty) {
                recipientId = leaderSnapshot.docs[0].id;
            }
        } else if (reportType === 'platform') {
            recipientId = 'platform_admin';
        }

        if (recipientId) {
            const notificationRef = firestore.collection('notifications').doc();
            batch.set(notificationRef, {
                recipientId,
                communityId: communityId || null,
                type: 'New Report',
                subject: `New Report: ${subject}`,
                from: userName,
                date: Timestamp.now().toDate().toISOString(),
                status: 'New',
                relatedId: newReportRef.id,
            });
        }
        
        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error creating report:", error);
        return { success: false, error: 'Failed to submit your report.' };
    }
}
