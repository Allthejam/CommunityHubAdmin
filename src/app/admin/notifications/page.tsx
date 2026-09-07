"use client";

import * as React from "react";
import {
    BellRing,
    Archive,
    CheckCircle2,
    Eye,
    Loader2,
    Mail,
    CalendarPlus,
    Building,
    Newspaper,
    Handshake,
    MessageSquare,
    AlertTriangle,
    Crown,
    Key,
    Gavel,
    ShieldAlert,
    ShieldCheck,
    MoreHorizontal,
    User,
    ArrowUpDown,
    ExternalLink,
    Shield,
    Sparkles,
    Inbox,
    Filter,
} from "lucide-react"
import { collection, query, where, doc, orderBy, or, onSnapshot } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format, isValid } from "date-fns";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { type Notification, type NotificationStatus, type NotificationType } from "@/lib/types/notifications";
import { 
    updateNotificationStatusAction, 
    deleteNotificationAction, 
    bulkUpdateNotificationStatusAction, 
    bulkDeleteNotificationsAction 
} from "@/lib/actions/notificationActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const TypeIcon = ({ type }: { type: NotificationType }) => {
    switch (type) {
        case "Event Request":
            return <CalendarPlus className="h-5 w-5 text-blue-500" />;
        case "Business Submission":
            return <Building className="h-5 w-5 text-green-500" />;
        case "News Story Submission":
            return <Newspaper className="h-5 w-5 text-purple-500" />;
        case "Partnership Request":
            return <Handshake className="h-5 w-5 text-teal-500" />;
        case "New Message":
            return <MessageSquare className="h-5 w-5 text-indigo-500" />;
        case "General Inquiry":
            return <Mail className="h-5 w-5 text-orange-500" />;
        case "New Report":
            return <AlertTriangle className="h-5 w-5 text-red-500" />;
        case "Leadership Invitation":
            return <Crown className="h-5 w-5 text-amber-500" />;
        case "Special Access Request":
            return <Key className="h-5 w-5 text-destructive" />;
         case "Leader Information Update":
            return <Key className="h-5 w-5 text-blue-500" />;
        case "Boundary Dispute":
            return <Gavel className="h-5 w-5 text-red-500" />;
        case "Leadership Application":
            return <Crown className="h-5 w-5 text-purple-500" />;
         case "Advertiser Profile":
            return <Building className="h-5 w-5 text-indigo-500" />;
        case "Task Assignment":
            return <FileText className="h-5 w-5 text-blue-500" />;
        default:
            return <BellRing className="h-5 w-5 text-muted-foreground" />;
    }
}

const normalizeNotificationStatus = (status: string | undefined): NotificationStatus => {
  if (!status) return 'New';
  const s = status.toLowerCase();
  if (s === 'new' || s === 'unread') return 'New';
  if (s === 'assigned') return 'Assigned';
  if (s === 'complete' || s === 'completed' || s === 'read') return 'Complete';
  if (s === 'reassigned') return 'Reassigned';
  if (s === 'archived') return 'Archived';
  return (status.charAt(0).toUpperCase() + status.slice(1)) as NotificationStatus;
};

const StatusBadge = ({ status }: { status: string }) => {
  const normalized = normalizeNotificationStatus(status);
  const statusConfig: Record<string, string> = {
    New: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    Assigned: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    Complete: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    Reassigned: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
    Archived: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    Read: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };
  return <Badge className={statusConfig[normalized] || "bg-gray-100"}>{normalized}</Badge>;
};

const getSafeDate = (d: any): Date => {
    if (!d) return new Date(0);
    if (d instanceof Date) return d;
    if (typeof d?.toDate === 'function') return d.toDate();
    const date = new Date(d);
    return isValid(date) ? date : new Date(0);
};

