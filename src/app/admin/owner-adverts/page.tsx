"use client";

import * as React from "react";
import {
    ShoppingBag,
    MoreHorizontal,
    PlusCircle,
    Globe,
    Handshake,
    ArrowRight,
    Loader2,
    FileEdit,
    Trash2,
    PlayCircle,
    PauseCircle,
    Sparkles,
    Calendar,
    Search,
    CheckCircle2,
    Clock,
    Eye,
    Layers,
} from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { collection, query, where, doc } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { deleteAdvertAction, updateAdvertStatusAction } from "@/lib/actions/advertActions";

type AdvertStatus = "Active" | "Scheduled" | "Expired" | "Draft" | "Paused" | "Pending Approval" | "Approved" | "Declined";

export type Advert = {
  id: string;
  title: string;
  headline?: string;
  shortDescription?: string;
  status: AdvertStatus;
  startDate?: { toDate: () => Date };
  endDate?: { toDate: () => Date };
  type: 'featured' | 'partner';
  image?: string | null;
  createdAt?: { toDate: () => Date };
};

const StatusBadge = ({ status }: { status: AdvertStatus }) => {
  switch (status) {
    case 'Active':
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </Badge>
      );
    case 'Scheduled':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 w-fit">
          <Clock className="h-3 w-3" />
          Scheduled
        </Badge>
      );
    case 'Paused':
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 w-fit">
          <PauseCircle className="h-3 w-3" />
          Paused
        </Badge>
      );
    case 'Draft':
      return (
        <Badge variant="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30 border-dashed font-bold uppercase text-[10px] tracking-wider w-fit">
          Draft
        </Badge>
      );
    case 'Expired':
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-bold uppercase text-[10px] tracking-wider w-fit">
          Expired
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="font-bold uppercase text-[10px] tracking-wider w-fit">
          {status}
        </Badge>
      );
  }
};

