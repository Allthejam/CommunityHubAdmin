'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { CRITICAL_TERMS } from "@/lib/moderation-rules";
import { logAuditTrailAction } from "./auditActions";

type ActionResponse = {
  success: boolean;
  error?: string;
  count?: number;
};

const DEFAULT_KEYWORDS = ['scam', 'spam', 'fraud', 'offensive', 'hate', 'harass'];

/**
 * Robust filter to exclude code, Base64 blobs, and data URIs.
 * Focuses strictly on human-readable text.
 */
function extractAllHumanText(obj: any): string[] {
    let texts: string[] = [];
    if (!obj) return texts;

    if (typeof obj === 'string') {
        const text = obj.trim();
        // Ignore data URIs and Base64-like long strings without spaces
        if (text.startsWith('data:')) return texts;
        if (text.length > 60 && !text.includes(' ')) return texts;
        if (text === 'undefined' || text === 'null' || text === '[object Object]') return texts;
        
        // Strip HTML and keep human readable segments
        const plainText = text.replace(/<[^>]*>?/gm, ' ');
        if (plainText.trim().length > 0) {
            texts.push(plainText.trim());
        }
    } else if (Array.isArray(obj)) {
        obj.forEach(item => texts.push(...extractAllHumanText(item)));
    } else if (typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof Timestamp)) {
        // Skip technical keys known to contain non-text data
        const skipKeys = ['image', 'images', 'avatar', 'banner', 'logo', 'icon', 'url', 'path', 'storagePath', 'videoId', 'id', 'uid'];
        Object.entries(obj).forEach(([key, value]) => {
            if (!skipKeys.includes(key.toLowerCase())) {
                texts.push(...extractAllHumanText(value));
            }
        });
    }
    return texts;
}

/**
 * Checks if a keyword matches as a whole word (case-insensitive).
 * Uses \b word boundaries to prevent "something" being flagged for "meth".
 */
function matchesWholeWord(text: string, keyword: string): boolean {
    if (!text || !keyword) return false;
    // Strip HTML before checking to avoid matching inside tags
    const cleanText = text.replace(/<[^>]*>?/gm, ' ');
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    return regex.test(cleanText);
}

export async function getModerationKeywords(): Promise<string[]> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = firestore.collection('platform_settings').doc('moderation');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return docSnap.data()?.keywords || DEFAULT_KEYWORDS;
        }
        await docRef.set({ keywords: DEFAULT_KEYWORDS, updatedAt: Timestamp.now() });
        return DEFAULT_KEYWORDS;
    } catch (error) {
        console.error("Error fetching moderation keywords:", error);
        return DEFAULT_KEYWORDS;
    }
}

