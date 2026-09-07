
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { scanAndFlagAction } from "./moderationActions";

type ActionResponse = {
  success: boolean;
  error?: string;
  postId?: string;
};

type CreatePostParams = {
  authorId: string;
  content: string;
  image?: string | null;
};

export async function createPostAction(params: CreatePostParams): Promise<ActionResponse> {
  const { authorId, content, image } = params;

  if (!authorId || !content) {
    return { success: false, error: "Missing required fields (author or content)." };
  }

  try {
    const { firestore } = initializeAdminApp(); 

    const userRef = firestore.collection('users').doc(authorId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return { success: false, error: "Author not found." };
    }
    const userData = userDoc.data()!;
    const communityId = userData.communityId;
    const authorName = userData.name;
    const authorAvatar = userData.avatar || '';

    if (!communityId) {
      return { success: false, error: "Your account is not associated with a community." };
    }
    
    const postRef = firestore.collection(`communities/${communityId}/posts`).doc();
    
    const postData = {
      authorId,
      authorName,
      authorAvatar,
      content,
      image: image || null,
      communityId,
      status: 'active',
      createdAt: Timestamp.now(),
      likes: 0,
      commentCount: 0,
      likedBy: [],
    };
    
    await postRef.set(postData);

    // Moderation Scan - passing absolute path for reliable deletion
    await scanAndFlagAction({
        text: content,
        contentType: "Community Post",
        authorId,
        authorName,
        contentId: postRef.id,
        contentPath: postRef.path
    });
    
    return { success: true, postId: postRef.id };
  } catch (error: any) {
    console.error("Error creating post:", error);
    return { success: false, error: "A server error occurred while trying to create the post." };
  }
}

export async function likePostAction(params: {
  postId: string;
  userId: string;
  communityId: string;
}): Promise<ActionResponse> {
  const { postId, userId, communityId } = params;
  if (!postId || !userId || !communityId) {
    return { success: false, error: 'Missing required parameters.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const postRef = firestore.collection(`communities/${communityId}/posts`).doc(postId);

    await firestore.runTransaction(async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists) {
        throw new Error("Post not found.");
      }
      
      const postData = postDoc.data();
      const likedBy = postData?.likedBy || [];
      
      if (likedBy.includes(userId)) {
        transaction.update(postRef, {
          likes: FieldValue.increment(-1),
          likedBy: FieldValue.arrayRemove(userId)
        });
      } else {
        transaction.update(postRef, {
          likes: FieldValue.increment(1),
          likedBy: FieldValue.arrayUnion(userId)
        });
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error liking post:", error);
    return { success: false, error: 'Could not update like status.' };
  }
}

export async function updatePostAction(params: {
  postId: string;
  communityId: string;
  content: string;
}): Promise<ActionResponse> {
  const { postId, communityId, content } = params;
  if (!postId || !communityId || !content) {
    return { success: false, error: "Missing required fields." };
  }

  try {
    const { firestore } = initializeAdminApp();
    const postRef = firestore.collection(`communities/${communityId}/posts`).doc(postId);

    await postRef.update({
      content,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating post:", error);
    return { success: false, error: "Could not update post." };
  }
}
