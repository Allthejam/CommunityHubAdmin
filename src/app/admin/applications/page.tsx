
"use client";

import * as React from "react";
import {
    Key,
    MoreHorizontal,
    Eye,
    CheckCircle2,
    XCircle,
    Loader2,
    Archive,
    Crown,
    ShieldCheck,
} from "lucide-react";
import { collection, onSnapshot, query, doc, updateDoc, where, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";


type ApplicationStatus = "Pending" | "Approved" | "Declined" | "Archived";

export type Application = {
  id: string;
  applicantId: string;
  applicantName: string;
  communityName: string;
  createdAt: any;
  status: ApplicationStatus;
};

const StatusBadge = ({ status }: { status: ApplicationStatus }) => {
  const statusConfig = {
    Pending: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold",
    Approved: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold",
    Declined: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 font-bold",
    Archived: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-semibold",
  };
  return <Badge variant="outline" className={cn("shadow-2xs text-xs px-2 py-0.5", statusConfig[status])}>{status}</Badge>;
};

const ApplicationRow = React.memo(({ application, onView }: { application: Application, onView: (id: string) => void }) => {
    const formattedDate = React.useMemo(() => {
        if (!application.createdAt) return 'N/A';
        const date = application.createdAt.toDate ? application.createdAt.toDate() : new Date(application.createdAt);
        return format(date, "PPP");
    }, [application.createdAt]);

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onView(application.id)}>
                    <TableCell>
                        <div className="font-semibold text-foreground">{application.applicantName}</div>
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground">{application.communityName}</TableCell>
                    <TableCell className="text-xs">{formattedDate}</TableCell>
                    <TableCell><StatusBadge status={application.status} /></TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onView(application.id)}>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuLabel>Actions</ContextMenuLabel>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => onView(application.id)}>
                    <Eye className="mr-2 h-4 w-4" /> View Details
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
});
ApplicationRow.displayName = "ApplicationRow";

const TABS = [
    { value: 'all', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Declined', label: 'Declined' },
    { value: 'Archived', label: 'Archived' },
];


export default function AdminApplicationsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [applications, setApplications] = React.useState<Application[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState('Pending');
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    React.useEffect(() => {
        if (profileLoading || !db) return;
        
        if (!userProfile) {
            setLoading(false);
            return;
        }

        const role = (userProfile.role || '').toLowerCase();
        const isAdmin = role === 'admin' || 
                        role === 'administrator' || 
                        role === 'owner' || 
                        userProfile.permissions?.isAdmin === true ||
                        userProfile.permissions?.isStaff === true;

        if (!isAdmin) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "leadership_applications"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
            
            data.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            setApplications(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching applications:", error);
            toast({ title: "Database Error", description: "Failed to sync with leadership applications.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile, profileLoading, toast, db]);
    
    const handleView = (docId: string) => {
        router.push(`/admin/applications/${docId}`);
    };

    const stats = React.useMemo(() => {
        return {
            total: applications.length,
            pending: applications.filter(a => a.status === 'Pending').length,
            approved: applications.filter(a => a.status === 'Approved').length,
            declined: applications.filter(a => a.status === 'Declined').length,
        };
    }, [applications]);

    const filteredApplications = React.useMemo(() => {
        if (activeTab === 'all') return applications;
        return applications.filter(req => req.status === activeTab);
    }, [applications, activeTab]);

    return (
        <div className="space-y-8">
            {/* Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-indigo-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                        <Crown className="h-3.5 w-3.5" />
                        Community Leadership Governance
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
                        <Crown className="h-7 w-7 text-amber-500" />
                        Leadership Applications
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Review, verify, and approve applications for Community President and Leadership roles.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button asChild variant="outline" size="sm" className="font-bold border-blue-600/30 text-blue-700 dark:text-blue-300 hover:bg-blue-600/10">
                        <Link href="/admin/applications/police-liaison">
                            <ShieldCheck className="mr-2 h-4 w-4 text-blue-600" />
                            Police Liaison Vetting
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Applications</p>
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                                <Crown className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-amber-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Review</p>
                            <div className="p-1.5 rounded-lg bg-amber-600/10 text-amber-600">
                                <Crown className="h-4 w-4 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pending}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Approved Leaders</p>
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.approved}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Declined</p>
                            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
                                <XCircle className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.declined}</div>
                    </CardContent>
                </Card>
            </div>
            
            <Card className="border-t-4 border-t-amber-500 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber-500/5 via-transparent to-transparent rounded-t-lg">
                    <CardTitle className="text-lg font-bold">Leadership Queue</CardTitle>
                    <CardDescription>Review applications from users wanting to lead a community hub.</CardDescription>
                     <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-4">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
                            {TABS.map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm font-semibold">
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="font-bold">Applicant</TableHead>
                                    <TableHead className="font-bold">Community</TableHead>
                                    <TableHead className="font-bold">Date Submitted</TableHead>
                                    <TableHead className="font-bold">Status</TableHead>
                                    <TableHead className="text-right font-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="animate-spin h-8 w-8 text-primary" />
                                                <p className="text-sm text-muted-foreground">Syncing application data...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredApplications.length > 0 ? (
                                    filteredApplications.map(req => (
                                        <ApplicationRow key={req.id} application={req} onView={handleView} />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Archive className="h-8 w-8 opacity-20" />
                                                <p>No applications found in the '{activeTab}' queue.</p>
                                            </div>
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
