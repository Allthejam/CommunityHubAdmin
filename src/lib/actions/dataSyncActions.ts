'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  message?: string;
  count?: number;
};

/**
 * Re-synchronizes community member and leader counts.
 * Optimized Strategy: Single-pass user audit to build a count map,
 * preventing the N+1 query problem that causes server timeouts.
 */
export async function recalculateCommunityCounts(): Promise<ActionResponse> {
  console.log("[Sync] Starting optimized global hub statistics recalculation...");
  try {
    const { firestore } = initializeAdminApp();
    const communitiesRef = firestore.collection('communities');
    const usersRef = firestore.collection('users');

    const memberCounts: Record<string, number> = {};
    const leaderCounts: Record<string, number> = {};

    // 1. Single-pass User Scan
    // Accurate calculation based on resident home community and explicit appointed community roles.
    // Visitors who merely browse or visit another community are NEVER counted as members or leaders.
    const usersSnapshot = await usersRef.get();
    usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const role = (data.role || '').toLowerCase();
        const isGlobalLeader = ['president', 'leader'].includes(role);

        // A user's home community (their official residence/membership)
        const homeId = data.homeCommunityId || data.primaryHomeCommunityId;
        if (homeId) {
            memberCounts[homeId] = (memberCounts[homeId] || 0) + 1;
            // Only count as leader of their home community if they hold a leader role
            if (isGlobalLeader) {
                leaderCounts[homeId] = (leaderCounts[homeId] || 0) + 1;
            }
        }

        // Additional official community assignments (e.g. multi-community leadership or staff)
        if (data.communityRoles && typeof data.communityRoles === 'object') {
            Object.entries(data.communityRoles).forEach(([cid, roleData]: [string, any]) => {
                if (!cid || cid === homeId) return;
                const cRole = (roleData?.role || '').toLowerCase();
                memberCounts[cid] = (memberCounts[cid] || 0) + 1;
                if (['president', 'leader'].includes(cRole)) {
                    leaderCounts[cid] = (leaderCounts[cid] || 0) + 1;
                }
            });
        }
    });

    // 2. Bulk Update Communities
    const communitiesSnapshot = await communitiesRef.get();
    const batchSize = 450; // Safely under the 500 limit
    let batch = firestore.batch();
    let currentBatchCount = 0;
    let communitiesUpdated = 0;

    for (const communityDoc of communitiesSnapshot.docs) {
      const communityId = communityDoc.id;
      const newMemberCount = memberCounts[communityId] || 0;
      const newLeaderCount = leaderCounts[communityId] || 0;

      const commData = communityDoc.data();
      const updatePayload: any = {
        memberCount: newMemberCount,
        leaderCount: newLeaderCount,
        lastStatsSync: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (newLeaderCount === 0 && commData.status === 'active') {
        updatePayload.status = 'inactive';
      }

      batch.update(communityDoc.ref, updatePayload);

      communitiesUpdated++;
      currentBatchCount++;

      if (currentBatchCount === batchSize) {
        console.log(`[Sync] Committing batch of ${currentBatchCount} updates...`);
        await batch.commit();
        batch = firestore.batch();
        currentBatchCount = 0;
      }
    }

    if (currentBatchCount > 0) {
      console.log(`[Sync] Committing final batch of ${currentBatchCount} updates...`);
      await batch.commit();
    }

    const message = `Recalculation complete. Synchronized stats for ${communitiesUpdated} community hubs.`;
    console.log(`[Sync] ${message}`);
    
    return { 
        success: true, 
        message,
        count: communitiesUpdated 
    };

  } catch (error: any) {
    console.error("[Sync] Fatal error during hub stats recalculation:", error);
    return { success: false, error: error.message || 'The server encountered an error during the data sweep.' };
  }
}
