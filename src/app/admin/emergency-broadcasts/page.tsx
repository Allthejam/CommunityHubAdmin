"use client";

import * as React from "react";
import {
    MoreHorizontal,
    Megaphone,
    Archive,
    Eye,
    Info,
    Loader2,
    XCircle,
    ArrowUpDown,
    ChevronsLeft,
    ChevronLeft,
    ChevronRight,
    ChevronsRight,
    MapPin,
    Target,
    Printer,
    User,
    Users,
    Calendar,
    ShieldCheck,
    Clock,
    FileText,
    Siren,
    Bell,
    History,
    Fingerprint,
    Globe,
    AlertTriangle,
    CheckCircle2,
    Database,
    ShieldAlert,
    UserCircle,
    HelpCircle,
    RotateCw,
    Trash2,
    FilterX,
    Building2,
    Shield,
    Radio,
    Layers,
} from "lucide-react"
import { collection, query, onSnapshot, doc, updateDoc, getDocs, getDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { printForensicAuditReport } from "@/lib/utils/printForensicReport";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Announcement } from "@/lib/announcement-data";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays } from "date-fns";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { runAnnouncementCleanupAction } from "@/lib/actions/announcementActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface EnrichedAnnouncement extends Announcement {
    isRegional?: boolean;
    regionalAuthorityName?: string;
    targetCommunityNames?: string[];
    targetCommunityIdsList?: string[];
}

const GeographicalPath = ({ audience, targetCommunityNames }: { audience: any; targetCommunityNames?: string[] }) => {
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
                if (targetCommunityNames && targetCommunityNames.length > 0) {
                    parts.push(`[${targetCommunityNames.join(', ')}]`);
                } else if (audience.communities?.length > 0) {
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
    }, [audience, db, targetCommunityNames]);

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

const getTypeBadge = (announcement: EnrichedAnnouncement) => {
    if (announcement.type === 'Standard' && announcement.severity === 'urgent') {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200">Urgent</Badge>;
    }
    const typeStyles: { [key in Announcement["type"]]: string } = {
        Standard: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
        Emergency: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200",
    };
    return <Badge className={cn(typeStyles[announcement.type])}>{announcement.type}</Badge>;
};

const getStatusBadge = (status: Announcement['status']) => {
     const statusStyles: { [key in Announcement["status"]]: string } = {
        Live: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
        Paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
        Scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
        Archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
    };
    return <Badge className={cn(statusStyles[status])}>{status}</Badge>;
}

/**
 * Renders target community badges with expandable popover if multiple communities are selected
 */
