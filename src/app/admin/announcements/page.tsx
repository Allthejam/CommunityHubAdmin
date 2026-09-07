"use client";

import * as React from "react";
import {
    MoreHorizontal,
    Bell,
    Archive,
    PauseCircle,
    PlayCircle,
    Eye,
    XCircle,
    Info,
    ChevronDown,
    FilterX,
    Loader2,
    ArrowUpDown,
    ChevronsLeft,
    ChevronLeft,
    ChevronRight,
    ChevronsRight,
    MapPin,
    Printer,
    Clock,
    FileText,
    History,
    Fingerprint,
    Globe,
    ShieldAlert,
    UserCircle,
    Database,
    Radio,
    Crown,
    Siren,
    Send,
    AlertCircle,
} from "lucide-react"
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BroadcastComposer } from "@/components/broadcast-composer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Announcement } from "@/lib/announcement-data";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

const announcementTypes: (Announcement['type'] | 'Urgent')[] = ["Standard", "Urgent", "Emergency"];
const allStatuses: Announcement['status'][] = ["Live", "Scheduled", "Paused", "Archived"];

const GeographicalPath = ({ audience }: { audience: any }) => {
    const db = useFirestore();
    const [resolvedPaths, setResolvedPaths] = React.useState<{path: string, ids: string}[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (!audience || !db || audience.type !== 'location') {
            setResolvedPaths([]);
            return;
        }

        const resolve = async () => {
            setLoading(true);
            const parts: string[] = [];
            const ids: string[] = [];
            try {
                if (audience.countries?.length > 0) {
                    const id = audience.countries[0];
                    const snap = await getDoc(doc(db, 'locations', id));
                    if (snap.exists()) { parts.push(snap.data().name); ids.push(id); }
                }
                if (audience.states?.length > 0) {
                    const id = audience.states[0];
                    const snap = await getDoc(doc(db, 'locations', id));
                    if (snap.exists()) { parts.push(snap.data().name); ids.push(id); }
                }
                if (audience.regions?.length > 0) {
                    const id = audience.regions[0];
                    const snap = await getDoc(doc(db, 'locations', id));
                    if (snap.exists()) { parts.push(snap.data().name); ids.push(id); }
                }
                if (audience.communities?.length > 0) {
                    const names: string[] = [];
                    for (const cid of audience.communities) {
                        const snap = await getDoc(doc(db, 'communities', cid));
                        if (snap.exists()) {
                            names.push(snap.data().name);
                        } else {
                            names.push(`Hub [${cid.substring(0, 5)}]`);
                        }
                        ids.push(cid);
                    }
                    parts.push(`[${names.join(', ')}]`);
                }
            } catch (e) {
                console.error("Audit Path resolution error:", e);
            }

            if (parts.length > 0) {
                setResolvedPaths([{
                    path: parts.join(' › '),
                    ids: ids.join(', ')
                }]);
            }
            setLoading(false);
        };

        resolve();
    }, [audience, db]);

    if (audience?.type === 'all') return <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-black uppercase text-[10px] h-7">Platform-Wide Dispatch</Badge>;
    if (audience?.type === 'roles') return (
        <div className="flex flex-wrap gap-1">
            {audience.roles?.map((r: string) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
        </div>
    );
    if (loading) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin"/> Resolving jurisdictional route...</div>;
    if (resolvedPaths.length === 0) return <span className="text-xs text-muted-foreground italic">No geographical targeting recorded.</span>;

    return (
        <div className="space-y-3">
            {resolvedPaths.map((item, i) => (
                <div key={i} className="space-y-1">
                    <div className="text-xs font-black text-primary bg-primary/5 p-3 rounded-lg border border-primary/20 leading-relaxed shadow-inner">
                        <MapPin className="h-3 w-3 inline mr-2 opacity-50" />
                        {item.path}
                    </div>
                    <p className="text-[8px] font-mono text-muted-foreground uppercase pl-3 tracking-tighter">Route IDs: {item.ids}</p>
                </div>
            ))}
        </div>
    );
}

const getTypeBadge = (announcement: Announcement) => {
    if (announcement.type === 'Standard' && announcement.severity === 'urgent') {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200">Urgent</Badge>;
    }
    const typeStyles: { [key in Announcement["type"]]: string } = {
        Standard: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
        Emergency: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200",
    };
    return <Badge className={cn(typeStyles[announcement.type])}>{announcement.type}</Badge>;
};

const AnnouncementRow = React.memo(({ announcement, onPause, onReactivate, onCancel, onView }: {
    announcement: Announcement;
    onPause: (id: string) => void;
    onReactivate: (id: string) => void;
    onCancel: (id: string) => void;
    onView: (announcement: Announcement) => void;
}) => {
    const isArchived = announcement.status === 'Archived';
    const isLive = announcement.status === 'Live';
    const isPaused = announcement.status === 'Paused';
    const isScheduled = announcement.status === 'Scheduled';

    const getStatusBadge = () => {
         const statusStyles: { [key in Announcement["status"]]: string } = {
            Live: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
            Paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
            Scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
            Archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
        };
        return <Badge className={cn(statusStyles[announcement.status])}>{announcement.status}</Badge>;
    }

    const getAudienceSummary = () => {
        const aud = announcement.audience;
        if (!aud || typeof aud !== 'object') return 'Legacy Structure';
        if (aud.type === 'all') return 'Full Platform';
        if (aud.type === 'roles') return `${aud.roles?.length || 0} Target Roles`;
        if (aud.type === 'location') return 'Targeted Geography';
        return 'Unknown';
    }

    return (
        <TableRow className="table-row cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onView(announcement)}>
            <TableCell className="table-cell" data-label="Select" onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
            <TableCell className="table-cell font-medium" data-label="Subject">
                {announcement.subject.length > 40 ? announcement.subject.substring(0, 40) + "..." : announcement.subject}
            </TableCell>
            <TableCell className="table-cell" data-label="Type">{getTypeBadge(announcement)}</TableCell>
            <TableCell className="table-cell" data-label="Audience">{getAudienceSummary()}</TableCell>
            <TableCell className="table-cell" data-label="Status">{getStatusBadge()}</TableCell>
            <TableCell className="table-cell" data-label="Scheduled Dates">{announcement.scheduledDates}</TableCell>
            <TableCell className="table-cell" data-label="Sent By">{announcement.sentBy}</TableCell>
            <TableCell className="table-cell text-right" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onView(announcement)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Audit Record
                        </DropdownMenuItem>
                        
                        {!isArchived && <DropdownMenuSeparator />}
                        
                        {isLive && (
                            <DropdownMenuItem onClick={() => onPause(announcement.id)}>
                                <PauseCircle className="mr-2 h-4 w-4" />
                                Pause
                            </DropdownMenuItem>
                        )}

                        {(isPaused || isScheduled) && !isArchived && (
                            <DropdownMenuItem onClick={() => onReactivate(announcement.id)}>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Reactivate
                            </DropdownMenuItem>
                        )}

                        {!isArchived && <DropdownMenuSeparator />}
                        
                        {!isArchived && (
                            <DropdownMenuItem 
                            onClick={() => onCancel(announcement.id)}
                            className="text-amber-600 focus:bg-amber-100 focus:text-amber-700 dark:text-amber-400 dark:focus:bg-amber-900/50 dark:focus:text-amber-300">
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel & Archive
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    )
});
AnnouncementRow.displayName = 'AnnouncementRow';


const PaginationControls = ({ pagination, setPagination, pageCount, totalRows }: {
    pagination: { pageIndex: number; pageSize: number; };
    setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number; }>>;
    pageCount: number;
    totalRows: number;
}) => (
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                {totalRows} total row(s).
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={`${pagination.pageSize}`}
                        onValueChange={(value) => {
                            setPagination({ pageIndex: 0, pageSize: Number(value) });
                        }}
                        >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={`${pagination.pageSize}`} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {pageSize}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-full sm:w-[100px] items-center justify-center text-sm font-medium">
                    Page {pagination.pageIndex + 1} of{" "}
                    {pageCount || 1}
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))} disabled={pagination.pageIndex === 0}><span className="sr-only">Go to first page</span><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))} disabled={pagination.pageIndex === 0}><span className="sr-only">Go to previous page</span><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={pagination.pageIndex >= pageCount - 1}><span className="sr-only">Go to next page</span><ChevronRight className="h-4 w-4" /></Button>
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPagination(p => ({ ...p, pageIndex: pageCount - 1 }))} disabled={pagination.pageIndex >= pageCount - 1}><span className="sr-only">Go to last page</span><ChevronsRight className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
);


