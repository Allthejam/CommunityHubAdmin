"use client";

import * as React from "react";
import {
    Building,
    MoreHorizontal,
    CheckCircle2,
    XCircle,
    Eye,
    FileEdit,
    Loader2,
    ArrowUpDown,
    Clock,
    ShieldAlert,
    Megaphone,
    CheckCircle,
} from "lucide-react";
import { collection, query, onSnapshot, where, doc, updateDoc } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { updateNationalAdvertiserStatusAction } from "@/lib/actions/advertiserActions";
import Link from "next/link";

type AdvertiserStatus = "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Suspended" | "Draft";

export type NationalAdvertiser = {
  id: string;
  name: string; // The user's name
  companyName: string;
  contactEmail: string;
  submittedAt: { toDate: () => Date };
  status: AdvertiserStatus;
  avatar?: string;
};

const StatusBadge = ({ status }: { status: AdvertiserStatus }) => {
  const statusStyles: { [key in AdvertiserStatus]: string } = {
    "Pending Approval": "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold",
    "Approved": "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold",
    "Requires Amendment": "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700 font-bold",
    "Declined": "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 font-bold",
    "Suspended": "bg-rose-600 text-white font-bold",
    "Draft": "border-dashed text-muted-foreground",
  };
  return <Badge variant="outline" className={cn("shadow-2xs text-xs px-2 py-0.5", statusStyles[status])}>{status}</Badge>;
};

const AdvertiserRow = React.memo(({ advertiser, onUpdateStatus }: { advertiser: NationalAdvertiser, onUpdateStatus: (id: string, status: AdvertiserStatus) => void }) => {
    
    const contextMenuItems = (
        <>
            <ContextMenuLabel>Actions</ContextMenuLabel>
            <ContextMenuItem asChild>
                <Link href={`/admin/national-advertisers/${advertiser.id}`}><Eye className="mr-2 h-4 w-4" />View Profile & Action</Link>
            </ContextMenuItem>
            <ContextMenuSeparator />
            {advertiser.status === 'Pending Approval' && (
                <>
                    <ContextMenuItem onClick={() => onUpdateStatus(advertiser.id, 'Approved')}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</ContextMenuItem>
                    <ContextMenuItem onClick={() => onUpdateStatus(advertiser.id, 'Requires Amendment')}><FileEdit className="mr-2 h-4 w-4" />Request Amendment</ContextMenuItem>
                    <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => onUpdateStatus(advertiser.id, 'Declined')}><XCircle className="mr-2 h-4 w-4" />Decline</ContextMenuItem>
                </>
            )}
             {advertiser.status === 'Approved' && (
               <ContextMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onUpdateStatus(advertiser.id, 'Suspended')}><XCircle className="mr-2 h-4 w-4" />Suspend Account</ContextMenuItem>
            )}
        </>
    );
    
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <TableRow>
                    <TableCell>
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={advertiser.avatar} alt={advertiser.name} />
                                <AvatarFallback>{advertiser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{advertiser.companyName}</div>
                                <div className="text-sm text-muted-foreground">{advertiser.name}</div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>{advertiser.contactEmail}</TableCell>
                    <TableCell>{advertiser.submittedAt?.toDate().toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={advertiser.status} /></TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                    <Link href={`/admin/national-advertisers/${advertiser.id}`}><Eye className="mr-2 h-4 w-4" />View Profile & Action</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {advertiser.status === 'Pending Approval' && (
                                    <>
                                        <DropdownMenuItem onClick={() => onUpdateStatus(advertiser.id, 'Approved')}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onUpdateStatus(advertiser.id, 'Requires Amendment')}><FileEdit className="mr-2 h-4 w-4" />Request Amendment</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onUpdateStatus(advertiser.id, 'Declined')}><XCircle className="mr-2 h-4 w-4" />Decline</DropdownMenuItem>
                                    </>
                                )}
                                 {advertiser.status === 'Approved' && (
                                   <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onUpdateStatus(advertiser.id, 'Suspended')}><XCircle className="mr-2 h-4 w-4" />Suspend Account</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            </ContextMenuTrigger>
            <ContextMenuContent>
                {contextMenuItems}
            </ContextMenuContent>
        </ContextMenu>
    );
});
AdvertiserRow.displayName = 'AdvertiserRow';

