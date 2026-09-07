'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { sendEmail } from './emailActions';
import CryptoJS from 'crypto-js';
import { logAuditTrailAction } from './auditActions';

type ActionResponse = {
  success: boolean;
  error?: string;
  user?: any;
  signupUrl?: string;
  vaultContent?: string;
};

/**
 * Robustly serializes Firestore document data for Next.js Client Components.
 * Recursively converts all Timestamps to ISO strings.
 */
function serializeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    // Check if it's a Firestore Timestamp (Admin SDK version)
    if (data._seconds !== undefined && data._nanoseconds !== undefined) {
        return new Date(data._seconds * 1000).toISOString();
    }
    
    // Check if it's a Timestamp-like object with toDate (Client SDK style or similar)
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

/**
 * Validates the successor's recovery tokens and reveals the encrypted vault content.
 * Does NOT promote the user yet.
 */
export async function verifyLegacyCredentialsAction(params: {
    userId: string;
    key1: string;
    key2: string;
    personalPassword?: string;
}): Promise<ActionResponse> {
    const { userId, key1, key2 } = params;
    const { firestore } = initializeAdminApp();

    try {
        const legacyRef = firestore.collection('owner_legacy').doc('settings');
        const legacySnap = await legacyRef.get();
        if (!legacySnap.exists) throw new Error("Legacy configuration missing.");
        
        const data = legacySnap.data()!;
        const { successorId, recoveryPack, inactivityMonths = 6, vaultContent } = data;

        if (userId !== successorId) throw new Error("Unauthorized: You are not the designated successor.");

        // Activity Check: Owner must be inactive
        const ownerSnap = await firestore.collection('users').where('role', '==', 'owner').limit(1).get();
        if (ownerSnap.empty) throw new Error("Primary owner record not found.");
        
        const ownerData = ownerSnap.docs[0].data();
        const lastActive = ownerData.lastActive?.toDate() || new Date(0);
        const monthsInactive = (new Date().getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        if (monthsInactive < inactivityMonths) {
            throw new Error(`Owner has been active recently. Handover protocol requires ${inactivityMonths} months of inactivity.`);
        }

        // Verify Recovery Shards
        const hash1 = CryptoJS.SHA256(key1).toString();
        const hash2 = CryptoJS.SHA256(key2).toString();
        
        const match1 = recoveryPack.find((p: any) => p.hash === hash1);
        const match2 = recoveryPack.find((p: any) => p.hash === hash2);

        if (!match1 || !match2 || hash1 === hash2) {
            throw new Error("Invalid or duplicate recovery shards provided.");
        }

        // Log the verification attempt
        await firestore.collection('audit_log').add({
            adminId: 'system_legacy_handover',
            action: 'legacy_credentials_verified',
            details: `Successor ${userId} successfully verified physical shards and unlocked master instructions.`,
            timestamp: Timestamp.now(),
            targetUser: { id: userId, name: 'Successor Verification' }
        });

        return { success: true, vaultContent };
    } catch (error: any) {
        console.error("Legacy Verification Failure:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Finalizes the handover by promoting the successor to Platform Owner.
 */
export async function finalizeLegacyHandoverAction(params: {
    userId: string;
}): Promise<ActionResponse> {
    const { userId } = params;
    const { firestore, adminApp } = initializeAdminApp();
    const auth = getAuth(adminApp);

    try {
        const batch = firestore.batch();
        const successorRef = firestore.collection('users').doc(userId);
        
        batch.update(successorRef, {
            role: 'owner',
            title: 'Platform Owner (Successor)',
            'permissions.isStaff': true,
            'permissions.isAdmin': true,
            updatedAt: Timestamp.now()
        });

        // Log the final assumption of sovereignty
        const logRef = firestore.collection('audit_log').doc();
        batch.set(logRef, {
            adminId: 'system_legacy_handover',
            action: 'legacy_sovereignty_assumed',
            details: `Successor ${userId} has officially accepted responsibility and assumed Platform Owner status.`,
            timestamp: Timestamp.now(),
            targetUser: { id: userId, name: 'Successor Promotion' }
        });

        await batch.commit();
        await auth.setCustomUserClaims(userId, { isStaff: true, isAdmin: true });

        return { success: true };
    } catch (error: any) {
        console.error("Legacy Finalization Failure:", error);
        return { success: false, error: error.message };
    }
}

export async function addAuthorizedEmailAction(params: {
    email: string;
    addedBy: string;
    addedByName: string;
}): Promise<ActionResponse> {
    const { email, addedBy, addedByName } = params;
    if (!email) return { success: false, error: "Email is required." };
    
    try {
        const { firestore } = initializeAdminApp();
        
        const cleanEmail = email.trim().toLowerCase();
        const id = cleanEmail.replace(/[^a-z0-9]/g, '_');
        
        await firestore.collection('authorized_logins').doc(id).set({
            email: cleanEmail,
            addedBy,
            addedByName,
            status: 'active',
            createdAt: Timestamp.now()
        });

        await logAuditTrailAction({
            adminId: addedBy,
            adminName: addedByName,
            action: 'whitelist_email_granted',
            category: 'Team & Whitelist',
            details: `Authorized login access granted to email "${cleanEmail}".`,
            targetObject: {
                id,
                name: cleanEmail,
                type: 'Authorized Login Whitelist'
            },
            metadata: { email: cleanEmail, addedBy, status: 'active' }
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Error authorizing email:", error);
        return { success: false, error: error.message };
    }
}

export async function removeAuthorizedEmailAction(id: string): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = firestore.collection('authorized_logins').doc(id);
        const docSnap = await docRef.get();
        const data = docSnap.data();

        await docRef.delete();

        await logAuditTrailAction({
            action: 'whitelist_email_revoked',
            category: 'Team & Whitelist',
            details: `Revoked authorized login access for identity "${data?.email || id}".`,
            targetObject: {
                id,
                name: data?.email || id,
                type: 'Authorized Login Whitelist'
            },
            metadata: { email: data?.email, id }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error removing authorized email:", error);
        return { success: false, error: error.message };
    }
}

export async function updateAuthorizedEmailStatusAction(params: {
    id: string;
    status: 'active' | 'suspended' | 'gardening_leave';
    adminId?: string;
    adminName?: string;
}): Promise<ActionResponse> {
    const { id, status } = params;
    try {
        const { firestore } = initializeAdminApp();
        const docRef = firestore.collection('authorized_logins').doc(id);
        const docSnap = await docRef.get();
        const data = docSnap.data();

        await docRef.update({
            status,
            updatedAt: Timestamp.now()
        });

        await logAuditTrailAction({
            adminId: params.adminId || 'system_admin',
            adminName: params.adminName || 'Platform Administration',
            action: `whitelist_status_${status}`,
            category: 'Team & Whitelist',
            details: `Updated whitelist clearance for "${data?.email || id}" to "${status}".`,
            targetObject: {
                id,
                name: data?.email || id,
                type: 'Authorized Login Whitelist'
            },
            metadata: { previousStatus: data?.status, newStatus: status, email: data?.email }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating whitelist status:", error);
        return { success: false, error: error.message };
    }
}

export async function acceptLeadershipInvitationAction(params: {
    userId: string;
    communityId: string;
    notificationId: string;
}): Promise<ActionResponse> {
    const { userId, communityId, notificationId } = params;
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        
        const userRef = firestore.collection('users').doc(userId);
        batch.update(userRef, {
            role: 'president',
            title: 'President'
        });

        const notificationRef = firestore.collection('notifications').doc(notificationId);
        batch.update(notificationRef, {
            status: 'archived',
        });
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function appointCommunityLeaderAction(params: {userId: string, communityId: string, communityName: string}): Promise<ActionResponse> {
    console.log("Appointing community leader", params);
    return { success: true };
}

export async function inviteTeamMemberAction(params: { recipientName: string, workEmail: string, role: string, inviterName: string, communityName: string }): Promise<ActionResponse> {
    const { recipientName, workEmail, role, inviterName, communityName } = params;

    if (!recipientName || !workEmail || !role || !inviterName || !communityName) {
        return { success: false, error: 'All fields are required to send an invitation.' };
    }
    
    try {
        const { firestore } = initializeAdminApp();
        const inviteRef = firestore.collection('staff_profiles').doc(); 
        
        const inviteData = {
            name: recipientName,
            workEmail: workEmail.trim().toLowerCase(),
            role: role,
            status: 'pending',
            invitedBy: inviterName,
            communityName,
            invitedAt: Timestamp.now(),
        };

        await inviteRef.set(inviteData);
        
        const signupUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/signup-staff?token=${inviteRef.id}`;
        
        await sendEmail({
            to: [{ email: workEmail, name: recipientName }],
            subject: `You're invited to join the ${communityName} team!`,
            htmlContent: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>You've Been Invited!</h2>
                    <p>Hello ${recipientName},</p>
                    <p>${inviterName} has invited you to join the <strong>${communityName}</strong> team on Community Hub as a <strong>${role}</strong>.</p>
                    <p>Please click the button below to create your account and accept the invitation.</p>
                    <p style="margin: 20px 0;">
                        <a href="${signupUrl}" style="background-color: #4338ca; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Create Your Account</a>
                    </p>
                    <p>If you have any questions, please contact ${inviterName}.</p>
                    <br>
                    <p><em>This invitation link is for your use only and should not be shared.</em></p>
                </div>
            `,
        });

        return { success: true, signupUrl };
    } catch (error: any) {
        console.error("Error creating team invitation:", error);
        return { success: false, error: "Failed to create invitation." };
    }
}

export async function findUserByNameAndEmail(params: { name: string, email: string }): Promise<ActionResponse> {
    if(params.email.includes("found")) {
        return { success: true, user: { id: 'found-user-id', name: params.name, email: params.email.toLowerCase().trim(), communityId: 'some-other-community', memberOf: ['some-other-community'] } };
    }
    return { success: false, error: "No user found with that name and email." };
}

export async function addExistingMemberToCommunity(params: { userId: string, communityId: string, communityName: string, adderName: string }): Promise<ActionResponse> {
    return { success: true };
}

export async function removeMemberFromCommunityAction(params: { memberId: string, communityId: string }): Promise<ActionResponse> {
    const { memberId, communityId } = params;
    if (!memberId || !communityId) {
        return { success: false, error: "User ID and Community ID are required." };
    }
    
    try {
        const { firestore } = initializeAdminApp();
        const userRef = firestore.collection('users').doc(memberId);
        
        await firestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User not found.");
            }
            
            const userData = userDoc.data()!;
            
            const updateData: { [key: string]: any } = {
                memberOf: FieldValue.arrayRemove(communityId)
            };

            if (userData.communityId === communityId) {
                const homeId = userData.homeCommunityId;
                const newMemberOf = (userData.memberOf || []).filter((id: string) => id !== communityId);

                if (homeId && newMemberOf.includes(homeId)) {
                    const homeCommunityDoc = await firestore.collection('communities').doc(homeId).get();
                    if (homeCommunityDoc.exists) {
                        updateData.communityId = homeId;
                        updateData.communityName = homeCommunityDoc.data()!.name;
                    }
                } else if (newMemberOf.length > 0) {
                    const firstCommunityId = newMemberOf[0];
                    const firstCommunityDoc = await firestore.collection('communities').doc(firstCommunityId).get();
                    if (firstCommunityDoc.exists) {
                        updateData.communityId = firstCommunityId;
                        updateData.communityName = firstCommunityDoc.data()!.name;
                    }
                } else {
                    updateData.communityId = null;
                    updateData.communityName = null;
                }
            }
            
            if (userData.communityRoles && userData.communityRoles[communityId]) {
                updateData[`communityRoles.${communityId}`] = FieldValue.delete();
            }

            transaction.update(userRef, updateData);
            
            const communityRef = firestore.collection('communities').doc(communityId);
            transaction.update(communityRef, {
                memberCount: FieldValue.increment(-1)
            });
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error removing member from community:", error);
        return { success: false, error: error.message || "Failed to remove member." };
    }
}

export async function updateMemberRoleAction(params: { 
    memberId: string, 
    communityId: string, 
    newRole: string, 
    newTitle: string 
}): Promise<ActionResponse> {
    const { memberId, communityId, newRole, newTitle } = params;
    if (newRole === 'president') {
        return { success: false, error: "The 'President' role can only be assigned through the leadership handover process in settings." };
    }
    const { firestore } = initializeAdminApp();
    const userRef = firestore.doc(`users/${memberId}`);
    
    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new Error("User not found.");
        }
        const userData = userDoc.data()!;

        const isPrimaryCommunity = userData.communityId === communityId;

        if (isPrimaryCommunity) {
             await userRef.update({
                role: newRole,
                title: newTitle,
            });
        } else {
            const fieldPath = `communityRoles.${communityId}`;
             await userRef.update({
                [`${fieldPath}.role`]: newRole,
                [`${fieldPath}.title`]: newTitle,
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error updating member role:", error);
        return { success: false, error: error.message };
    }
}

export async function getStaffProfile(employeeId: string) {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.doc(`users/${employeeId}`);
    const profileRef = firestore.doc(`staff_profiles/${employeeId}`);

    const [userSnap, profileSnap] = await Promise.all([userRef.get(), profileRef.get()]);

    const userData = userSnap.exists ? userSnap.data() : {};
    const name = userData?.name || "Unknown";
    const reportsTo = userData?.reportsTo || null;
    const profile = profileSnap.exists ? profileSnap.data() : {};
    
    return { 
        name, 
        reportsTo, 
        profile: serializeData(profile) 
    };
}

export async function saveStaffProfileAction(employeeId: string, profile: any, reportsTo?: string | null): Promise<ActionResponse> {
     try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        
        const userRef = firestore.doc(`users/${employeeId}`);
        const profileRef = firestore.doc(`staff_profiles/${employeeId}`);
        
        batch.set(profileRef, profile, { merge: true });
        
        if (reportsTo !== undefined) {
            batch.update(userRef, { reportsTo });
        }
        
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error saving staff profile:", error);
        return { success: false, error: error.message };
    }
}


export async function runSaveCommunityTeamPermissions(params: {
    memberId: string;
    permissions: any;
    communityId: string;
    updaterId: string;
    profileType: 'primary' | 'secondary';
}): Promise<ActionResponse> {
    const { memberId, permissions, communityId, updaterId, profileType } = params;

    try {
        const { firestore } = initializeAdminApp();
        const memberRef = firestore.collection("users").doc(memberId);
        
        if (profileType === 'primary') {
             await memberRef.update({ permissions });
        } else {
            const fieldPath = `communityRoles.${communityId}.permissions`;
            await memberRef.update({ [fieldPath]: permissions });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error saving team permissions:", error);
        return { success: false, error: error.message };
    }
}

export async function runAddCommunityToLeadership(params: { userId: string, communityId: string }): Promise<ActionResponse> {
  const { userId, communityId } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User and Community must be specified.' };
  }

  const { firestore } = initializeAdminApp();
  try {
    await firestore.runTransaction(async (transaction) => {
      const userRef = firestore.collection('users').doc(userId);
      const communityRef = firestore.collection('communities').doc(communityId);
      
      const [userDoc, communityDoc] = await Promise.all([
        transaction.get(userRef),
        transaction.get(communityRef),
      ]);

      if (!userDoc.exists) throw new Error("User does not exist.");
      if (!communityDoc.exists) throw new Error("Community does not exist.");

      const communityData = communityDoc.data();
      if ((communityData?.leaderCount || 0) > 0) {
        throw new Error("This community already has a leader.");
      }

      const userData = userDoc.data()!;
      let finalStatus: 'active' | 'pending' = 'pending';

      if (userData.homeCommunityId) {
          const homeCommunityRef = firestore.collection('communities').doc(userData.homeCommunityId);
          const homeCommunityDoc = await transaction.get(homeCommunityRef);
          if (homeCommunityDoc.exists && homeCommunityDoc.data()?.status === 'active') {
              finalStatus = 'active';
          }
      }

      transaction.update(userRef, {
        [`communityRoles.${communityId}`]: {
            role: 'president',
            title: 'President'
        },
        memberOf: FieldValue.arrayUnion(communityId)
      });

      transaction.update(communityRef, {
        leaderCount: FieldValue.increment(1),
        status: finalStatus,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding community to leadership:", error);
    return { success: false, error: error.message };
  }
}

export async function runHandoverLeadership(params: { currentLeaderId: string; newLeaderId: string; }): Promise<ActionResponse> {
    const { firestore, adminApp } = initializeAdminApp();
    const auth = getAuth(adminApp);
    const { currentLeaderId, newLeaderId } = params;

    try {
        let communityId: string | null = null;
        
        await firestore.runTransaction(async (transaction) => {
            const currentLeaderRef = firestore.doc(`users/${currentLeaderId}`);
            const newLeaderRef = firestore.doc(`users/${newLeaderId}`);

            const [currentLeaderDoc, newLeaderDoc] = await Promise.all([
                transaction.get(currentLeaderRef),
                transaction.get(newLeaderRef)
            ]);

            if (!currentLeaderDoc.exists || !newLeaderDoc.exists) {
                throw new Error("One or both user profiles could not be found.");
            } 
            
            const currentLeaderData = currentLeaderDoc.data()!;
            communityId = currentLeaderData.communityId;

            if (!communityId) {
                throw new Error("Current leader is not associated with a community.");
            }

            transaction.update(currentLeaderRef, {
                role: 'personal',
                title: 'Personal',
                permissions: FieldValue.delete()
            });

            transaction.update(newLeaderRef, {
                role: 'president',
                title: 'President',
                communityId: communityId
            });
        });

        if (communityId) {
            await auth.setCustomUserClaims(newLeaderId, { presidentOf: [communityId] });
            await auth.setCustomUserClaims(currentLeaderId, {}); 
        }

        return { success: true };
    } catch (error: any) {
        console.error("Leadership handover failed:", error);
        return { success: false, error: error.message };
    }
}


export async function savePlatformRolesAction(roles: { name: string, description: string }[], communityId?: string): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = communityId 
            ? firestore.collection('communities').doc(communityId)
            : firestore.collection('platform_settings').doc('roles');
        
        const updateData = communityId ? { communityTeamRoles: roles } : { roleList: roles };

        await docRef.set(updateData, { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving platform roles:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Promotes a user to Platform Staff.
 * Hardens security by automatically adding the user to the Login Whitelist.
 */
export async function promoteToStaffAction(params: { userId: string; role: string; }): Promise<ActionResponse> {
  const { userId, role } = params;
  if (!userId || !role) {
    return { success: false, error: "User ID and role are required." };
  }
  
  const { firestore, adminApp } = initializeAdminApp();
  const auth = getAuth(adminApp);

  try {
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) throw new Error("Target user record not found.");
    const userData = userDoc.data()!;
    const userEmail = userData.email;

    if (!userEmail) throw new Error("User email is missing from record. Access cannot be granted.");

    const roleKey = role.toLowerCase().replace(/\s+/g, '-');
    const title = `Platform ${role}`;
    
    const batch = firestore.batch();

    // 1. Update Custom Claims
    await auth.setCustomUserClaims(userId, { 
        isStaff: true,
        isAdmin: true 
    });

    // 2. Update User Profile
    batch.update(userRef, {
      role: roleKey,
      title: title,
      'permissions.isAdmin': true,
      'permissions.isStaff': true, 
      'permissions.dashboards.admin': true,
      updatedAt: Timestamp.now()
    });

    // 3. SECURE WHITELIST SYNC: Automatically authorize for backend login
    const cleanEmail = userEmail.trim().toLowerCase();
    const whitelistId = cleanEmail.replace(/[^a-z0-9]/g, '_');
    const authRef = firestore.collection('authorized_logins').doc(whitelistId);
    
    batch.set(authRef, {
        email: cleanEmail,
        addedBy: 'system_promotion',
        addedByName: 'Platform Recruitment System',
        status: 'active',
        createdAt: Timestamp.now()
    }, { merge: true });

    // 4. Send Internal Notification
    const notificationRef = firestore.collection('notifications').doc();
    batch.set(notificationRef, {
      recipientId: userId,
      type: "Account Update",
      subject: "You have been promoted to Platform Staff",
      from: "Platform Administration",
      date: Timestamp.now().toDate().toISOString(),
      status: 'new',
      details: { message: `Your new role is ${title}. You now have full access to the Administrative Back-Office and been added to the secure login whitelist.` }
    });

    // 5. Record to Audit Log
    const logRef = firestore.collection('audit_log').doc();
    batch.set(logRef, {
        adminId: 'system_recruitment',
        action: 'staff_promotion',
        details: `Promoted ${userData.name} to ${title}. Automatically synchronized to whitelist.`,
        timestamp: Timestamp.now(),
        targetUser: { id: userId, name: userData.name }
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error promoting user to staff:", error);
    return { success: false, error: error.message };
  }
}

export async function demoteStaffAction(params: { userId: string }): Promise<ActionResponse> {
  const { userId } = params;
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  
  const { firestore, adminApp } = initializeAdminApp();
  const auth = getAuth(adminApp);

  try {
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const originalAccountType = userData?.accountType || 'personal';

    await auth.setCustomUserClaims(userId, {
        isStaff: false,
        isAdmin: false
    });

    await userRef.update({
      role: originalAccountType,
      title: originalAccountType.charAt(0).toUpperCase() + originalAccountType.slice(1),
      'permissions.isAdmin': false,
      'permissions.isStaff': false,
      'permissions.dashboards.admin': false,
      permissions: FieldValue.delete() 
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error demoting user:", error);
    return { success: false, error: error.message };
  }
}