const NotificationRow = React.memo(({ 
    notification, 
    onView, 
    openAssignDialog, 
    onDelete, 
    isSelected, 
    onToggleSelection 
}: { 
    notification: Notification; 
    onView: (notification: Notification) => void;
    openAssignDialog: (notification: Notification) => void;
    onDelete: (id: string) => void;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
}) => {
    const isNew = normalizeNotificationStatus(notification.status) === 'New';
    const formattedDate = React.useMemo(() => format(getSafeDate(notification.date), 'PPP'), [notification.date]);
    const isPlatformAdmin = notification.recipientId === 'platform_admin';

    return (
        <TableRow className={cn(isNew ? 'bg-primary/5' : '', 'cursor-pointer group')} onClick={() => onView(notification)}>
            <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                    checked={isSelected} 
                    onCheckedChange={() => onToggleSelection(notification.id)}
                />
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-3">
                    <TypeIcon type={notification.type} />
                    <div>
                        <p className={cn("font-medium line-clamp-1", isNew ? "font-bold text-foreground" : "text-muted-foreground")}>{notification.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{notification.from}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                {isPlatformAdmin ? (
                    <Badge variant="outline" className="bg-purple-100/90 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800 gap-1 font-bold text-[10px] uppercase">
                        <Shield className="h-3 w-3 text-purple-600" />
                        Platform Admin
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-blue-100/90 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800 gap-1 font-bold text-[10px] uppercase">
                        <Crown className="h-3 w-3 text-blue-600" />
                        {notification.details?.communityName ? `Leader • ${notification.details.communityName}` : 'Community Leader'}
                    </Badge>
                )}
            </TableCell>
            <TableCell>
                <StatusBadge status={notification.status} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
                {formattedDate}
            </TableCell>
            <TableCell className="text-xs font-mono">
                {notification.assignedTo ? notification.assignedTo.name : <span className="text-muted-foreground/40 italic">Unassigned</span>}
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onView(notification)}><Eye className="mr-2 h-4 w-4"/>View Details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openAssignDialog(notification)}><User className="mr-2 h-4 w-4"/>Assign / Re-assign</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateNotificationStatusAction({ notificationId: notification.id, status: 'Complete' })}><CheckCircle2 className="mr-2 h-4 w-4"/>Mark as Complete</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateNotificationStatusAction({ notificationId: notification.id, status: 'Archived' })}><Archive className="mr-2 h-4 w-4"/>Archive</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(notification.id)}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
});
NotificationRow.displayName = "NotificationRow";

const TABS: { value: string, label: string }[] = [
    { value: "all", label: "All" },
    { value: "New", label: "New" },
    { value: "Assigned", label: "Assigned" },
    { value: "Complete", label: "Complete" },
    { value: "Archived", label: "Archived" },
];