const TABS: { value: string, label: string }[] = [
    { value: "all", label: "All" },
    { value: "Pending Approval", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Requires Amendment", label: "Needs Amendment" },
    { value: "Declined", label: "Declined" },
    { value: "Suspended", label: "Suspended" },
];

export default function NationalAdvertisersPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = React.useState("all");
    const [sorting, setSorting] = React.useState<{ key: keyof NationalAdvertiser; order: 'asc' | 'desc' }>({ key: 'submittedAt', order: 'desc' });
    const db = useFirestore();

    const advertisersQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(collection(db, "users"), where("accountType", "in", ["advertiser", "national"]));
    }, [db]);

    const { data, isLoading } = useCollection<any>(advertisersQuery);

    const advertisers: NationalAdvertiser[] = React.useMemo(() => {
        if (!data) return [];
        return data.map(d => ({
            id: d.id,
            name: d.name,
            companyName: d.companyProfile?.companyName || d.businessName || 'N/A',
            contactEmail: d.email,
            submittedAt: d.companyProfile?.submittedAt,
            status: d.companyProfile?.status || 'Draft',
            avatar: d.avatar,
        }));
    }, [data]);

    const handleUpdateStatus = React.useCallback(async (id: string, status: AdvertiserStatus) => {
        const result = await updateNationalAdvertiserStatusAction({ userId: id, status });
        if (result.success) {
            toast({ title: 'Success', description: `Advertiser status updated to ${status}.` });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    }, [toast]);

    const handleSort = (key: keyof NationalAdvertiser) => {
        setSorting(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };
    
    const filteredAndSortedAdvertisers = React.useMemo(() => {
        let filtered = advertisers;
        if (activeTab !== 'all') {
            filtered = advertisers.filter(advertiser => advertiser.status === activeTab);
        }
        
        return [...filtered].sort((a, b) => {
            const key = sorting.key;
            const order = sorting.order === 'asc' ? 1 : -1;
            
            let valA = a[key as keyof NationalAdvertiser] as any;
            let valB = b[key as keyof NationalAdvertiser] as any;

            if (key === 'submittedAt') {
                valA = a.submittedAt?.toDate() || new Date(0);
                valB = b.submittedAt?.toDate() || new Date(0);
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                 return valA.localeCompare(valB) * order;
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return (valA - valB) * order;
            }
            if (valA < valB) return -1 * order;
            if (valA > valB) return 1 * order;
            return 0;
        });

    }, [advertisers, activeTab, sorting]);

  const advertiserStats = React.useMemo(() => {
    const list = advertisers || [];
    return {
      total: list.length,
      pending: list.filter(a => a.status === 'Pending Approval').length,
      approved: list.filter(a => a.status === 'Approved').length,
      needsAction: list.filter(a => a.status === 'Requires Amendment' || a.status === 'Declined' || a.status === 'Suspended').length,
    };
  }, [advertisers]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 via-primary/5 to-indigo-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Megaphone className="h-3.5 w-3.5" />
            Enterprise Brand Sponsorship
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
            <Building className="h-7 w-7 text-purple-600" />
            National Enterprise Advertisers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review brand accounts, multi-territory campaign approvals, and enterprise advertiser contracts.
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-t-4 border-t-purple-600 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Advertisers</p>
              <div className="p-1.5 rounded-lg bg-purple-600/10 text-purple-600">
                <Building className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black">{advertiserStats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Review</p>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                <Clock className="h-4 w-4 animate-pulse" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{advertiserStats.pending}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Approved</p>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{advertiserStats.approved}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Needs Action</p>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{advertiserStats.needsAction}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-t-4 border-t-purple-600 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-purple-500/5 via-transparent to-transparent rounded-t-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div>
              <CardTitle className="text-lg font-bold">Advertiser Directory</CardTitle>
              <CardDescription>Review and action brand partner accounts and campaigns.</CardDescription>
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 h-auto">
              {TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm font-semibold">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('companyName')}>
                            Company / Contact <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </TableHead>
                    <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('contactEmail')}>
                            Email <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </TableHead>
                    <TableHead>
                         <Button variant="ghost" onClick={() => handleSort('submittedAt')}>
                            Submitted <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </TableHead>
                    <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('status')}>
                            Status <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || authLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedAdvertisers.length > 0 ? (
                  filteredAndSortedAdvertisers.map((advertiser) => (
                    <AdvertiserRow key={advertiser.id} advertiser={advertiser} onUpdateStatus={handleUpdateStatus} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No advertisers in this category.
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