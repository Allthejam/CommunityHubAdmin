'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

type ActionResponse = {
  success: boolean;
  error?: string;
  communityName?: string;
  message?: string;
};

const MASTER_OWNER_EMAIL = 'allan_jamieson@outlook.com';

/**
 * Platform Standards for Syncing
 * These define the baseline visibility flags for different staff tiers.
 */
const STAFF_DEFAULT_PERMISSIONS = {
    viewDashboard: true,
    viewUsers: true,
    viewCommunities: true,
    viewBusinesses: true,
    viewAnnouncements: true,
    viewTeam: true,
    viewChat: true,
    viewAuditLog: true,
    viewModeration: true,
    isAdmin: true,
    isStaff: true,
};

const OWNER_DEFAULT_PERMISSIONS = {
    ...STAFF_DEFAULT_PERMISSIONS,
    viewDeletedUsers: true,
    viewCommunityMap: true,
    viewLeadershipApps: true,
    viewPoliceLiaisonApps: true,
    viewReports: true,
    viewFinancials: true,
    viewNationalAdvertisers: true,
    viewPricing: true,
    viewOwnerAdverts: true,
    viewShoppingTaxonomy: true,
    viewShoppingControls: true,
    viewMarketingGen: true,
    viewMarketResearch: true,
    viewManuals: true,
    viewGallery: true,
    viewAudioHub: true,
    viewPlatformOverview: true,
    viewCareers: true,
    viewAppraisalsAndPay: true,
    viewBroadcastLog: true,
    viewSpecialAccess: true,
    viewAuthLogins: true,
    viewSiteMap: true,
    viewRoadmap: true,
    viewLegal: true,
    viewDropdowns: true,
    viewLawEnforcement: true,
    viewSettings: true,
    actionSetTeamPermissions: true,
    actionViewStaffProfiles: true,
    actionViewUserProfile: true,
    actionImpersonateUser: true,
    actionImpersonateLeader: true,
    actionManageCareers: true,
    actionRunGlobalSync: true,
    actionRecalculateHubStats: true,
    actionManageAppraisalsAndPay: true,
    actionManageShoppingControls: true,
};

export async function checkAndCreateMailingListsAction(userId: string): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const userRef = firestore.collection('users').doc(userId);
        await userRef.set({
            mailingLists: {
                standard: true,
                emergency: true,
                newsletter: true,
            }
        }, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function findUser(userId: string): Promise<{ id: string, name: string, avatar: string } | null> {
    try {
        const { firestore } = initializeAdminApp();
        const userDoc = await firestore.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return {
                id: userDoc.id,
                name: userData?.name || 'Unknown User',
                avatar: userData?.avatar || ''
            };
        }
        return null;
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}


export async function updateUserCommunityAction(params: {
  userId: string;
  communityId: string;
}): Promise<ActionResponse> {
  const { userId, communityId } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const communityRef = firestore.collection('communities').doc(communityId);
    
    const communityDoc = await communityRef.get();

    if (!communityDoc.exists) {
      return { success: false, error: 'Community not found.' };
    }

    const communityData = communityDoc.data()!;

    await userRef.update({
      communityId: communityId,
      communityName: communityData.name,
    });
    
    return { success: true, communityName: communityData.name };
  } catch (error: any) {
    console.error("Error updating user's viewing community:", error);
    return { success: false, error: error.message || 'Failed to switch community.' };
  }
}

export async function returnToHomeCommunityAction(params: { userId: string }): Promise<ActionResponse> {
  const { userId } = params;
  if (!userId) {
    return { success: false, error: "User ID is required." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return { success: false, error: "User found." };
    }
    
    const userData = userDoc.data();
    const homeCommunityId = userData?.homeCommunityId || userData?.memberOf?.[0];
    
    if (!homeCommunityId) {
       return { success: false, error: "Home community not set for this user." };
    }

    const communityRef = firestore.collection('communities').doc(homeCommunityId);
    const communityDoc = await communityRef.get();
    
    if (!communityDoc.exists) {
      return { success: false, error: "Home community data could not be found." };
    }
    
    const communityData = communityDoc.data()!;

    await userRef.update({
      communityId: homeCommunityId,
      communityName: communityData.name,
    });

    return { success: true, communityName: communityData.name };
  } catch (error: any) {
    console.error("Error returning to home community:", error);
    return { success: false, error: error.message || "Failed to return home." };
  }
}