const TargetCommunitiesCell = ({ communities }: { communities?: string[] }) => {
    if (!communities || communities.length === 0) {
        return <span className="text-xs text-muted-foreground italic">All Boundary Hubs</span>;
    }

    if (communities.length <= 2) {
        return (
            <div className="flex flex-wrap gap-1">
                {communities.map((name, i) => (
                    <Badge key={i} variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[11px] font-semibold">
                        <MapPin className="h-3 w-3 mr-1 text-emerald-500" />
                        {name}
                    </Badge>
                ))}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[11px] font-semibold">
                <MapPin className="h-3 w-3 mr-1 text-emerald-500" />
                {communities[0]}
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[11px] font-semibold">
                <MapPin className="h-3 w-3 mr-1 text-emerald-500" />
                {communities[1]}
            </Badge>
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-5 px-1.5 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200" onClick={(e) => e.stopPropagation()}>
                        +{communities.length - 2} more
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 shadow-xl border-2" align="start" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            Targeted Communities ({communities.length})
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-1 divide-y">
                            {communities.map((name, i) => (
                                <div key={i} className="pt-1 first:pt-0 text-xs font-medium flex items-center gap-1.5 text-foreground">
                                    <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                                    <span>{name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

// Standard Community Broadcast Row
const CommunityAnnouncementRow = React.memo(({ announcement, onView, onCancel, isStale }: {
    announcement: EnrichedAnnouncement;
    onView: (announcement: EnrichedAnnouncement) => void;
    onCancel: (id: string) => void;
    isStale: boolean;
}) => {
    const isArchived = announcement.status === 'Archived';

    const getAudienceSummary = () => {
        const aud = announcement.audience;
        if (!aud || typeof aud !== 'object') return 'Legacy Structure';
        if (aud.type === 'all') return 'Full Platform';
        if (aud.type === 'roles') return `${aud.roles?.length || 0} Target Roles`;
        if (aud.type === 'location') return 'Targeted Geography';
        return 'Unknown';
    }

    return (
        <TableRow className={cn("table-row hover:bg-muted/50 transition-colors cursor-context-menu", isStale && "bg-amber-50/50 hover:bg-amber-100/50")} onClick={() => onView(announcement)}>
            <TableCell className="table-cell" data-label="Select" onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
            <TableCell className="table-cell font-medium" data-label="Subject">
                <div className="flex items-center gap-2">
                    {isStale && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" title="Stale content: older than 14 days with no expiry date" />}
                    <span className="font-bold text-foreground">{announcement.subject.length > 40 ? announcement.subject.substring(0, 40) + "..." : announcement.subject}</span>
                </div>
            </TableCell>
            <TableCell className="table-cell" data-label="Type">{getTypeBadge(announcement)}</TableCell>
            <TableCell className="table-cell font-semibold" data-label="Community">{announcement.communityName || 'Platform-Wide'}</TableCell>
            <TableCell className="table-cell" data-label="Audience">{getAudienceSummary()}</TableCell>
            <TableCell className="table-cell" data-label="Status">{getStatusBadge(announcement.status)}</TableCell>
            <TableCell className="table-cell text-xs font-mono" data-label="Scheduled Dates">{announcement.scheduledDates}</TableCell>
            <TableCell className="table-cell text-xs" data-label="Sent By">{announcement.sentBy}</TableCell>
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
                        {!isArchived && (
                            <DropdownMenuItem
                                onClick={() => onCancel(announcement.id)}
                                className="text-amber-600 focus:bg-amber-100 focus:text-amber-700 dark:text-amber-400 dark:focus:bg-amber-900/50 dark:focus:text-amber-300"
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Archive Broadcast
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    )
});
CommunityAnnouncementRow.displayName = "CommunityAnnouncementRow";

// Dedicated Regional Announcement Row
const RegionalAnnouncementRow = React.memo(({ announcement, onView, onCancel, isStale }: {
    announcement: EnrichedAnnouncement;
    onView: (announcement: EnrichedAnnouncement) => void;
    onCancel: (id: string) => void;
    isStale: boolean;
}) => {
    const isArchived = announcement.status === 'Archived';
    const targetCount = announcement.targetCommunityNames?.length || 0;

    return (
        <TableRow className={cn("table-row hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors cursor-context-menu", isStale && "bg-amber-50/50 hover:bg-amber-100/50")} onClick={() => onView(announcement)}>
            <TableCell className="table-cell" data-label="Select" onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
            <TableCell className="table-cell font-medium" data-label="Subject">
                <div className="flex items-center gap-2">
                    {isStale && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" title="Stale content: older than 14 days with no expiry date" />}
                    <span className="font-bold text-indigo-950 dark:text-indigo-200">
                        {announcement.subject.length > 38 ? announcement.subject.substring(0, 38) + "..." : announcement.subject}
                    </span>
                </div>
            </TableCell>
            <TableCell className="table-cell" data-label="Type">{getTypeBadge(announcement)}</TableCell>
            <TableCell className="table-cell" data-label="Regional Authority">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                    <span className="truncate">{announcement.regionalAuthorityName || announcement.sentBy || 'Regional Network'}</span>
                </div>
            </TableCell>
            <TableCell className="table-cell" data-label="Target Communities">
                <TargetCommunitiesCell communities={announcement.targetCommunityNames} />
            </TableCell>
            <TableCell className="table-cell" data-label="Scope & Reach">
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 font-bold text-[10px]">
                    <Radio className="h-3 w-3 mr-1" />
                    {targetCount > 0 ? `${targetCount} Local Hub${targetCount > 1 ? 's' : ''}` : "All Member Hubs"}
                </Badge>
            </TableCell>
            <TableCell className="table-cell" data-label="Status">{getStatusBadge(announcement.status)}</TableCell>
            <TableCell className="table-cell text-xs font-mono" data-label="Scheduled Dates">{announcement.scheduledDates}</TableCell>
            <TableCell className="table-cell text-xs" data-label="Sent By">{announcement.sentBy}</TableCell>
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
                        {!isArchived && (
                            <DropdownMenuItem
                                onClick={() => onCancel(announcement.id)}
                                className="text-amber-600 focus:bg-amber-100 focus:text-amber-700 dark:text-amber-400 dark:focus:bg-amber-900/50 dark:focus:text-amber-300"
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Archive Broadcast
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
});
RegionalAnnouncementRow.displayName = "RegionalAnnouncementRow";


export default function AdminEmergencyPage() {
  const [announcements, setAnnouncements] = React.useState<EnrichedAnnouncement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isCleaning, setIsCleaning] = React.useState(false);
  const [staleCount, setStaleCount] = React.useState(0);
  const [viewingAnnouncement, setViewingAnnouncement] = React.useState<EnrichedAnnouncement | null>(null);
  const [showStaleOnly, setShowStaleOnly] = React.useState(false);
  const { user } = useUser();
  const { toast } = useToast();
  const db = useFirestore();
  
  // Sorting & Pagination for Community table
  const [commSorting, setCommSorting] = React.useState<{ key: keyof EnrichedAnnouncement; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
  const [commPagination, setCommPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  // Sorting & Pagination for Regional table
  const [regSorting, setRegSorting] = React.useState<{ key: keyof EnrichedAnnouncement; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
  const [regPagination, setRegPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  
  // Sorting & Pagination for Archive table
  const [archivedSorting, setArchivedSorting] = React.useState<{ key: keyof EnrichedAnnouncement; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
  const [archivedPagination, setArchivedPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const getStaleCutoff = React.useMemo(() => subDays(new Date(), 14), []);

  const isStale = React.useCallback((announcement: Announcement) => {
    if (announcement.status === 'Archived' || announcement.endDate) return false;
    const createdAt = announcement.createdAt?.toDate ? announcement.createdAt.toDate() : new Date(announcement.createdAt);
    return createdAt < getStaleCutoff;
  }, [getStaleCutoff]);

  React.useEffect(() => {
    if (!user || !db) {
        setLoading(false);
        return;
    }

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch communities and build map
            const communitiesSnapshot = await getDocs(collection(db, "communities"));
            const communitiesMap = new Map<string, string>();
            communitiesSnapshot.forEach(doc => {
                communitiesMap.set(doc.id, doc.data().name);
            });

            // 2. Fetch users to identify regional authority senders
            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersMap = new Map<string, any>();
            usersSnapshot.forEach(doc => {
                usersMap.set(doc.id, doc.data());
            });

            // 3. Listen to announcements collection
            const announcementsQuery = query(collection(db, "announcements"));
            const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
                const allAnnouncements: EnrichedAnnouncement[] = [];
                let identifiedStale = 0;

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const senderId = data.ownerId || data.userId || data.creatorId;
                    const senderUser = usersMap.get(senderId);

                    // Check if sender is a Regional Network Account
                    const isRegional = 
                        data.scope === 'regional' || 
                        data.isRegional === true || 
                        data.isRegionalNetwork === true ||
                        data.authorAccountType === 'regional' || 
                        senderUser?.accountType === 'regional' ||
                        (Array.isArray(data.targetCommunityIds) && data.targetCommunityIds.length > 0 && (data.isRegionalNetwork || data.scope === 'regional' || senderUser?.accountType === 'regional'));

                    // Resolve target community names
                    let targetCommunityIdsList: string[] = [];
                    if (Array.isArray(data.targetCommunityIds) && data.targetCommunityIds.length > 0) {
                        targetCommunityIdsList = data.targetCommunityIds;
                    } else if (Array.isArray(data.audience?.communities) && data.audience.communities.length > 0) {
                        targetCommunityIdsList = data.audience.communities;
                    } else if (data.communityId) {
                        targetCommunityIdsList = [data.communityId];
                    }

                    const targetCommunityNames = targetCommunityIdsList
                        .map(cid => communitiesMap.get(cid) || `Hub [${cid.substring(0, 5)}]`);

                    let communityName: string | undefined;
                    if (data.scope === 'community' && data.communityId) {
                        communityName = communitiesMap.get(data.communityId) || "Unknown Community";
                    } else if (targetCommunityNames.length === 1) {
                        communityName = targetCommunityNames[0];
                    } else if (targetCommunityNames.length > 1) {
                        communityName = `${targetCommunityNames.length} Communities`;
                    }

                    const regionalAuthorityName = 
                        data.organizationName || 
                        data.creator ||
                        senderUser?.organizationName || 
                        senderUser?.businessName || 
                        data.sentBy || 
                        'Regional Network Authority';

                    let scheduledDatesDisplay = data.scheduledDates;
                    if (scheduledDatesDisplay === 'Active') {
                        scheduledDatesDisplay = 'Immediate Dispatch';
                    } else if (!scheduledDatesDisplay) {
                        if (data.startDate && data.endDate) {
                            scheduledDatesDisplay = `${format(data.startDate.toDate(), "PPP")} - ${format(data.endDate.toDate(), "PPP")}`;
                        } else if (data.createdAt?.toDate) {
                            scheduledDatesDisplay = format(data.createdAt.toDate(), "PPP");
                        } else {
                            scheduledDatesDisplay = 'Immediate Dispatch';
                        }
                    }

                    const announcement = {
                        id: doc.id,
                        ...data,
                        isRegional,
                        regionalAuthorityName,
                        targetCommunityNames,
                        targetCommunityIdsList,
                        communityName: communityName,
                        scheduledDates: scheduledDatesDisplay,
                    } as EnrichedAnnouncement;

                    if (isStale(announcement)) {
                        identifiedStale++;
                    }

                    allAnnouncements.push(announcement);
                });

                setAnnouncements(allAnnouncements);
                setStaleCount(identifiedStale);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching announcements:", error);
                toast({ title: "Error", description: "Could not fetch global log.", variant: "destructive" });
                setLoading(false);
            });

            return unsubscribe;
        } catch (error) {
            console.error("Error in initial load:", error);
            setLoading(false);
        }
    };

    const unsubPromise = fetchInitialData();
    return () => { unsubPromise.then(unsub => unsub?.()) };

  }, [user, db, toast, isStale]);
  
  const handleView = React.useCallback((announcement: EnrichedAnnouncement) => setViewingAnnouncement(announcement), []);

  const handleCancel = React.useCallback(async (announcement: EnrichedAnnouncement | string) => {
    if (!db || !user) return;
    const id = typeof announcement === 'string' ? announcement : announcement.id;
    const subject = typeof announcement === 'object' ? announcement.subject : undefined;

    try {
        const announcementRef = doc(db, 'announcements', id);
        const existingHistory = (typeof announcement === 'object' && Array.isArray(announcement.history)) 
            ? announcement.history 
            : (viewingAnnouncement?.history || []);
        
        await updateDoc(announcementRef, { 
            status: "Archived",
            history: [...existingHistory, { status: "Archived", actorId: user.uid, timestamp: new Date(), reason: "Manually archived by Administrator" }]
        });

        // Also update direct ID match in regionalBroadcasts
        try {
            await updateDoc(doc(db, 'regionalBroadcasts', id), { status: "Archived", updatedAt: new Date() });
        } catch (_) {}

        // Also update matching title in regionalBroadcasts
        if (subject) {
            try {
                const regQuery = query(collection(db, 'regionalBroadcasts'), where('title', '==', subject));
                const regSnap = await getDocs(regQuery);
                regSnap.forEach(async (d) => {
                    await updateDoc(doc(db, 'regionalBroadcasts', d.id), { status: 'Archived', updatedAt: new Date() });
                });
            } catch (_) {}
        }

        toast({ title: "Broadcast Archived", description: `Record moved to historical archive.`});
    } catch (error: any) {
        console.error("Error archiving broadcast:", error);
        toast({ title: "Error", description: error.message || "Failed to archive the broadcast.", variant: "destructive"});
    }
  }, [toast, db, user, viewingAnnouncement]);

  const handleReactivate = React.useCallback(async (announcement: EnrichedAnnouncement) => {
    if (!db || !user) return;
    try {
        const announcementRef = doc(db, 'announcements', announcement.id);
        const historyEntry = {
            status: "Live",
            actorId: user.uid,
            timestamp: new Date(),
            reason: "Manually restored to Live by Administrator"
        };
        const existingHistory = Array.isArray(announcement.history) ? announcement.history : [];
        await updateDoc(announcementRef, { 
            status: "Live",
            history: [...existingHistory, historyEntry],
            updatedAt: new Date()
        });

        // Also update regionalBroadcasts document if direct ID match
        try {
            await updateDoc(doc(db, 'regionalBroadcasts', announcement.id), { status: "Live", updatedAt: new Date() });
        } catch (_) {}

        // Also update matching title in regionalBroadcasts
        if (announcement.subject) {
            try {
                const regQuery = query(collection(db, 'regionalBroadcasts'), where('title', '==', announcement.subject));
                const regSnap = await getDocs(regQuery);
                regSnap.forEach(async (d) => {
                    await updateDoc(doc(db, 'regionalBroadcasts', d.id), { status: 'Live', updatedAt: new Date() });
                });
            } catch (_) {}
        }

        toast({ title: "Broadcast Restored to Live", description: `Record is now Live and returned to active tables.`});
    } catch (error: any) {
        console.error("Error reactivating broadcast:", error);
        toast({ title: "Error", description: error.message || "Failed to reactivate broadcast.", variant: "destructive"});
    }
  }, [toast, db, user]);

  const handleMaintenanceSweep = async () => {
    if (!confirm("Are you sure you want to archive all broadcasts that have been active for more than 14 days without an expiry date?")) return;
    
    setIsCleaning(true);
    try {
        const result = await runAnnouncementCleanupAction();
        if (result.success) {
            toast({ title: "Sweep Complete", description: `Successfully archived ${result.count} stale broadcasts.` });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ title: "Sweep Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsCleaning(false);
    }
  };

  const handlePrintForensicReport = () => {
    if (viewingAnnouncement) {
      printForensicAuditReport(viewingAnnouncement);
    }
  };
  
  const createSortHandler = (
    setter: React.Dispatch<React.SetStateAction<{ key: keyof EnrichedAnnouncement; order: 'asc' | 'desc' }>>
  ) => (key: keyof EnrichedAnnouncement) => {
    setter(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortAnnouncements = (data: EnrichedAnnouncement[], sortConfig: { key: keyof EnrichedAnnouncement; order: 'asc' | 'desc' }) => {
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

  // Partition announcements into live community, live regional, and archived
  const liveCommunityAnnouncements = announcements.filter(a => a.status !== 'Archived' && !a.isRegional);
  const liveRegionalAnnouncements = announcements.filter(a => a.status !== 'Archived' && a.isRegional);
  const archivedAnnouncements = announcements.filter(a => a.status === 'Archived');
  
  // Filtered Community Announcements
  const filteredCommunityAnnouncements = React.useMemo(() => {
      let filtered = liveCommunityAnnouncements;
      if (showStaleOnly) {
          filtered = filtered.filter(isStale);
      }
      return sortAnnouncements(filtered, commSorting);
  }, [liveCommunityAnnouncements, commSorting, showStaleOnly, isStale]);

  const commPageCount = Math.ceil(filteredCommunityAnnouncements.length / commPagination.pageSize);
  const paginatedCommunityAnnouncements = React.useMemo(() => {
    const start = commPagination.pageIndex * commPagination.pageSize;
    return filteredCommunityAnnouncements.slice(start, start + commPagination.pageSize);
  }, [filteredCommunityAnnouncements, commPagination]);

  // Filtered Regional Announcements
  const filteredRegionalAnnouncements = React.useMemo(() => {
      let filtered = liveRegionalAnnouncements;
      if (showStaleOnly) {
          filtered = filtered.filter(isStale);
      }
      return sortAnnouncements(filtered, regSorting);
  }, [liveRegionalAnnouncements, regSorting, showStaleOnly, isStale]);

  const regPageCount = Math.ceil(filteredRegionalAnnouncements.length / regPagination.pageSize);
  const paginatedRegionalAnnouncements = React.useMemo(() => {
    const start = regPagination.pageIndex * regPagination.pageSize;
    return filteredRegionalAnnouncements.slice(start, start + regPagination.pageSize);
  }, [filteredRegionalAnnouncements, regPagination]);

  // Filtered Archived Announcements
  const filteredArchivedAnnouncements = React.useMemo(() => sortAnnouncements(archivedAnnouncements, archivedSorting), [archivedAnnouncements, archivedSorting]);
  const archivedPageCount = Math.ceil(filteredArchivedAnnouncements.length / archivedPagination.pageSize);
  const paginatedArchivedAnnouncements = React.useMemo(() => {
    const start = archivedPagination.pageIndex * archivedPagination.pageSize;
    return filteredArchivedAnnouncements.slice(start, start + archivedPagination.pageSize);
  }, [filteredArchivedAnnouncements, archivedPagination]);

  
  const emergencyStats = React.useMemo(() => {
    const list = announcements || [];
    return {
      total: list.length,
      community: list.filter(a => a.status !== 'Archived' && !a.isRegional).length,
      regional: list.filter(a => a.status !== 'Archived' && a.isRegional).length,
      live: list.filter(a => a.status === 'Live').length,
      emergency: list.filter(a => a.type === 'Emergency').length,
      urgent: list.filter(a => a.type === 'Standard' && a.severity === 'urgent').length,
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

  // Helper for dynamic box colors
  const getAuthorityBoxStyles = (announcement: EnrichedAnnouncement) => {
    if (announcement.type === 'Emergency') {
        return {
            container: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50",
            label: "text-red-700 dark:text-red-400",
            icon: "text-red-500/50"
        };
    }
    if (announcement.isRegional) {
        return {
            container: "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/50",
            label: "text-indigo-700 dark:text-indigo-400",
            icon: "text-indigo-500/50"
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
        {/* Emergency Hero Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-rose-600/15 via-indigo-600/10 to-amber-600/10 border-2 border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
            <div>
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest mb-1.5">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                    <Siren className="h-4 w-4 text-rose-600" />
                    Civil Defense & Public Safety Telemetry
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                    <Megaphone className="h-8 w-8 text-rose-600" />
                    Global Broadcasts & Emergency Console
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                    Audit, track, override, and archive critical high-priority dispatches and life-safety alerts deployed across local community hubs and regional networks.
                </p>
            </div>
             <Card className={cn(
                "w-full sm:w-auto border-2 transition-all shrink-0",
                staleCount > 0 ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-slate-200"
            )}>
                <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                        "p-2 rounded-full",
                        staleCount > 0 ? "bg-amber-500 text-white animate-pulse" : "bg-slate-100 text-slate-400"
                    )}>
                        <RotateCw className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Maintenance Sweep</p>
                        <p className="text-sm font-bold">
                            {staleCount > 0 ? `${staleCount} stale broadcasts` : "All broadcasts current"}
                        </p>
                    </div>
                    {staleCount > 0 && (
                        <div className="flex gap-2 ml-2">
                            <Button 
                                size="sm" 
                                variant={showStaleOnly ? "secondary" : "outline"}
                                className="font-black uppercase text-[10px] tracking-widest"
                                onClick={() => setShowStaleOnly(!showStaleOnly)}
                            >
                                {showStaleOnly ? <FilterX className="h-3 w-3 mr-1.5" /> : <Info className="h-3 w-3 mr-1.5" />}
                                {showStaleOnly ? "Show All" : "Review"}
                            </Button>
                            <Button 
                                size="sm" 
                                className="font-black uppercase text-[10px] tracking-widest shadow-sm bg-amber-600 hover:bg-amber-700"
                                onClick={handleMaintenanceSweep}
                                disabled={isCleaning}
                            >
                                {isCleaning ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Trash2 className="h-3 w-3 mr-1.5" />}
                                Sweep
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* 5 Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="border-t-4 border-t-rose-600 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Dispatches</p>
                        <div className="p-1 rounded-md bg-rose-600/10 text-rose-600">
                            <Megaphone className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black">{emergencyStats.total}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Global dispatches</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-indigo-600 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Regional Broadcasts</p>
                        <div className="p-1 rounded-md bg-indigo-600/10 text-indigo-600">
                            <Shield className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{emergencyStats.regional}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Multi-hub authority alerts</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-emerald-600 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Community Broadcasts</p>
                        <div className="p-1 rounded-md bg-emerald-600/10 text-emerald-600">
                            <Building2 className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{emergencyStats.community}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Local town announcements</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-red-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Emergencies / Urgent</p>
                        <div className="p-1 rounded-md bg-red-500/10 text-red-600">
                            <Siren className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-red-600 dark:text-red-400">{emergencyStats.emergency + emergencyStats.urgent}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">High-priority alerts</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-slate-500 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Archived</p>
                        <div className="p-1 rounded-md bg-slate-500/10 text-slate-600">
                            <Archive className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-slate-600 dark:text-slate-400">{emergencyStats.archived}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Historical audit log</p>
                </CardContent>
            </Card>
        </div>

        {/* Dual Tab Console: Community Broadcasts vs Regional Authority Dispatches */}
        <Tabs defaultValue="regional" className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
                <TabsList className="bg-muted p-1 rounded-xl h-11">
                    <TabsTrigger value="regional" className="gap-2 font-bold text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all">
                        <Shield className="h-4 w-4" />
                        Regional Network Dispatches
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-white/20 text-current">
                            {liveRegionalAnnouncements.length}
                        </Badge>
                    </TabsTrigger>
                    
                    <TabsTrigger value="community" className="gap-2 font-bold text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all">
                        <Building2 className="h-4 w-4" />
                        Local Community Broadcasts
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-white/20 text-current">
                            {liveCommunityAnnouncements.length}
                        </Badge>
                    </TabsTrigger>

                    <TabsTrigger value="archive" className="gap-2 font-bold text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white transition-all">
                        <Archive className="h-4 w-4" />
                        Archive Log
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-white/20 text-current">
                            {archivedAnnouncements.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Regional announcements broadcast to multiple communities inside defined boundaries.</span>
                </div>
            </div>

            {/* TAB 1: REGIONAL NETWORK DISPATCHES */}
            <TabsContent value="regional" className="space-y-4 m-0">
                <Card className="border-t-4 border-t-indigo-600 shadow-sm">
                    <CardHeader className="bg-gradient-to-r from-indigo-600/5 via-transparent to-transparent rounded-t-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
                                    <Shield className="h-5 w-5 text-indigo-600" />
                                    Regional Authority Multi-Community Broadcasts
                                </CardTitle>
                                <CardDescription>
                                    Announcements dispatched by Regional Authorities (National Parks, Councils, Emergency Services) targeting 1 or multiple communities within their jurisdiction.
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50 font-bold self-start sm:self-auto">
                                Multi-Community Boundary Routing
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table className="responsive-table">
                                <TableHeader className="table-header">
                                    <TableRow>
                                        <TableHead><Checkbox /></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setRegSorting)('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setRegSorting)('type')}>Type <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setRegSorting)('regionalAuthorityName')}>Regional Authority <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead>Targeted Communities</TableHead>
                                        <TableHead>Reach</TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setRegSorting)('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setRegSorting)('scheduledDates')}>Scheduled <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setRegSorting)('sentBy')}>Dispatched By <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRegionalAnnouncements.length > 0 ? (
                                        paginatedRegionalAnnouncements.map((announcement) => (
                                            <RegionalAnnouncementRow
                                                key={announcement.id}
                                                announcement={announcement}
                                                onView={handleView}
                                                onCancel={handleCancel}
                                                isStale={isStale(announcement)}
                                            />
                                        ))
                                    ) : (
                                        <TableRow className="table-row">
                                            <TableCell colSpan={10} className="table-cell h-28 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Shield className="h-8 w-8 text-indigo-300 animate-pulse" />
                                                    <p className="font-semibold text-sm">No active regional broadcasts found.</p>
                                                    <p className="text-xs">When regional accounts broadcast to member communities, they will appear here.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <PaginationControls pagination={regPagination} setPagination={setRegPagination} pageCount={regPageCount} totalRows={filteredRegionalAnnouncements.length} />
                    </CardContent>
                </Card>
            </TabsContent>

            {/* TAB 2: LOCAL COMMUNITY BROADCASTS */}
            <TabsContent value="community" className="space-y-4 m-0">
                <Card className="border-t-4 border-t-emerald-600 shadow-sm">
                    <CardHeader className="bg-gradient-to-r from-emerald-600/5 via-transparent to-transparent rounded-t-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-950 dark:text-emerald-200">
                                    <Building2 className="h-5 w-5 text-emerald-600" />
                                    Local Community Announcements Log
                                </CardTitle>
                                <CardDescription>
                                    {showStaleOnly ? "Isolating stale content for maintenance review." : "Comprehensive log of active and scheduled alerts issued by local community leaders and admins."}
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 font-bold self-start sm:self-auto">
                                Town & Village Scope
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table className="responsive-table">
                                <TableHeader className="table-header">
                                    <TableRow>
                                        <TableHead><Checkbox /></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setCommSorting)('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setCommSorting)('type')}>Type <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setCommSorting)('communityName')}>Community <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setCommSorting)('audience')}>Audience <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setCommSorting)('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setCommSorting)('scheduledDates')}>Scheduled <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setCommSorting)('sentBy')}>Sent By <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedCommunityAnnouncements.length > 0 ? (
                                        paginatedCommunityAnnouncements.map((announcement) => (
                                            <CommunityAnnouncementRow
                                                key={announcement.id}
                                                announcement={announcement}
                                                onView={handleView}
                                                onCancel={handleCancel}
                                                isStale={isStale(announcement)}
                                            />
                                        ))
                                    ) : (
                                        <TableRow className="table-row">
                                            <TableCell colSpan={9} className="table-cell h-24 text-center">
                                                No active local community broadcasts found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <PaginationControls pagination={commPagination} setPagination={setCommPagination} pageCount={commPageCount} totalRows={filteredCommunityAnnouncements.length} />
                    </CardContent>
                </Card>
            </TabsContent>

            {/* TAB 3: ARCHIVE */}
            <TabsContent value="archive" className="space-y-4 m-0">
                <Card className="border-t-4 border-t-slate-700 shadow-sm">
                    <CardHeader className="bg-gradient-to-r from-slate-700/5 via-transparent to-transparent rounded-t-lg">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Archive className="h-5 w-5 text-slate-600" />
                            Global Broadcast Historical Archive
                        </CardTitle>
                        <CardDescription>A comprehensive forensic record of all expired, completed, and archived broadcasts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table className="responsive-table">
                                <TableHeader className="table-header">
                                    <TableRow>
                                        <TableHead><Checkbox /></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('type')}>Type <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead>Authority / Scope</TableHead>
                                        <TableHead>Target Communities</TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('scheduledDates')}>Scheduled Dates <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('sentBy')}>Sent By <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedArchivedAnnouncements.length > 0 ? (
                                        paginatedArchivedAnnouncements.map((announcement) => (
                                            <TableRow key={announcement.id} className="table-row hover:bg-muted/50 cursor-context-menu" onClick={() => handleView(announcement)}>
                                                <TableCell className="table-cell" data-label="Select" onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
                                                <TableCell className="table-cell font-medium" data-label="Subject">
                                                    <span className="font-semibold">{announcement.subject}</span>
                                                </TableCell>
                                                <TableCell className="table-cell" data-label="Type">{getTypeBadge(announcement)}</TableCell>
                                                <TableCell className="table-cell font-medium" data-label="Scope">
                                                    {announcement.isRegional ? (
                                                        <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50 text-[10px]">
                                                            🛡️ {announcement.regionalAuthorityName || 'Regional'}
                                                        </Badge>
                                                    ) : (
                                                        <span>{announcement.communityName || 'Platform'}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="table-cell" data-label="Target Communities">
                                                    <TargetCommunitiesCell communities={announcement.targetCommunityNames} />
                                                </TableCell>
                                                <TableCell className="table-cell" data-label="Status">{getStatusBadge(announcement.status)}</TableCell>
                                                <TableCell className="table-cell text-xs font-mono" data-label="Scheduled Dates">{announcement.scheduledDates}</TableCell>
                                                <TableCell className="table-cell text-xs" data-label="Sent By">{announcement.sentBy}</TableCell>
                                                <TableCell className="table-cell text-right" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Archive Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleView(announcement)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View Audit Record
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleReactivate(announcement)} className="text-emerald-600 focus:text-emerald-700 font-medium">
                                                                <RotateCw className="mr-2 h-4 w-4" />
                                                                Restore to Live
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => printForensicAuditReport(announcement)}>
                                                                <Printer className="mr-2 h-4 w-4" />
                                                                Print Forensic Report
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow className="table-row">
                                            <TableCell colSpan={9} className="table-cell h-24 text-center">
                                                No archived broadcasts found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <PaginationControls pagination={archivedPagination} setPagination={setArchivedPagination} pageCount={archivedPageCount} totalRows={filteredArchivedAnnouncements.length} />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
    
    {/* Detailed Forensic Audit Record Modal */}
    <Dialog open={!!viewingAnnouncement} onOpenChange={(isOpen) => !isOpen && setViewingAnnouncement(null)}>
        <DialogContent id="printable-forensic-report" className="sm:max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden border-2 shadow-2xl print:h-auto print:max-h-none print:w-full print:max-w-none print:p-0 print:border-none print:shadow-none print:overflow-visible">
            <DialogHeader className="p-6 pb-4 border-b shrink-0 text-center sm:text-left flex flex-row items-center justify-between bg-primary/5">
                <div className="space-y-1 text-left">
                    <DialogTitle className="font-black text-2xl tracking-tighter flex items-center gap-2">
                        <Fingerprint className="h-6 w-6 text-primary" />
                        Official Investigative Audit Record
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Permanent Platform Forensic Communication Log &bull; System Verified
                    </DialogDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handlePrintForensicReport} className="shrink-0 gap-2 font-bold uppercase tracking-tighter text-xs shadow-sm bg-white no-print">
                    <Printer className="h-3.5 w-3.5" /> Print Forensic Report
                </Button>
            </DialogHeader>
            <ScrollArea className="flex-1">
                {viewingAnnouncement && (() => {
                    const styles = getAuthorityBoxStyles(viewingAnnouncement);
                    return (
                        <div className="p-6 space-y-8">
                            {/* Sender Authority Header Card */}
                            <section className={cn("p-6 rounded-2xl border-2 space-y-6 transition-colors duration-500", styles.container)}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <h4 className={cn("text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2", styles.label)}>
                                            {viewingAnnouncement.isRegional ? <Shield className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                                            {viewingAnnouncement.isRegional ? "Verified Regional Authority Sender" : "Verified Sender Authority"}
                                        </h4>
                                        <p className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-foreground flex items-center gap-3">
                                            <UserCircle className={cn("h-8 w-8", styles.icon)} />
                                            {viewingAnnouncement.regionalAuthorityName || viewingAnnouncement.sentBy}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-mono text-muted-foreground uppercase bg-white/50 px-2 py-0.5 rounded w-fit border border-primary/10">
                                                Authority ID: {viewingAnnouncement.ownerId || viewingAnnouncement.userId || 'N/A'}
                                            </p>
                                            {viewingAnnouncement.isRegional && (
                                                <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                                                    Regional Network Tier
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:text-right">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Log Timestamp of Origin</h4>
                                        <p className="text-sm font-bold flex md:justify-end items-center gap-2">
                                            <Clock className={cn("h-4 w-4", styles.label)} />
                                            {viewingAnnouncement.createdAt?.toDate ? format(viewingAnnouncement.createdAt.toDate(), "PPPP 'at' HH:mm:ss 'UTC'") : 'N/A'}
                                        </p>
                                        <Badge variant="outline" className="bg-background font-black uppercase text-[10px] tracking-widest">
                                            Scope: {viewingAnnouncement.isRegional ? 'Regional Multi-Hub' : `${viewingAnnouncement.scope || 'Community'}-level`}
                                        </Badge>
                                    </div>
                                </div>
                            </section>

                            {/* Targeted Communities Section for Regional Broadcasts */}
                            {viewingAnnouncement.targetCommunityNames && viewingAnnouncement.targetCommunityNames.length > 0 && (
                                <section className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                                            <Building2 className="h-4 w-4" />
                                            Targeted Boundary Member Communities ({viewingAnnouncement.targetCommunityNames.length})
                                        </h4>
                                        <Badge variant="outline" className="border-indigo-300 text-indigo-700 text-[10px] font-bold">
                                            Delivery Scope Verified
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        This broadcast was dispatched directly into the community hubs and emergency feeds of the following towns:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {viewingAnnouncement.targetCommunityNames.map((name, i) => (
                                            <Badge key={i} variant="secondary" className="bg-white dark:bg-slate-900 border border-indigo-200 shadow-xs text-xs font-semibold py-1 px-2.5">
                                                <MapPin className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                                {name}
                                            </Badge>
                                        ))}
                                    </div>
                                </section>
                            )}

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
                                    <GeographicalPath audience={viewingAnnouncement.audience} targetCommunityNames={viewingAnnouncement.targetCommunityNames} />
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
                                                    {log.reason && <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">{log.reason}</p>}
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

                            <section className="pt-4 no-print">
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