export async function updateModerationKeywords(keywords: string[]): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = firestore.collection('platform_settings').doc('moderation');
        await docRef.set({ keywords, updatedAt: Timestamp.now() }, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function flagContentAction(params: {
    contentType: string;
    content: string;
    keywordMatched: string;
    authorId: string;
    authorName: string;
    contentId: string;
    contentPath: string;
    priority?: 'normal' | 'critical';
}): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        // Deterministic ID prevents duplicate flags for the same violation
        const keywordSlug = params.keywordMatched.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const flagId = `${params.contentId}_${keywordSlug}`;
        const flagRef = firestore.collection('moderation_flags').doc(flagId);
        
        const existingDoc = await flagRef.get();
        if (existingDoc.exists && existingDoc.data()?.status === 'resolved') {
            return { success: true };
        }

        await flagRef.set({
            ...params,
            status: 'new',
            priority: params.priority || 'normal',
            createdAt: existingDoc.data()?.createdAt || Timestamp.now(),
            updatedAt: Timestamp.now(),
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function scanAndFlagAction(params: {
    text: string;
    contentType: string;
    authorId: string;
    authorName: string;
    contentId: string;
    contentPath: string;
}): Promise<boolean> {
    const { text, contentType, authorId, authorName, contentId, contentPath } = params;
    if (!text || typeof text !== 'string' || text.startsWith('data:')) return false;

    try {
        const keywords = await getModerationKeywords();
        
        const matchedCritical = CRITICAL_TERMS.find(k => matchesWholeWord(text, k));
        if (matchedCritical) {
            await flagContentAction({
                contentType,
                content: text,
                keywordMatched: matchedCritical,
                authorId: authorId || 'unknown',
                authorName: authorName || 'Unknown User',
                contentId,
                contentPath,
                priority: 'critical'
            });
            return true;
        }

        const matchedKeyword = keywords.find(k => matchesWholeWord(text, k));
        if (matchedKeyword) {
            await flagContentAction({
                contentType,
                content: text,
                keywordMatched: matchedKeyword,
                authorId: authorId || 'unknown',
                authorName: authorName || 'Unknown User',
                contentId,
                contentPath,
                priority: 'normal'
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error("Moderation scan failed:", error);
        return false;
    }
}

export async function runGlobalContentScanAction(): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        let totalFlagged = 0;

        const scanCollection = async (collectionPath: string, typeLabel: string, isGroup = false) => {
            try {
                const colRef = isGroup ? firestore.collectionGroup(collectionPath) : firestore.collection(collectionPath);
                // Limit scan to 40 most recent to prevent timeout
                const snap = await colRef.limit(40).get();
                
                for (const doc of snap.docs) {
                    const data = doc.data();
                    const allTextParts = extractAllHumanText(data);
                    const fullTranscript = allTextParts.join('\n\n');

                    if (fullTranscript && fullTranscript.trim().length > 0) {
                        const flagged = await scanAndFlagAction({
                            text: fullTranscript,
                            contentType: typeLabel,
                            authorId: data.authorId || data.ownerId || data.senderId || data.applicantId || data.userId || data.createdBy || 'unknown',
                            authorName: data.authorName || data.ownerName || data.businessName || data.sender || data.applicantName || data.name || data.title || 'Platform Member',
                            contentId: doc.id,
                            contentPath: doc.ref.path
                        });
                        if (flagged) totalFlagged++;
                    }
                }
            } catch (e) {
                console.warn(`Scan failed for ${collectionPath}:`, e);
            }
        };

        // Scans limited set of items across platform
        await scanCollection('posts', 'Community Post', true);
        await scanCollection('comments', 'Post Comment', true);
        await scanCollection('messages', 'Private Message', true);
        await scanCollection('marketplace', 'Marketplace Listing', true);
        await scanCollection('businesses', 'Business Profile');
        await scanCollection('products', 'Storefront Product', true);
        await scanCollection('jobs', 'Job Vacancy');
        await scanCollection('jobSeekers', 'Job Seeker Profile');
        await scanCollection('lostAndFound', 'Lost & Found Report');
        await scanCollection('charities', 'Charity Listing');
        await scanCollection('events', 'Event');
        await scanCollection('news', 'News Article');
        await scanCollection('announcements', 'Announcement');

        return { success: true, count: totalFlagged };
    } catch (error: any) {
        console.error("Global scan failed:", error);
        return { success: false, error: error.message };
    }
}

export async function applyModerationAction(params: {
    flagId: string;
    action: 'dismiss' | 'remove' | 'suspend';
    contentPath?: string;
    authorId: string;
    moderatorId: string;
    moderatorName: string;
    reason: string;
    contentType: string;
    contentId: string;
}): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    const batch = firestore.batch();
    const now = Timestamp.now();

    try {
        const flagRef = firestore.collection('moderation_flags').doc(params.flagId);
        batch.update(flagRef, { 
            status: 'resolved', 
            resolvedAt: now, 
            resolvedBy: params.moderatorName 
        });

        if (params.action === 'remove' || params.action === 'suspend') {
            if (params.contentPath) {
                const contentRef = firestore.doc(params.contentPath);
                batch.delete(contentRef);
            }

            const offenseRef = firestore.collection('user_offenses').doc();
            batch.set(offenseRef, {
                userId: params.authorId,
                action: params.action === 'suspend' ? 'suspended' : 'warned',
                moderatorId: params.moderatorId,
                moderatorName: params.moderatorName,
                reason: params.reason,
                contentId: params.contentId,
                contentType: params.contentType,
                createdAt: now
            });

            const userRef = firestore.collection('users').doc(params.authorId);
            const userUpdate: any = { 
                offenseCount: FieldValue.increment(1),
                updatedAt: now 
            };
            if (params.action === 'suspend') {
                userUpdate.status = 'suspended';
            }
            batch.update(userRef, userUpdate);

            const notificationRef = firestore.collection('notifications').doc();
            const subject = params.action === 'suspend' 
                ? "Your account has been suspended" 
                : "Policy Violation Warning: Content Removed";
            
            const message = `Our AI moderation system detected a violation of our User Policy Agreement in your "${params.contentType}". 
            Action: ${params.action.toUpperCase()}. 
            Moderator Note: ${params.reason || "Violation of community safety standards."}`;

            batch.set(notificationRef, {
                recipientId: params.authorId,
                type: "Account Update",
                subject,
                from: "Platform Administration",
                date: now.toDate().toISOString(),
                status: 'new',
                details: { message }
            });
        }

        await batch.commit();

        await logAuditTrailAction({
            adminId: params.moderatorId,
            adminName: params.moderatorName,
            action: `moderation_${params.action}`,
            category: 'Reports & Moderation',
            details: `Enforced ${params.action.toUpperCase()} on "${params.contentType}" (Author ID: ${params.authorId}). Reason: ${params.reason || 'Safety standard violation'}`,
            targetUser: {
                id: params.authorId,
                name: 'Author'
            },
            targetObject: {
                id: params.contentId,
                name: params.contentType,
                type: params.contentType
            },
            metadata: {
                flagId: params.flagId,
                action: params.action,
                reason: params.reason,
                contentType: params.contentType,
                contentPath: params.contentPath
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Moderation enforcement failed:", error);
        return { success: false, error: error.message };
    }
}
