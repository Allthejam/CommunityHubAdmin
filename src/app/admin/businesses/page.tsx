"use client";

import * as React from "react";
import {
    Briefcase,
    MoreHorizontal,
    Search,
    ArrowUpDown,
    FilterX,
    ChevronDown,
    Loader2,
    Building2,
    ExternalLink,
    Mail,
    User,
    Calendar,
    Eye,
    CheckCircle,
    Store,
    Clock,
    ShieldAlert,
} from "lucide-react";
import { collection, query, onSnapshot, orderBy, doc } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { PaginationControls } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Business = {
  id: string;
  businessName: string;
  ownerId: string;
  primaryCommunityId: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Hidden" | "Trial Expired";
  storefrontSubscription?: boolean;
  createdAt: any;
  updatedAt: any;
  submittedAt?: any;
  contactEmail?: string;
};

export default function AdminBusinessDirectoryPage() {
    const db = useFirestore();
    const { toast } = useToast();
    
    const [businesses, setBusinesses] = React.useState<Business[]>([]);
    const [communities, setCommunities] = React.useState<Map<string, string>>(new Map());
    const [loading, setLoading] = React.useState(true);
    
    // Table State
    const [nameFilter, setNameFilter] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
    const [sorting, setSorting] = React.useState<{ key: keyof Business; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

    const statuses: Business['status'][] = ["Subscribed", "Approved", "Pending Approval", "Requires Amendment", "Trial Expired", "Declined", "Draft"];

    React.useEffect(() => {
        if (!db) return;

        setLoading(true);

        // Fetch communities once to map IDs to Names
        const commsQuery = collection(db, "communities");
        const unsubComms = onSnapshot(commsQuery, (snapshot) => {
            const map = new Map<string, string>();
            snapshot.forEach(doc => map.set(doc.id, doc.data().name));
            setCommunities(map);
        });

        // Fetch all businesses - Removed orderBy to ensure docs missing createdAt are not excluded
        const bizCollection = collection(db, "businesses");
        const unsubBiz = onSnapshot(bizCollection, (snapshot) => {
            const bizData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
            setBusinesses(bizData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching businesses:", error);
            toast({ title: "Error", description: "Could not load business directory.", variant: "destructive" });
            setLoading(false);
        });

        return () => {
            unsubComms();
            unsubBiz();
        };
    }, [db, toast]);

    const stats = React.useMemo(() => {
        return {
            total: businesses.length,
            subscribed: businesses.filter(b => b.status === 'Subscribed').length,
            storefront: businesses.filter(b => b.storefrontSubscription).length,
            approved: businesses.filter(b => b.status === 'Approved').length,
            pending: businesses.filter(b => b.status === 'Pending Approval').length,
            attention: businesses.filter(b => ['Requires Amendment', 'Declined', 'Trial Expired'].includes(b.status)).length,
        };
    }, [businesses]);

    const handleSort = (key: keyof Business) => {
        setSorting(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedBusinesses = React.useMemo(() => {
        let filtered = businesses;

        if (nameFilter) {
            filtered = filtered.filter(b => b.businessName?.toLowerCase().includes(nameFilter.toLowerCase()));
        }

        if (statusFilter.length > 0) {
            filtered = filtered.filter(b => statusFilter.includes(b.status));
        }

        return [...filtered].sort((a, b) => {
            const key = sorting.key;
            const order = sorting.order === 'asc' ? 1 : -1;
            
            let valA = a[key] ?? '';
            let valB = b[key] ?? '';

            if (key === 'createdAt' || key === 'updatedAt' || key === 'submittedAt') {
                const timeA = valA?.seconds ? valA.seconds * 1000 : (valA ? new Date(valA).getTime() : 0);
                const timeB = valB?.seconds ? valB.seconds * 1000 : (valB ? new Date(valB).getTime() : 0);
                return (timeA - timeB) * order;
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB) * order;
            }

            return 0;
        });
    }, [businesses, nameFilter, statusFilter, sorting]);

    const paginatedBusinesses = React.useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return filteredAndSortedBusinesses.slice(start, start + pagination.pageSize);
    }, [filteredAndSortedBusinesses, pagination]);

    const pageCount = Math.ceil(filteredAndSortedBusinesses.length / pagination.pageSize);

    const formatDate = (ts: any) => {
        if (!ts) return 'N/A';
        try {
            const date = ts.toDate ? ts.toDate() : new Date(ts);
            return format(date, "dd MMM yyyy");
        } catch (e) {
            return 'N/A';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-primary/5 to-blue-500/10 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
                        <Store className="h-3.5 w-3.5" />
                        Commercial Directory & Subscriptions
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
                        <Briefcase className="h-7 w-7 text-cyan-600" />
                        Global Business Directory
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Monitor enterprise accounts, commercial storefront subscriptions, and approval workflows.
                    </p>
                </div>
            </div>

            {/* Metrics Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="border-t-4 border-t-slate-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Listings</p>
                            <div className="p-1 rounded bg-slate-500/10 text-slate-600">
                                <Building2 className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subscribed</p>
                            <div className="p-1 rounded bg-emerald-500/10 text-emerald-600">
                                <CheckCircle className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.subscribed}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Storefronts</p>
                            <div className="p-1 rounded bg-blue-500/10 text-blue-600">
                                <Store className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">{stats.storefront}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-cyan-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Approved (Trial)</p>
                            <div className="p-1 rounded bg-cyan-500/10 text-cyan-600">
                                <CheckCircle className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">{stats.approved}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending</p>
                            <div className="p-1 rounded bg-amber-500/10 text-amber-600">
                                <Clock className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pending}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Needs Action</p>
                            <div className="p-1 rounded bg-rose-500/10 text-rose-600">
                                <ShieldAlert className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">{stats.attention}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-t-4 border-t-cyan-500 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent rounded-t-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold">Business Index</CardTitle>
                            <CardDescription>A total of {filteredAndSortedBusinesses.length} businesses found matching your filters.</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name..."
                                    value={nameFilter}
                                    onChange={(e) => setNameFilter(e.target.value)}
                                    className="pl-8 w-full md:w-[250px]"
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        Status <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {statuses.map(status => (
                                        <DropdownMenuCheckboxItem
                                            key={status}
                                            checked={statusFilter.includes(status)}
                                            onCheckedChange={(checked) => {
                                                setStatusFilter(prev => checked ? [...prev, status] : prev.filter(s => s !== status));
                                            }}
                                        >
                                            {status}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {(nameFilter || statusFilter.length > 0) && (
                                <Button variant="ghost" onClick={() => { setNameFilter(""); setStatusFilter([]); }}>
                                    <FilterX className="mr-2 h-4 w-4" /> Reset
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table className="responsive-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => handleSort('businessName')}>
                                            Business <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>Community</TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => handleSort('status')}>
                                            Status & Subscription <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => handleSort('createdAt')}>
                                            Registered <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>Last Activity</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedBusinesses.length > 0 ? (
                                    paginatedBusinesses.map((biz) => (
                                        <ContextMenu key={biz.id}>
                                            <ContextMenuTrigger asChild>
                                                <TableRow className="cursor-context-menu hover:bg-muted/50 transition-colors">
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-primary/5 rounded-md">
                                                                <Building2 className="h-4 w-4 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold">{biz.businessName}</p>
                                                                <p className="text-[10px] text-muted-foreground font-mono uppercase">ID: {biz.id}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm">{communities.get(biz.primaryCommunityId) || 'Global'}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">CID: {biz.primaryCommunityId}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1.5">
                                                            <BusinessStatusBadge status={biz.status} createdAt={biz.createdAt} />
                                                            {biz.storefrontSubscription && (
                                                                <Badge variant="outline" className="w-fit gap-1 text-[10px] h-5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                                                    <Store className="h-3 w-3" /> Storefront Active
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                                            {formatDate(biz.createdAt)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        <div className="flex flex-col">
                                                            {biz.status === 'Subscribed' ? (
                                                                <div className="flex items-center gap-2 text-green-600 font-medium">
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    Sub: {formatDate(biz.updatedAt)}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground italic">Updated: {formatDate(biz.updatedAt)}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Business Controls</DropdownMenuLabel>
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/businesses/${biz.id}`}>
                                                                        <Eye className="mr-2 h-4 w-4" /> View Public Profile
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => {
                                                                    if (biz.contactEmail) {
                                                                        window.location.href = `mailto:${biz.contactEmail}`;
                                                                    } else {
                                                                        toast({ title: "No Email", description: "This business has not provided a contact email." });
                                                                    }
                                                                }}>
                                                                    <Mail className="mr-2 h-4 w-4" /> Contact Owner
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/admin/manage-users?userId=${biz.ownerId}`}>
                                                                        <User className="mr-2 h-4 w-4" /> Manage Owner Account
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent>
                                                <ContextMenuLabel>Actions for {biz.businessName}</ContextMenuLabel>
                                                <ContextMenuSeparator />
                                                <ContextMenuItem asChild>
                                                    <Link href={`/businesses/${biz.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" /> View Public Profile
                                                    </Link>
                                                </ContextMenuItem>
                                                <ContextMenuItem onClick={() => {
                                                    if (biz.contactEmail) {
                                                        window.location.href = `mailto:${biz.contactEmail}`;
                                                    } else {
                                                        toast({ title: "No Email", description: "This business has not provided a contact email." });
                                                    }
                                                }}>
                                                    <Mail className="mr-2 h-4 w-4" /> Contact Owner
                                                </ContextMenuItem>
                                                <ContextMenuSeparator />
                                                <ContextMenuItem asChild>
                                                    <Link href={`/admin/manage-users?userId=${biz.ownerId}`}>
                                                        <User className="mr-2 h-4 w-4" /> Manage Owner Account
                                                    </Link>
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No businesses found.
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
                        totalRows={filteredAndSortedBusinesses.length}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
