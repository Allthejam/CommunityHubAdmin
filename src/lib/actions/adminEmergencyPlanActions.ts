'use server';

import { initializeAdminApp } from "@/firebase/admin-app";

export type HazardCompletion = {
    wildfire: boolean;
    urbanfire: boolean;
    flood: boolean;
    power: boolean;
    drought: boolean;
    unrest: boolean;
    defence: boolean;
};

export type CommunityEmergencyOverview = {
    communityId: string;
    communityName: string;
    county?: string;
    region?: string;
    leader: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        avatar?: string;
        title?: string;
    };
    hasPlan: boolean;
    threatStatus: 'green' | 'amber' | 'red' | 'black';
    threatNotes?: string;
    threatUpdatedAt?: any;
    threatUpdatedByName?: string;
    certified: boolean;
    certifiedAt?: any;
    certifiedBy?: string;
    hazards: HazardCompletion;
    completedCount: number; // 0 to 7
    completionPercentage: number;
    keyholderCount: number;
    facilityCount: number;
    evacuationPointCount: number;
    activeBroadcastCount: number;
    lastUpdated?: any;
    planData?: any;
};

export type EmergencyBroadcastItem = {
    id: string;
    communityId: string;
    communityName: string;
    title: string;
    message: string;
    level: 'Critical' | 'Warning' | 'Advisory' | 'Informational';
    active: boolean;
    archived?: boolean;
    retracted?: boolean;
    createdAt: any;
    createdByName?: string;
};

/**
 * Fetch all communities that have a designated president / leader,
 * along with their live 7-hazard emergency plan completion and threat status.
 */
