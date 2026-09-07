"use client";

import * as React from "react";
import {
    ShieldCheck,
    MoreHorizontal,
    Eye,
    CheckCircle2,
    XCircle,
    Loader2,
    Search,
    ArrowUpDown,
    Check,
    Ban,
    RefreshCw,
    Trash2,
    ArrowLeft,
    Shield,
    Clock,
} from "lucide-react";
import Link from "next/link";
import { collection, onSnapshot, query, orderBy, doc, writeBatch, arrayUnion } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type ApplicationStatus = "Pending Leader Review" | "Pending Admin Verification" | "Approved" | "Declined" | "Suspended";

export type PoliceLiaisonApplication = {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantTitle: string;
  stationName: string;
  communityName: string;
  communityId: string;
  createdAt: { toDate: () => Date };
  status: ApplicationStatus;
};

const StatusBadge = ({ status }: { status: ApplicationStatus }) => {
  const statusConfig = {
    "Pending Leader Review": "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold",
    "Pending Admin Verification": "bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-bold animate-pulse",
    "Approved": "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold",
    "Declined": "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 font-bold",
    "Suspended": "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold",
  };
  return <Badge variant="outline" className={cn("shadow-2xs text-xs px-2 py-0.5", statusConfig[status])}>{status}</Badge>;
};

