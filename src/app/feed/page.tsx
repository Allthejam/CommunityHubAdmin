'use client';

import * as React from 'react';
import CreatePostForm from '@/components/create-post-form';
import PostCard from '@/components/post-card';
import { type Post } from '@/components/post-card';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import EmergencyAlert from '@/components/emergency-alert';
import { type Announcement } from '@/lib/announcement-data';
import { filterAnnouncementsForUser } from '@/lib/announcement-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NationalAdvertisers } from '@/components/national-advertisers';

/**
 * Community Feed Page
 * Consolidated to top-level to resolve parallel route conflicts with (main)/feed.
 */
export default function FeedPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const postsQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) return null;
    return query(
      collection(db, `communities/${userProfile.communityId}/posts`),
      orderBy('createdAt', 'desc')
    );
  }, [userProfile?.communityId, db]);

  const { data: postsData, isLoading: postsLoading } = useCollection(postsQuery);
  
  const platformAnnouncementsQuery = useMemoFirebase(() => {
      if (!db) return null;
      return query(
          collection(db, "announcements"), 
          where("scope", "==", "platform"),
          where("status", "==", "Live")
      );
  }, [db]);
  const { data: platformAnnouncementsData, isLoading: platformLoading } = useCollection<Announcement>(platformAnnouncementsQuery);

  const communityAnnouncementsQuery = useMemoFirebase(() => {
      if (!db || !userProfile?.communityId) return null;
      return query(
          collection(db, "announcements"), 
          where("scope", "==", "community"),
          where("communityId", "==", userProfile.communityId),
          where("status", "==", "Live")
      );
  }, [db, userProfile?.communityId]);
  const { data: communityAnnouncementsData, isLoading: communityLoading } = useCollection<Announcement>(communityAnnouncementsQuery);

  const posts: Post[] = (postsData || []).map(post => ({
    ...post,
    id: post.id,
    author: post.authorName,
    authorAvatar: post.authorAvatar,
    timestamp: post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'just now',
    image: post.image || null,
    likedBy: post.likedBy || [],
    communityId: post.communityId,
    commentCount: post.commentCount || 0,
  }));

  // Combine and apply inclusive audience filtering
  const allAnnouncementsRaw = [...(platformAnnouncementsData || []), ...(communityAnnouncementsData || [])];
  const allAnnouncements = React.useMemo(() => {
    if (!userProfile) return [];
    return filterAnnouncementsForUser(allAnnouncementsRaw, userProfile);
  }, [allAnnouncementsRaw, userProfile]);
  
  const mailingLists = (userProfile as any)?.mailingLists || {};
  const showEmergency = mailingLists.emergency !== false;

  const emergencyBroadcasts = showEmergency 
    ? allAnnouncements.filter(a => a.type === "Emergency") 
    : [];

  const loading = isUserLoading || profileLoading || postsLoading || platformLoading || communityLoading;

  return (
    <div className="space-y-6 container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <aside className="hidden lg:block lg:col-span-1 lg:sticky lg:top-24 space-y-6">
          <NationalAdvertisers />
           <Card>
            <CardHeader>
              <CardTitle>Community Hub</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Stay connected with local updates and neighboring hub activities.</p>
            </CardContent>
          </Card>
        </aside>

        <div className="lg:col-span-2 space-y-6">
          <div className="lg:hidden">
            <EmergencyAlert allBroadcasts={emergencyBroadcasts} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-headline">
            Community Feed
          </h1>
          <CreatePostForm />
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : posts && posts.length > 0 ? (
              posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                <h3 className="text-lg font-semibold">No posts yet</h3>
                <p className="text-muted-foreground">Be the first to share something with your community!</p>
              </div>
            )}
          </div>
        </div>

        <aside className="hidden lg:block lg:col-span-1 lg:sticky lg:top-24 space-y-6">
           <EmergencyAlert allBroadcasts={emergencyBroadcasts} />
           <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h3 className="font-bold text-lg mb-2 uppercase tracking-tighter text-primary">Regional Activity</h3>
            <p className="text-xs text-muted-foreground italic">Targeted broadcasts appearing here are restricted to verified residents of this jurisdiction.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
