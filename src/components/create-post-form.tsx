'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createPostAction } from '@/lib/actions/postActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Image as ImageIcon, Send } from 'lucide-react';

export default function CreatePostForm() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [content, setContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const result = await createPostAction({
        authorId: user.uid,
        content: content.trim(),
      });

      if (result.success) {
        setContent('');
        toast({ title: "Post shared!", description: "Your update is now visible in the community feed." });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to share post.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
              <AvatarFallback>{userProfile?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <Textarea
              placeholder={`What's happening in ${userProfile?.communityName || 'your community'}?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-none focus-visible:ring-0 p-0 text-lg"
            />
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                <ImageIcon className="mr-2 h-4 w-4" />
                Add Image
            </Button>
            <Button type="submit" disabled={!content.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Post
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
