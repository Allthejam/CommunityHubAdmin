
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type CommunityProfile = {
  headline?: string;
  introduction?: string;
  mainContent?: string;
  bannerImage?: string;
  bannerImageDescription?: string;
  imageOne?: string;
  imageOneDescription?: string;
  imageTwo?: string;
  imageTwoDescription?: string;
  area?: string;
  mapEmbedCode?: string;
  population?: string;
  yearEstablished?: string;
  metaTitle?: string;
  metaDescription?: string;
  usefulInformation?: { name: string; number: string; address: string }[];
};

export async function updateCommunityProfileAction(params: {
  communityId: string;
  data: CommunityProfile;
}): Promise<ActionResponse> {
  const { communityId, data } = params;
  if (!communityId) {
    return { success: false, error: 'Community ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const communityRef = firestore.collection('communities').doc(communityId);
    
    const communitySnap = await communityRef.get();
    
    if (!communitySnap.exists) {
        return { success: false, error: 'Community not found.' };
    }

    const communityData = communitySnap.data();
    let profileId = communityData?.profileId;

    // If no profileId exists, create one.
    if (!profileId) {
        // We can use the communityId as the profileId for consistency.
        profileId = communityId;
        
        // Atomically update the community doc with the new profileId
        // and create the new profile document.
        const profileRef = firestore.collection('community_profiles').doc(profileId);
        
        const batch = firestore.batch();
        batch.update(communityRef, { profileId: profileId });
        batch.set(profileRef, data);
        
        await batch.commit();

    } else {
        // If profileId exists, just update the profile document.
        const profileRef = firestore.collection('community_profiles').doc(profileId);
        await profileRef.set(data, { merge: true });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating community profile:', error);
    return { success: false, error: error.message || 'Failed to update profile.' };
  }
}
