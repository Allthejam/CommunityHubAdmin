'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { logAuditTrailAction } from "./auditActions";
import { encryptMessage, decryptMessage } from "@/lib/staff-chat-crypto";

export type StaffMessageAttachment = {
    name: string;
    url: string;
    type: 'image' | 'file';
    size?: number;
};

export type SendStaffMessageParams = {
    channelId: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    senderAvatar?: string;
    text: string;
    attachments?: StaffMessageAttachment[];
    replyToId?: string;
    replyToText?: string;
    replyToAuthor?: string;
};

export async function sendStaffMessageAction(params: SendStaffMessageParams) {
    try {
        const { firestore } = initializeAdminApp();
        const { channelId, senderId, senderName, senderRole, senderAvatar, text, attachments = [], replyToId, replyToText, replyToAuthor } = params;

        if (!channelId || !senderId || (!text.trim() && attachments.length === 0)) {
            return { success: false, error: "Cannot send an empty message." };
        }

        const now = Timestamp.now();
        const plaintextForNotif = text.trim(); // keep plaintext in memory for notification only

        // Encrypt message content before writing to Firestore
        const encryptedText = text.trim() ? encryptMessage(text.trim()) : '';
        const encryptedReplyText = replyToText ? encryptMessage(replyToText) : null;

        const messageDoc = {
            channelId,
            senderId,
            senderName,
            senderRole: senderRole || 'Staff Member',
            senderAvatar: senderAvatar || null,
            text: encryptedText,                     // AES-256-GCM ciphertext
            attachments,
            replyToId: replyToId || null,
            replyToText: encryptedReplyText || null, // quoted reply also encrypted
            replyToAuthor: replyToAuthor || null,
            reactions: {},
            createdAt: now,
            updatedAt: now,
        };

        const channelRef = firestore.collection('staff_channels').doc(channelId);
        const msgRef = await channelRef.collection('messages').add(messageDoc);

        // Store a generic last-message indicator (never store plaintext in metadata)
        await channelRef.set({
            id: channelId,
            lastMessage: attachments.length > 0 ? `[${attachments.length} attachment${attachments.length > 1 ? 's' : ''}]` : '[Encrypted message]',
            lastMessageSender: senderName,
            lastMessageTimestamp: now,
            updatedAt: now,
        }, { merge: true });

        // Dispatch in-app notifications to recipients
        try {
            const previewSnippet = plaintextForNotif ? (plaintextForNotif.length > 90 ? plaintextForNotif.substring(0, 90) + '...' : plaintextForNotif) : 'Sent an attachment';

            if (channelId.startsWith('dm_')) {
                // Direct Message: find the recipient user ID
                const uids = channelId.replace('dm_', '').split('_');
                const recipientId = uids.find(id => id !== senderId);

                if (recipientId) {
                    await firestore.collection('notifications').add({
                        title: `💬 New Message from ${senderName}`,
                        message: previewSnippet,
                        recipientId: recipientId,
                        type: 'staff_chat_dm',
                        status: 'New',
                        date: now,
                        createdAt: now,
                        link: '/admin/staff-chat',
                        metadata: { channelId, senderId, senderName }
                    });
                }
            } else {
                // Group / Operation Channel
                const channelDoc = await channelRef.get();
                const channelData = channelDoc.data();
                const channelLabel = channelData?.label || `#${channelId}`;
                const memberIds: string[] = channelData?.memberIds || [];

                if (memberIds.length > 0 && !memberIds.includes('all')) {
                    // Custom squad: notify specific assigned staff members
                    const recipients = memberIds.filter(id => id !== senderId);
                    if (recipients.length > 0) {
                        const batch = firestore.batch();
                        recipients.forEach(rId => {
                            const notifRef = firestore.collection('notifications').doc();
                            batch.set(notifRef, {
                                title: `💬 New message in ${channelLabel}`,
                                message: `${senderName}: ${previewSnippet}`,
                                recipientId: rId,
                                type: 'staff_chat_channel',
                                status: 'New',
                                date: now,
                                createdAt: now,
                                link: '/admin/staff-chat',
                                metadata: { channelId, senderId, senderName }
                            });
                        });
                        await batch.commit();
                    }
                } else {
                    // Core / General staff channel: notify platform staff & admins
                    await firestore.collection('notifications').add({
                        title: `💬 New message in ${channelLabel}`,
                        message: `${senderName}: ${previewSnippet}`,
                        recipientId: 'platform_admin',
                        type: 'staff_chat_channel',
                        status: 'New',
                        date: now,
                        createdAt: now,
                        link: '/admin/staff-chat',
                        metadata: { channelId, senderId, senderName }
                    });
                }
            }
        } catch (notifErr) {
            console.error("Non-fatal: Failed to send chat notification:", notifErr);
        }

        return { success: true, messageId: msgRef.id };
    } catch (error: any) {
        console.error("Failed to send staff message:", error);
        return { success: false, error: error.message || "Failed to send message." };
    }
}

