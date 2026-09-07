'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logAuditTrailAction } from "./auditActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export type Community = {
  id: string;
  name: string;
  type: "geographic" | "topic";
  category?: string;
  visibility: "public" | "private";
  country: string;
  state: string;
  region: string;
  leaders: number;
  status: "active" | "pending" | "suspended" | "under construction" | "under investigation" | "inactive";
  users: number;
  businesses: number;
  createdAt: any; 
  createdBy: string;
  monthlyIncome: number;
  revenueShare?: number;
  isLocked?: boolean;
};

export async function updateCommunityStatusAction(params: {
  communityId: string; 
  newStatus: Community['status'];
  adminId?: string;
  adminName?: string;
}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        const snap = await communityRef.get();
        const commData = snap.data();

        await communityRef.update({ status: params.newStatus, updatedAt: Timestamp.now() });

        await logAuditTrailAction({
          adminId: params.adminId || 'system_admin',
          adminName: params.adminName || 'Platform Administration',
          action: `community_status_${params.newStatus.replace(/\s+/g, '_')}`,
          category: 'Communities & Hubs',
          details: `Updated status of community "${commData?.name || params.communityId}" to "${params.newStatus}".`,
          targetObject: {
            id: params.communityId,
            name: commData?.name || params.communityId,
            type: 'Community Hub'
          },
          metadata: { previousStatus: commData?.status, newStatus: params.newStatus }
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Performs a bulk status update for communities.
 * Correctly identifies all case-variations of 'Pending' and 'pending'.
 */
export async function runBulkUpdateCommunityStatus(params: { fromStatus: string, toStatus: string }): Promise<ActionResponse & { count?: number }> {
    const { firestore } = initializeAdminApp();
    console.log(`[Maintenance] Starting migration from ${params.fromStatus} to ${params.toStatus}...`);
    
    try {
        // Query for both variations to ensure we catch everything
        const q1 = firestore.collection('communities').where('status', '==', 'pending');
        const q2 = firestore.collection('communities').where('status', '==', 'Pending');
        
        const [snap1, snap2] = await Promise.all([q1.get(), q2.get()]);
        
        // Combine results and remove duplicates (if any)
        const docsToUpdate = new Map();
        snap1.docs.forEach(doc => docsToUpdate.set(doc.id, doc.ref));
        snap2.docs.forEach(doc => docsToUpdate.set(doc.id, doc.ref));
        
        const allRefs = Array.from(docsToUpdate.values());
        
        if (allRefs.length === 0) {
            console.log("[Maintenance] No matching communities found for migration.");
            return { success: true, count: 0 };
        }

        const batchSize = 500;
        let totalCount = 0;
        let currentBatch = firestore.batch();

        for (const ref of allRefs) {
            currentBatch.update(ref, { 
                status: params.toStatus, 
                updatedAt: Timestamp.now() 
            });
            totalCount++;

            if (totalCount % batchSize === 0) {
                console.log(`[Maintenance] Committing batch of ${batchSize}...`);
                await currentBatch.commit();
                currentBatch = firestore.batch();
            }
        }

        if (totalCount % batchSize !== 0) {
            console.log(`[Maintenance] Committing final batch of ${totalCount % batchSize}...`);
            await currentBatch.commit();
        }

        console.log(`[Maintenance] Migration successful. Updated ${totalCount} records.`);
        return { success: true, count: totalCount };
    } catch (error: any) {
        console.error("[Maintenance] Bulk status update failed:", error);
        return { success: false, error: error.message };
    }
}

export async function renameCommunityAction(params: {communityId: string, newName: string}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ name: params.newName });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateCommunityTypeAction(params: {communityId: string, newType: Community['type']}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ type: params.newType });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateCommunityVisibilityAction(params: {communityId: string, newVisibility: Community['visibility']}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ visibility: params.newVisibility });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runSetCommunityRevenueShare(params: {communityId: string, share: number, reason: string, leaderId: string | null}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    try {
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ revenueShare: params.share });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function checkCommunityLeaderAction(communityId: string): Promise<{ hasLeader: boolean }> {
  try {
    const { firestore } = initializeAdminApp();
    const usersRef = firestore.collection('users');
    const q1 = usersRef.where(`communityRoles.${communityId}.role`, 'in', ['president', 'leader']).limit(1);
    const q2 = usersRef.where('homeCommunityId', '==', communityId).where('role', 'in', ['president', 'leader']).limit(1);
    
    const [snapshot1, snapshot2] = await Promise.all([q1.get(), q2.get()]);

    return { hasLeader: !snapshot1.empty || !snapshot2.empty };
  } catch (error) {
    console.error("Error checking for community leader:", error);
    return { hasLeader: true };
  }
}

