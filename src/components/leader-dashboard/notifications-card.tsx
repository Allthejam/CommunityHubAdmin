
'use client';

import * as React from 'react';
import { Bell, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Button } from '../ui/button';
import Link from 'next/link';

type Notification = {
  id: string;
  subject: string;
  from: string;
};

export function NotificationsCard() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();

    const notificationsQuery = useMemoFirebase(() => {
        if (!user || !db) return null;
        return query(
            collection(db, 'notifications'), 
            where('recipientId', '==', user.uid),
            where('status', '==', 'new')
        );
    }, [user, db]);

    const { data: newNotifications, isLoading: notificationsLoading } = useCollection<Notification>(notificationsQuery);

    const loading = isUserLoading || notificationsLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell /> Notifications</CardTitle>
                <CardDescription>Your latest alerts and updates.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-3xl font-bold">{newNotifications?.length || 0}</p>
                        <div className="text-sm text-muted-foreground space-y-2">
                            {newNotifications && newNotifications.length > 0 ? (
                                newNotifications.slice(0, 2).map(notif => (
                                    <div key={notif.id} className="flex justify-between items-center">
                                        <div className="truncate">
                                            <p className="font-medium truncate">{notif.subject}</p>
                                            <p className="text-xs">From: {notif.from}</p>
                                        </div>
                                        <Button asChild variant="secondary" size="sm">
                                            <Link href="/leader/notifications">Review</Link>
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p>No new notifications.</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
