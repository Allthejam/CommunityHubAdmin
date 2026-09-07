'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { scanAndFlagAction } from "./moderationActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type AddCommentParams = {
  postId: string;
  communityId?: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
};

export async function addCommentAction(params: AddCommentParams): Promise<ActionResponse> {
  const { postId, communityId, authorId, authorName, authorAvatar, text } = params;

  if (!postId || !authorId || !text || !communityId) {
    return { success: false, error: "Missing required fields." };
  }

  try {
    const { firestore } = initializeAdminApp();
    
    const postRef = firestore.collection(`communities/${communityId}/posts`).doc(postId);
    const postDocForCheck = await postRef.get();
    if (!postDocForCheck.exists) {
        throw new Error("Post not found.");
    }
    
    const commentRef = postRef.collection('comments').doc();

    await firestore.runTransaction(async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists) {
        throw new Error("Post not found during transaction.");
      }

      // Add the new comment
      transaction.set(commentRef, {
        authorId,
        authorName,
        authorAvatar,
        text,
        createdAt: Timestamp.now(),
      });

      // Increment the comment count on the post
      transaction.update(postRef, {
        commentCount: FieldValue.increment(1),
      });
    });

    // Moderation Scan - passing absolute path
    await scanAndFlagAction({
        text,
        contentType: "Post Comment",
        authorId,
        authorName,
        contentId: commentRef.id,
        contentPath: commentRef.path
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding comment:", error);
    return { success: false, error: error.message || "Failed to add comment." };
  }
}