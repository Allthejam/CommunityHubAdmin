'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { addCommentAction } from '@/lib/actions/commentActions';
import { Skeleton } from './ui/skeleton';

type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: { toDate: () => Date };
};

export function CommentSheet({ postId, communityId }: { postId: string; communityId: string }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [newComment, setNewComment] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const commentsQuery = useMemoFirebase(() => {
    if (!postId || !db) return null;
    return query(
      collection(db, `communities/${communityId}/posts/${postId}/comments`),
      orderBy('createdAt', 'asc')
    );
  }, [postId, communityId, db]);

  const { data: comments, isLoading } = useCollection<Comment>(commentsQuery);
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !userProfile) return;
    setIsSubmitting(true);
    try {
      const result = await addCommentAction({
        postId,
        communityId,
        authorId: user.uid,
        authorName: userProfile.name,
        authorAvatar: userProfile.avatar || '',
        text: newComment,
      });
      if (result.success) setNewComment('');
      else throw new Error(result.error);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Could not post comment.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-6 -mx-6">
        <div className="space-y-6 pr-6">
          {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
          ) : comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 text-sm">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.authorAvatar} />
                    <AvatarFallback>{comment.authorName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-bold">{comment.authorName} <span className="text-[10px] font-normal text-muted-foreground ml-2">{formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })}</span></p>
                    <p className="text-muted-foreground">{comment.text}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8 italic">No comments yet.</p>
          )}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4 bg-background">
        <form onSubmit={handleAddComment} className="flex items-center gap-2">
          <Input
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
          />
          <Button type="submit" size="icon" disabled={isSubmitting || !newComment.trim()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}