export async function getNationalEmergencyPlansOverviewAction(): Promise<{
    success: boolean;
    overview: CommunityEmergencyOverview[];
    activeAlerts: CommunityEmergencyOverview[];
    broadcasts: EmergencyBroadcastItem[];
    stats: {
        totalWithLeader: number;
        totalCertified: number;
        fullyReadyCount: number;
        inProgressCount: number;
        missingPlanCount: number;
        activeIncidentsCount: number; // Amber or Red/Black
    };
    error?: string;
}> {
    try {
        const { firestore } = initializeAdminApp();

        // 1. Fetch all users who have leader / president roles
        const usersSnap = await firestore.collection('users').get();
        const leaderMap: Record<string, {
            id: string;
            name: string;
            email: string;
            phone?: string;
            avatar?: string;
            title?: string;
        }> = {};

        usersSnap.docs.forEach(docSnap => {
            const u = docSnap.data();
            const uid = docSnap.id;
            const name = u.displayName || u.name || (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.email?.split('@')[0]) || 'Leader';
            const email = u.email || '';
            const phone = u.phone || u.phoneNumber || u.mobile || '';
            const avatar = u.photoURL || u.profileImage || '';
            const title = u.title || (u.role === 'president' ? 'President' : 'Leader');

            const leaderInfo = { id: uid, name, email, phone, avatar, title };

            // Check primary community
            if ((u.role === 'president' || u.role === 'leader') && u.homeCommunityId) {
                leaderMap[u.homeCommunityId] = leaderInfo;
            }
            if ((u.role === 'president' || u.role === 'leader') && u.communityId) {
                leaderMap[u.communityId] = leaderInfo;
            }

            // Check multi-community roles
            if (u.communityRoles && typeof u.communityRoles === 'object') {
                Object.entries(u.communityRoles).forEach(([cId, roleObj]: [string, any]) => {
                    if (roleObj?.role === 'president' || roleObj?.role === 'leader') {
                        leaderMap[cId] = leaderInfo;
                    }
                });
            }
        });

        // 2. Fetch all active communities
        const communitiesSnap = await firestore.collection('communities').get();
        const activeCommunities = communitiesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // 3. Filter to ONLY communities that have a designated leader (president)
        const eligibleCommunities = activeCommunities.filter(c => !!leaderMap[c.id]);

        const overviewList: CommunityEmergencyOverview[] = [];
        const allBroadcasts: EmergencyBroadcastItem[] = [];

        // 4. For each eligible community, inspect their emergency_plan/main and emergency_messages
        for (const comm of eligibleCommunities) {
            const communityId = comm.id;
            const communityName = comm.name || comm.title || communityId;
            const county = comm.county || comm.region || '';
            const region = comm.region || comm.area || '';
            const leader = leaderMap[communityId];

            // Fetch emergency plan main doc
            const planDocSnap = await firestore
                .collection('communities')
                .doc(communityId)
                .collection('emergency_plan')
                .doc('main')
                .get();

            // Fetch live emergency messages
            const messagesSnap = await firestore
                .collection('communities')
                .doc(communityId)
                .collection('emergency_messages')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();

            const commMessages: EmergencyBroadcastItem[] = messagesSnap.docs.map(mDoc => {
                const mData = mDoc.data();
                return {
                    id: mDoc.id,
                    communityId,
                    communityName,
                    title: mData.title || 'Emergency Notice',
                    message: mData.message || '',
                    level: mData.level || 'Warning',
                    active: mData.active !== false && !mData.retracted && !mData.archived,
                    archived: mData.archived || false,
                    retracted: mData.retracted || false,
                    createdAt: mData.createdAt?.toDate ? mData.createdAt.toDate().toISOString() : mData.createdAt,
                    createdByName: mData.createdByName || mData.author || leader.name,
                };
            });

            commMessages.forEach(msg => allBroadcasts.push(msg));
            const activeBroadcastCount = commMessages.filter(m => m.active).length;

            if (!planDocSnap.exists) {
                // Community has a leader, but has NOT created an emergency plan yet
                overviewList.push({
                    communityId,
                    communityName,
                    county,
                    region,
                    leader,
                    hasPlan: false,
                    threatStatus: 'green',
                    certified: false,
                    hazards: {
                        wildfire: false,
                        urbanfire: false,
                        flood: false,
                        power: false,
                        drought: false,
                        unrest: false,
                        defence: false,
                    },
                    completedCount: 0,
                    completionPercentage: 0,
                    keyholderCount: 0,
                    facilityCount: 0,
                    evacuationPointCount: 0,
                    activeBroadcastCount,
                });
                continue;
            }

            const pData = planDocSnap.data() || {};

            // Calculate hazard completion across all 7 scenarios
            const sf = pData.scenarioFacilities || {};
            const sl = pData.scenarioLiaisons || {};
            const st = pData.scenarioTimelines || {};
            const ss = pData.scenarioSops || {};

            const hasWildfire = Boolean(
                (pData.wildfireAreas && pData.wildfireAreas.length > 0) ||
                (pData.wildfireAssets && pData.wildfireAssets.length > 0) ||
                (sf.wildfire && sf.wildfire.length > 0) ||
                (sl.wildfire && sl.wildfire.length > 0)
            );

            const hasUrbanFire = Boolean(
                (sf.urbanfire && sf.urbanfire.length > 0) ||
                (sl.urbanfire && sl.urbanfire.length > 0) ||
                (st.urbanfire && st.urbanfire.length > 0)
            );

            const hasFlood = Boolean(
                (sf.flood && sf.flood.length > 0) ||
                (sl.flood && sl.flood.length > 0) ||
                (st.flood && st.flood.length > 0)
            );

            const hasPower = Boolean(
                (sf.power && sf.power.length > 0) ||
                (sl.power && sl.power.length > 0) ||
                (st.power && st.power.length > 0)
            );

            const hasDrought = Boolean(
                (sf.drought && sf.drought.length > 0) ||
                (sl.drought && sl.drought.length > 0) ||
                (st.drought && st.drought.length > 0)
            );

            const hasUnrest = Boolean(
                (sf.unrest && sf.unrest.length > 0) ||
                (sl.unrest && sl.unrest.length > 0) ||
                (st.unrest && st.unrest.length > 0)
            );

            const hasDefence = Boolean(
                (sf.defence && sf.defence.length > 0) ||
                (sl.defence && sl.defence.length > 0) ||
                (st.defence && st.defence.length > 0) ||
                pData.certified === true
            );

            const hazards: HazardCompletion = {
                wildfire: hasWildfire,
                urbanfire: hasUrbanFire,
                flood: hasFlood,
                power: hasPower,
                drought: hasDrought,
                unrest: hasUnrest,
                defence: hasDefence,
            };

            const completedCount = Object.values(hazards).filter(Boolean).length;
            const completionPercentage = Math.round((completedCount / 7) * 100);

            // Count total keyholders, facilities, and evacuation points
            const keyholders = pData.keyholders || [];
            let totalFacilities = 0;
            Object.values(sf).forEach((list: any) => {
                if (Array.isArray(list)) totalFacilities += list.length;
            });
            const collectionPoints = pData.collectionPoints || [];

            const threatStatus = (pData.threatStatus || 'green').toLowerCase() as any;

            overviewList.push({
                communityId,
                communityName,
                county,
                region,
                leader,
                hasPlan: true,
                threatStatus,
                threatNotes: pData.threatNotes || '',
                threatUpdatedAt: pData.threatUpdatedAt?.toDate ? pData.threatUpdatedAt.toDate().toISOString() : pData.threatUpdatedAt,
                threatUpdatedByName: pData.threatUpdatedByName || leader.name,
                certified: pData.certified === true,
                certifiedAt: pData.certifiedAt?.toDate ? pData.certifiedAt.toDate().toISOString() : pData.certifiedAt,
                certifiedBy: pData.certifiedBy || '',
                hazards,
                completedCount,
                completionPercentage,
                keyholderCount: keyholders.length,
                facilityCount: totalFacilities,
                evacuationPointCount: collectionPoints.length,
                activeBroadcastCount,
                lastUpdated: pData.lastUpdated?.toDate ? pData.lastUpdated.toDate().toISOString() : (pData.updatedAt?.toDate ? pData.updatedAt.toDate().toISOString() : undefined),
                planData: {
                    keyholders,
                    scenarioFacilities: sf,
                    scenarioLiaisons: sl,
                    scenarioTimelines: st,
                    collectionPoints,
                    evacuationPartners: pData.evacuationPartners || [],
                }
            });
        }

        // Sort: Active incidents (Red/Amber) first, then by completed count descending
        overviewList.sort((a, b) => {
            const threatRank: Record<string, number> = { black: 4, red: 3, amber: 2, green: 1 };
            const rankA = threatRank[a.threatStatus] || 1;
            const rankB = threatRank[b.threatStatus] || 1;
            if (rankA !== rankB) return rankB - rankA;
            return b.completedCount - a.completedCount;
        });

        const activeAlerts = overviewList.filter(o => o.threatStatus === 'amber' || o.threatStatus === 'red' || o.threatStatus === 'black');

        const stats = {
            totalWithLeader: overviewList.length,
            totalCertified: overviewList.filter(o => o.certified).length,
            fullyReadyCount: overviewList.filter(o => o.completedCount === 7).length,
            inProgressCount: overviewList.filter(o => o.hasPlan && o.completedCount > 0 && o.completedCount < 7).length,
            missingPlanCount: overviewList.filter(o => !o.hasPlan || o.completedCount === 0).length,
            activeIncidentsCount: activeAlerts.length,
        };

        return {
            success: true,
            overview: overviewList,
            activeAlerts,
            broadcasts: allBroadcasts,
            stats,
        };
    } catch (error: any) {
        console.error("getNationalEmergencyPlansOverviewAction error:", error);
        return {
            success: false,
            overview: [],
            activeAlerts: [],
            broadcasts: [],
            stats: {
                totalWithLeader: 0,
                totalCertified: 0,
                fullyReadyCount: 0,
                inProgressCount: 0,
                missingPlanCount: 0,
                activeIncidentsCount: 0,
            },
            error: error.message || "Failed to load national emergency plans overview.",
        };
    }
}
