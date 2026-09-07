'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { sendEmail } from './emailActions';
import { sendPushNotificationAction } from './notificationActions';
import { subDays } from 'date-fns';
import { scanAndFlagAction } from './moderationActions';
import { logAuditTrailAction } from './auditActions';

type ActionResponse = {
  success: boolean;
  error?: string;
  count?: number;
};

type CreatePlatformAnnouncementParams = {
  userId: string;
  subject: string;
  message: string;
  image: string | null;
  type: 'Standard' | 'Emergency';
  severity?: 'normal' | 'urgent';
  status: 'Live' | 'Scheduled';
  audience: {
    type: 'all' | 'roles' | 'location';
    roles?: string[];
    countries?: string[];
    states?: string[];
    regions?: string[];
    communities?: string[];
  };
  showOnLoginPage: boolean;
  sendEmail: boolean;
  scheduledDates: string;
  startDate: Date | null;
  endDate: Date | null;
  scope: 'platform' | 'community';
  sentBy: string;
  communityId?: string;
};

/**
 * Resolves location names from a list of IDs.
 */
async function resolveLocationNames(db: FirebaseFirestore.Firestore, collectionName: string, ids: string[]): Promise<string[]> {
    if (!ids || ids.length === 0) return [];
    const names: string[] = [];
    const CHUNK_SIZE = 30;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const snap = await db.collection(collectionName).where('__name__', 'in', chunk).get();
        snap.docs.forEach(doc => {
            const name = doc.data().name;
            if (name) names.push(name);
        });
    }
    return names;
}

/**
 * Robust User Resolution
 * Implements Strict Exclusive Hierarchy:
 * Ensures dispatches are locked to the most specific level provided in the audience object.
 */
async function resolveRecipients(
    db: FirebaseFirestore.Firestore, 
    audience: any
): Promise<string[]> {
    const usersRef = db.collection('users');
    const uniqueUserIds = new Set<string>();

    const addUsersFromQuery = async (q: FirebaseFirestore.Query) => {
        const snap = await q.get();
        snap.docs.forEach(doc => uniqueUserIds.add(doc.id));
    };

    if (audience.type === 'all') {
        const snap = await usersRef.get();
        return snap.docs.map(d => d.id);
    }

    if (audience.type === 'roles' && audience.roles?.length > 0) {
        await addUsersFromQuery(usersRef.where('role', 'in', audience.roles));
        return Array.from(uniqueUserIds);
    }

    if (audience.type === 'location') {
        const countryIds = audience.countries || [];
        const stateIds = audience.states || [];
        const regionIds = audience.regions || [];
        const communityIds = audience.communities || [];

        const CHUNK_SIZE = 10;

        // CRITICAL: STRICT EXCLUSIVE HIERARCHY
        if (communityIds.length > 0) {
            for (let i = 0; i < communityIds.length; i += CHUNK_SIZE) {
                const chunk = communityIds.slice(i, i + CHUNK_SIZE);
                await addUsersFromQuery(usersRef.where('homeCommunityId', 'in', chunk));
                const names = await resolveLocationNames(db, 'communities', chunk);
                if (names.length > 0) {
                    await addUsersFromQuery(usersRef.where('communityName', 'in', names));
                }
            }
            return Array.from(uniqueUserIds);
        }

        if (regionIds.length > 0) {
            const regionNames = await resolveLocationNames(db, 'locations', regionIds);
            const identifiers = Array.from(new Set([...regionIds, ...regionNames]));
            for (let i = 0; i < identifiers.length; i += CHUNK_SIZE) {
                const chunk = identifiers.slice(i, i + CHUNK_SIZE);
                await addUsersFromQuery(usersRef.where('region', 'in', chunk));
            }
            return Array.from(uniqueUserIds);
        }

        if (stateIds.length > 0) {
            const stateNames = await resolveLocationNames(db, 'locations', stateIds);
            const identifiers = Array.from(new Set([...stateIds, ...stateNames]));
            for (let i = 0; i < identifiers.length; i += CHUNK_SIZE) {
                const chunk = identifiers.slice(i, i + CHUNK_SIZE);
                await addUsersFromQuery(usersRef.where('state', 'in', chunk));
            }
            return Array.from(uniqueUserIds);
        }

        if (countryIds.length > 0) {
            const countryNames = await resolveLocationNames(db, 'locations', countryIds);
            const identifiers = Array.from(new Set([...countryIds, ...countryNames]));
            for (let i = 0; i < identifiers.length; i += CHUNK_SIZE) {
                const chunk = identifiers.slice(i, i + CHUNK_SIZE);
                await addUsersFromQuery(usersRef.where('country', 'in', chunk));
            }
            return Array.from(uniqueUserIds);
        }
    }

    return [];
}

