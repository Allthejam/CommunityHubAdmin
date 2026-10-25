
"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    Loader2,
    User,
    Building,
    Mail,
    Phone,
    Printer,
    Check,
    X,
    MapPin,
    Crown,
    Ban,
    ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { doc, getDoc, updateDoc, writeBatch, collection, getDocs, where, query, deleteField, addDoc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { logAuditTrailAction } from "@/lib/actions/auditActions";

const ApplicationDetail = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 items-start border-b last:border-0">
        <dt className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{label}</dt>
        <dd className="sm:col-span-2 text-sm">{children || value || 'Not Provided'}</dd>
    </div>
);


export default function ApplicationViewPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const db = useFirestore();
    const { applicationId } = params;

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const [applicantData, setApplicantData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [isProcessing, setIsProcessing] = React.useState(false);

    React.useEffect(() => {
        if (!applicationId || !db) return;

        const fetchApplicationData = async () => {
            setLoading(true);
            try {
                // 1. Fetch the application document by its document ID
                const applicationRef = doc(db, 'leadership_applications', applicationId as string);
                const applicationSnap = await getDoc(applicationRef);
                
                if (!applicationSnap.exists()) {
                    throw new Error("Application record not found.");
                }
                const appData = applicationSnap.data();
                const applicantId = appData.applicantId;

                if (!applicantId) {
                    throw new Error("Missing applicant ID in the record.");
                }

                // 2. Fetch the User profile using the ID from the application
                const userRef = doc(db, 'users', applicantId);
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) {
                    throw new Error("Applicant user profile not found.");
                }
                const userData = userSnap.data();

                const communityId = userData.homeCommunityId || userData.communityId || appData.communityId;
                if (!communityId) {
                    throw new Error("Applicant's community not found.");
                }
                
                // 3. Fetch Community details
                const communityRef = doc(db, 'communities', communityId);
                const communitySnap = await getDoc(communityRef);
                const communityData = communitySnap.exists() ? communitySnap.data() : null;

                // 4. Try to fetch the specific leader profile if it exists
                const profileRef = doc(db, `communities/${communityId}/leader_profiles`, applicantId);
                const profileRefSnap = await getDoc(profileRef);

                setApplicantData({
                    ...userData,
                    ...(profileRefSnap.exists() && profileRefSnap.data()),
                    ...appData,
                    applicantId: applicantId, // Ensure we have the user UID
                    displayName: userData.name || appData.applicantName || 'Unknown Applicant',
                    communityName: communityData?.name || appData.communityName || 'Unknown Community',
                    communityCountry: communityData?.country || 'N/A',
                    communityState: communityData?.state || 'N/A',
                    communityRegion: communityData?.region || 'N/A',
                    appId: applicationId,
                    communityId: communityId,
                });

            } catch (error: any) {
                console.error("Failed to fetch application data:", error);
                toast({ variant: 'destructive', title: "Error", description: error.message });
            } finally {
                setLoading(false);
            }
        };

        fetchApplicationData();
    }, [applicationId, db, toast]);
    
        const [isRevokeDialogOpen, setIsRevokeDialogOpen] = React.useState(false);
    const [revocationReason, setRevocationReason] = React.useState('');

    const handleRevokeLeadership = async () => {
        if (!applicantData || !userProfile || !db) return;
        setIsProcessing(true);
        const now = new Date();

        try {
            const batch = writeBatch(db);

            // 1. Update application record with full audit metadata
            const appRef = doc(db, 'leadership_applications', applicantData.appId);
            batch.update(appRef, {
                status: 'Archived',
                revokedAt: now,
                revokedBy: userProfile.name || 'Platform Administrator',
                revokedById: user?.uid,
                revocationReason: revocationReason.trim() || 'Leadership revoked by platform administrator',
                updatedAt: now
            });

            // 2. Return community back to inactive status & reset leader count
            const communityRef = doc(db, 'communities', applicantData.communityId);
            batch.set(communityRef, {
                status: 'inactive',
                leaderCount: 0,
                updatedAt: now
            }, { merge: true });

            // 3. Reset user role to personal
            const userRef = doc(db, 'users', applicantData.applicantId);
            batch.update(userRef, {
                role: 'personal',
                title: 'Personal',
                'permissions.isLeader': false,
                [`communityRoles.${applicantData.communityId}`]: deleteField()
            });

            // 4. Update community leader profile subcollection
            const leaderProfileRef = doc(db, `communities/${applicantData.communityId}/leader_profiles`, applicantData.applicantId);
            batch.set(leaderProfileRef, {
                profileStatus: 'revoked',
                revokedAt: now,
                lastUpdated: now
            }, { merge: true });

            // 5. Send notification to user
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
                recipientId: applicantData.applicantId,
                type: 'Leadership Application',
                subject: `Leadership Status Update: Leadership role revoked for ${applicantData.communityName}`,
                from: "Platform Administration",
                date: now,
                status: 'new',
                relatedId: applicantData.communityId,
            });

            await batch.commit();

            // 6. Record forensic audit log
            const auditEntry = {
                adminId: user?.uid || 'system_admin',
                adminName: userProfile.name || 'Platform Administrator',
                adminEmail: user?.email || '',
                action: 'leadership_application_revoked',
                category: 'Applications & Vetting' as const,
                details: `Revoked leadership for ${applicantData.displayName} in community "${applicantData.communityName}". Community returned to inactive status. Reason: ${revocationReason.trim() || 'Administrative revocation'}.`,
                timestamp: now,
                targetUser: {
                    id: applicantData.applicantId,
                    name: applicantData.displayName,
                    email: applicantData.email || ''
                },
                targetObject: {
                    id: applicantData.communityId,
                    name: applicantData.communityName,
                    type: 'Community Hub'
                },
                metadata: {
                    applicationId: applicantData.appId,
                    communityId: applicantData.communityId,
                    reason: revocationReason,
                    revokedBy: userProfile.name,
                    previousStatus: 'Approved',
                    newCommunityStatus: 'inactive'
                }
            };
            try {
                await addDoc(collection(db, 'audit_log'), auditEntry);
            } catch (cErr) {
                await logAuditTrailAction(auditEntry as any);
            }

            toast({
                title: "Leadership Revoked",
                description: `${applicantData.displayName} is no longer leader. ${applicantData.communityName} has been returned to Inactive status.`
            });

            // Optimistically update local state
            setApplicantData((prev: any) => ({
                ...prev,
                status: 'Archived',
                revokedAt: { toDate: () => now },
                revokedBy: userProfile.name || 'Platform Administrator',
                revocationReason: revocationReason.trim() || 'Leadership revoked by platform administrator'
            }));

            setIsRevokeDialogOpen(false);
            setRevocationReason('');
        } catch (error: any) {
            console.error("Revoke error:", error);
            toast({ title: "Error", description: error.message || "Failed to revoke leadership.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateStatus = async (status: 'Approved' | 'Declined') => {
        if (!db || !applicantData?.appId || !userProfile?.name || !applicantData?.communityId || !applicantData?.applicantId) {
             toast({ title: "Error", description: "Cannot process application. Missing required data.", variant: "destructive" });
            return;
        };
        setIsProcessing(true);
        try {
            const batch = writeBatch(db);
            const now = new Date();
            
            // 1. Update the leadership_applications document
            const appRef = doc(db, 'leadership_applications', applicantData.appId);
            batch.update(appRef, { 
                status: status,
                processedBy: userProfile.name,
                processedAt: now,
            });

            // 2. Update user role and leader profile status if approved
            if (status === 'Approved') {
                const userRef = doc(db, 'users', applicantData.applicantId);
                batch.update(userRef, {
                    role: 'president',
                    title: 'President',
                    homeCommunityId: applicantData.communityId,
                    communityId: applicantData.communityId,
                    'permissions.isLeader': true,
                    [`communityRoles.${applicantData.communityId}`]: {
                        role: 'president',
                        title: 'President',
                    }
                });
                
                const leaderProfileRef = doc(db, `communities/${applicantData.communityId}/leader_profiles`, applicantData.applicantId);
                batch.set(leaderProfileRef, {
                    profileStatus: 'verified',
                    approvedAt: now,
                    lastUpdated: now
                }, { merge: true });

                // 3. Activate the community hub and update leader count
                const communityRef = doc(db, 'communities', applicantData.communityId);
                batch.set(communityRef, {
                    status: 'active',
                    leaderCount: 1,
                    updatedAt: now
                }, { merge: true });

                // 3b. Automatically archive any previous applications for this community to prevent duplicates
                try {
                    const olderAppsQuery = query(
                        collection(db, 'leadership_applications'),
                        where('communityId', '==', applicantData.communityId)
                    );
                    const olderAppsSnap = await getDocs(olderAppsQuery);
                    olderAppsSnap.docs.forEach(oldDoc => {
                        if (oldDoc.id !== applicantData.appId && (oldDoc.data().status === 'Approved' || oldDoc.data().status === 'Pending')) {
                            batch.update(oldDoc.ref, {
                                status: 'Archived',
                                archivedAt: now,
                                archiveReason: `Superseded by newly approved president (${applicantData.applicantName})`
                            });
                        }
                    });
                } catch (archiveErr) {
                    console.warn("Could not archive older applications:", archiveErr);
                }

                // 4. Notify applicant
                const notifRef = doc(collection(db, 'notifications'));
                batch.set(notifRef, {
                    recipientId: applicantData.applicantId,
                    type: 'Leadership Invitation',
                    subject: `Leadership Approved: You are now the President of ${applicantData.communityName}`,
                    from: "Platform Administration",
                    date: now,
                    status: 'new',
                    relatedId: applicantData.communityId,
                    actionUrl: '/leader/dashboard'
                });
            } else if (status === 'Declined') {
                // Notify applicant of decline
                const notifRef = doc(collection(db, 'notifications'));
                batch.set(notifRef, {
                    recipientId: applicantData.applicantId,
                    type: 'Leadership Invitation',
                    subject: `Leadership Application Update for ${applicantData.communityName}`,
                    from: "Platform Administration",
                    date: now,
                    status: 'new',
                    relatedId: applicantData.communityId,
                });
            }

            await batch.commit();

            const appAuditEntry = {
                adminId: user?.uid || 'system_admin',
                adminName: userProfile.name || 'Platform Administrator',
                adminEmail: user?.email || '',
                action: status === 'Approved' ? 'leadership_application_approved' : 'leadership_application_declined',
                category: 'Applications & Vetting' as const,
                details: `${status === 'Approved' ? 'Approved' : 'Declined'} leadership application for ${applicantData.applicantName} for community "${applicantData.communityName}".`,
                timestamp: now,
                targetUser: {
                    id: applicantData.applicantId,
                    name: applicantData.applicantName,
                    email: applicantData.contactEmail || ''
                },
                targetObject: {
                    id: applicantData.communityId,
                    name: applicantData.communityName,
                    type: 'Community Hub'
                },
                metadata: {
                    applicationId: applicantData.appId,
                    status,
                    processedBy: userProfile.name
                }
            };
            try {
                await addDoc(collection(db, 'audit_log'), appAuditEntry);
            } catch (cErr) {
                await logAuditTrailAction(appAuditEntry as any);
            }

            toast({ title: "Status Updated", description: `Application has been marked as ${status}.` });
            
            // Optimistically update local state
            setApplicantData((prev: any) => ({
                ...prev,
                status: status,
                processedBy: userProfile.name,
                processedAt: { toDate: () => now }
            }));

        } catch (error) {
            toast({ title: "Error", description: "Could not update application status.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };
    
     if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }
    
    if (!applicantData) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Application Not Found</h1>
                <p className="text-muted-foreground">The requested application could not be found.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/admin/applications">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Applications
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8 px-4 sm:px-6">
             <div className="flex justify-between items-center print:hidden">
                <Button asChild variant="ghost">
                    <Link href="/admin/applications">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Applications
                    </Link>
                </Button>
                 <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print / Save PDF
                </Button>
            </div>

            <Card className="border-2 shadow-lg">
                 <CardHeader className="text-center py-10 bg-primary/5 border-b">
                    <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="text-3xl font-bold">Community Leader Application</CardTitle>
                     <CardDescription>
                        Submitted on {applicantData.createdAt ? format(applicantData.createdAt.toDate(), "PPPp") : "Unknown Date"}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-10 p-8">
                     <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary"><User className="h-5 w-5" /> Applicant Details</h2>
                        <div className="rounded-lg border bg-muted/20 px-4">
                            <ApplicationDetail label="Full Name" value={applicantData.displayName} />
                            <ApplicationDetail label="Personal Email" value={applicantData.email} />
                            <ApplicationDetail label="Contact Phone" value={applicantData.contactPhone} />
                            <ApplicationDetail label="Preferred Contact" value={applicantData.preferredContactMethod} />
                        </div>
                    </section>
                    
                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary"><Building className="h-5 w-5" /> Community Jurisdiction</h2>
                        <div className="rounded-lg border bg-muted/20 px-4">
                           <ApplicationDetail label="Location Path">
                               <div className="flex items-center gap-2">
                                   <MapPin className="h-4 w-4 text-primary shrink-0" />
                                   <div className="text-sm">
                                       {applicantData.communityCountry} &rsaquo; {applicantData.communityState} &rsaquo; {applicantData.communityRegion} &rsaquo; <strong className="text-primary text-base underline underline-offset-2">{applicantData.communityName}</strong>
                                   </div>
                               </div>
                           </ApplicationDetail>
                           <ApplicationDetail label="Intended Hubs" value={applicantData.intendedCommunityCount?.toString()} />
                           <ApplicationDetail label="Primary Goal" value={applicantData.communityIntent} />
                           <ApplicationDetail label="Statement of Intent">
                               <p className="text-sm italic leading-relaxed py-2">{applicantData.communityIntentDescription || "No detailed statement provided."}</p>
                           </ApplicationDetail>
                        </div>
                    </section>
                    
                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary">Professional Reference</h2>
                         <div className="rounded-lg border bg-muted/20 px-4">
                            <ApplicationDetail label="Referee Name" value={applicantData.refName} />
                            <ApplicationDetail label="Relationship" value={applicantData.refRelationship} />
                            <ApplicationDetail label="Referee Email" value={applicantData.refEmail} />
                            <ApplicationDetail label="Referee Phone" value={applicantData.refPhone} />
                        </div>
                    </section>
                    
                    <Separator />
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-100 dark:border-green-800">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">The applicant has verified their identity and agreed to the platform's Terms of Service.</p>
                    </div>
                </CardContent>

                                {applicantData.status === 'Pending' ? (
                    <CardFooter className="flex justify-end gap-4 p-8 bg-muted/30 border-t print:hidden">
                        <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleUpdateStatus('Declined')} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <X className="mr-2 h-4 w-4" />}
                            Decline
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateStatus('Approved')} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                            Approve & Activate Hub
                        </Button>
                    </CardFooter>
                ) : (
                    <CardFooter className="p-8 bg-muted/30 border-t flex flex-col space-y-4">
                        <div className="w-full rounded-lg border bg-background p-6 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between border-b pb-3">
                                <h3 className="font-bold flex items-center gap-2">
                                    <CheckCircle2 className={applicantData.status === 'Approved' ? "text-green-600 h-5 w-5" : "text-slate-500 h-5 w-5"} />
                                    Application Record Status
                                </h3>
                                <Badge variant={applicantData.status === 'Approved' ? "default" : "secondary"} className={applicantData.status === 'Approved' ? "bg-green-600 text-white font-bold" : "font-bold"}>
                                    {applicantData.revokedAt ? 'Archived (Revoked)' : applicantData.status}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground uppercase text-[10px] font-bold">Processed By</p>
                                    <p className="font-semibold">{applicantData.processedBy || 'Platform Administrator'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground uppercase text-[10px] font-bold">Decision Date</p>
                                    <p className="font-semibold">{applicantData.processedAt ? (typeof applicantData.processedAt.toDate === 'function' ? format(applicantData.processedAt.toDate(), "PPPp") : format(new Date(applicantData.processedAt), "PPPp")) : 'N/A'}</p>
                                </div>

                                {applicantData.revokedAt && (
                                    <>
                                        <div className="border-t pt-3">
                                            <p className="text-destructive uppercase text-[10px] font-bold">Revoked By</p>
                                            <p className="font-semibold text-destructive">{applicantData.revokedBy || 'Platform Administrator'}</p>
                                        </div>
                                        <div className="border-t pt-3">
                                            <p className="text-destructive uppercase text-[10px] font-bold">Revocation Date</p>
                                            <p className="font-semibold">{typeof applicantData.revokedAt.toDate === 'function' ? format(applicantData.revokedAt.toDate(), "PPPp") : format(new Date(applicantData.revokedAt), "PPPp")}</p>
                                        </div>
                                        {applicantData.revocationReason && (
                                            <div className="col-span-1 sm:col-span-2 bg-destructive/5 p-3 rounded border border-destructive/20 text-xs">
                                                <p className="font-bold text-destructive uppercase text-[9px] mb-1">Revocation Reason</p>
                                                <p className="italic text-muted-foreground">{applicantData.revocationReason}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {applicantData.status === 'Approved' && !applicantData.revokedAt && (
                                <div className="border-t pt-4 flex justify-between items-center print:hidden">
                                    <div className="text-xs text-muted-foreground">
                                        Need to remove this president? Revoking will return <strong>{applicantData.communityName}</strong> back to inactive status.
                                    </div>
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        className="font-bold gap-2"
                                        onClick={() => setIsRevokeDialogOpen(true)}
                                        disabled={isProcessing}
                                    >
                                        <Ban className="h-4 w-4" /> Revoke Leadership
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardFooter>
                )}

                <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <ShieldAlert className="h-5 w-5" /> Revoke Leadership & Deactivate Hub
                            </DialogTitle>
                            <DialogDescription className="text-xs leading-relaxed pt-2">
                                Are you sure you want to revoke leadership from <strong>{applicantData.displayName}</strong> for <strong>{applicantData.communityName}</strong>?
                                <br /><br />
                                This action will:
                                <ul className="list-disc pl-5 mt-1 space-y-1 text-foreground">
                                    <li>Remove president permissions from the user.</li>
                                    <li>Return <strong>{applicantData.communityName}</strong> back to <strong>Inactive</strong> status.</li>
                                    <li>Archive this application record with a forensic timestamp.</li>
                                    <li>Re-open the community for future leadership applications.</li>
                                </ul>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 py-3">
                            <Label htmlFor="revoke-reason" className="text-xs font-bold uppercase tracking-wider">Reason for Revocation (Audit Trail)</Label>
                            <Textarea 
                                id="revoke-reason"
                                placeholder="e.g. Leader requested resignation, inactivity, or policy non-compliance..."
                                value={revocationReason}
                                onChange={(e) => setRevocationReason(e.target.value)}
                                className="text-xs"
                                rows={3}
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsRevokeDialogOpen(false)} disabled={isProcessing}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleRevokeLeadership} disabled={isProcessing} className="font-bold gap-1.5">
                                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                                Confirm Revoke Leadership
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Card>
        </div>
    )
}
