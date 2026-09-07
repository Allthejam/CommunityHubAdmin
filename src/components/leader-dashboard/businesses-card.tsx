
'use client';

import * as React from 'react';
import { Building2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";

export function BusinessesCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const communityId = userProfile?.communityId;

    const businessesQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(collection(db, 'businesses'), where('primaryCommunityId', '==', communityId));
    }, [communityId, db]);

    const { data: businesses, isLoading: businessesLoading } = useCollection(businessesQuery);

    const loading = profileLoading || businessesLoading;

    const liveCount = React.useMemo(() => {
        if (!businesses) return 0;
        return businesses.filter(b => b.status === 'Approved' || b.status === 'Subscribed').length;
    }, [businesses]);

    const pendingCount = React.useMemo(() => {
        if (!businesses) return 0;
        return businesses.filter(b => b.status === 'Pending Approval').length;
    }, [businesses]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 /> Businesses</CardTitle>
                <CardDescription>Live and pending businesses in your community.</CardDescription>
            </CardHeader>
            <CardContent>
                 {loading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{liveCount}</p>
                            <p className="text-sm text-muted-foreground">Live</p>
                        </div>
                        <div className="text-center">
                             <p className="text-3xl font-bold">{pendingCount}</p>
                            <p className="text-sm text-muted-foreground">Pending</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