export async function toggleMessageReactionAction(params: {
    channelId: string;
    messageId: string;
    emoji: string;
    userId: string;
    userName: string;
}) {
    try {
        const { firestore } = initializeAdminApp();
        const { channelId, messageId, emoji, userId, userName } = params;

        const msgRef = firestore.collection('staff_channels').doc(channelId).collection('messages').doc(messageId);
        const snap = await msgRef.get();
        if (!snap.exists) {
            return { success: false, error: "Message not found." };
        }

        const data = snap.data() || {};
        const reactions: Record<string, string[]> = data.reactions || {};
        const userList: string[] = reactions[emoji] || [];

        let updatedList: string[];
        if (userList.includes(userId)) {
            updatedList = userList.filter(id => id !== userId);
        } else {
            updatedList = [...userList, userId];
        }

        const newReactions = { ...reactions };
        if (updatedList.length === 0) {
            delete newReactions[emoji];
        } else {
            newReactions[emoji] = updatedList;
        }

        await msgRef.update({
            reactions: newReactions,
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error: any) {
        console.error("Failed to toggle reaction:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteStaffMessageAction(params: {
    channelId: string;
    messageId: string;
    adminId: string;
    adminName: string;
}) {
    try {
        const { firestore } = initializeAdminApp();
        const { channelId, messageId, adminId, adminName } = params;

        const channelRef = firestore.collection('staff_channels').doc(channelId);
        const msgRef = channelRef.collection('messages').doc(messageId);
        await msgRef.delete();

        // Recalculate latest remaining message in this channel/DM room
        const remainingSnap = await channelRef.collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (!remainingSnap.empty) {
            const latestMsg = remainingSnap.docs[0].data();
            await channelRef.update({
                lastMessage: latestMsg.text || `[${(latestMsg.attachments || []).length} attachment]`,
                lastMessageSender: latestMsg.senderName || 'Staff',
                lastMessageTimestamp: latestMsg.createdAt || Timestamp.now(),
                updatedAt: Timestamp.now()
            });
        } else {
            // No messages remaining - remove last message preview metadata
            await channelRef.update({
                lastMessage: FieldValue.delete(),
                lastMessageSender: FieldValue.delete(),
                lastMessageTimestamp: FieldValue.delete(),
                updatedAt: Timestamp.now()
            });
        }

        await logAuditTrailAction({
            adminId,
            adminName,
            action: 'staff_chat_message_deleted',
            category: 'System',
            details: `Deleted message ID ${messageId} in staff channel #${channelId}`,
            metadata: { channelId, messageId }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete message:", error);
        return { success: false, error: error.message };
    }
}

export async function createStaffChannelAction(params: {
    name: string;
    label: string;
    description: string;
    badge?: string;
    memberIds: string[]; // selected staff uids (or empty for all)
    createdBy: string;
    createdByName: string;
}) {
    try {
        const { firestore } = initializeAdminApp();
        const { name, label, description, badge, memberIds, createdBy, createdByName } = params;

        if (!name.trim() || !label.trim()) {
            return { success: false, error: "Channel name and label are required." };
        }

        // Clean slug for channel ID
        const slug = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/^-+|-+$/g, '');
        if (!slug) {
            return { success: false, error: "Invalid channel name format." };
        }

        const channelRef = firestore.collection('staff_channels').doc(slug);
        const existing = await channelRef.get();
        if (existing.exists && existing.data()?.isCustom) {
            return { success: false, error: `A channel named #${slug} already exists.` };
        }

        const now = Timestamp.now();
        const channelData = {
            id: slug,
            name: slug,
            label: label.trim(),
            description: description.trim() || `Channel dedicated to ${label.trim()}`,
            badge: badge?.trim() || "Group Chat",
            memberIds: memberIds.length > 0 ? memberIds : ['all'],
            isCustom: true,
            createdBy,
            createdByName,
            createdAt: now,
            updatedAt: now,
        };

        await channelRef.set(channelData, { merge: true });

        // Add welcome message
        await channelRef.collection('messages').add({
            channelId: slug,
            senderId: 'system',
            senderName: 'System Bot',
            senderRole: 'System',
            text: `🎉 Channel #${slug} created by ${createdByName}. Welcome team!`,
            reactions: {},
            createdAt: now,
            updatedAt: now
        });

        await logAuditTrailAction({
            adminId: createdBy,
            adminName: createdByName,
            action: 'staff_channel_created',
            category: 'System',
            details: `Created new Operation Channel #${slug} (${label}) with ${memberIds.length > 0 ? memberIds.length + ' selected staff' : 'all staff'}.`,
            metadata: { channelId: slug, label, memberIds }
        });

        return { success: true, channelId: slug };
    } catch (error: any) {
        console.error("Failed to create staff channel:", error);
        return { success: false, error: error.message || "Failed to create channel." };
    }
}

export async function deleteStaffChannelAction(params: {
    channelId: string;
    adminId: string;
    adminName: string;
}) {
    try {
        const { firestore } = initializeAdminApp();
        const { channelId, adminId, adminName } = params;

        const channelRef = firestore.collection('staff_channels').doc(channelId);
        const channelSnap = await channelRef.get();
        if (!channelSnap.exists) {
            return { success: false, error: "Channel not found." };
        }

        // Delete subcollection messages
        const msgsSnap = await channelRef.collection('messages').get();
        const batch = firestore.batch();
        msgsSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(channelRef);
        await batch.commit();

        await logAuditTrailAction({
            adminId,
            adminName,
            action: 'staff_channel_deleted',
            category: 'System',
            details: `Deleted custom Operation Channel #${channelId}`,
            metadata: { channelId }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete staff channel:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Decrypt a batch of staff chat messages server-side.
 * The encryption key never leaves the server — the client sends ciphertexts
 * received from Firestore and receives back the decrypted plaintext.
 */
export async function decryptStaffMessagesAction(
    messages: Array<{ id: string; text: string; replyToText: string | null }>
): Promise<{ id: string; text: string; replyToText: string | null }[]> {
    try {
        return messages.map(msg => ({
            id: msg.id,
            text: msg.text ? decryptMessage(msg.text) : '',
            replyToText: msg.replyToText ? decryptMessage(msg.replyToText) : null,
        }));
    } catch (err) {
        console.error("decryptStaffMessagesAction error:", err);
        return messages;
    }
}

/**
 * Mark a batch of messages as delivered (single tick ✓).
 * Called on the recipient's side when their onSnapshot fires and new messages arrive.
 */
export async function markMessagesDeliveredAction(params: {
    channelId: string;
    messageIds: string[];
    userId: string;
}): Promise<{ success: boolean }> {
    const { channelId, messageIds, userId } = params;
    if (!channelId || !messageIds.length || !userId) return { success: false };
    try {
        const { firestore } = initializeAdminApp();
        const batchSize = 450;
        for (let i = 0; i < messageIds.length; i += batchSize) {
            const chunk = messageIds.slice(i, i + batchSize);
            const batch = firestore.batch();
            chunk.forEach(msgId => {
                const ref = firestore
                    .collection('staff_channels')
                    .doc(channelId)
                    .collection('messages')
                    .doc(msgId);
                batch.update(ref, { [`deliveredTo.${userId}`]: true });
            });
            await batch.commit();
        }
        return { success: true };
    } catch (error: any) {
        console.error('markMessagesDeliveredAction error:', error);
        return { success: false };
    }
}

/**
 * Mark a batch of messages as read (double tick ✓✓).
 * Called on the recipient's side when they open the chat room and messages become visible.
 */
export async function markMessagesReadAction(params: {
    channelId: string;
    messageIds: string[];
    userId: string;
}): Promise<{ success: boolean }> {
    const { channelId, messageIds, userId } = params;
    if (!channelId || !messageIds.length || !userId) return { success: false };
    try {
        const { firestore } = initializeAdminApp();
        const batchSize = 450;
        for (let i = 0; i < messageIds.length; i += batchSize) {
            const chunk = messageIds.slice(i, i + batchSize);
            const batch = firestore.batch();
            chunk.forEach(msgId => {
                const ref = firestore
                    .collection('staff_channels')
                    .doc(channelId)
                    .collection('messages')
                    .doc(msgId);
                // Mark both delivered and read in one write
                batch.update(ref, {
                    [`deliveredTo.${userId}`]: true,
                    [`readBy.${userId}`]: true
                });
            });
            await batch.commit();
        }
        return { success: true };
    } catch (error: any) {
        console.error('markMessagesReadAction error:', error);
        return { success: false };
    }
}
