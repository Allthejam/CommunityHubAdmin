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
    // Build a map of counts for every community mentioned in user records
    const usersSnapshot = await usersRef.get();
    usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const role = (data.role || '').toLowerCase();
        const isLeader = ['president', 'leader'].includes(role);

        // Track membership (memberOf includes home community)
        const memberOf = data.memberOf || [];
        if (memberOf.length > 0) {
            memberOf.forEach((cid: string) => {
                if (!cid) return;
                memberCounts[cid] = (memberCounts[cid] || 0) + 1;
                if (isLeader) {
                    leaderCounts[cid] = (leaderCounts[cid] || 0) + 1;
                }
            });
        }

        // Integrity Check: Ensure homeCommunityId is counted even if memberOf is missing it
        if (data.homeCommunityId && !memberOf.includes(data.homeCommunityId)) {
            const hId = data.homeCommunityId;
            memberCounts[hId] = (memberCounts[hId] || 0) + 1;
            if (isLeader) {
                leaderCounts[hId] = (leaderCounts[hId] || 0) + 1;
            }
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

      batch.update(communityDoc.ref, {
        memberCount: newMemberCount,
        leaderCount: newLeaderCount,
        lastStatsSync: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

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
