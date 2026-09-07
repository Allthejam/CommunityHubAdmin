
'use client';

import * as React from 'react';
import { Calendar, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";

export function EventsCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const communityId = userProfile?.communityId;

    const eventsQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(
            collection(db, 'events'), 
            where('communityId', '==', communityId),
            where('status', 'in', ['Live', 'Upcoming'])
        );
    }, [communityId, db]);

    const { data: events, isLoading: eventsLoading } = useCollection(eventsQuery);

    const loading = profileLoading || eventsLoading;

    const liveCount = React.useMemo(() => {
        if (!events) return 0;
        return events.filter(e => e.status === 'Live').length;
    }, [events]);

    const upcomingCount = React.useMemo(() => {
        if (!events) return 0;
        return events.filter(e => e.status === 'Upcoming').length;
    }, [events]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar /> Upcoming Events</CardTitle>
                <CardDescription>Events happening soon.</CardDescription>
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
                             <p className="text-3xl font-bold">{upcomingCount}</p>
                            <p className="text-sm text-muted-foreground">Upcoming</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