export async function getTargetAudienceCountAction(params: {
    audienceType: string;
    selectedRoles: string[];
    selectedLocation: any;
}): Promise<{ userCount: number, communityCount: number }> {
    const { firestore } = initializeAdminApp();
    try {
        const audienceObj: any = { type: params.audienceType };
        if (params.audienceType === 'roles') audienceObj.roles = params.selectedRoles;
        if (params.audienceType === 'location') {
            audienceObj.countries = params.selectedLocation.countries || [];
            audienceObj.states = params.selectedLocation.states || [];
            audienceObj.regions = params.selectedLocation.regions || [];
            audienceObj.communities = params.selectedLocation.communities || [];
        }

        const recipientIds = await resolveRecipients(firestore, audienceObj);
        
        let communityCount = 0;
        if (params.audienceType === 'all') {
            const commsSnap = await firestore.collection('communities').where('status', '==', 'active').get();
            communityCount = commsSnap.size;
        } else if (params.audienceType === 'location') {
            const { countries = [], states = [], regions = [], communities = [] } = params.selectedLocation;
            const uniqueCommunityIds = new Set<string>(communities);

            if (regions.length > 0) {
                const regionNames = await resolveLocationNames(firestore, 'locations', regions);
                const commsSnap = await firestore.collection('communities').where('region', 'in', regionNames).get();
                commsSnap.docs.forEach(d => uniqueCommunityIds.add(d.id));
            }
            if (states.length > 0) {
                const stateNames = await resolveLocationNames(firestore, 'locations', states);
                const commsSnap = await firestore.collection('communities').where('state', 'in', stateNames).get();
                commsSnap.docs.forEach(d => uniqueCommunityIds.add(d.id));
            }
            if (countries.length > 0) {
                const countryNames = await resolveLocationNames(firestore, 'locations', countries);
                const commsSnap = await firestore.collection('communities').where('country', 'in', countryNames).get();
                commsSnap.docs.forEach(d => uniqueCommunityIds.add(d.id));
            }
            communityCount = uniqueCommunityIds.size;
        }

        return { userCount: recipientIds.length, communityCount };
    } catch (error) {
        console.error("Audience tally failed:", error);
        return { userCount: 0, communityCount: 0 };
    }
}

