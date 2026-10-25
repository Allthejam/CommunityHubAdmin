
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { sendEmail } from './emailActions';

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
    
    let adminRecipients: { email?: string; name?: string }[] = [];
    let applicationCommunityName = 'Unknown Community';
    const applicantDisplayName = leaderName || userData?.name || [userData?.firstName, userData?.lastName].filter(Boolean).join(' ') || 'Applicant';

    if (status === 'pending') {
      const commDoc = await firestore.collection('communities').doc(communityId).get();
      applicationCommunityName = commDoc.data()?.name || 'Unknown Community';

      const leaderApplicationRef = firestore.collection('leadership_applications').doc(userId);
      batch.set(leaderApplicationRef, {
        applicantId: userId,
        applicantName: applicantDisplayName,
        communityId: communityId,
        communityName: applicationCommunityName,
        status: 'Pending',
        createdAt: Timestamp.now()
      }, { merge: true });

      const actionUrl = `/admin/applications/${userId}`;
      const notifSubject = `New Leadership Application: ${applicantDisplayName} (${applicationCommunityName})`;

      // 1. Always create the broadcast notification for platform administrators (Admin header bell listener)
      const platformNotifRef = firestore.collection('notifications').doc();
      batch.set(platformNotifRef, {
        recipientId: 'platform_admin',
        type: 'Leadership Application',
        subject: notifSubject,
        from: applicantDisplayName,
        date: Timestamp.now(),
        status: 'new',
        relatedId: userId,
        communityId: communityId,
        communityName: applicationCommunityName,
        actionUrl: actionUrl,
        targetApp: 'admin'
      });

      // 2. Discover all platform administrators across role, permissions, and accountType
      const adminMap = new Map<string, { id: string; email?: string; name?: string }>();
      try {
        const adminRoles = ['administrator', 'admin', 'owner', 'Administrator', 'Admin', 'Owner', 'superadmin'];
        const [roleSnap, permSnap, ownerSnap] = await Promise.all([
          firestore.collection('users').where('role', 'in', adminRoles).get(),
          firestore.collection('users').where('permissions.isAdmin', '==', true).get(),
          firestore.collection('users').where('accountType', '==', 'owner').get(),
        ]);

        [...roleSnap.docs, ...permSnap.docs, ...ownerSnap.docs].forEach(doc => {
          const d = doc.data();
          if (doc.id !== userId) {
            adminMap.set(doc.id, {
              id: doc.id,
              email: d.email,
              name: d.name || d.firstName || 'Administrator'
            });
          }
        });

        // 3. Create personalized notification record for each admin user
        adminMap.forEach((admin) => {
          const notificationRef = firestore.collection('notifications').doc();
          batch.set(notificationRef, {
            recipientId: admin.id,
            type: 'Leadership Application',
            subject: notifSubject,
            from: applicantDisplayName,
            date: Timestamp.now(),
            status: 'new',
            relatedId: userId,
            communityId: communityId,
            communityName: applicationCommunityName,
            actionUrl: actionUrl,
            targetApp: 'admin'
          });
        });

        adminRecipients = Array.from(adminMap.values());
      } catch (adminErr) {
        console.error('Error fetching admin users for notification:', adminErr);
      }
    }
    
    await batch.commit();

    // 4. Send email alert to administrators
    if (status === 'pending' && adminRecipients.length > 0) {
      const validEmailRecipients = adminRecipients
        .filter(a => a.email && typeof a.email === 'string' && a.email.includes('@'))
        .map(a => ({ email: a.email!, name: a.name }));

      if (validEmailRecipients.length > 0) {
        try {
          await sendEmail({
            to: validEmailRecipients,
            subject: `[Action Required] New Leadership Application: ${applicantDisplayName} (${applicationCommunityName})`,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
                <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 20px;">
                  <h2 style="color: #b45309; margin: 0 0 6px 0;">👑 New Leadership Application Received</h2>
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Platform Admin Alert &bull; Community Hub Governance</p>
                </div>
                <p style="font-size: 15px;">Hello Administrator,</p>
                <p style="font-size: 15px;">A new application for <strong>Community Leadership</strong> has been submitted and is waiting for your review.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 6px; overflow: hidden;">
                  <tbody>
                    <tr>
                      <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e5e7eb; width: 35%; color: #4b5563;">Applicant Name:</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; color: #111827;">${applicantDisplayName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Applicant Email:</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; color: #111827;">${userData?.email || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Target Community:</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; color: #111827;">${applicationCommunityName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; font-weight: bold; color: #4b5563;">Status:</td>
                      <td style="padding: 10px 14px; color: #b45309; font-weight: bold;">Pending Review</td>
                    </tr>
                  </tbody>
                </table>
                <div style="margin: 30px 0 20px 0; text-align: center;">
                  <a href="https://admin.my-community-hub.co.uk/admin/applications/${userId}" style="background-color: #f59e0b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
                    Open Application in Admin Console
                  </a>
                </div>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center;">
                  This automated alert was dispatched by the Community Hub Central Platform.
                </p>
              </div>
            `
          });
        } catch (emailErr) {
          console.error('Failed to send admin email alert:', emailErr);
        }
      }
    }

    return { success: true };

  } catch (error: any) {
    console.error("Error saving leader profile:", error);
    return { success: false, error: error.message || "Failed to save profile." };
  }
}