export default function AdminNotificationsPage() {
    const { user } = useUser();
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [activeTab, setActiveTab] = React.useState("New");
    const [scopeFilter, setScopeFilter] = React.useState<"all" | "admin" | "leader">("all");
    const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
    const [selectedNotification, setSelectedNotification] = React.useState<Notification | null>(null);
    const [viewingDetails, setViewingDetails] = React.useState<Notification | null>(null);
    const [assigneeId, setAssigneeId] = React.useState<string | null>(null);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [sorting, setSorting] = React.useState<{ key: keyof Notification; order: 'asc' | 'desc' }>({ key: 'date', order: 'desc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

    // 1. Stable, Memoized Query
    const notificationsQuery = useMemoFirebase(() => {
        if (!db || !user) return null;
        return query(
            collection(db, "notifications"), 
            or(
                where("recipientId", "==", "platform_admin"),
                where("recipientId", "==", user.uid)
            )
        );
    }, [db, user?.uid]);

    // 2. Optimized Collection Subscription
    const { data: rawNotifications, isLoading: loading } = useCollection<Notification>(notificationsQuery);
    
    // 3. Team Lookup
    const [teamMembers, setTeamMembers] = React.useState<{id: string, name: string}[]>([]);
    React.useEffect(() => {
        if (!db) return;
        const adminRoles = ['owner', 'admin', 'administrator', 'moderator', 'support', 'finance', 'investigator', 'accountant', 'support-specialist'];
        const teamQuery = query(collection(db, 'users'), where('role', 'in', adminRoles));
        const unsub = onSnapshot(teamQuery, (snap) => setTeamMembers(snap.docs.map(d => ({ id: d.id, name: d.data().name }))));
        return () => unsub();
    }, [db]);

    const notifStats = React.useMemo(() => {
        const list = rawNotifications || [];
        return {
            total: list.length,
            unread: list.filter(n => normalizeNotificationStatus(n.status) === 'New').length,
            adminAlerts: list.filter(n => n.recipientId === 'platform_admin').length,
            leaderAlerts: list.filter(n => n.recipientId !== 'platform_admin').length,
        };
    }, [rawNotifications]);

    const filteredAndSortedNotifications = React.useMemo(() => {
        if (!rawNotifications) return [];
        let filtered = activeTab === 'all' 
            ? rawNotifications 
            : rawNotifications.filter(n => normalizeNotificationStatus(n.status) === activeTab);
        
        if (scopeFilter === 'admin') {
            filtered = filtered.filter(n => n.recipientId === 'platform_admin');
        } else if (scopeFilter === 'leader') {
            filtered = filtered.filter(n => n.recipientId !== 'platform_admin');
        }
        
        return [...filtered].sort((a, b) => {
            const key = sorting.key;
            const order = sorting.order === 'asc' ? 1 : -1;
            let valA = a[key] as any;
            let valB = b[key] as any;
            if (key === 'date') return (getSafeDate(valA).getTime() - getSafeDate(valB).getTime()) * order;
            if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB) * order;
            return (valA > valB ? 1 : -1) * order;
        });
    }, [rawNotifications, activeTab, scopeFilter, sorting]);

    const paginatedNotifications = filteredAndSortedNotifications.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize);
    const pageCount = Math.ceil(filteredAndSortedNotifications.length / pagination.pageSize);

    const handleUpdateStatus = async (notificationId: string, status: NotificationStatus) => {
        const result = await updateNotificationStatusAction({ 
            notificationId, 
            status,
            actor: userProfile?.name || 'Admin',
        });
        if (!result.success) toast({ title: 'Error', description: result.error, variant: 'destructive'});
    }

    const handleView = async (notification: Notification) => {
        // CLOSE POPUP IMMEDIATELY to prevent UI lock during navigation
        setViewingDetails(null);

        if (notification.status === 'New') {
            handleUpdateStatus(notification.id, 'Read');
        }

        let path = '';
        switch (notification.type) {
            case 'New Report': path = '/admin/reports'; break;
            case 'Leadership Application': path = `/admin/applications/${notification.relatedId}`; break;
            case 'Special Access Request': path = `/admin/special-access/${notification.relatedId}`; break;
            case 'Boundary Dispute': path = `/admin/communities/map`; break;
            case 'Advertiser Profile': path = `/admin/national-advertisers/${notification.relatedId}`; break;
            case 'New Community': path = '/admin/communities'; break;
            case 'Business Submission': path = '/admin/businesses'; break;
            case 'Leader Information Update': path = `/admin/applications/${notification.relatedId}`; break;
            case 'New Message': if (notification.from === "Platform Administration") path = `/admin/staff-chat?conversationId=${notification.relatedId}`; break;
            case 'Task Assignment': path = '/admin/app-development'; break;
            default: setViewingDetails(notification); return;
        }

        if (path) router.push(path);
    };

    const handleConfirmAssignment = async () => {
        if (!selectedNotification || !assigneeId) return;
        setIsUpdating(true);
        const assignee = teamMembers.find(m => m.id === assigneeId);
        const result = await updateNotificationStatusAction({ 
            notificationId: selectedNotification.id, 
            status: "Assigned",
            actor: userProfile?.name || 'Admin',
            assignedTo: { id: assigneeId, name: assignee?.name || 'Unknown' }
        });
        setIsUpdating(false);
        if (result.success) {
            toast({ title: 'Notification Assigned' });
            setIsAssignDialogOpen(false);
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive'});
        }
    }

    const toggleSelectRow = React.useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const handleBulkStatusUpdate = async (status: NotificationStatus) => {
        if (selectedIds.size === 0) return;
        setIsUpdating(true);
        const result = await bulkUpdateNotificationStatusAction({ notificationIds: Array.from(selectedIds), status, actor: userProfile?.name || 'Admin' });
        setIsUpdating(false);
        if (result.success) {
            toast({ title: 'Bulk Update Success' });
            setSelectedIds(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0 || !confirm("Delete selected?")) return;
        setIsUpdating(true);
        const result = await bulkDeleteNotificationsAction({ notificationIds: Array.from(selectedIds) });
        setIsUpdating(false);
        if (result.success) {
            toast({ title: 'Bulk Deletion Complete' });
            setSelectedIds(new Set());
        }
    };

    const openAssignDialog = (notification: Notification) => {
        setSelectedNotification(notification);
        setAssigneeId(notification.assignedTo?.id || null);
        setIsAssignDialogOpen(true);
    };

    return (
        <div className="space-y-8">
            {/* Unified Notification Hero Banner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-600/15 via-purple-600/10 to-indigo-600/15 border-2 border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest mb-1.5">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        Unified Dispatch &amp; Accountability Inbox • Multi-Role Routing
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                        <BellRing className="h-8 w-8 text-primary" />
                        Platform &amp; Community Notifications Hub
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                        Unified triage inbox distinguishing between system-wide platform admin events and localized community leader dispatches.
                    </p>
                </div>
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20 shrink-0 animate-in slide-in-from-right-4">
                        <span className="text-xs font-black uppercase text-primary px-2">{selectedIds.size} Selected</span>
                        <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase font-black" onClick={() => handleBulkStatusUpdate('Read')}>Mark Read</Button>
                            <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase font-black" onClick={() => handleBulkStatusUpdate('Archived')}>Archive</Button>
                            <Button size="sm" variant="destructive" className="h-8 text-[10px] uppercase font-black" onClick={handleBulkDelete}>Delete</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* 4 Top KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total In Queue</p>
                            <div className="p-1 rounded-md bg-primary/10 text-primary">
                                <Inbox className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black">{notifStats.total}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Total logged items</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Unread</p>
                            <div className="p-1 rounded-md bg-rose-500/10 text-rose-600">
                                <BellRing className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400">{notifStats.unread}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Requires immediate review</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-purple-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Platform Admin</p>
                            <div className="p-1 rounded-md bg-purple-500/10 text-purple-600">
                                <Shield className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-purple-600 dark:text-purple-400">{notifStats.adminAlerts}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">System-wide admin scope</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Community Leader</p>
                            <div className="p-1 rounded-md bg-blue-500/10 text-blue-600">
                                <Crown className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-blue-600 dark:text-blue-400">{notifStats.leaderAlerts}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Home community dispatches</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-t-4 border-t-primary shadow-md">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-transparent rounded-t-lg space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-lg font-bold">Notifications Queue</CardTitle>
                            <CardDescription>Filter notifications by lifecycle status or role channel.</CardDescription>
                        </div>

                        {/* Channel / Role Scope Filter Pills */}
                        <div className="flex items-center gap-1.5 p-1 bg-muted/70 rounded-lg border text-xs">
                            <button
                                onClick={() => { setScopeFilter("all"); setPagination(p => ({ ...p, pageIndex: 0 })); }}
                                className={cn(
                                    "px-2.5 py-1 rounded-md font-bold transition-all text-xs",
                                    scopeFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                All Channels ({notifStats.total})
                            </button>
                            <button
                                onClick={() => { setScopeFilter("admin"); setPagination(p => ({ ...p, pageIndex: 0 })); }}
                                className={cn(
                                    "px-2.5 py-1 rounded-md font-bold transition-all text-xs flex items-center gap-1",
                                    scopeFilter === "admin" ? "bg-purple-600 text-white shadow-sm" : "text-muted-foreground hover:text-purple-600"
                                )}
                            >
                                <Shield className="h-3 w-3" /> Admin ({notifStats.adminAlerts})
                            </button>
                            <button
                                onClick={() => { setScopeFilter("leader"); setPagination(p => ({ ...p, pageIndex: 0 })); }}
                                className={cn(
                                    "px-2.5 py-1 rounded-md font-bold transition-all text-xs flex items-center gap-1",
                                    scopeFilter === "leader" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-blue-600"
                                )}
                            >
                                <Crown className="h-3 w-3" /> Leader ({notifStats.leaderAlerts})
                            </button>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPagination(p => ({ ...p, pageIndex: 0 })); }}>
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1 bg-muted/60">
                            {TABS.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="text-xs font-bold py-1.5">{tab.label}</TabsTrigger>)}
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox 
                                        checked={selectedIds.size > 0 && selectedIds.size === paginatedNotifications.length}
                                        onCheckedChange={() => selectedIds.size === paginatedNotifications.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(paginatedNotifications.map(n => n.id)))}
                                    />
                                </TableHead>
                                <TableHead><Button variant="ghost" onClick={() => setSorting(p => ({ key: 'type', order: p.key === 'type' && p.order === 'asc' ? 'desc' : 'asc' }))} className="p-0 hover:bg-transparent font-bold">Type <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead>Channel / Scope</TableHead>
                                <TableHead><Button variant="ghost" onClick={() => setSorting(p => ({ key: 'subject', order: p.key === 'subject' && p.order === 'asc' ? 'desc' : 'asc' }))} className="p-0 hover:bg-transparent font-bold">Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => setSorting(p => ({ key: 'from', order: p.key === 'from' && p.order === 'asc' ? 'desc' : 'asc' }))} className="p-0 hover:bg-transparent font-bold">From <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => setSorting(p => ({ key: 'date', order: p.key === 'date' && p.order === 'asc' ? 'desc' : 'asc' }))} className="p-0 hover:bg-transparent font-bold">Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={9} className="h-48 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></TableCell></TableRow>
                            ) : paginatedNotifications.length > 0 ? (
                                paginatedNotifications.map((notification) => (
                                    <NotificationRow 
                                        key={notification.id} 
                                        notification={notification} 
                                        onView={handleView} 
                                        openAssignDialog={openAssignDialog} 
                                        onDelete={id => deleteNotificationAction({ notificationId: id })} 
                                        isSelected={selectedIds.has(notification.id)}
                                        onToggleSelection={toggleSelectRow}
                                    />
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={9} className="h-48 text-center text-muted-foreground italic">No notifications found in this queue.</TableCell></TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                    <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={filteredAndSortedNotifications.length} />
                </CardContent>
            </Card>
            
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Notification</DialogTitle>
                        <DialogDescription>Assign this task to a team member.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm font-semibold">{selectedNotification?.subject}</p>
                        <div className="space-y-2">
                            <Label>Team Member</Label>
                            <Select value={assigneeId || ''} onValueChange={setAssigneeId}>
                                <SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger>
                                <SelectContent>{teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmAssignment} disabled={!assigneeId || isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewingDetails} onOpenChange={(open) => !open && setViewingDetails(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            {viewingDetails && <TypeIcon type={viewingDetails.type} />}
                            <DialogTitle>{viewingDetails?.type}</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs uppercase font-black tracking-widest text-primary">Platform Dispatch Record</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-black uppercase tracking-tight text-foreground">{viewingDetails?.subject}</h4>
                            <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {viewingDetails?.date ? format(getSafeDate(viewingDetails.date), "PPPP 'at' p") : 'N/A'}
                            </p>
                        </div>
                        <Separator />
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1"><UserCircle className="h-3 w-3" />Source</p>
                                    <p className="text-sm font-bold">{viewingDetails?.from}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Status</p>
                                    <StatusBadge status={viewingDetails?.status || 'New'} />
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1"><FileText className="h-3 w-3" />Message</p>
                                <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap italic">{viewingDetails?.details?.message || "No message body provided."}</div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild><Button variant="outline" className="font-bold uppercase text-xs">Close</Button></DialogClose>
                        {viewingDetails?.relatedId && (
                            <Button onClick={() => viewingDetails && handleView(viewingDetails)} className="font-black uppercase tracking-tighter text-xs">
                                <ExternalLink className="mr-2 h-4 w-4" />Open Related Record
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
