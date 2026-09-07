
"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    Shield,
    Building,
    Mail,
    Phone,
    Printer,
    Check,
    X,
    BadgeCheck,
    AlertCircle,
    MapPin,
    User,
    FileText,
    Ban,
    RefreshCw,
    Trash2,
    Globe,
    Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { doc, collection, writeBatch, getDocs, query, where, limit } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DetailRow = ({ label, value }: { label: string; value?: string | React.ReactNode }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 border-b last:border-0 items-start">
        <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
        <dd className="sm:col-span-2 text-sm text-foreground">{value || 'Not provided'}</dd>
    </div>
);

type ApplicationStatus = "Pending Leader Review" | "Pending Admin Verification" | "Approved" | "Declined" | "Suspended";

export default function PoliceApplicationDetailView() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const db = useFirestore();
    const { applicationId } = params;

    const [isProcessing, setIsProcessing] = React.useState(false);
    const [notes, setNotes] = React.useState("");
    
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const appRef = useMemoFirebase(() => (applicationId && db ? doc(db, 'liaison_applications', applicationId as string) : null), [applicationId, db]);
    const { data: appData, isLoading } = useDoc<any>(appRef);

    const handleAction = async (status: ApplicationStatus) => {
        if (!db || !appData || !user || !userProfile) return;
        
        setIsProcessing(true);
        try {
            const batch = writeBatch(db);
            const now = new Date();
            const adminName = userProfile.name || user.email || "Administrator";
            
            // 1. Update Application status
            const applicationRef = doc(db, 'liaison_applications', applicationId as string);
            batch.update(applicationRef, {
                status,
                processedBy: adminName,
                processedAt: now,
                processingNotes: notes,
            });

            // 2. Handle User role and permissions
            if (!appData.applicantId) {
                throw new Error("Applicant User ID is missing. Cannot update permissions.");
            }
            const targetUserRef = doc(db, 'users', appData.applicantId);

            if (status === 'Approved') {
                batch.update(targetUserRef, {
                    role: 'police_liaison',
                    title: 'Verified Police Liaison',
                    'permissions.hasBroadcastAccess': true,
                    isVerifiedLiaison: true,
                });
            } else {
                // For Suspension or Removal (Declined) or Reversion
                batch.update(targetUserRef, {
                    role: 'personal',
                    title: 'Personal',
                    'permissions.hasBroadcastAccess': false,
                    isVerifiedLiaison: false,
                });
            }

            // 3. Notify Officer
            const officerNotificationRef = doc(collection(db, 'notifications'));
            let officerSubject = `Updates to your Police Liaison application`;
            if (status === 'Approved') officerSubject = `Your Police Liaison application was approved!`;
            if (status === 'Suspended') officerSubject = `Your Police Liaison access has been suspended.`;
            if (status === 'Declined') officerSubject = `Your Police Liaison credentials have been removed.`;

            batch.set(officerNotificationRef, {
                recipientId: appData.applicantId,
                type: 'Account Update',
                subject: officerSubject,
                from: 'Platform Administration',
                date: now.toISOString(),
                status: 'new',
                relatedId: applicationId,
            });

            // 4. Notify Community Leader (of Removal or Suspension)
            if (status === 'Suspended' || status === 'Declined') {
                const leadersQuery = query(
                    collection(db, 'users'),
                    where('communityId', '==', appData.communityId),
                    where('role', 'in', ['president', 'leader']),
                    limit(1)
                );
                const leadersSnap = await getDocs(leadersQuery);
                if (!leadersSnap.empty) {
                    const leaderId = leadersSnap.docs[0].id;
                    const leaderNotificationRef = doc(collection(db, 'notifications'));
                    batch.set(leaderNotificationRef, {
                        recipientId: leaderId,
                        type: 'Account Update',
                        subject: `Liaison Status Changed: ${appData.applicantName}`,
                        from: 'Platform Administration',
                        date: now.toISOString(),
                        status: 'new',
                        relatedId: applicationId,
                        details: { 
                            message: `The police liaison status for ${appData.applicantName} in your community has been set to ${status}.` 
                        }
                    });
                }
            }

            // 5. Create Audit Log Entry
            const logRef = doc(collection(db, 'audit_log'));
            batch.set(logRef, {
                adminId: user.uid,
                adminNameSnapshot: adminName,
                action: `police_liaison_${status.toLowerCase().replace(/ /g, '_')}`,
                details: `Action: ${status}. Officer: ${appData.applicantName}. Notes: ${notes || "None."}`,
                timestamp: now,
                targetUser: {
                    id: appData.applicantId,
                    name: appData.applicantName
                }
            });

            await batch.commit();
            toast({ title: `Action Completed`, description: `The application has been moved to ${status}.` });
            router.push('/admin/applications/police-liaison');

        } catch (error: any) {
            console.error("Failed to process application:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!appData) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Application Not Found</h1>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/admin/applications/police-liaison">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center print:hidden">
                <Button asChild variant="ghost">
                    <Link href="/admin/applications/police-liaison">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print Vetting Doc
                    </Button>
                </div>
            </div>

            <Card className="border-2 shadow-lg">
                <CardHeader className={cn(
                    "border-b text-center py-10",
                    appData.status === 'Approved' ? "bg-green-50" : 
                    appData.status === 'Pending Admin Verification' ? "bg-purple-50" : "bg-primary/5"
                )}>
                    <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="text-3xl font-bold">Police Liaison Vetting</CardTitle>
                    <CardDescription>Official verification of regional law enforcement credentials</CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 space-y-10">
                    <div className="flex justify-end">
                        <Badge variant="outline" className="text-lg px-4 py-1">
                            Current Status: {appData.status}
                        </Badge>
                    </div>

                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary">
                            <BadgeCheck className="h-5 w-5" /> Professional Identification
                        </h2>
                        <dl className="rounded-lg border p-4 bg-muted/20">
                            <DetailRow label="Officer Full Name" value={appData.applicantName} />
                            <DetailRow label="Rank / Title" value={appData.applicantTitle} />
                            <DetailRow label="Officer ID (UID)" value={<span className="font-mono text-xs">{appData.applicantId}</span>} />
                        </dl>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary">
                            <Globe className="h-5 w-5" /> Geographic Jurisdiction
                        </h2>
                        <dl className="rounded-lg border p-4 bg-muted/20">
                            <DetailRow label="Country" value={appData.country} />
                            <DetailRow label="State / Constituent" value={appData.state} />
                            <DetailRow label="Region / County" value={appData.region} />
                            <DetailRow label="Primary Community" value={appData.communityName} />
                        </dl>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary">
                            <Building className="h-5 w-5" /> Station Details
                        </h2>
                        <dl className="rounded-lg border p-4 bg-muted/20">
                            <DetailRow label="Station Name" value={appData.stationName} />
                            <DetailRow label="Station Address" value={appData.stationAddress} />
                            <DetailRow label="Station Contact" value={appData.stationPhoneNumber} />
                        </dl>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary">
                            <User className="h-5 w-5" /> Professional Reference
                        </h2>
                        <dl className="rounded-lg border p-4 bg-muted/20">
                            <DetailRow label="Reference Name" value={appData.referenceName} />
                            <DetailRow label="Reference Title" value={appData.referenceTitle} />
                        </dl>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary">
                            <FileText className="h-5 w-5" /> Application Justification
                        </h2>
                        <div className="rounded-lg border p-6 bg-muted/20 italic text-sm">
                            {appData.justification || "No justification provided."}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-amber-600">
                            <Scale className="h-5 w-5" /> Leader Endorsement
                        </h2>
                        <div className="rounded-lg border p-6 bg-amber-50/50 border-amber-100">
                            <Label className="text-xs font-bold text-amber-800 uppercase mb-2 block">Community Leader Verification Note</Label>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                {appData.leaderNotes || "No verification notes provided by the community leader."}
                            </p>
                        </div>
                    </section>

                    <div className="space-y-4 pt-6 border-t">
                        <h2 className="text-lg font-bold text-primary">Admin Vetting Process</h2>
                        <div className="space-y-2">
                            <Label htmlFor="vetting-notes">Internal Processing Notes</Label>
                            <Textarea 
                                id="vetting-notes"
                                placeholder="Describe the steps taken to verify this officer's identity or the reasons for the current status change..."
                                className="min-h-[120px]"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">These notes will be recorded in the permanent audit log and the officer's record.</p>
                        </div>
                    </div>

                    {appData.processingNotes && (
                        <section className="space-y-4 pt-6 border-t">
                            <h2 className="text-lg font-bold text-primary">Previous Vetting Records</h2>
                            <div className="rounded-lg border p-4 bg-primary/5">
                                <p className="text-sm font-semibold mb-2">Most Recent Notes:</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{appData.processingNotes}</p>
                            </div>
                        </section>
                    )}

                    <Alert className="border-primary/20 bg-primary/5">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Administrative Oversight</AlertTitle>
                        <AlertDescription>
                            Modifying liaison status directly impacts an officer's ability to broadcast emergency alerts. All actions are logged.
                        </AlertDescription>
                    </Alert>
                </CardContent>

                <CardFooter className="bg-muted/30 border-t p-6 flex flex-wrap justify-end gap-4 print:hidden">
                    {appData.status === 'Pending Admin Verification' && (
                        <>
                            <Button variant="destructive" onClick={() => handleAction('Declined')} disabled={isProcessing}>
                                <X className="mr-2 h-4 w-4" /> Decline Application
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction('Approved')} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                Final Approve & Grant Access
                            </Button>
                        </>
                    )}

                    {appData.status === 'Approved' && (
                        <>
                            <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleAction('Suspended')} disabled={isProcessing}>
                                <Ban className="mr-2 h-4 w-4" /> Suspend Liaison Access
                            </Button>
                            <Button variant="destructive" onClick={() => handleAction('Declined')} disabled={isProcessing}>
                                <Trash2 className="mr-2 h-4 w-4" /> Remove Liaison Credentials
                            </Button>
                        </>
                    )}

                    {(appData.status === 'Suspended' || appData.status === 'Declined' || appData.status === 'Pending Leader Review') && (
                        <>
                            <Button variant="outline" onClick={() => handleAction('Pending Admin Verification')} disabled={isProcessing}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Reset to Verification Queue
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction('Approved')} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Restore & Re-Approve Access
                            </Button>
                        </>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
