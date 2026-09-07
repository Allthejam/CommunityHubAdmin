"use client";

import * as React from "react";
import {
    Key,
    MoreHorizontal,
    Eye,
    CheckCircle2,
    XCircle,
    Loader2,
    UserX,
    Archive,
    RefreshCw,
    Search,
    ArrowUpDown,
    ShieldCheck,
    Info,
} from "lucide-react";
import { collection, onSnapshot, query, doc, updateDoc, orderBy } from "firebase/firestore";
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
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


type AccessRequestStatus = "Pending" | "Approved" | "Declined" | "Suspended" | "Archived";

export type AccessRequest = {
  id: string;
  applicantName: string;
  agency: string;
  country: string;
  createdAt: { toDate: () => Date };
  status: AccessRequestStatus;
};

const StatusBadge = ({ status }: { status: AccessRequestStatus }) => {
  const statusConfig = {
    Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    Approved: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    Declined: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    Suspended: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
    Archived: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };
  return <Badge className={cn(statusConfig[status])}>{status}</Badge>;
};

const AccessRequestRow = React.memo(({ request, onUpdateStatus, onView }: { request: AccessRequest, onUpdateStatus: (id: string, status: AccessRequestStatus) => void, onView: (id: string) => void }) => {
    return (
        <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => onView(request.id)}>
            <TableCell>
                <div className="font-medium">{request.applicantName}</div>
                <div className="text-sm text-muted-foreground">{request.agency}</div>
            </TableCell>
            <TableCell>{request.country}</TableCell>
            <TableCell>{request.createdAt ? format(request.createdAt.toDate(), "PPP") : 'N/A'}</TableCell>
            <TableCell><StatusBadge status={request.status} /></TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => onView(request.id)}><Eye className="mr-2 h-4 w-4" />View Full Application</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {request.status === 'Pending' && (
                            <>
                                <DropdownMenuItem onClick={() => onUpdateStatus(request.id, 'Approved')}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onUpdateStatus(request.id, 'Declined')}><XCircle className="mr-2 h-4 w-4" />Decline</DropdownMenuItem>
                            </>
                        )}
                        {request.status === 'Approved' && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onUpdateStatus(request.id, 'Suspended')}><UserX className="mr-2 h-4 w-4" />Suspend</DropdownMenuItem>
                        )}
                        {request.status === 'Suspended' && (
                            <>
                                <DropdownMenuItem onClick={() => onView(request.id)}><RefreshCw className="mr-2 h-4 w-4" />Re-approve</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onUpdateStatus(request.id, 'Archived')}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem>
                            </>
                        )}
                        {request.status === 'Declined' && (
                            <DropdownMenuItem onClick={() => onUpdateStatus(request.id, 'Pending')}><RefreshCw className="mr-2 h-4 w-4" />Re-submit for Approval</DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
});
AccessRequestRow.displayName = 'AccessRequestRow';

const TABS: { value: string, label: string }[] = [
    { value: "all", label: "All" },
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Declined", label: "Declined" },
    { value: "Suspended", label: "Suspended" },
    { value: "Archived", label: "Archived" },
];