export async function saveUserSettingsAction(
  userId: string,
  settings: Record<string, any>
): Promise<ActionResponse> {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const validSettings = Object.entries(settings).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    await userRef.update(validSettings);
    return { success: true };
  } catch (error: any) {
    console.error('Error saving user settings:', error);
    return { success: false, error: error.message || 'Failed to save settings.' };
  }
}

export async function updateUserFavouriteCommunitiesAction(params: { userId: string; communityId: string; isFavourited: boolean }): Promise<ActionResponse> {
  const { userId, communityId, isFavourited } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    
    if (isFavourited) {
      await userRef.update({
        favouriteCommunities: FieldValue.arrayRemove(communityId),
      });
    } else {
      await userRef.update({
        favouriteCommunities: FieldValue.arrayUnion(communityId),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating favourite communities:', error);
    return { success: false, error: error.message || 'Failed to update favourites.' };
  }
}

export async function updateUserBusinessFavouritesAction(params: { userId: string; businessId: string; isFavourited: boolean }): Promise<ActionResponse> {
  const { userId, businessId, isFavourited } = params;
  if (!userId || !businessId) {
    return { success: false, error: 'User ID and Business ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    
    if (isFavourited) {
      await userRef.update({
        favouriteBusinesses: FieldValue.arrayRemove(businessId),
      });
    } else {
      await userRef.update({
        favouriteBusinesses: FieldValue.arrayUnion(businessId),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating business favourites:', error);
    return { success: false, error: error.message || 'Failed to update business favourites.' };
  }
}


export async function updateUserCartAction(params: {
  userId: string;
  cart: { productId: string; quantity: number; businessId: string; }[];
}): Promise<ActionResponse> {
  const { userId, cart } = params;
  if (!userId) {
    return { success: false, error: 'User ID is required to update the cart.' };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({ cart });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user cart:', error);
    return { success: false, error: 'Failed to sync your cart with the server.' };
  }
}

export async function changeAccountTypeAction(params: {
  userId: string;
  newType: 'personal' | 'business';
  communityId: string;
}): Promise<ActionResponse> {
  const { userId, newType, communityId } = params;
  if (!userId || !newType || !communityId) {
    return { success: false, error: 'User ID, new account type, and community ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    
    const updateData: { [key: string]: any } = {
        accountType: newType,
    };
    
    updateData[`communityRoles.${communityId}`] = FieldValue.delete();

    if (newType === 'business') {
        updateData['permissions.isBusinessOwner'] = true;
    } else {
        updateData['permissions.isBusinessOwner'] = false;
    }

    await userRef.update(updateData);

    return { success: true };
  } catch (error: any) {
    console.error("Error changing account type:", error);
    return { success: false, error: 'Failed to update account type.' };
  }
}

export async function resignAsPresidentAction(params: {
  userId: string;
  communityId: string;
}): Promise<ActionResponse> {
  const { userId, communityId } = params;
  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }

  const { firestore } = initializeAdminApp();
  const userRef = firestore.collection('users').doc(userId);
  const communityRef = firestore.collection('communities').doc(communityId);

  try {
    await firestore.runTransaction(async (transaction) => {
      const communityDoc = await transaction.get(communityRef);
      if (!communityDoc.exists) {
        throw new Error("Community not found.");
      }

      transaction.update(userRef, {
        role: 'personal',
        title: 'Personal',
        accountType: 'personal',
        'permissions.isLeader': false,
      });

      const currentLeaderCount = communityDoc.data()?.leaderCount || 0;
      const newLeaderCount = Math.max(0, currentLeaderCount - 1);
      
      const communityUpdateData: { leaderCount: number; status?: string } = {
        leaderCount: newLeaderCount
      };

      if (newLeaderCount === 0) {
        communityUpdateData.status = 'pending';
      }

      transaction.update(communityRef, communityUpdateData);
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error during president resignation:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteUserAccountAction(params: { userId: string }): Promise<ActionResponse> {
  const { userId } = params;
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const { firestore, adminApp } = initializeAdminApp();
    const auth = getAuth(adminApp);
    const batch = firestore.batch();

    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData && (userData.role === 'president' || userData.role === 'leader')) {
            const communityId = userData.communityId;
            if (communityId) {
                const communityRef = firestore.collection('communities').doc(communityId);
                const communityDoc = await communityRef.get();
                if (communityDoc.exists && communityDoc.data()?.stripeAccountId) {
                    batch.update(communityRef, {
                        stripeAccountId: FieldValue.delete(),
                        leaderCount: FieldValue.increment(-1)
                    });
                }
            }
        }
    }

    batch.delete(userRef);
    await batch.commit();
    await auth.deleteUser(userId);

    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting user account ${userId}:`, error);
    if (error.code === 'auth/user-not-found') {
        return { success: true, message: 'User already deleted from Auth, cleaned up Firestore records.' };
    }
    return { success: false, error: error.message || 'Failed to delete user account.' };
  }
}


export async function acceptTermsAction(userId: string): Promise<ActionResponse> {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({
      termsAcceptedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error accepting terms:', error);
    return { success: false, error: 'Failed to record acceptance.' };
  }
}

export async function setNationalAdvertiserCommunity(userId: string): Promise<ActionResponse> {
  const { firestore } = initializeAdminApp();
  try {
    const communityQuery = firestore.collection('communities').where('name', '==', 'Atlantis').limit(1);
    const communitySnapshot = await communityQuery.get();

    if (communitySnapshot.empty) {
      return { success: false, error: "The 'Atlantis' community hub for advertisers could not be found." };
    }

    const communityDoc = communitySnapshot.docs[0];
    const communityId = communityDoc.id;
    const communityName = communityDoc.data().name;

    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({
      communityId: communityId,
      communityName: communityName,
      homeCommunityId: communityId,
      memberOf: FieldValue.arrayUnion(communityId)
    });

    return { success: true, communityName: communityName };

  } catch (error: any) {
    console.error("Error setting advertiser community:", error);
    return { success: false, error: "Could not set the advertiser's home community." };
  }
}

/**
 * Iterates through all users and updates their communityName field 
 * if it doesn't match the actual name of their associated communityId.
 */
export async function syncUserCommunityNamesAction(): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const usersRef = firestore.collection('users');
    const communitiesRef = firestore.collection('communities');
    
    const communitiesSnap = await communitiesRef.get();
    const communityMap = new Map();
    communitiesSnap.forEach(doc => communityMap.set(doc.id, doc.data().name));

    const usersSnap = await usersRef.get();
    let updatedCount = 0;
    
    const batchSize = 500;
    let batch = firestore.batch();
    let count = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (!userData.communityId) continue;

      const correctName = communityMap.get(userData.communityId);
      
      if (correctName && userData.communityName !== correctName) {
        batch.update(userDoc.ref, { communityName: correctName });
        updatedCount++;
        count++;
        
        if (count === batchSize) {
          await batch.commit();
          batch = firestore.batch();
          count = 0;
        }
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    return { 
        success: true, 
        message: `Synchronization complete. Updated ${updatedCount} user records with the correct community names.` 
    };
  } catch (error: any) {
    console.error("User community name sync failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Validates and triggers a high-level impersonation session.
 */
export async function runImpersonateUser(params: {
    targetUserId: string;
    adminId: string;
}): Promise<ActionResponse> {
    const { targetUserId, adminId } = params;
    try {
        const { firestore } = initializeAdminApp();
        
        const adminDoc = await firestore.collection('users').doc(adminId).get();
        const adminData = adminDoc.data();
        const canImpersonate = adminData?.role === 'owner' || adminData?.permissions?.actionImpersonateUser || adminData?.permissions?.actionImpersonateLeader;

        if (!canImpersonate) {
            return { success: false, error: "Security Restriction: You do not have the required administrative permission to impersonate users." };
        }

        const targetDoc = await firestore.collection('users').doc(targetUserId).get();
        if (!targetDoc.exists) {
            return { success: false, error: "Target user not found." };
        }

        await firestore.collection('audit_log').add({
            adminId,
            adminNameSnapshot: adminData?.name || 'Admin',
            action: 'user_impersonation_initiated',
            details: `Admin initiated impersonation of ${targetDoc.data()?.name} (${targetUserId})`,
            timestamp: Timestamp.now(),
            targetUser: { id: targetUserId, name: targetDoc.data()?.name }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Impersonation setup failed:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Robust Platform-wide Synchronization of User Permissions.
 * Regenerates the 'permissions' object for every user based on their Role, Title, and Account Type.
 * Ensures administrative staff have full visibility across the back-office ecosystem.
 */
export async function syncAllUserPermissionsAction(adminId: string): Promise<ActionResponse> {
  console.log(`[Permission Sync] Initiation requested by admin: ${adminId}`);
  const { firestore } = initializeAdminApp();
  const batchSize = 500;
  let totalUpdated = 0;

  try {
    const adminSnap = await firestore.collection('users').doc(adminId).get();
    if (!adminSnap.exists) {
      return { success: false, error: "Unauthorized: Requester record not found in database." };
    }

    const adminData = adminSnap.data()!;
    const adminEmail = (adminData.email || '').toLowerCase().trim();
    const role = (adminData.role || '').toLowerCase();
    const isStaffFlag = !!adminData.permissions?.isStaff;
    const isAdminFlag = !!adminData.permissions?.isAdmin;
    const canRunSync = !!adminData.permissions?.actionRunGlobalSync;

    // Sovereign Authorization Gate
    const isSovereign = adminEmail === MASTER_OWNER_EMAIL || role === 'owner';

    if (!isSovereign && role !== 'admin' && !isAdminFlag && !isStaffFlag && !canRunSync) {
      return { success: false, error: "Unauthorized: You do not have the clearance level required to run a global permission sweep." };
    }

    const usersSnap = await firestore.collection('users').get();
    console.log(`[Permission Sync] Processing ${usersSnap.size} user records...`);

    let batch = firestore.batch();
    let count = 0;

    for (const userDoc of usersSnap.docs) {
      try {
        const data = userDoc.data();
        const userEmail = (data.email || '').toLowerCase().trim();
        const userRole = (data.role || '').toLowerCase();
        const accountType = (data.accountType || '').toLowerCase();
        const userTitle = (data.title || '').toLowerCase();

        // 1. Identify Administrative Status
        const staffRoles = ['admin', 'administrator', 'moderator', 'support', 'finance', 'investigator', 'accountant', 'support-specialist'];
        const isPlatformStaff = userRole === 'owner' || 
                                userTitle.includes('platform') || 
                                userTitle.includes('admin') ||
                                staffRoles.includes(userRole) ||
                                userEmail === MASTER_OWNER_EMAIL;
        
        // 2. Build Permission Baseline
        let newPermissions: any = {
            ...(data.permissions || {}),
            isAdmin: isPlatformStaff,
            isStaff: isPlatformStaff,
            isLeader: userRole === 'president' || userRole === 'leader',
            isBusinessOwner: accountType === 'business',
            isEnterpriseUser: accountType === 'enterprise',
            isNationalAdvertiser: accountType === 'advertiser' || accountType === 'national',
        };

        // 3. Apply Detailed Visibility Overrides for Staff
        if (userRole === 'owner' || userTitle.includes('owner') || userEmail === MASTER_OWNER_EMAIL) {
            // Owners/Master Admins get absolute sovereignty
            newPermissions = { ...newPermissions, ...OWNER_DEFAULT_PERMISSIONS };
        } else if (isPlatformStaff) {
            // General staff get the standard admin toolkit
            newPermissions = { ...newPermissions, ...STAFF_DEFAULT_PERMISSIONS };
        }

        // 4. Update the record
        batch.update(userDoc.ref, { 
            permissions: newPermissions,
            updatedAt: Timestamp.now()
        });

        totalUpdated++;
        count++;

        if (count === batchSize) {
            await batch.commit();
            batch = firestore.batch();
            count = 0;
        }
      } catch (innerError) {
        console.warn(`[Permission Sync] Skipping record ${userDoc.id} due to processing error:`, innerError);
      }
    }

    // Commit any remaining updates
    if (count > 0) {
      await batch.commit();
    }

    // 5. Finalize Audit Trail
    await firestore.collection('audit_log').add({
      adminId,
      adminNameSnapshot: adminData.name || 'Admin',
      action: 'global_permission_sync',
      details: `Successful sweep of ${totalUpdated} user records. Administrative visibility flags have been standardized.`,
      timestamp: Timestamp.now()
    });

    console.log(`[Permission Sync] Completed successfully. Updated ${totalUpdated} records.`);
    return { 
      success: true, 
      message: `Global synchronization complete. Verified and updated ${totalUpdated} user permission profiles.` 
    };

  } catch (error: any) {
    console.error("[Permission Sync] Fatal error during synchronization:", error);
    return { success: false, error: error.message || "A system error occurred during the synchronization sweep." };
  }
}
