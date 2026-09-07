
'use client';

import * as React from 'react';
import { Newspaper, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { Button } from '../ui/button';
import Link from 'next/link';

type NewsStory = {
    id: string;
    title: string;
    author: string;
}

export function NewsCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const communityId = userProfile?.communityId;

    const newsQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(
            collection(db, 'news'), 
            where('communityId', '==', communityId),
            where('status', '==', 'Pending Approval')
        );
    }, [communityId, db]);

    const { data: pendingNews, isLoading: newsLoading } = useCollection<NewsStory>(newsQuery);

    const loading = profileLoading || newsLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Newspaper /> News Queue</CardTitle>
                <CardDescription>Articles pending your approval.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-3xl font-bold">{pendingNews?.length || 0}</p>
                        <div className="text-sm text-muted-foreground space-y-2">
                            {pendingNews && pendingNews.length > 0 ? (
                                pendingNews.slice(0, 3).map(story => (
                                    <div key={story.id} className="flex justify-between items-center">
                                        <div className="truncate">
                                            <p className="font-medium truncate">{story.title}</p>
                                            <p className="text-xs">by {story.author}</p>
                                        </div>
                                        <Button asChild variant="secondary" size="sm">
                                            <Link href="/leader/news">Review</Link>
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p>No news stories are pending approval.</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