export default function AdminAccessPage() {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    
    const [requests, setRequests] = React.useState<AccessRequest[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState("Pending");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [sorting, setSorting] = React.useState<{ key: keyof AccessRequest; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

    React.useEffect(() => {
        if (!db || !user) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "access_requests"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccessRequest));
            setRequests(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching access requests:", error);
            toast({ title: "Error", description: "Failed to fetch access requests.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [toast, db, user]);

    const handleUpdateStatus = async (id: string, status: AccessRequestStatus) => {
        try {
            if (!db) throw new Error("Database not available.");
            const requestRef = doc(db, 'access_requests', id);
            await updateDoc(requestRef, { status });
            toast({ title: "Status Updated", description: `Request has been marked as ${status}.` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Could not update request status.", variant: "destructive" });
        }
    };
    
    const handleView = (id: string) => {
        router.push(`/admin/special-access/${id}`);
    };

    const handleSort = (key: keyof AccessRequest) => {
        setSorting(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedRequests = React.useMemo(() => {
        let filtered = requests;
        
        if (activeTab !== 'all') {
            filtered = filtered.filter(req => req.status === activeTab);
        }

        if (searchQuery) {
            const lowQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(req => 
                req.applicantName?.toLowerCase().includes(lowQuery) ||
                req.agency?.toLowerCase().includes(lowQuery)
            );
        }

        return [...filtered].sort((a, b) => {
            const key = sorting.key;
            const order = sorting.order === 'asc' ? 1 : -1;
            
            let valA = a[key] as any;
            let valB = b[key] as any;

            if (key === 'createdAt') {
                const dateA = valA?.toDate ? valA.toDate().getTime() : 0;
                const dateB = valB?.toDate ? valB.toDate().getTime() : 0;
                return (dateA - dateB) * order;
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB) * order;
            }

            return (valA > valB ? 1 : -1) * order;
        });
    }, [requests, activeTab, searchQuery, sorting]);

    const paginatedRequests = React.useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return filteredAndSortedRequests.slice(start, start + pagination.pageSize);
    }, [filteredAndSortedRequests, pagination]);

    const pageCount = Math.ceil(filteredAndSortedRequests.length / pagination.pageSize);

    const accessStats = React.useMemo(() => {
        const list = requests || [];
        return {
            total: list.length,
            pending: list.filter(r => r.status === 'Pending').length,
            approved: list.filter(r => r.status === 'Approved').length,
            suspended: list.filter(r => r.status === 'Suspended').length,
            declined: list.filter(r => r.status === 'Declined').length,
            archived: list.filter(r => r.status === 'Archived').length,
        };
    }, [requests]);

    return (
        <div className="space-y-8">
            {/* Security Hero Banner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900/10 via-blue-900/10 to-emerald-900/10 border-2 border-blue-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest mb-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        Multi-Agency Vetting & Security Clearance
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                        <Key className="h-8 w-8 text-blue-600" />
                        Special Access & Agency Credentials
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                        Review and authorize elevated dispatch security clearances for emergency services, government agencies, and accredited platform liaisons.
                    </p>
                </div>
            </div>

            {/* 5 Top KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card className="border-t-4 border-t-blue-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Requests</p>
                            <div className="p-1 rounded-md bg-blue-600/10 text-blue-600">
                                <Key className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black">{accessStats.total}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Total submissions</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Vetting</p>
                            <div className="p-1 rounded-md bg-amber-500/10 text-amber-600">
                                <ShieldCheck className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400">{accessStats.pending}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Requires officer review</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Approved Credentials</p>
                            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{accessStats.approved}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Active TGBS dispatchers</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-orange-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Suspended</p>
                            <div className="p-1 rounded-md bg-orange-500/10 text-orange-600">
                                <UserX className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-orange-600 dark:text-orange-400">{accessStats.suspended}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Temporarily revoked</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Declined</p>
                            <div className="p-1 rounded-md bg-rose-500/10 text-rose-600">
                                <XCircle className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400">{accessStats.declined}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Failed verification</p>
                    </CardContent>
                </Card>
            </div>

            <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-sm font-bold uppercase tracking-tight">Administrative Vetting Protocol</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
                    We aim to complete every application within <strong className="text-foreground">5 working days</strong>. Applications are processed in chronological order; however, priority is given to requests using <strong className="text-foreground">official organizational email domains</strong>, as these allow for rapid credential verification. Requests from generic providers (Gmail, Outlook, etc.) require extensive manual vetting and will be subject to longer review periods.
                </AlertDescription>
            </Alert>
            
            <Card className="border-t-4 border-t-blue-600 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-600/5 via-transparent to-transparent rounded-t-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle className="text-lg font-bold">Authority Requests</CardTitle>
                            <CardDescription>Targeted Geographical Broadcast System (TGBS) vetting queue.</CardDescription>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or agency..." 
                                className="pl-9 h-9 border-blue-500/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPagination(p => ({ ...p, pageIndex: 0 })); }} className="pt-4">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-muted/60">
                            {TABS.map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value} className="text-xs font-bold py-1.5">
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table className="responsive-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => handleSort('applicantName')} className="p-0 hover:bg-transparent font-bold">
                                            Applicant & Agency <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => handleSort('country')} className="p-0 hover:bg-transparent font-bold">
                                            Country <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => handleSort('createdAt')} className="p-0 hover:bg-transparent font-bold">
                                            Date Submitted <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => handleSort('status')} className="p-0 hover:bg-transparent font-bold">
                                            Status <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="animate-spin h-8 w-8 text-primary" />
                                                <p className="text-sm text-muted-foreground">Retrieving vetting records...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedRequests.length > 0 ? (
                                    paginatedRequests.map(req => (
                                        <AccessRequestRow key={req.id} request={req} onUpdateStatus={handleUpdateStatus} onView={handleView} />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                                            {searchQuery ? "No matching records found for your search." : "No applications found in this category."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <PaginationControls 
                        pagination={pagination}
                        setPagination={setPagination}
                        pageCount={pageCount}
                        totalRows={filteredAndSortedRequests.length}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