export async function createPlatformAnnouncementAction(
  params: CreatePlatformAnnouncementParams
): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    
    let targetNames: string[] = [];
    const { audience } = params;

    if (audience.type === 'all') {
        targetNames = ['All Platform Users'];
    } else if (audience.type === 'roles') {
        targetNames = audience.roles || [];
    } else if (audience.type === 'location') {
        const cNames = await resolveLocationNames(firestore, 'locations', audience.countries || []);
        const sNames = await resolveLocationNames(firestore, 'locations', audience.states || []);
        const rNames = await resolveLocationNames(firestore, 'locations', audience.regions || []);
        const hNames = await resolveLocationNames(firestore, 'communities', audience.communities || []);
        targetNames = [...cNames, ...sNames, ...rNames, ...hNames];
    }

    const { userId, ...rest } = params;
    const announcementData: any = {
      ...rest,
      ownerId: userId,
      userId: userId,
      targetNames: targetNames.length > 0 ? targetNames : ["Geographical Route Resolution Active"],
      createdAt: Timestamp.now(),
      history: [{ status: params.status, actorId: userId, timestamp: Timestamp.now() }]
    };

    if(params.startDate) announcementData.startDate = Timestamp.fromDate(new Date(params.startDate));
    if(params.endDate) announcementData.endDate = Timestamp.fromDate(new Date(params.endDate));

    const newRef = await firestore.collection('announcements').add(announcementData);

    // AI MODERATION SCAN
    await scanAndFlagAction({
        text: `${params.subject} ${params.message}`,
        contentType: "Platform Announcement",
        authorId: userId,
        authorName: params.sentBy,
        contentId: newRef.id,
        contentPath: newRef.path
    });

    if (params.status === 'Live') {
        const recipientIds = await resolveRecipients(firestore, audience);
        
        if (recipientIds.length > 0) {
            const priorityPrefix = params.type === 'Emergency' ? '🚨 EMERGENCY: ' : (params.severity === 'urgent' ? '⚠️ URGENT: ' : '');
            const displaySubject = `${priorityPrefix}${params.subject}`;

            await sendPushNotificationAction({
                audience: { type: 'users', value: recipientIds },
                notification: { 
                    title: displaySubject, 
                    body: `${params.sentBy}: ${params.message.replace(/<[^>]*>?/gm, '').substring(0, 100)}...`, 
                    tag: newRef.id 
                }
            });

            const BATCH_SIZE = 450;
            for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
                const chunk = recipientIds.slice(i, i + BATCH_SIZE);
                const batch = firestore.batch();
                chunk.forEach(id => {
                    const ref = firestore.collection('notifications').doc();
                    batch.set(ref, {
                        recipientId: id,
                        type: 'Platform Announcement',
                        subject: displaySubject,
                        from: params.sentBy,
                        date: Timestamp.now().toDate().toISOString(),
                        status: 'New',
                        relatedId: newRef.id
                    });
                });
                await batch.commit();
            }

            if (params.sendEmail) {
                const emailRecipients: { email: string; name: string }[] = [];
                const FETCH_CHUNK = 30;
                for (let i = 0; i < recipientIds.length; i += FETCH_CHUNK) {
                    const chunkIds = recipientIds.slice(i, i + FETCH_CHUNK);
                    const usersSnap = await firestore.collection('users').where('__name__', 'in', chunkIds).get();
                    usersSnap.docs.forEach(doc => {
                        const d = doc.data();
                        if (d.email) emailRecipients.push({ email: d.email, name: d.name });
                    });
                }
                
                if (emailRecipients.length > 0) {
                    // SECURITY FIX: Send to the platform sender and BCC all recipients to protect privacy
                    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@my-community-hub.co.uk';
                    
                    // Brevo and other SMTP providers have limits on BCC recipients per call.
                    // We chunk the BCC sends to ensure high deliverability and reliability.
                    const SEND_CHUNK = 90; 
                    for (let i = 0; i < emailRecipients.length; i += SEND_CHUNK) {
                        const bccChunk = emailRecipients.slice(i, i + SEND_CHUNK);
                        await sendEmail({
                            to: [{ email: senderEmail, name: 'Community Hub Platform' }],
                            bcc: bccChunk,
                            subject: displaySubject,
                            htmlContent: `<h2>${displaySubject}</h2><hr/>${params.message}`,
                        });
                    }
                }
            }
        }
    }

    // AUDIT TRAIL LOGGING
    await logAuditTrailAction({
        adminId: userId,
        adminName: params.sentBy,
        action: params.type === 'Emergency' ? 'emergency_broadcast_dispatched' : 'platform_announcement_created',
        category: 'Broadcasts & Dispatches',
        details: `Dispatched ${params.type} platform broadcast: "${params.subject}" (Status: ${params.status}, Audience: ${params.audience?.type || 'all'}, Email: ${params.sendEmail ? 'Yes' : 'No'})`,
        targetObject: {
            id: newRef.id,
            name: params.subject,
            type: 'Platform Announcement'
        },
        metadata: {
            type: params.type,
            severity: params.severity || 'normal',
            status: params.status,
            showOnLoginPage: params.showOnLoginPage,
            sendEmail: params.sendEmail,
        }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Broadcast dispatch failed:', error);
    return { success: false, error: error.message };
  }
}

export async function createCommunityAnnouncementAction(
  params: any
): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const announcementData: any = { 
        ...params, 
        ownerId: params.userId,
        userId: params.userId,
        scope: 'community', 
        audience: {
            type: 'location',
            communities: [params.communityId],
            regions: [],
            states: [],
            countries: []
        },
        createdAt: Timestamp.now(),
        history: [{ status: params.status, actorId: params.userId, timestamp: Timestamp.now() }]
    };
    const newAnnouncementRef = await firestore.collection('announcements').add(announcementData);

    // AI MODERATION SCAN
    await scanAndFlagAction({
        text: `${params.subject} ${params.message}`,
        contentType: "Community Announcement",
        authorId: params.userId,
        authorName: params.sentBy,
        contentId: newAnnouncementRef.id,
        contentPath: newAnnouncementRef.path
    });

    if (params.status === 'Live') {
        const recipientsSnapshot = await firestore.collection('users')
            .where('homeCommunityId', '==', params.communityId)
            .get();

        const recipientIds = recipientsSnapshot.docs.map(d => d.id);
        
        const priorityPrefix = params.type === 'Emergency' ? '🚨 EMERGENCY: ' : (params.severity === 'urgent' ? '⚠️ URGENT: ' : '');
        const displaySubject = `${priorityPrefix}${params.subject}`;

        const BATCH_SIZE = 450;
        for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
            const chunk = recipientIds.slice(i, i + BATCH_SIZE);
            const batch = firestore.batch();
            chunk.forEach(id => {
                const notificationRef = firestore.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientId: id,
                    type: 'Community Announcement',
                    subject: displaySubject,
                    from: params.sentBy,
                    date: Timestamp.now().toDate().toISOString(),
                    status: 'New',
                    relatedId: newAnnouncementRef.id,
                    communityId: params.communityId,
                });
            });
            await batch.commit();
        }

        if (recipientIds.length > 0) {
            await sendPushNotificationAction({
                audience: { type: 'users', value: recipientIds },
                notification: { title: displaySubject, body: `${params.sentBy}: ${params.message.replace(/<[^>]*>?/gm, '').substring(0, 100)}...` }
            });
        }
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create announcement.' };
  }
}