export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewingAnnouncement, setViewingAnnouncement] = React.useState<Announcement | null>(null);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [subjectFilter, setSubjectFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  
  const [archivedSubjectFilter, setArchivedSubjectFilter] = React.useState("");
  const [archivedTypeFilter, setArchivedTypeFilter] = React.useState<string[]>([]);
  
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [archivedPagination, setArchivedPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  
  const [sorting, setSorting] = React.useState<{ key: keyof Announcement; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
  const [archivedSorting, setArchivedSorting] = React.useState<{ key: keyof Announcement; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });

  React.useEffect(() => {
    if (!user || !db) {
        setLoading(false);
        return;
    };

    setLoading(true);

    const q = query(
        collection(db, "announcements"), 
        where("ownerId", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const platformAnnouncements: Announcement[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            platformAnnouncements.push({ 
                id: doc.id,
                ...data,
                scheduledDates: data.scheduledDates || (data.startDate && data.endDate ? `${format(data.startDate.toDate(), "PPP")} - ${format(data.endDate.toDate(), "PPP")}` : (data.createdAt ? format(data.createdAt.toDate(), "PPP") : 'N/A')),
            } as Announcement);
        });
        setAnnouncements(platformAnnouncements);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching announcements:", error);
        toast({ title: "Error", description: "Could not load your announcements.", variant: "destructive"});
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db, toast]);

  const updateAnnouncementStatus = React.useCallback(async (announcementId: string, status: Announcement['status']) => {
    if (!db || !user) return;
    const announcementRef = doc(db, 'announcements', announcementId);
    try {
        await updateDoc(announcementRef, { 
            status,
            history: viewingAnnouncement?.history ? [...viewingAnnouncement.history, { status, actorId: user.uid, timestamp: new Date() }] : [{ status, actorId: user.uid, timestamp: new Date() }]
        });
        toast({ title: "Success", description: `Status updated to ${status}.`});
    } catch (error) {
        console.error("Error updating status:", error);
        toast({ title: "Error", description: "Failed to update status.", variant: "destructive"});
    }
  }, [db, toast, user, viewingAnnouncement]);
  
  const handlePause = React.useCallback((announcementId: string) => updateAnnouncementStatus(announcementId, 'Paused'), [updateAnnouncementStatus]);
  const handleReactivate = React.useCallback((announcementId: string) => updateAnnouncementStatus(announcementId, 'Live'), [updateAnnouncementStatus]);
  const handleCancel = React.useCallback((announcementId: string) => updateAnnouncementStatus(announcementId, 'Archived'), [updateAnnouncementStatus]);
  const handleView = React.useCallback((announcement: Announcement) => setViewingAnnouncement(announcement), []);

  const createSortHandler = (setter: React.Dispatch<React.SetStateAction<{ key: keyof Announcement; order: 'asc' | 'desc' }>>) => (key: keyof Announcement) => {
    setter(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortAnnouncements = (data: Announcement[], sortConfig: { key: keyof Announcement; order: 'asc' | 'desc' }) => {
    return [...data].sort((a,b) => {
        const valA = (a as any)[sortConfig.key] ?? '';
        const valB = (b as any)[sortConfig.key] ?? '';
        const order = sortConfig.order === 'asc' ? 1 : -1;
        if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB) * order;
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
     });
  };

  const filteredLiveAnnouncements = React.useMemo(() => {
    let filtered = announcements
      .filter(a => a.status !== 'Archived')
      .filter(a => subjectFilter ? a.subject.toLowerCase().includes(subjectFilter.toLowerCase()) : true)
      .filter(a => {
        if (typeFilter.length === 0) return true;
        const announcementType = a.type === 'Standard' && a.severity === 'urgent' ? 'Urgent' : a.type;
        return typeFilter.includes(announcementType);
      })
      .filter(a => statusFilter.length > 0 ? statusFilter.includes(a.status) : true);
    return sortAnnouncements(filtered, sorting);
  }, [announcements, subjectFilter, typeFilter, statusFilter, sorting]);

  const paginatedLiveAnnouncements = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredLiveAnnouncements.slice(start, start + pagination.pageSize);
  }, [filteredLiveAnnouncements, pagination]);
  
  const pageCount = Math.ceil(filteredLiveAnnouncements.length / pagination.pageSize);

  const filteredArchivedAnnouncements = React.useMemo(() => {
      let filtered = announcements
        .filter(a => a.status === 'Archived')
        .filter(a => archivedSubjectFilter ? a.subject.toLowerCase().includes(archivedSubjectFilter.toLowerCase()) : true)
        .filter(a => {
          if (archivedTypeFilter.length === 0) return true;
          const announcementType = a.type === 'Standard' && a.severity === 'urgent' ? 'Urgent' : a.type;
          return archivedTypeFilter.includes(announcementType);
        });
      return sortAnnouncements(filtered, archivedSorting);
  }, [announcements, archivedSubjectFilter, archivedTypeFilter, archivedSorting]);

  const paginatedArchivedAnnouncements = React.useMemo(() => {
    const start = archivedPagination.pageIndex * archivedPagination.pageSize;
    return filteredArchivedAnnouncements.slice(start, start + archivedPagination.pageSize);
  }, [filteredArchivedAnnouncements, archivedPagination]);
  const archivedPageCount = Math.ceil(filteredArchivedAnnouncements.length / archivedPagination.pageSize);

  const announcementStats = React.useMemo(() => {
    const list = announcements || [];
    return {
      total: list.length,
      live: list.filter(a => a.status === 'Live').length,
      scheduled: list.filter(a => a.status === 'Scheduled').length,
      urgent: list.filter(a => a.type === 'Standard' && a.severity === 'urgent').length,
      emergency: list.filter(a => a.type === 'Emergency').length,
      paused: list.filter(a => a.status === 'Paused').length,
      archived: list.filter(a => a.status === 'Archived').length,
    };
  }, [announcements]);
  
  if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  // Helper for dynamic box colors
  const getAuthorityBoxStyles = (announcement: Announcement) => {
    if (announcement.type === 'Emergency') {
        return {
            container: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50",
            label: "text-red-700 dark:text-red-400",
            icon: "text-red-500/50"
        };
    }
    if (announcement.type === 'Standard' && announcement.severity === 'urgent') {
        return {
            container: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50",
            label: "text-amber-700 dark:text-amber-400",
            icon: "text-amber-500/50"
        };
    }
    return {
        container: "bg-primary/10 border-primary/20",
        label: "text-primary",
        icon: "text-primary/50"
    };
  };

  return (
    <>
    <div className="space-y-8">
        {/* Central Core Hero Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-primary/15 via-blue-600/10 to-indigo-700/15 border-2 border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest mb-1.5">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <Crown className="h-4 w-4 text-amber-500" />
                    Central Platform Broadcast Engine • Core Omni-Dispatch
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                    <Radio className="h-8 w-8 text-primary animate-pulse" />
                    Platform Announcements & Broadcast Hub
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                    The central command console for ecosystem-wide broadcasts, location-targeted municipal notices, and public safety announcements across all community hubs.
                </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2 shrink-0 relative z-10">
                <div className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-black text-xs flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 text-emerald-500" />
                    {announcementStats.live} Live Omnicast Dispatches
                </div>
            </div>
        </div>

        {/* 6 Top KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Dispatches</p>
                        <div className="p-1 rounded-md bg-primary/10 text-primary">
                            <Send className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black">{announcementStats.total}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Total records logged</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Now</p>
                        <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600">
                            <Radio className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{announcementStats.live}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Broadcasting on feeds</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scheduled</p>
                        <div className="p-1 rounded-md bg-blue-500/10 text-blue-600">
                            <Clock className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-blue-600 dark:text-blue-400">{announcementStats.scheduled}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Awaiting release date</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Urgent Priority</p>
                        <div className="p-1 rounded-md bg-amber-500/10 text-amber-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-amber-600 dark:text-amber-400">{announcementStats.urgent}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">High-visibility banner</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-rose-600 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Emergencies</p>
                        <div className="p-1 rounded-md bg-rose-600/10 text-rose-600">
                            <Siren className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-rose-600 dark:text-rose-400">{announcementStats.emergency}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">System override alerts</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-slate-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Archived</p>
                        <div className="p-1 rounded-md bg-slate-500/10 text-slate-600">
                            <Archive className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-slate-600 dark:text-slate-400">{announcementStats.archived}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Historical audit log</p>
                </CardContent>
            </Card>
        </div>

        <BroadcastComposer />

        <Card className="border-t-4 border-t-primary shadow-sm">
            <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-transparent rounded-t-lg">
                 <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold">Platform Announcement History</CardTitle>
                        <CardDescription>View, monitor live engagement, pause, or audit your scheduled and active dispatches.</CardDescription>
                    </div>
                </div>
                 <div className="flex items-center gap-2 pt-4">
                    <Input
                        placeholder="Filter by subject..."
                        value={subjectFilter}
                        onChange={(event) => setSubjectFilter(event.target.value)}
                        className="max-w-xs h-9 border-primary/20"
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9 font-bold text-xs">
                            Type <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {announcementTypes.map(type => (
                                <DropdownMenuCheckboxItem
                                    key={type}
                                    checked={typeFilter.includes(type)}
                                    onCheckedChange={() => {
                                        setTypeFilter(prev => prev.includes(type) ? prev.filter(p => p !== type) : [...prev, type]);
                                    }}
                                >
                                    {type}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9 font-bold text-xs">
                            Status <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                             {allStatuses.filter(s => s !== 'Archived').map(status => (
                                <DropdownMenuCheckboxItem
                                    key={status}
                                    checked={statusFilter.includes(status)}
                                    onCheckedChange={() => {
                                        setStatusFilter(prev => prev.includes(status) ? prev.filter(p => p !== status) : [...prev, status]);
                                    }}
                                >
                                    {status}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {(subjectFilter || typeFilter.length > 0 || statusFilter.length > 0) && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSubjectFilter("");
                                setTypeFilter([]);
                                setStatusFilter([]);
                            }}
                        >
                            Reset
                            <FilterX className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table className="responsive-table">
                        <TableHeader className="table-header">
                            <TableRow>
                                <TableHead><Checkbox /></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('type')}>Type <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('audience')}>Audience <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('scheduledDates')}>Scheduled Dates <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => createSortHandler(setSorting)('sentBy')}>Sent By <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedLiveAnnouncements.length > 0 ? (
                                paginatedLiveAnnouncements.map((announcement) => (
                                    <AnnouncementRow
                                        key={announcement.id}
                                        announcement={announcement}
                                        onPause={handlePause}
                                        onReactivate={handleReactivate}
                                        onCancel={handleCancel}
                                        onView={handleView}
                                    />
                                ))
                            ) : (
                                <TableRow className="table-row">
                                    <TableCell colSpan={8} className="table-cell h-24 text-center">
                                        No active platform dispatches found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={filteredLiveAnnouncements.length} />
            </CardContent>
        </Card>

        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5" />
                        <h3 className="text-lg font-medium">View My Archived Platform Dispatches</h3>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <Card className="border-t-4 border-t-slate-500 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-slate-500/5 via-transparent to-transparent rounded-t-lg">
                            <CardTitle className="text-lg font-bold">My Archived Dispatches</CardTitle>
                            <CardDescription>A list of your past and archived platform dispatches.</CardDescription>
                             <div className="flex items-center gap-2 pt-4">
                                <Input
                                    placeholder="Filter by subject..."
                                    value={archivedSubjectFilter}
                                    onChange={(event) => setArchivedSubjectFilter(event.target.value)}
                                    className="max-w-xs"
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                        Type <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {announcementTypes.map(type => (
                                            <DropdownMenuCheckboxItem
                                                key={type}
                                                checked={archivedTypeFilter.includes(type)}
                                                onCheckedChange={() => {
                                                     setArchivedTypeFilter(prev => prev.includes(type) ? prev.filter(p => p !== type) : [...prev, type]);
                                                }}
                                            >
                                                {type}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {(archivedSubjectFilter || archivedTypeFilter.length > 0) && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setArchivedSubjectFilter("");
                                            setArchivedTypeFilter([]);
                                        }}
                                    >
                                        Reset
                                        <FilterX className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="rounded-md border">
                                <Table className="responsive-table">
                                    <TableHeader className="table-header">
                                        <TableRow>
                                            <TableHead><Checkbox /></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('type')}>Type <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('audience')}>Audience <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('scheduledDates')}>Scheduled Dates <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('sentBy')}>Sent By <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedArchivedAnnouncements.length > 0 ? (
                                            paginatedArchivedAnnouncements.map((announcement) => (
                                                <AnnouncementRow
                                                    key={announcement.id}
                                                    announcement={announcement}
                                                    onPause={handlePause}
                                                    onReactivate={handleReactivate}
                                                    onCancel={handleCancel}
                                                    onView={handleView}
                                                />
                                            ))
                                        ) : (
                                            <TableRow className="table-row">
                                                <TableCell colSpan={8} className="table-cell h-24 text-center">
                                                    No archived platform dispatches found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <PaginationControls pagination={archivedPagination} setPagination={setArchivedPagination} pageCount={archivedPageCount} totalRows={filteredArchivedAnnouncements.length} />
                        </CardContent>
                    </Card>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
    
    <Dialog open={!!viewingAnnouncement} onOpenChange={(isOpen) => !isOpen && setViewingAnnouncement(null)}>
        <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden border-2 shadow-2xl">
            <DialogHeader className="p-6 pb-4 border-b shrink-0 text-center sm:text-left flex flex-row items-center justify-between bg-primary/5">
                <div className="space-y-1 text-left">
                    <DialogTitle className="font-black text-2xl tracking-tighter flex items-center gap-2">
                        <Fingerprint className="h-6 w-6 text-primary" />
                        Official Investigative Audit Record
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Permanent Platform Forensic communication log &bull; System Verified
                    </DialogDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="shrink-0 gap-2 font-bold uppercase tracking-tighter text-xs shadow-sm bg-white no-print">
                    <Printer className="h-3.5 w-3.5" /> Print Forensic Report
                </Button>
            </DialogHeader>
            <ScrollArea className="flex-1">
                {viewingAnnouncement && (() => {
                    const styles = getAuthorityBoxStyles(viewingAnnouncement);
                    return (
                        <div className="p-6 space-y-10">
                            <section className={cn("p-6 rounded-2xl border-2 space-y-6 transition-colors duration-500", styles.container)}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <h4 className={cn("text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2", styles.label)}>
                                            <ShieldAlert className="h-3 w-3" />
                                            Verified Sender Authority
                                        </h4>
                                        <p className="text-3xl font-black font-headline tracking-tighter text-foreground flex items-center gap-3">
                                            <UserCircle className={cn("h-8 w-8", styles.icon)} />
                                            {viewingAnnouncement.sentBy}
                                        </p>
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase bg-white/50 px-2 py-0.5 rounded w-fit border border-primary/10">
                                            Authority ID: {viewingAnnouncement.ownerId || viewingAnnouncement.userId || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-2 md:text-right">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Log Timestamp of Origin</h4>
                                        <p className="text-sm font-bold flex md:justify-end items-center gap-2">
                                            <Clock className={cn("h-4 w-4", styles.label)} />
                                            {viewingAnnouncement.createdAt?.toDate ? format(viewingAnnouncement.createdAt.toDate(), "PPPP 'at' HH:mm:ss 'UTC'") : 'N/A'}
                                        </p>
                                        <Badge variant="outline" className="bg-background font-black uppercase text-[10px] tracking-widest">
                                            Scope: {viewingAnnouncement.scope}-level
                                        </Badge>
                                    </div>
                                </div>
                            </section>

                            {viewingAnnouncement.image && (
                                <div className="relative w-1/3 mx-auto aspect-video rounded-xl overflow-hidden shadow-sm border bg-muted group">
                                    <Image src={viewingAnnouncement.image} alt="Announcement Image" fill className="object-cover" />
                                    <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">Media Attachment</div>
                                </div>
                            )}

                            <section className="space-y-4">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        Broadcast Subject Heading
                                    </h4>
                                    <p className="text-2xl font-black font-headline tracking-tight text-foreground leading-none">{viewingAnnouncement.subject}</p>
                                </div>
                                <Separator className="opacity-50" />
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Validated Message Body</h4>
                                    <div className="text-sm text-foreground bg-muted/20 p-5 rounded-xl border border-dashed prose dark:prose-invert max-w-none shadow-inner leading-relaxed" dangerouslySetInnerHTML={{ __html: viewingAnnouncement.message }} />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                    <Globe className="h-3 w-3" />
                                    Targeted Jurisdictional Routing Audit
                                </h4>
                                <div className="p-4 rounded-xl bg-muted/30 border-2 border-primary/10">
                                    <GeographicalPath audience={viewingAnnouncement.audience} />
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase mt-4 italic tracking-tighter opacity-70 border-t pt-2">
                                        Legal Notice: This broadcast was restricted to verified recipients in the jurisdictional route resolved above.
                                    </p>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <History className="h-3 w-3" />
                                    Forensic Lifecycle Audit Timeline
                                </h4>
                                <div className="space-y-6 pl-4 border-l-2 border-muted ml-2">
                                    {Array.isArray(viewingAnnouncement.history) ? (
                                        viewingAnnouncement.history.map((log: any, i: number) => (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background ring-2 ring-primary/20" />
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="secondary" className="text-[9px] uppercase font-black bg-slate-900 text-white dark:bg-white dark:text-slate-900">{log.status}</Badge>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actor Auth ID: {log.actorId}</span>
                                                    </div>
                                                    <p className="text-[11px] font-medium flex items-center gap-1.5 text-foreground/70">
                                                        <Clock className="h-3 w-3" />
                                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), "PPPP 'at' HH:mm:ss 'UTC'") : 'TIMESTAMP CORRUPT'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-muted-foreground italic p-4 bg-muted/20 rounded border border-dashed flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 opacity-50" />
                                            Historical action array missing from database record. Initial creation timestamp used for baseline.
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="pt-4">
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="raw-json" className="border-none">
                                        <AccordionTrigger className="bg-slate-900 text-white p-4 rounded-xl hover:no-underline">
                                            <div className="flex items-center gap-3">
                                                <Database className="h-4 w-4 text-primary" />
                                                <span className="font-black uppercase text-xs tracking-widest">Access Raw System Log (Forensic JSON)</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-4">
                                            <div className="bg-muted p-4 rounded-lg border font-mono text-[10px] whitespace-pre overflow-x-auto shadow-inner">
                                                {JSON.stringify(viewingAnnouncement, null, 2)}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </section>

                            <div className="flex items-center gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-lg group">
                                <Fingerprint className="h-8 w-8 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">Global Database Audit Reference</h4>
                                    <p className="text-[10px] font-mono truncate opacity-60 select-all">{viewingAnnouncement.id}</p>
                                </div>
                                <Info className="h-4 w-4 opacity-30" />
                            </div>
                        </div>
                    );
                })()}
            </ScrollArea>
            <DialogFooter className="p-6 pt-4 border-t shrink-0 bg-muted/10 no-print">
                <Button variant="outline" onClick={() => setViewingAnnouncement(null)} className="w-full sm:w-auto font-black uppercase tracking-tighter text-xs h-10 border-2">Close Investigation</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
