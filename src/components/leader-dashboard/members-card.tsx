
'use client';

import * as React from 'react';
import { Users, UserPlus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, Timestamp } from "firebase/firestore";
import { subDays } from "date-fns";

export function MembersCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const communityId = userProfile?.communityId;

    const membersQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(collection(db, 'users'), where('memberOf', 'array-contains', communityId));
    }, [communityId, db]);

    const { data: members, isLoading: membersLoading } = useCollection(membersQuery);

    const loading = profileLoading || membersLoading;

    const newMembersCount = React.useMemo(() => {
        if (!members) return 0;
        const sevenDaysAgo = subDays(new Date(), 7);
        return members.filter(member => {
            const joinedDate = (member.joined as Timestamp)?.toDate();
            return joinedDate && joinedDate >= sevenDaysAgo;
        }).length;
    }, [members]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> Members</CardTitle>
                <CardDescription>An overview of your community members.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{members?.length || 0}</p>
                            <p className="text-sm text-muted-foreground">Current</p>
                        </div>
                        <div className="text-center">
                             <p className="text-3xl font-bold">{newMembersCount}</p>
                            <p className="text-sm text-muted-foreground">New (Last 7d)</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
