
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type LeaderProfileData = {
    communityId: string;
    leaderName?: string;
    contactPhone?: string;
    preferredContactMethod?: 'email' | 'phone' | 'chat';
    intendedCommunityCount?: number;
    communityIntent?: 'project' | 'revenue';
    communityIntentDescription?: string;
    refName?: string;
    refEmail?: string;
    refPhone?: string;
    refRelationship?: string;
    agreedToTerms?: boolean;
    avatar?: string | null;
    banner?: string | null;
    gender?: string;
    ageRange?: string;
    homeCommunityId?: string;
}

export async function saveLeaderProfile(params: {
  userId: string;
  profileData: Partial<LeaderProfileData>;
  status?: 'draft' | 'pending';
}): Promise<ActionResponse> {
  const { userId, profileData, status } = params;
  if (!userId) {
    return { success: false, error: "User ID is required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    // The communityId for the leader profile should come from the user's primary community
    const communityId = userData?.communityId;

    if (!communityId) {
        return { success: false, error: "User is not associated with a community." };
    }

    const { leaderName, ...restOfProfileData } = profileData;

    // Update user document if there are user-level fields
    const userUpdateData: Record<string, any> = {};
    if (leaderName) userUpdateData.name = leaderName;
    if (profileData.avatar !== undefined) userUpdateData.avatar = profileData.avatar;
    if (profileData.banner !== undefined) userUpdateData.banner = profileData.banner;
    if (profileData.gender !== undefined) userUpdateData.gender = profileData.gender;
    if (profileData.ageRange !== undefined) userUpdateData.ageRange = profileData.ageRange;
    if (profileData.homeCommunityId) userUpdateData.homeCommunityId = profileData.homeCommunityId;

    const batch = firestore.batch();

    if (Object.keys(userUpdateData).length > 0) {
      batch.update(userRef, userUpdateData);
    }
    
    // Update leader_profiles subcollection
    const communityProfileRef = firestore.collection(`communities/${communityId}/leader_profiles`).doc(userId);
    const leaderProfileData: any = {
        ...restOfProfileData,
        lastUpdated: Timestamp.now(),
    };
     if (status) {
      leaderProfileData.profileStatus = status;
    }
    batch.set(communityProfileRef, leaderProfileData, { merge: true });
    
    if (status === 'pending') {
      const leaderApplicationRef = firestore.collection('leadership_applications').doc(userId);
      batch.set(leaderApplicationRef, {
        applicantId: userId,
        applicantName: leaderName,
        communityId: communityId,
        communityName: (await firestore.collection('communities').doc(communityId).get()).data()?.name || 'Unknown Community',
        status: 'Pending',
        createdAt: Timestamp.now()
      }, { merge: true });
    }
    
    await batch.commit();
    return { success: true };

  } catch (error: any) {
    console.error("Error saving leader profile:", error);
    return { success: false, error: error.message || "Failed to save profile." };
  }
}