/**
 * Platform Maintenance Engine: Auto-Archive stale content.
 * Archive any announcement that is:
 * 1. Not already archived.
 * 2. Has NO endDate specified.
 * 3. Was created more than 14 days ago.
 */
export async function runAnnouncementCleanupAction(): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    const cutoffDate = subDays(new Date(), 14);
    const now = new Date();

    try {
        console.log(`[Maintenance] Starting announcement sweep for items past expiration or older than 14 days...`);
        
        // Fetch announcements and perform in-memory evaluation to avoid Firestore composite index requirement
        const snapshot = await firestore.collection('announcements').get();
        
        // Filter for stale/expired documents
        const staleDocs = snapshot.docs.filter(doc => {
            const data = doc.data();
            const status = (data.status || '').toLowerCase();
            if (status === 'archived') return false;

            // 1. If explicit endDate is provided and has passed -> archive
            if (data.endDate) {
                const endDate = data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate);
                if (endDate && !isNaN(endDate.getTime()) && endDate < now) {
                    return true;
                }
            }

            // 2. If NO endDate is provided and item was created > 14 days ago -> archive
            if (!data.endDate) {
                const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null;
                if (createdAt && !isNaN(createdAt.getTime()) && createdAt < cutoffDate) {
                    return true;
                }
            }

            return false;
        });

        if (staleDocs.length === 0) {
            return { success: true, count: 0 };
        }

        const batchSize = 500;
        let totalUpdated = 0;
        let currentBatch = firestore.batch();

        for (const doc of staleDocs) {
            const historyEntry = {
                status: 'Archived',
                actorId: 'system_maintenance',
                timestamp: Timestamp.now(),
                reason: 'Auto-archived: Content exceeded 14-day limit for dateless dispatches or passed expiration date.'
            };

            currentBatch.update(doc.ref, {
                status: 'Archived',
                history: FieldValue.arrayUnion(historyEntry),
                updatedAt: Timestamp.now()
            });

            totalUpdated++;
            if (totalUpdated % batchSize === 0) {
                await currentBatch.commit();
                currentBatch = firestore.batch();
            }
        }

        // Also sweep regionalBroadcasts collection for expired broadcasts
        try {
            const regSnapshot = await firestore.collection('regionalBroadcasts').get();
            const staleRegDocs = regSnapshot.docs.filter(doc => {
                const data = doc.data();
                const status = (data.status || '').toLowerCase();
                if (status === 'archived') return false;

                if (data.endDate) {
                    const endDate = data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate);
                    if (endDate && !isNaN(endDate.getTime()) && endDate < now) return true;
                }
                if (!data.endDate && data.createdAt) {
                    const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    if (createdAt && !isNaN(createdAt.getTime()) && createdAt < cutoffDate) return true;
                }
                return false;
            });

            for (const doc of staleRegDocs) {
                currentBatch.update(doc.ref, {
                    status: 'Archived',
                    updatedAt: Timestamp.now()
                });
                totalUpdated++;
                if (totalUpdated % batchSize === 0) {
                    await currentBatch.commit();
                    currentBatch = firestore.batch();
                }
            }
        } catch (regErr) {
            console.warn("[Maintenance] Regional broadcasts sweep skipped or empty:", regErr);
        }

        if (totalUpdated % batchSize !== 0) {
            await currentBatch.commit();
        }

        console.log(`[Maintenance] Successfully archived ${totalUpdated} stale announcements.`);
        return { success: true, count: totalUpdated };

    } catch (error: any) {
        console.error("[Maintenance] Announcement cleanup failed:", error);
        return { success: false, error: error.message };
    }
}
