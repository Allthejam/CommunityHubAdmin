'use client';

import * as React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, Share2, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { likePostAction } from '@/lib/actions/postActions';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CommentSheet } from './comment-sheet';

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  image?: string | null;
  createdAt: any;
  likes: number;
  commentCount: number;
  likedBy: string[];
  communityId: string;
};

export default function PostCard({ post }: { post: Post }) {
  const { user } = useUser();
  const isLiked = user ? post.likedBy?.includes(user.uid) : false;

  const handleLike = async () => {
    if (!user) return;
    await likePostAction({
      postId: post.id,
      userId: user.uid,
      communityId: post.communityId,
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-4 p-4 space-y-0">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={post.authorAvatar} alt={post.authorName} />
          <AvatarFallback>{post.authorName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{post.authorName}</p>
          <p className="text-xs text-muted-foreground uppercase font-black tracking-tighter">Community Member</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pb-4 whitespace-pre-wrap text-sm leading-relaxed">
          {post.content}
        </div>
        {post.image && (
          <div className="relative aspect-video w-full bg-muted">
            <Image src={post.image} alt="Post image" fill className="object-cover" />
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 px-4 flex justify-between border-t bg-muted/5">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className={cn("gap-2 px-2", isLiked && "text-primary")} onClick={handleLike}>
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
            <span className="text-xs font-bold">{post.likes || 0}</span>
          </Button>
          
          <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs font-bold">{post.commentCount || 0}</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-md p-0">
                <SheetHeader className="p-6 pb-2 border-b">
                    <SheetTitle>Comments</SheetTitle>
                </SheetHeader>
                <CommentSheet postId={post.id} communityId={post.communityId} />
            </SheetContent>
          </Sheet>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Share2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
