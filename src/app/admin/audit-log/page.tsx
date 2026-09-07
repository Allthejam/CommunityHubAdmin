"use client";

import * as React from "react";
import {
    FileClock,
    MoreHorizontal,
    ArrowUpDown,
    ChevronsLeft,
    ChevronLeft,
    ChevronRight,
    ChevronsRight,
    FilterX,
    Calendar as CalendarIcon,
    Loader2,
    Search,
    Download,
    Shield,
    Radio,
    Users,
    AlertTriangle,
    Clock,
} from "lucide-react";
import { 
    format, 
    isWithinInterval, 
    subDays, 
    subMonths, 
    subYears, 
    startOfYear, 
    endOfYear, 
    startOfDay, 
    endOfDay 
} from "date-fns";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore } from "@/firebase";
import { collection, onSnapshot, query, orderBy, getDoc, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import Link from "next/link";

export type AuditCategory = 
  | 'Users & Directory'
  | 'Communities & Hubs'
  | 'Applications & Vetting'
  | 'Reports & Moderation'
  | 'Broadcasts & Dispatches'
  | 'Team & Whitelist'
  | 'Financials & Commerce'
  | 'System & Settings';

type LogEntry = {
    id: string;
    adminId: string;
    adminNameSnapshot: string;
    adminEmail?: string;
    action: string;
    category?: AuditCategory;
    details: string;
    timestamp: any;
    targetUser?: {
        name: string;
        id: string;
        email?: string;
    };
    targetObject?: {
        id: string;
        name: string;
        type: string;
    };
    metadata?: Record<string, any>;
};

type AdminUser = {
    id: string;
    name: string;
    email: string;
    avatar?: string;
};

const CATEGORIES: { label: string; value: AuditCategory | 'ALL'; color: string }[] = [
    { label: "All Categories", value: "ALL", color: "bg-muted text-foreground" },
    { label: "Security & Whitelist", value: "Team & Whitelist", color: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
    { label: "Broadcasts & Dispatches", value: "Broadcasts & Dispatches", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    { label: "Users & Directory", value: "Users & Directory", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    { label: "Communities & Hubs", value: "Communities & Hubs", color: "bg-teal-500/10 text-teal-600 border-teal-500/30" },
    { label: "Applications & Vetting", value: "Applications & Vetting", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" },
    { label: "Reports & Moderation", value: "Reports & Moderation", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
    { label: "Financials & Commerce", value: "Financials & Commerce", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    { label: "System & Settings", value: "System & Settings", color: "bg-slate-500/10 text-slate-600 border-slate-500/30" },
];

function getCategoryFromAction(action: string, explicitCategory?: AuditCategory): AuditCategory {
    if (explicitCategory) return explicitCategory;
    const lower = action.toLowerCase();
    if (lower.includes('whitelist') || lower.includes('staff') || lower.includes('security') || lower.includes('auth') || lower.includes('appraisal')) return 'Team & Whitelist';
    if (lower.includes('broadcast') || lower.includes('announcement') || lower.includes('dispatch') || lower.includes('emergency')) return 'Broadcasts & Dispatches';
    if (lower.includes('user') || lower.includes('member') || lower.includes('profile')) return 'Users & Directory';
    if (lower.includes('community') || lower.includes('hub')) return 'Communities & Hubs';
    if (lower.includes('application') || lower.includes('leader') || lower.includes('vetting')) return 'Applications & Vetting';
    if (lower.includes('report') || lower.includes('moderation') || lower.includes('warn') || lower.includes('suspend')) return 'Reports & Moderation';
    if (lower.includes('pricing') || lower.includes('stripe') || lower.includes('fee') || lower.includes('shopping')) return 'Financials & Commerce';
    return 'System & Settings';
}

function getCategoryColor(category: AuditCategory): string {
    switch (category) {
        case 'Team & Whitelist': return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';
        case 'Broadcasts & Dispatches': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
        case 'Users & Directory': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
        case 'Communities & Hubs': return 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30';
        case 'Applications & Vetting': return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30';
        case 'Reports & Moderation': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30';
        case 'Financials & Commerce': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
        default: return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30';
    }
}

export default function AdminAuditLogPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [logData, setLogData] = React.useState<LogEntry[]>([]);
    const [adminUsers, setAdminUsers] = React.useState<Map<string, AdminUser>>(new Map());
    const [loading, setLoading] = React.useState(true);
    const [viewingLog, setViewingLog] = React.useState<LogEntry | null>(null);
    const db = useFirestore();

    // Multidimensional filter state
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
    const [selectedUser, setSelectedUser] = React.useState<string>("all");
    const [selectedYear, setSelectedYear] = React.useState<string>("all");
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: subMonths(new Date(), 1),
        to: new Date()
    });

    const [sorting, setSorting] = React.useState<{ key: keyof LogEntry; order: 'asc' | 'desc' }>({ key: 'timestamp', order: 'desc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 20 });

    React.useEffect(() => {
        if (!user || !db) {
            setLoading(false);
            return;
        }
        
        const logQuery = query(collection(db, "audit_log"), orderBy("timestamp", "desc"));
        const logUnsubscribe = onSnapshot(logQuery, async (logSnapshot) => {
            const logs: LogEntry[] = logSnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    adminId: data.adminId || '',
                    adminNameSnapshot: data.adminNameSnapshot || data.adminName || 'Platform Administration',
                    adminEmail: data.adminEmail || '',
                    action: data.action || 'system_event',
                    category: data.category || getCategoryFromAction(data.action || ''),
                    details: data.details || 'No additional details provided.',
                    timestamp: data.timestamp,
                    targetUser: data.targetUser,
                    targetObject: data.targetObject,
                    metadata: data.metadata,
                } as LogEntry;
            });
            setLogData(logs);
            
            const adminIds = [...new Set(logs.map(log => log.adminId).filter(Boolean))];
            if (adminIds.length > 0) {
                 const newAdminUsers = new Map<string, AdminUser>(adminUsers);
                 const profilesToFetch = adminIds.filter(id => !newAdminUsers.has(id));

                if (profilesToFetch.length > 0) {
                    const fetchPromises = profilesToFetch.map(id => getDoc(doc(db, "users", id)));
                    const userSnapshots = await Promise.all(fetchPromises);

                    userSnapshots.forEach(docSnap => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                             newAdminUsers.set(docSnap.id, {
                                id: docSnap.id,
                                name: data.name || 'Admin',
                                email: data.email || '',
                                avatar: data.avatar || '',
                            } as AdminUser);
                        }
                    });
                     setAdminUsers(newAdminUsers);
                }
            }
            
            setLoading(false);
        }, (error) => {
            console.error("Error fetching audit logs:", error);
            toast({ title: "Error", description: "Failed to fetch audit logs.", variant: "destructive" });
            setLoading(false);
        });

        return () => logUnsubscribe();
    }, [user, toast, db]);

    // Available Years calculated dynamically from dataset
    const availableYears = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        const yearsSet = new Set<number>([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
        logData.forEach(log => {
            const d = log.timestamp?.toDate ? log.timestamp.toDate() : (log.timestamp ? new Date(log.timestamp) : null);
            if (d && !isNaN(d.getFullYear())) {
                yearsSet.add(d.getFullYear());
            }
        });
        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [logData]);

    // KPI Metrics calculation
    const kpiStats = React.useMemo(() => {
        const total = logData.length;
        const securityCount = logData.filter(l => getCategoryFromAction(l.action, l.category) === 'Team & Whitelist').length;
        const broadcastCount = logData.filter(l => getCategoryFromAction(l.action, l.category) === 'Broadcasts & Dispatches').length;
        const userCommCount = logData.filter(l => ['Users & Directory', 'Communities & Hubs', 'Applications & Vetting'].includes(getCategoryFromAction(l.action, l.category))).length;
        const reportsCount = logData.filter(l => getCategoryFromAction(l.action, l.category) === 'Reports & Moderation').length;
        return { total, securityCount, broadcastCount, userCommCount, reportsCount };
    }, [logData]);

    const handleSort = (key: keyof LogEntry) => {
        setSorting(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Quick range preset handler
    const handleQuickRange = (preset: 'today' | '7d' | '1m' | '3m' | '6m' | '9m' | '1y' | 'all') => {
        setSelectedYear("all");
        const now = new Date();
        switch (preset) {
            case 'today':
                setDateRange({ from: now, to: now });
                break;
            case '7d':
                setDateRange({ from: subDays(now, 7), to: now });
                break;
            case '1m':
                setDateRange({ from: subMonths(now, 1), to: now });
                break;
            case '3m':
                setDateRange({ from: subMonths(now, 3), to: now });
                break;
            case '6m':
                setDateRange({ from: subMonths(now, 6), to: now });
                break;
            case '9m':
                setDateRange({ from: subMonths(now, 9), to: now });
                break;
            case '1y':
                setDateRange({ from: subYears(now, 1), to: now });
                break;
            case 'all':
                setDateRange(undefined);
                break;
        }
    };

    // Year selection handler
    const handleYearSelect = (yearStr: string) => {
        setSelectedYear(yearStr);
        if (yearStr === "all") {
            setDateRange(undefined);
        } else {
            const year = parseInt(yearStr, 10);
            setDateRange({
                from: startOfYear(new Date(year, 0, 1)),
                to: endOfYear(new Date(year, 11, 31))
            });
        }
    };

    const filteredAndSortedLogs = React.useMemo(() => {
        let logs = [...logData];

        // 1. Keyword search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            logs = logs.filter(log => {
                const adminName = (adminUsers.get(log.adminId)?.name || log.adminNameSnapshot || '').toLowerCase();
                const adminEmail = (adminUsers.get(log.adminId)?.email || log.adminEmail || '').toLowerCase();
                const action = (log.action || '').toLowerCase();
                const details = (log.details || '').toLowerCase();
                const targetUserName = (log.targetUser?.name || '').toLowerCase();
                const targetObjName = (log.targetObject?.name || '').toLowerCase();
                
                return adminName.includes(q) || 
                       adminEmail.includes(q) || 
                       action.includes(q) || 
                       details.includes(q) || 
                       targetUserName.includes(q) || 
                       targetObjName.includes(q);
            });
        }

        // 2. Category filter
        if (selectedCategory !== "ALL") {
            logs = logs.filter(log => getCategoryFromAction(log.action, log.category) === selectedCategory);
        }

        // 3. User filter
        if (selectedUser !== "all") {
            logs = logs.filter(log => log.adminId === selectedUser);
        }

        // 4. Date range filter
        if (dateRange?.from) {
            const fromStart = startOfDay(dateRange.from);
            const toEnd = endOfDay(dateRange.to || dateRange.from);
            logs = logs.filter(log => {
                const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : (log.timestamp ? new Date(log.timestamp) : null);
                if (!logDate) return false;
                return isWithinInterval(logDate, { start: fromStart, end: toEnd });
            });
        }

        // 5. Sorting
        logs.sort((a, b) => {
            const key = sorting.key;
            const order = sorting.order === 'asc' ? 1 : -1;
            
            let valA = a[key as keyof LogEntry] as any;
            let valB = b[key as keyof LogEntry] as any;
            
            if (key === 'timestamp') {
                const timeA = valA?.seconds ? valA.seconds * 1000 : (valA ? new Date(valA).getTime() : 0);
                const timeB = valB?.seconds ? valB.seconds * 1000 : (valB ? new Date(valB).getTime() : 0);
                return (timeA - timeB) * order;
            }

            if (key === 'adminId') {
                const nameA = adminUsers.get(a.adminId)?.name || a.adminNameSnapshot || '';
                const nameB = adminUsers.get(b.adminId)?.name || b.adminNameSnapshot || '';
                return nameA.localeCompare(nameB) * order;
            }

            if (String(valA) < String(valB)) return -1 * order;
            if (String(valA) > String(valB)) return 1 * order;
            return 0;
        });

        return logs;
    }, [logData, searchQuery, selectedCategory, selectedUser, dateRange, sorting, adminUsers]);

    const paginatedLogs = React.useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return filteredAndSortedLogs.slice(start, start + pagination.pageSize);
    }, [filteredAndSortedLogs, pagination]);

    const pageCount = Math.ceil(filteredAndSortedLogs.length / pagination.pageSize);

    const isFiltered = searchQuery !== "" || selectedCategory !== "ALL" || selectedUser !== "all" || selectedYear !== "all" || !!dateRange?.from;

    const handleClearFilters = () => {
        setSearchQuery("");
        setSelectedCategory("ALL");
        setSelectedUser("all");
        setSelectedYear("all");
        setDateRange(undefined);
    };

    const handleExportCSV = () => {
        if (filteredAndSortedLogs.length === 0) {
            toast({ title: "No Records", description: "There are no audit logs matching your current filters to export." });
            return;
        }

        const headers = ["Timestamp", "Category", "Action", "Operator Name", "Operator Email", "Details", "Target User", "Target Object"];
        const rows = filteredAndSortedLogs.map(log => {
            const dateStr = log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : '';
            const category = getCategoryFromAction(log.action, log.category);
            const adminName = adminUsers.get(log.adminId)?.name || log.adminNameSnapshot;
            const adminEmail = adminUsers.get(log.adminId)?.email || log.adminEmail || '';
            const targetUser = log.targetUser?.name || '';
            const targetObj = log.targetObject?.name || '';
            
            return [
                `"${dateStr}"`,
                `"${category}"`,
                `"${log.action}"`,
                `"${adminName.replace(/"/g, '""')}"`,
                `"${adminEmail.replace(/"/g, '""')}"`,
                `"${log.details.replace(/"/g, '""')}"`,
                `"${targetUser.replace(/"/g, '""')}"`,
                `"${targetObj.replace(/"/g, '""')}"`
            ].join(",");
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `community_hub_audit_log_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "Export Complete", description: `Exported ${filteredAndSortedLogs.length} audit records to CSV.` });
    };

    const adminUserList = Array.from(adminUsers.values());

    return (
        <>
        <div className="space-y-8 pb-20">
            {/* Audit Log Hero Banner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-rose-600/15 via-indigo-600/10 to-slate-900/15 border-2 border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest mb-1.5">
                        <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
                        Forensic Audit Trail • Full Platform Accountability
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                        <FileClock className="h-8 w-8 text-rose-600" />
                        System Audit &amp; Operational Log
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                        Immutable record of all administrative operations, dispatches, whitelist mutations, approvals, and moderation decisions across the back-office.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button 
                        onClick={handleExportCSV} 
                        className="font-black gap-2 shadow-lg h-12 px-6 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white uppercase text-xs tracking-wider"
                    >
                        <Download className="h-4 w-4" /> Export CSV Log
                    </Button>
                </div>
            </div>

            {/* 5 Real-Time KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Operations</p>
                            <div className="p-1 rounded-md bg-primary/10 text-primary">
                                <FileClock className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-primary">{kpiStats.total}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Recorded platform events</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Security &amp; Whitelist</p>
                            <div className="p-1 rounded-md bg-rose-500/10 text-rose-600">
                                <Shield className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400">{kpiStats.securityCount}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Staff &amp; clearance events</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Broadcasts</p>
                            <div className="p-1 rounded-md bg-blue-500/10 text-blue-600">
                                <Radio className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-blue-600 dark:text-blue-400">{kpiStats.broadcastCount}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Global &amp; email dispatches</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Users &amp; Hubs</p>
                            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600">
                                <Users className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{kpiStats.userCommCount}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Profiles &amp; hub activations</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-purple-600 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Moderation &amp; Reports</p>
                            <div className="p-1 rounded-md bg-purple-500/10 text-purple-600">
                                <AlertTriangle className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-purple-600 dark:text-purple-400">{kpiStats.reportsCount}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Resolutions &amp; sanctions</p>
                    </CardContent>
                </Card>
            </div>
            
            {/* Main Log Card */}
            <Card className="border-t-4 border-t-rose-600 shadow-md">
                <CardHeader className="bg-gradient-to-r from-rose-500/5 via-transparent to-transparent space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold">Cryptographic Audit Stream</CardTitle>
                            <CardDescription>Verified log of backend interactions, chronological sequencing, and actor fingerprints.</CardDescription>
                        </div>
                        {isFiltered && (
                            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="font-bold text-xs uppercase text-rose-600 hover:text-rose-700 hover:bg-rose-500/10">
                                <FilterX className="mr-1.5 h-4 w-4" /> Reset All Filters
                            </Button>
                        )}
                    </div>

                    {/* Quick-Preset Time Range Pill Bar */}
                    <div className="flex items-center flex-wrap gap-1.5 pt-1 border-b border-border/40 pb-3">
                        <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-rose-500" /> Time Presets:
                        </span>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleQuickRange('today')} 
                            className="h-7 px-2.5 text-[11px] font-bold rounded-lg hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                        >
                            Today
                        </Button>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleQuickRange('7d')} 
                            className="h-7 px-2.5 text-[11px] font-bold rounded-lg hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                        >
                            7 Days
                        </Button>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleQuickRange('1m')} 
                            className="h-7 px-2.5 text-[11px] font-bold rounded-lg hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                        >
                            1 Month
                        </Button>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleQuickRange('3m')} 
                            className="h-7 px-2.5 text-[11px] font-bold rounded-lg hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                        >
                            3 Months
                        </Button>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleQuickRange('6m')} 
                            className="h-7 px-2.5 text-[11px] font-bold rounded-lg hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                        >
                            6 Months
                        </Button>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleQuickRange('9m')} 
                            className="h-7 px-2.5 text-[11px] font-bold rounded-lg hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                        >
                            9 Months
                        </Button>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleQuickRange('1y')} 
                            className="h-7 px-2.5 text-[11px] font-bold rounded-lg hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                        >
                            1 Year
                        </Button>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleQuickRange('all')} 
                            className="h-7 px-2.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                        >
                            All Time
                        </Button>
                    </div>

                    {/* Multidimensional Filter Toolbar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search keyword, action, operator..."
                                className="pl-9 h-10 border-2 bg-background font-medium text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Category Selector */}
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="h-10 border-2 bg-background font-bold text-xs">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value} className="text-xs font-semibold">
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Operator / Staff Selector */}
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger className="h-10 border-2 bg-background font-bold text-xs">
                                <SelectValue placeholder="All Operators" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Platform Operators</SelectItem>
                                {adminUserList.map(admin => (
                                    <SelectItem key={admin.id} value={admin.id} className="text-xs font-semibold">
                                        {admin.name} ({admin.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Year Selector */}
                        <Select value={selectedYear} onValueChange={handleYearSelect}>
                            <SelectTrigger className="h-10 border-2 bg-background font-bold text-xs">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Years</SelectItem>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={`${year}`} className="text-xs font-semibold">
                                        Year {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Date Range Selector */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn("h-10 border-2 bg-background justify-start text-left font-bold text-xs truncate", !dateRange && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-rose-500 shrink-0" />
                                    {dateRange?.from ? (
                                        dateRange.to ? `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}` : format(dateRange.from, "dd MMM yyyy")
                                    ) : (
                                        <span>Pick Custom Range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <div className="p-3 border-b bg-muted/40 flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Quick Presets</span>
                                    <div className="grid grid-cols-4 gap-1">
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('today')}>Today</Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('7d')}>7 Days</Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('1m')}>1 Month</Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('3m')}>3 Months</Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('6m')}>6 Months</Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('9m')}>9 Months</Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('1y')}>1 Year</Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-rose-600" onClick={() => handleQuickRange('all')}>All Time</Button>
                                    </div>
                                </div>
                                <Calendar mode="range" selected={dateRange} onSelect={(r) => { setSelectedYear("all"); setDateRange(r); }} numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('adminId')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Operator <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Category</TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('action')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Action <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Narrative Details</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Target Context</TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('timestamp')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Timestamp <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest pr-6">Inspect</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center">
                                            <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" />
                                            <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest">Streaming forensic records...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedLogs.map((log) => {
                                    const admin = adminUsers.get(log.adminId);
                                    const adminName = admin?.name || log.adminNameSnapshot;
                                    const adminEmail = admin?.email || log.adminEmail;
                                    const adminAvatar = admin?.avatar;
                                    const category = getCategoryFromAction(log.action, log.category);
                                    
                                    return (
                                        <ContextMenu key={log.id}>
                                            <ContextMenuTrigger asChild>
                                                <TableRow className="hover:bg-muted/30 group cursor-pointer" onClick={() => setViewingLog(log)}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9 border-2 border-rose-500/20 shadow-sm">
                                                                <AvatarImage src={adminAvatar} alt={adminName} />
                                                                <AvatarFallback className="font-black text-xs">{adminName?.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-sm">{adminName}</span>
                                                                {adminEmail && <span className="text-[10px] text-muted-foreground font-mono">{adminEmail}</span>}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-wider border", getCategoryColor(category))}>
                                                            {category}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded">
                                                            {log.action}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs max-w-xs truncate font-medium">
                                                        {log.details}
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.targetUser ? (
                                                            <Badge variant="secondary" className="text-[10px] font-bold">
                                                                👤 {log.targetUser.name}
                                                            </Badge>
                                                        ) : log.targetObject ? (
                                                            <Badge variant="secondary" className="text-[10px] font-bold">
                                                                🏷️ {log.targetObject.name}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground italic opacity-50">Global / System</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium font-mono text-muted-foreground">
                                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'dd MMM yyyy HH:mm:ss') : (log.timestamp ? format(new Date(log.timestamp), 'dd MMM yyyy HH:mm:ss') : 'N/A')}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={(e) => { e.stopPropagation(); setViewingLog(log); }}
                                                            className="font-black uppercase text-[10px] h-8 border-2 border-rose-500/30 hover:border-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                                                        >
                                                            Inspect
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent>
                                                <ContextMenuLabel>Audit Record Actions</ContextMenuLabel>
                                                <ContextMenuSeparator />
                                                <ContextMenuItem onSelect={() => setViewingLog(log)}>Inspect Full Metadata</ContextMenuItem>
                                                {log.targetUser && (
                                                    <ContextMenuItem asChild>
                                                        <Link href={`/admin/users?search=${encodeURIComponent(log.targetUser.name)}`}>
                                                            Jump to User Profile
                                                        </Link>
                                                    </ContextMenuItem>
                                                )}
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    );
                                })}
                                 {paginatedLogs.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center text-muted-foreground italic">
                                            No audit log entries matching the selected criteria.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                        <div className="text-xs text-muted-foreground font-semibold">
                            Showing <span className="font-black text-foreground">{Math.min(filteredAndSortedLogs.length, pagination.pageIndex * pagination.pageSize + 1)}</span> to <span className="font-black text-foreground">{Math.min(filteredAndSortedLogs.length, (pagination.pageIndex + 1) * pagination.pageSize)}</span> of <span className="font-black text-foreground">{filteredAndSortedLogs.length}</span> records
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rows</p>
                                <Select value={`${pagination.pageSize}`} onValueChange={(value) => setPagination(p => ({...p, pageSize: Number(value), pageIndex: 0}))}>
                                    <SelectTrigger className="h-8 w-[70px] border-2 bg-background text-xs font-bold"><SelectValue placeholder={pagination.pageSize} /></SelectTrigger>
                                    <SelectContent side="top">
                                        {[10, 20, 50, 100].map((pageSize) => <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="text-xs font-bold">Page {pagination.pageIndex + 1} of {Math.max(1, pageCount)}</div>
                            <div className="flex items-center space-x-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({...p, pageIndex: 0}))} disabled={pagination.pageIndex === 0}><ChevronsLeft className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({...p, pageIndex: p.pageIndex - 1}))} disabled={pagination.pageIndex === 0}><ChevronLeft className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({...p, pageIndex: p.pageIndex + 1}))} disabled={pagination.pageIndex >= pageCount - 1}><ChevronRight className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({...p, pageIndex: pageCount - 1}))} disabled={pagination.pageIndex >= pageCount - 1}><ChevronsRight className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Detailed Event Inspector Modal */}
        <Dialog open={!!viewingLog} onOpenChange={() => setViewingLog(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[10px] font-black uppercase", viewingLog ? getCategoryColor(getCategoryFromAction(viewingLog.action, viewingLog.category)) : '')}>
                            {viewingLog ? getCategoryFromAction(viewingLog.action, viewingLog.category) : ''}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">{viewingLog?.id}</span>
                    </div>
                    <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2 mt-1">
                        <FileClock className="h-5 w-5 text-rose-600" />
                        {viewingLog?.action}
                    </DialogTitle>
                    <DialogDescription>
                        Forensic event captured on {viewingLog?.timestamp?.toDate ? format(viewingLog.timestamp.toDate(), 'PPP p') : (viewingLog?.timestamp ? format(new Date(viewingLog.timestamp), 'PPP p') : 'N/A')}
                    </DialogDescription>
                </DialogHeader>

                {viewingLog && (() => {
                    const admin = adminUsers.get(viewingLog.adminId);
                    const adminName = admin?.name || viewingLog.adminNameSnapshot;
                    const adminEmail = admin?.email || viewingLog.adminEmail;

                    return (
                        <div className="space-y-6 py-4">
                            {/* Operator Box */}
                            <div className="p-4 rounded-xl bg-muted/50 border space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorized Operator</span>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                                            <AvatarImage src={admin?.avatar} />
                                            <AvatarFallback className="font-bold">{adminName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-sm">{adminName}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{adminEmail || viewingLog.adminId}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="font-mono text-[10px]">ID: {viewingLog.adminId.substring(0, 8)}...</Badge>
                                </div>
                            </div>

                            {/* Narrative Details */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Operation Narrative</span>
                                <div className="p-3.5 rounded-lg bg-background border text-sm font-medium leading-relaxed">
                                    {viewingLog.details}
                                </div>
                            </div>

                            {/* Target Context (if any) */}
                            {(viewingLog.targetUser || viewingLog.targetObject) && (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Subject</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        {viewingLog.targetUser && (
                                            <div className="p-3 rounded-lg border bg-background">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Target User</p>
                                                <p className="font-bold text-sm mt-0.5">{viewingLog.targetUser.name}</p>
                                                <p className="text-[10px] font-mono text-muted-foreground">{viewingLog.targetUser.id}</p>
                                            </div>
                                        )}
                                        {viewingLog.targetObject && (
                                            <div className="p-3 rounded-lg border bg-background">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Target {viewingLog.targetObject.type}</p>
                                                <p className="font-bold text-sm mt-0.5">{viewingLog.targetObject.name}</p>
                                                <p className="text-[10px] font-mono text-muted-foreground">{viewingLog.targetObject.id}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Raw Metadata JSON */}
                            {viewingLog.metadata && Object.keys(viewingLog.metadata).length > 0 && (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Structured Metadata Payload</span>
                                    <pre className="p-3 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-48">
                                        {JSON.stringify(viewingLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    );
                })()}

                <DialogFooter className="bg-muted/30 p-4 -mx-6 -mb-6 border-t mt-4">
                    <DialogClose asChild>
                        <Button variant="outline" className="font-bold uppercase text-xs">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}