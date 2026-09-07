'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  conversationId?: string;
  message?: string;
};

export async function findOrCreateChatForItem(params: {
  currentUserId: string;
  sellerId: string;
  itemId: string;
  itemTitle: string;
}): Promise<ActionResponse> {
  const { currentUserId, sellerId, itemId, itemTitle } = params;
  if (!currentUserId || !sellerId || !itemId || !itemTitle) {
    return { success: false, error: 'Missing required information.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const conversationsRef = firestore.collection('conversations');

    const query1 = conversationsRef
      .where('memberIds', '==', [currentUserId, sellerId])
      .where('scope', '==', 'private')
      .limit(1);

    const query2 = conversationsRef
      .where('memberIds', '==', [sellerId, currentUserId])
      .where('scope', '==', 'private')
      .limit(1);

    const [snapshot1, snapshot2] = await Promise.all([query1.get(), query2.get()]);
    const existingChat = snapshot1.docs[0] || snapshot2.docs[0];

    if (existingChat) {
      return { success: true, conversationId: existingChat.id };
    }

    const userRef = firestore.collection('users').doc(currentUserId);
    const sellerRef = firestore.collection('users').doc(sellerId);
    const [userDoc, sellerDoc] = await Promise.all([userRef.get(), sellerRef.get()]);

    if (!userDoc.exists || !sellerDoc.exists) {
      return { success: false, error: 'One or more users not found.' };
    }

    const userData = userDoc.data()!;
    const sellerData = sellerDoc.data()!;
    const communityId = sellerData.communityId;

    if (!communityId) {
        return { success: false, error: 'Seller is not associated with a community.' };
    }

    const newConversationData = {
      name: `${userData.name} / ${sellerData.name}`,
      memberIds: [currentUserId, sellerId],
      scope: 'private',
      communityId: communityId,
      lastMessage: `Inquiry about: ${itemTitle}`,
      lastMessageTimestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
      createdBy: currentUserId,
      archivedBy: [],
    };
    
    const newConvoRef = await conversationsRef.add(newConversationData);

    const initialMessage = {
      senderId: 'system',
      sender: 'System',
      text: `${userData.name} started a conversation with ${sellerData.name} about the marketplace item: "${itemTitle}".`,
      timestamp: Timestamp.now(),
    };
    await newConvoRef.collection('messages').add(initialMessage);

    return { success: true, conversationId: newConvoRef.id };

  } catch (error: any) {
    console.error("Error finding or creating chat:", error);
    return { success: false, error: "Could not initiate conversation." };
  }
}

export async function resetChats(): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const conversationsRef = firestore.collection('conversations');
    const conversationsSnapshot = await conversationsRef.get();

    if (conversationsSnapshot.empty) {
        return { success: true, message: "No conversations found to delete." };
    }
    
    let convoCount = 0;
    for (const convoDoc of conversationsSnapshot.docs) {
        const messagesRef = convoDoc.ref.collection('messages');
        const messagesSnapshot = await messagesRef.get();
        if (!messagesSnapshot.empty) {
            const batch = firestore.batch();
            messagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        await convoDoc.ref.delete();
        convoCount++;
    }

    return { success: true, message: `Successfully deleted ${convoCount} conversation(s).` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Performs raw network and API diagnostics to bypass library-level errors.
 */
export async function debugAdmin(): Promise<ActionResponse> {
  const keys = ['GOOGLE_GENAI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_API_KEY'];
  let activeKeyName = "";
  let apiKey = "";

  keys.forEach(k => {
    if (process.env[k]) {
      apiKey = process.env[k]!;
      activeKeyName = k;
    }
  });

  if (!apiKey) {
    return { success: false, error: "No AI API key found in environment variables. Ensure GOOGLE_GENAI_API_KEY is set in your project settings." };
  }

  // 1. Raw Network Test (google.com)
  let netStatus = "FAILED";
  try {
    const res = await fetch('https://www.google.com', { method: 'HEAD' });
    if (res.ok) netStatus = "PASSED";
  } catch (e: any) {
    netStatus = `FAILED (${e.message})`;
  }

  // 2. Raw API Test (Listing models is the most reliable "ping")
  let apiStatus = "FAILED";
  let apiDetail = "";
  try {
    // We use the general models endpoint to verify the key and model visibility
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const apiRes = await fetch(endpoint);
    const data = await apiRes.json();
    
    if (apiRes.ok) {
      apiStatus = "PASSED";
      const modelNames = data.models?.map((m: any) => m.name.replace('models/', '')).slice(0, 5).join(', ');
      apiDetail = `Authorized. Available models include: ${modelNames}...`;
    } else {
      apiStatus = `FAILED (HTTP ${apiRes.status})`;
      apiDetail = data.error?.message || JSON.stringify(data);
    }
  } catch (e: any) {
    apiStatus = `FAILED (${e.message})`;
  }

  const message = `
    Key Detected: ${activeKeyName} (${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)})
    Network Connectivity: ${netStatus}
    API Authorization: ${apiStatus}
    API Detail: ${apiDetail}
  `.trim();

  return { 
    success: apiStatus === "PASSED", 
    message: message,
    error: apiStatus !== "PASSED" ? "The API key is found but cannot authorize model requests." : undefined
  };
}
