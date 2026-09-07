
'use client';

import * as React from 'react';
import { FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { Button } from '../ui/button';
import Link from 'next/link';

type Report = {
  id: string;
  subject: string;
  reporterName: string;
};

export function ReportsCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const communityId = userProfile?.communityId;

    const reportsQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(
            collection(db, 'community_reports'),
            where('communityId', '==', communityId),
            where('status', '==', 'New')
        );
    }, [communityId, db]);

    const { data: newReports, isLoading: reportsLoading } = useCollection<Report>(reportsQuery);

    const loading = profileLoading || reportsLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> Recent Reports</CardTitle>
                <CardDescription>New reports from your community.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-3xl font-bold">{newReports?.length || 0}</p>
                        <div className="text-sm text-muted-foreground space-y-2">
                            {newReports && newReports.length > 0 ? (
                                newReports.slice(0, 2).map(report => (
                                    <div key={report.id} className="flex justify-between items-center">
                                        <div className="truncate">
                                            <p className="font-medium truncate">{report.subject}</p>
                                            <p className="text-xs">by {report.reporterName}</p>
                                        </div>
                                        <Button asChild variant="secondary" size="sm">
                                            <Link href="/leader/reports">Review</Link>
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p>No new reports to review.</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