export default function OwnerAdvertsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<string>("all");
    const [typeFilter, setTypeFilter] = React.useState<string>("all");
    const [isCreateOpen, setIsCreateOpen] = React.useState(false);

    const advertsQuery = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return query(collection(firestore, "adverts"), where("ownerId", "==", user.uid), where("scope", "==", "platform"));
    }, [user, firestore]);

    const { data: adverts, isLoading: loading } = useCollection<Advert>(advertsQuery);
    
    // 4 KPI Metrics
    const kpiStats = React.useMemo(() => {
        const list = adverts || [];
        const active = list.filter(a => a.status === 'Active').length;
        const scheduled = list.filter(a => a.status === 'Scheduled' || (a.startDate?.toDate && isFuture(a.startDate.toDate()))).length;
        const pausedOrDraft = list.filter(a => a.status === 'Paused' || a.status === 'Draft').length;
        const total = list.length;
        return { active, scheduled, pausedOrDraft, total };
    }, [adverts]);

    // Filtered list
    const filteredAdverts = React.useMemo(() => {
        let list = adverts || [];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(a => 
                (a.title || '').toLowerCase().includes(q) || 
                (a.headline || '').toLowerCase().includes(q) ||
                (a.shortDescription || '').toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'all') {
            list = list.filter(a => a.status === statusFilter);
        }

        if (typeFilter !== 'all') {
            list = list.filter(a => a.type === typeFilter);
        }

        return list;
    }, [adverts, searchQuery, statusFilter, typeFilter]);

    const handleUpdateStatus = async (id: string, status: AdvertStatus) => {
        const result = await updateAdvertStatusAction({ advertId: id, status });
        if (result.success) {
            toast({ title: "Status Updated", description: `Campaign has been marked as ${status}.` });
        } else {
            toast({ title: "Error", description: result.error || "Could not update campaign status.", variant: "destructive" });
        }
    };
    
    const handleDelete = async (id: string, title?: string) => {
        if (window.confirm(`Are you sure you want to permanently delete the campaign "${title || id}"?`)) {
            const result = await deleteAdvertAction({ advertId: id });
            if (result.success) {
                toast({ title: "Campaign Deleted", description: "The advert campaign has been removed." });
            } else {
                toast({ title: "Error", description: result.error || "Could not delete campaign.", variant: "destructive" });
            }
        }
    };

    return (
    <div className="space-y-8 pb-20">
      {/* Hero Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-amber-600/15 via-orange-600/10 to-indigo-950/15 border-2 border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest mb-1.5">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            Internal Marketing • Platform Promotion Suite
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
            <ShoppingBag className="h-8 w-8 text-amber-500" />
            Owner Advert Campaigns
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
            Create, test, and deploy prime Featured carousels and Partner advertisements across the entire network with zero cost and direct broadcast privileges.
          </p>
        </div>

        {/* Create Campaign Trigger */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button className="font-black gap-2 shadow-lg h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white uppercase text-xs tracking-wider shrink-0">
                    <PlusCircle className="h-5 w-5" /> Create New Campaign
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-widest mb-1">
                        <Sparkles className="h-4 w-4" /> Internal Campaign Creator
                    </div>
                    <DialogTitle className="text-xl font-black">Choose Advert Format</DialogTitle>
                    <DialogDescription>
                        Select where and how your internal promotion should appear across Community Hub.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Featured Ad Option */}
                    <Link 
                        href="/admin/owner-adverts/create?type=featured&owner=true" 
                        onClick={() => setIsCreateOpen(false)}
                        className="group p-5 rounded-xl border-2 border-amber-500/30 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-all flex items-start gap-4 shadow-sm"
                    >
                        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-600 group-hover:scale-105 transition-transform shrink-0">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <h3 className="font-bold text-foreground text-base">Featured Carousel Ad</h3>
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-black uppercase">
                                    Top Billboard
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                High-impact billboard banner shown on the main homepage and top-level directory discovery carousels.
                            </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all self-center shrink-0" />
                    </Link>

                    {/* Partner Ad Option */}
                    <Link 
                        href="/admin/owner-adverts/create?type=partner&owner=true" 
                        onClick={() => setIsCreateOpen(false)}
                        className="group p-5 rounded-xl border-2 border-blue-500/30 hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer transition-all flex items-start gap-4 shadow-sm"
                    >
                        <div className="p-3 rounded-xl bg-blue-500/20 text-blue-600 group-hover:scale-105 transition-transform shrink-0">
                            <Handshake className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <h3 className="font-bold text-foreground text-base">Valued Partner Ad</h3>
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] font-black uppercase">
                                    Partner Showcase
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Compact card format embedded into the &apos;Valued Partners&apos; showcase grid and community feeds.
                            </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all self-center shrink-0" />
                    </Link>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      {/* 4 Real-Time KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Campaigns</p>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpiStats.active}</div>
                <p className="text-[10px] text-muted-foreground font-semibold">Broadcasting on live site</p>
            </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scheduled</p>
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                        <Clock className="h-4 w-4" />
                    </div>
                </div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{kpiStats.scheduled}</div>
                <p className="text-[10px] text-muted-foreground font-semibold">Upcoming start dates</p>
            </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Paused &amp; Drafts</p>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                        <PauseCircle className="h-4 w-4" />
                    </div>
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{kpiStats.pausedOrDraft}</div>
                <p className="text-[10px] text-muted-foreground font-semibold">Ready for dispatch or review</p>
            </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-600 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Campaigns</p>
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                        <Layers className="h-4 w-4" />
                    </div>
                </div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{kpiStats.total}</div>
                <p className="text-[10px] text-muted-foreground font-semibold">Internal platform adverts</p>
            </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-t-4 border-t-amber-500 shadow-md">
        <CardHeader className="bg-gradient-to-r from-amber-500/5 via-transparent to-transparent space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-lg font-bold">Campaign Inventory</CardTitle>
                    <CardDescription>All internal platform adverts running or scheduled across Community Hub.</CardDescription>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
                    <TabsList className="grid grid-cols-4 h-9">
                        <TabsTrigger value="all" className="text-xs font-bold">All</TabsTrigger>
                        <TabsTrigger value="Active" className="text-xs font-bold">Active</TabsTrigger>
                        <TabsTrigger value="Paused" className="text-xs font-bold">Paused</TabsTrigger>
                        <TabsTrigger value="Draft" className="text-xs font-bold">Drafts</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Filter Search bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search campaigns by title, headline..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 border-2 bg-background font-medium text-xs"
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button 
                        size="sm" 
                        variant={typeFilter === 'all' ? 'secondary' : 'outline'} 
                        onClick={() => setTypeFilter('all')}
                        className="h-10 text-xs font-bold"
                    >
                        All Types
                    </Button>
                    <Button 
                        size="sm" 
                        variant={typeFilter === 'featured' ? 'secondary' : 'outline'} 
                        onClick={() => setTypeFilter('featured')}
                        className="h-10 text-xs font-bold gap-1 text-amber-600"
                    >
                        <Globe className="h-3.5 w-3.5" /> Featured
                    </Button>
                    <Button 
                        size="sm" 
                        variant={typeFilter === 'partner' ? 'secondary' : 'outline'} 
                        onClick={() => setTypeFilter('partner')}
                        className="h-10 text-xs font-bold gap-1 text-blue-600"
                    >
                        <Handshake className="h-3.5 w-3.5" /> Partner
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-widest">Advert Creative</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-widest">Format</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-widest">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-widest">Active Schedule</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest pr-6">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                        <Loader2 className="animate-spin h-8 w-8 mx-auto text-amber-500" />
                        <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest">Loading adverts...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredAdverts.length > 0 ? (
                  filteredAdverts.map((advert) => {
                    const isFeatured = advert.type === 'featured';
                    const startDateFormatted = advert.startDate?.toDate ? format(advert.startDate.toDate(), "dd MMM yyyy") : 'Immediate';
                    const endDateFormatted = advert.endDate?.toDate ? format(advert.endDate.toDate(), "dd MMM yyyy") : 'Open-Ended';

                    return (
                    <ContextMenu key={advert.id}>
                        <ContextMenuTrigger asChild>
                            <TableRow className="cursor-context-menu hover:bg-muted/40 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        {advert.image ? (
                                            <div className="relative h-12 w-16 rounded-lg overflow-hidden border shadow-sm shrink-0 bg-muted">
                                                <Image 
                                                    src={advert.image} 
                                                    alt={advert.title || 'Advert image'} 
                                                    fill 
                                                    className="object-cover" 
                                                />
                                            </div>
                                        ) : (
                                            <div className={cn("h-12 w-16 rounded-lg flex items-center justify-center border shrink-0", isFeatured ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600")}>
                                                {isFeatured ? <Globe className="h-6 w-6" /> : <Handshake className="h-6 w-6" />}
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-foreground">{advert.title || advert.headline || 'Untitled Campaign'}</span>
                                            {advert.shortDescription && (
                                                <span className="text-xs text-muted-foreground line-clamp-1 max-w-sm">{advert.shortDescription}</span>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {isFeatured ? (
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                                            <Globe className="h-3 w-3" /> Featured Ad
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                                            <Handshake className="h-3 w-3" /> Partner Ad
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={advert.status} />
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-xs font-medium">
                                        <span className="text-foreground">{startDateFormatted}</span>
                                        <span className="text-muted-foreground text-[11px]">until {endDateFormatted}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuLabel>Campaign Options</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/owner-adverts/create?type=${advert.type}&id=${advert.id}&owner=true`} className="cursor-pointer">
                                                    <FileEdit className="mr-2 h-4 w-4 text-primary" /> Edit Creative
                                                </Link>
                                            </DropdownMenuItem>
                                            {advert.status === 'Active' && (
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(advert.id, 'Paused')} className="cursor-pointer">
                                                    <PauseCircle className="mr-2 h-4 w-4 text-amber-500" /> Pause Campaign
                                                </DropdownMenuItem>
                                            )}
                                            {advert.status === 'Paused' && (
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(advert.id, 'Active')} className="cursor-pointer">
                                                    <PlayCircle className="mr-2 h-4 w-4 text-emerald-500" /> Resume Campaign
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(advert.id, advert.title)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Campaign
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56">
                            <ContextMenuLabel>{advert.title || 'Campaign Options'}</ContextMenuLabel>
                            <ContextMenuSeparator />
                            <ContextMenuItem asChild>
                                <Link href={`/admin/owner-adverts/create?type=${advert.type}&id=${advert.id}&owner=true`}>
                                    <FileEdit className="mr-2 h-4 w-4" /> Edit Creative
                                </Link>
                            </ContextMenuItem>
                            {advert.status === 'Active' && (
                                <ContextMenuItem onClick={() => handleUpdateStatus(advert.id, 'Paused')}>
                                    <PauseCircle className="mr-2 h-4 w-4 text-amber-500" /> Pause Campaign
                                </ContextMenuItem>
                            )}
                            {advert.status === 'Paused' && (
                                <ContextMenuItem onClick={() => handleUpdateStatus(advert.id, 'Active')}>
                                    <PlayCircle className="mr-2 h-4 w-4 text-emerald-500" /> Resume Campaign
                                </ContextMenuItem>
                            )}
                            <ContextMenuSeparator />
                            <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(advert.id, advert.title)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Campaign
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm font-semibold text-muted-foreground">No internal adverts found</p>
                        <p className="text-xs text-muted-foreground">Create your first featured or partner ad to promote internal initiatives.</p>
                        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="mt-2 text-xs font-bold">
                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Create Advert
                        </Button>
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