export default function PoliceLiaisonApplicationsPage() {
    const db = useFirestore();
    const { user } = useUser();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const [applications, setApplications] = React.useState<PoliceLiaisonApplication[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [activeTab, setActiveTab] = React.useState("Pending Admin Verification");
    const { toast } = useToast();
    const router = useRouter();

    React.useEffect(() => {
        if (!db) return;

        const q = query(collection(db, "police_liaison_applications"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PoliceLiaisonApplication));
            apps.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return dateB - dateA;
            });
            setApplications(apps);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching police applications:", error);
            toast({ title: "Error", description: "Failed to fetch applications.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, toast]);

    const policeStats = React.useMemo(() => {
        return {
            total: applications.length,
            pendingAdmin: applications.filter(a => a.status === 'Pending Admin Verification').length,
            approved: applications.filter(a => a.status === 'Approved').length,
            suspendedOrDeclined: applications.filter(a => a.status === 'Suspended' || a.status === 'Declined').length,
            pendingLeader: applications.filter(a => a.status === 'Pending Leader Review').length,
        };
    }, [applications]);

    const filteredApplications = React.useMemo(() => {
        return applications.filter(app => {
            const matchesTab = activeTab === "all" || app.status === activeTab;
            const matchesSearch = app.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 app.stationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 app.communityName?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTab && matchesSearch;
        });
    }, [applications, activeTab, searchQuery]);

    const handleView = (id: string) => {
        router.push(`/admin/applications/police-liaison/${id}`);
    };

    const handleAction = async (app: PoliceLiaisonApplication, newStatus: ApplicationStatus) => {
        if (!db || !user || !userProfile) return;
        
        try {
            const batch = writeBatch(db);
            const now = new Date();
            const adminName = userProfile.name || "Administrator";

            // 1. Update Application Status
            const appRef = doc(db, 'liaison_applications', app.id);
            batch.update(appRef, {
                status: newStatus,
                processedBy: adminName,
                processedAt: now,
            });

            // 2. Handle User Permissions/Roles
            const targetUserRef = doc(db, 'users', app.applicantId);
            if (newStatus === 'Approved') {
                batch.update(targetUserRef, {
                    role: 'police_liaison',
                    title: 'Verified Police Liaison',
                    'permissions.hasBroadcastAccess': true,
                    isVerifiedLiaison: true,
                });
            } else if (newStatus === 'Suspended' || newStatus === 'Declined' || newStatus === 'Pending Admin Verification') {
                batch.update(targetUserRef, {
                    role: 'personal',
                    title: 'Personal',
                    'permissions.hasBroadcastAccess': false,
                    isVerifiedLiaison: false,
                });
            }

            // 3. Create Audit Log
            const logRef = doc(collection(db, 'audit_log'));
            batch.set(logRef, {
                adminId: user.uid,
                adminNameSnapshot: adminName,
                action: `police_liaison_${newStatus.toLowerCase().replace(/ /g, '_')}`,
                details: `Updated police liaison application for ${app.applicantName} to ${newStatus}.`,
                timestamp: now,
                targetUser: { id: app.applicantId, name: app.applicantName }
            });

            await batch.commit();
            toast({ title: `Status Updated`, description: `Application is now ${newStatus}.` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-8">
            {/* Police Theme Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white border-2 border-blue-600/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-amber-300 to-blue-500" />
                <div>
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-widest mb-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        Law Enforcement & Emergency Services Governance
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2.5 text-white">
                        <Shield className="h-8 w-8 text-blue-400 fill-blue-400/20" />
                        Police Liaison Officer Verification
                    </h1>
                    <p className="text-blue-200 text-sm mt-1 max-w-2xl">
                        Official platform accreditation, police warrant verification, and station liaison appointments.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button asChild variant="outline" size="sm" className="font-bold bg-white/10 text-white border-white/20 hover:bg-white/20">
                        <Link href="/admin/applications">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            All Applications
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Police KPI Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-t-4 border-t-blue-900 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Submissions</p>
                            <div className="p-1.5 rounded-lg bg-blue-950/10 text-blue-900 dark:text-blue-300">
                                <Shield className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black">{policeStats.total}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Verification</p>
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                                <ShieldCheck className="h-4 w-4 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{policeStats.pendingAdmin}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-emerald-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Liaisons</p>
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{policeStats.approved}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Leader Review</p>
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{policeStats.pendingLeader}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-t-4 border-t-blue-900 shadow-md">
                <CardHeader className="bg-gradient-to-r from-blue-900/5 via-transparent to-transparent rounded-t-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Shield className="h-5 w-5 text-blue-800 dark:text-blue-400" />
                                Officer Application Log
                            </CardTitle>
                            <CardDescription>
                                Review credentials and verify station authentication for community police liaisons.
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or station..." 
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-4">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
                            <TabsTrigger value="Pending Admin Verification">Pending Verification</TabsTrigger>
                            <TabsTrigger value="Approved">Approved</TabsTrigger>
                            <TabsTrigger value="Suspended">Suspended</TabsTrigger>
                            <TabsTrigger value="Declined">Declined</TabsTrigger>
                            <TabsTrigger value="Pending Leader Review">Leader Review</TabsTrigger>
                            <TabsTrigger value="all">All</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Applicant</TableHead>
                                    <TableHead>Title/Rank</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date Submitted</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="animate-spin h-6 w-6 mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredApplications.length > 0 ? (
                                    filteredApplications.map(app => (
                                        <ContextMenu key={app.id}>
                                            <ContextMenuTrigger asChild>
                                                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => handleView(app.id)}>
                                                    <TableCell className="font-medium">
                                                        <div>{app.applicantName}</div>
                                                        <div className="text-xs text-muted-foreground font-normal">{app.communityName}</div>
                                                    </TableCell>
                                                    <TableCell>{app.applicantTitle}</TableCell>
                                                    <TableCell><StatusBadge status={app.status} /></TableCell>
                                                    <TableCell>{app.createdAt ? format(app.createdAt.toDate(), "dd MMM yyyy") : 'N/A'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onSelect={() => handleView(app.id)}>
                                                                    <Eye className="mr-2 h-4 w-4" /> View Full Profile
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                
                                                                {app.status === 'Pending Admin Verification' && (
                                                                    <>
                                                                        <DropdownMenuItem onSelect={() => handleAction(app, 'Approved')}>
                                                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Approve
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onSelect={() => handleAction(app, 'Declined')} className="text-destructive">
                                                                            <XCircle className="mr-2 h-4 w-4" /> Decline
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}

                                                                {app.status === 'Approved' && (
                                                                    <>
                                                                        <DropdownMenuItem onSelect={() => handleAction(app, 'Suspended')} className="text-amber-600">
                                                                            <Ban className="mr-2 h-4 w-4" /> Suspend Access
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onSelect={() => handleAction(app, 'Declined')} className="text-destructive">
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Remove Liaison
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}

                                                                {(app.status === 'Suspended' || app.status === 'Declined') && (
                                                                    <>
                                                                        <DropdownMenuItem onSelect={() => handleAction(app, 'Approved')} className="text-green-600">
                                                                            <RefreshCw className="mr-2 h-4 w-4" /> Re-Approve
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onSelect={() => handleAction(app, 'Pending Admin Verification')}>
                                                                            <RefreshCw className="mr-2 h-4 w-4" /> Reset to Verification
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent>
                                                <ContextMenuLabel>Actions</ContextMenuLabel>
                                                <ContextMenuItem onSelect={() => handleView(app.id)}>
                                                    <Eye className="mr-2 h-4 w-4" /> View & Action
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No applications found in this queue.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}