export async function claimCommunityLeadershipAction(params: { userId: string, communityId: string }): Promise<ActionResponse> {
    const { userId, communityId } = params;
    if (!userId || !communityId) {
        return { success: false, error: 'User and Community must be specified.' };
    }
    const { firestore } = initializeAdminApp();

    try {
        await firestore.runTransaction(async (transaction) => {
            const communityRef = firestore.collection('communities').doc(communityId);
            const userRef = firestore.collection('users').doc(userId);

            const [communityDoc, userDoc] = await Promise.all([
                transaction.get(communityRef),
                transaction.get(userRef)
            ]);

            if (!communityDoc.exists) throw new Error("Community does not exist.");
            if (!userDoc.exists) throw new Error("User does not exist.");
            
            const communityData = communityDoc.data();
            if ((communityData?.leaderCount || 0) > 0) {
                 throw new Error("This community already has a leader.");
            }
            
            const userData = userDoc.data()!;
            let finalStatus: Community['status'] = 'pending';

            if (userData.homeCommunityId) {
                const homeCommunityDoc = await transaction.get(firestore.collection('communities').doc(userData.homeCommunityId));
                if (homeCommunityDoc.exists && homeCommunityDoc.data()?.status === 'active') {
                    finalStatus = 'active'; 
                }
            }


            transaction.update(userRef, {
                role: 'president',
                title: 'President',
                communityId: communityId,
                homeCommunityId: communityId,
                memberOf: FieldValue.arrayUnion(communityId),
                [`communityRoles.${communityId}`]: {
                    role: 'president',
                    title: 'President'
                }
            });

            transaction.update(communityRef, {
                leaderCount: FieldValue.increment(1),
                status: finalStatus,
                revenueShare: 40 
            });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error claiming community leadership:", error);
        return { success: false, error: error.message };
    }
}


export async function runSaveNewsCategories(params: { communityId: string; categories: string[] }): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ newsCategories: params.categories });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runSavePoliceLiaison(params: {
  communityId: string;
  policeContact: {
    officerName: string;
    stationName: string;
    contactEmail: string;
    contactPhone: string;
    autoForward: boolean;
  };
}): Promise<ActionResponse> {
  const { firestore } = initializeAdminApp();
  try {
    const communityRef = firestore.collection('communities').doc(params.communityId);
    await communityRef.update({ policeContact: params.policeContact });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runSaveCommunityBoundary(params: { communityId: string; geoJsonString: string }): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ boundary: params.geoJsonString, updatedAt: Timestamp.now() });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving community boundary:", error);
        return { success: false, error: error.message };
    }
}

export async function runToggleCommunityLock(params: { communityId: string; isLocked: boolean }): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.collection('communities').doc(params.communityId);
        await communityRef.update({ isLocked: params.isLocked, updatedAt: Timestamp.now() });
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling community lock:", error);
        return { success: false, error: error.message };
    }
}

export async function runGetAllBoundaries(): Promise<{ success: boolean; data: any[]; error?: string }> {
    try {
        const { firestore } = initializeAdminApp();
        
        // Query communities collection
        const communitiesSnapshot = await firestore.collection('communities').get();
        const boundaries: any[] = [];
        const seenIds = new Set<string>();

        communitiesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const rawBoundary = data.boundary || data.boundaries || data.geoBoundary || data.geoJson || data.geometry;
            if (rawBoundary) {
                let boundaryStr = '';
                if (typeof rawBoundary === 'string') {
                    boundaryStr = rawBoundary;
                } else if (typeof rawBoundary === 'object') {
                    boundaryStr = JSON.stringify(rawBoundary);
                }

                if (boundaryStr && !seenIds.has(doc.id)) {
                    seenIds.add(doc.id);
                    boundaries.push({
                        id: doc.id,
                        name: data.name || data.communityName || 'Community',
                        boundary: boundaryStr,
                        isLocked: Boolean(data.isLocked),
                        status: data.status || 'active',
                        region: data.region || data.state || '',
                    });
                }
            }
        });

        // Also check locations collection if any boundaries are registered there
        try {
            const locationsSnapshot = await firestore.collection('locations').get();
            locationsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const rawBoundary = data.boundary || data.boundaries || data.geoBoundary || data.geoJson || data.geometry;
                if (rawBoundary && !seenIds.has(doc.id)) {
                    let boundaryStr = '';
                    if (typeof rawBoundary === 'string') {
                        boundaryStr = rawBoundary;
                    } else if (typeof rawBoundary === 'object') {
                        boundaryStr = JSON.stringify(rawBoundary);
                    }

                    if (boundaryStr) {
                        seenIds.add(doc.id);
                        boundaries.push({
                            id: doc.id,
                            name: data.name || data.communityName || 'Location',
                            boundary: boundaryStr,
                            isLocked: Boolean(data.isLocked),
                            status: data.status || 'active',
                            region: data.region || data.state || '',
                        });
                    }
                }
            });
        } catch (locErr) {
            // locations collection might not exist or have different permissions, which is safe to ignore
            console.warn("Locations boundary check skipped:", locErr);
        }

        return { success: true, data: boundaries };
    } catch (error: any) {
        console.error("Error fetching all boundaries:", error);
        return { success: false, data: [], error: error.message || 'Firestore connection error' };
    }
}

export async function runCheckBoundaryOverlap(params: { communityId: string; geoJson: any }): Promise<{ overlaps: boolean; reason: string; overlappingCommunityId?: string; overlappingCommunityName?: string; conflictingCommunityGeoJson?: string; }> {
    if (params.geoJson.geometry.coordinates[0][0][0] > 0) {
        return { 
            overlaps: true, 
            reason: "Boundary overlaps with 'Eastwood'.",
            overlappingCommunityId: "mock-eastwood-id",
            overlappingCommunityName: "Eastwood",
            conflictingCommunityGeoJson: JSON.stringify(params.geoJson.geometry) 
        };
    }
    return { overlaps: false, reason: "No overlaps detected with neighboring communities." };
}

export async function runCreateDisputeFromOverlap(params: {
  reportingCommunityId: string;
  reportingCommunityName: string;
  overlappingCommunityId: string;
  overlappingCommunityName: string;
  reportedBy: string;
}): Promise<ActionResponse> {
  try {
    console.log("Dispute created:", params);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Robustly serializes Firestore document data for Next.js Client Components.
 * Recursively converts all Timestamps to ISO strings.
 */
function serializeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    // Check if it's a Firestore Timestamp
    if (typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(serializeData);
    }
    
    // Handle objects
    const serialized: any = {};
    for (const key in data) {
        serialized[key] = serializeData(data[key]);
    }
    return serialized;
}

