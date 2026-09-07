'use client';

import * as React from 'react';
import { 
    Search, 
    Users, 
    Calendar as CalendarIcon, 
    FilterX, 
    Loader2, 
    ArrowUpDown, 
    Globe,
    BarChart3,
    ArrowRight,
    Info,
    AlertTriangle,
    ArrowUp,
    ArrowDown,
    UserX,
    PieChart as PieChartIcon,
    ShieldAlert,
    Activity,
    TrendingUp,
    Briefcase,
    Flame,
    Newspaper,
    ShoppingCart,
    ShieldCheck,
    Gavel,
    MessageSquare,
    XCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, collectionGroup } from "firebase/firestore";
import { format, isWithinInterval, startOfDay, endOfDay, subDays, differenceInDays, isBefore, isValid } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const SAFETY_COLORS = {
    Stable: '#10b981',
    Volatile: '#f59e0b',
    HighFriction: '#ef4444'
};

const resolveDate = (val: any): Date => {
    if (!val) return new Date(0);
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isValid(d) ? d : new Date(0);
};

export default function MarketResearchPage() {
    const db = useFirestore();
    
    const [fromDate, setFromDate] = React.useState<Date | undefined>(subDays(new Date(), 30));
    const [toDate, setToDate] = React.useState<Date | undefined>(new Date());
    
    const [commSearch, setCommSearch] = React.useState("");
    const [hotspotSearch, setHotspotSearch] = React.useState("");
    const [safetySearch, setSafetySearch] = React.useState("");
    
    const [sorting, setSorting] = React.useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'monthlyNet', order: 'desc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
    const [userSorting, setUserSorting] = React.useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'joined', order: 'desc' });
    const [userPagination, setUserPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
    const [retentionSorting, setRetentionSorting] = React.useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'daysInactive', order: 'desc' });
    const [retentionPagination, setRetentionPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
    const [hotspotSorting, setHotspotSorting] = React.useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'totalEngagement', order: 'desc' });
    const [hotspotPagination, setHotspotPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
    const [safetySorting, setSafetySorting] = React.useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'riskScore', order: 'desc' });
    const [safetyPagination, setSafetyPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

    const usersQuery = useMemoFirebase(() => db ? collection(db, "users") : null, [db]);
    const { data: allUsers, isLoading: usersLoading } = useCollection(usersQuery);

    const commsQuery = useMemoFirebase(() => db ? collection(db, "communities") : null, [db]);
    const { data: allComms, isLoading: commsLoading } = useCollection(commsQuery);

    const bizQuery = useMemoFirebase(() => db ? query(collection(db, "businesses"), where("status", "==", "Subscribed")) : null, [db]);
    const { data: allSubscribedBiz, isLoading: bizLoading } = useCollection(bizQuery);

    const newsQuery = useMemoFirebase(() => db ? collection(db, "news") : null, [db]);
    const { data: allNews } = useCollection(newsQuery);

    const eventsQuery = useMemoFirebase(() => db ? collection(db, "events") : null, [db]);
    const { data: allEvents } = useCollection(eventsQuery);

    const forumQuery = useMemoFirebase(() => db ? collection(db, "forum-topics") : null, [db]);
    const { data: allTopics } = useCollection(forumQuery);

    const marketplaceQuery = useMemoFirebase(() => db ? collectionGroup(db, "marketplace") : null, [db]);
    const { data: allMarketplace } = useCollection(marketplaceQuery);

    const flagsQuery = useMemoFirebase(() => db ? collection(db, "moderation_flags") : null, [db]);
    const { data: allFlags } = useCollection(flagsQuery);

    const communityReportsQuery = useMemoFirebase(() => db ? collection(db, "community_reports") : null, [db]);
    const { data: allReports } = useCollection(communityReportsQuery);

    const researchedUsers = React.useMemo(() => {
        if (!allUsers || !fromDate) return [];
        const start = startOfDay(fromDate);
        const end = endOfDay(toDate || fromDate);

        let filtered = allUsers.filter(u => {
            const joined = resolveDate(u.joined);
            return isWithinInterval(joined, { start, end });
        });

        return filtered.sort((a, b) => {
            const order = userSorting.order === 'asc' ? 1 : -1;
            const key = userSorting.key;
            
            let valA = (a as any)[key];
            let valB = (b as any)[key];

            if (key === 'joined') {
                valA = resolveDate(a.joined).getTime();
                valB = resolveDate(b.joined).getTime();
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB) * order;
            }
            return (valA > valB ? 1 : -1) * order;
        });
    }, [allUsers, fromDate, toDate, userSorting]);

    const atRiskUsers = React.useMemo(() => {
        if (!allUsers) return [];
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);

        return allUsers
            .map(u => {
                const lastActive = resolveDate(u.lastActive);
                const lastSeenLegacy = resolveDate(u.lastSeen);
                const joined = resolveDate(u.joined);
                
                const lastInteraction = [lastActive, lastSeenLegacy, joined]
                    .sort((a, b) => b.getTime() - a.getTime())[0];
                
                const daysInactive = differenceInDays(now, lastInteraction);
                return { ...u, lastInteraction, daysInactive };
            })
            .filter(u => !u.isOnline && isBefore(u.lastInteraction, thirtyDaysAgo))
            .sort((a, b) => {
                const order = retentionSorting.order === 'asc' ? 1 : -1;
                const valA = (a as any)[retentionSorting.key];
                const valB = (b as any)[retentionSorting.key];
                return (valA > valB ? 1 : -1) * order;
            });
    }, [allUsers, retentionSorting]);

    const demographicStats = React.useMemo(() => {
        if (!allUsers) return { ageData: [], genderData: [] };
        
        const ageGroups: Record<string, number> = {};
        const genderGroups: Record<string, number> = {};

        allUsers.forEach(u => {
            const age = u.ageRange || 'Not Disclosed';
            const gender = u.gender || 'Not Disclosed';
            ageGroups[age] = (ageGroups[age] || 0) + 1;
            genderGroups[gender] = (genderGroups[gender] || 0) + 1;
        });

        return {
            ageData: Object.entries(ageGroups).map(([name, value]) => ({ name, value })),
            genderData: Object.entries(genderGroups).map(([name, value]) => ({ name, value }))
        };
    }, [allUsers]);

    const communityPerformance = React.useMemo(() => {
        if (!allComms || !allSubscribedBiz || !allUsers) return [];

        return allComms
            .filter(comm => comm.status !== 'inactive')
            .map(comm => {
                const commBiz = allSubscribedBiz.filter(b => b.primaryCommunityId === comm.id);
                const commMembers = allUsers.filter(u => u.homeCommunityId === comm.id || u.communityId === comm.id);
                const totalOffenses = commMembers.reduce((acc, u) => acc + (u.offenseCount || 0), 0);
                
                const share = comm.revenueShare ?? (comm.type === 'topic' ? 0 : 40);
                const netIncome = commBiz.reduce((acc, b) => {
                    const basePrice = (b as any).accountType === 'enterprise' ? 50 : 20;
                    return acc + (basePrice * 0.975 * (share / 100));
                }, 0);

                return {
                    id: comm.id,
                    name: comm.name,
                    memberCount: commMembers.length,
                    businessCount: commBiz.length,
                    revenueShare: share,
                    monthlyNet: netIncome,
                    status: comm.status,
                    type: comm.type || 'geographic',
                    safetyIndex: totalOffenses
                };
            });
    }, [allComms, allSubscribedBiz, allUsers]);

    const hotspotPerformance = React.useMemo(() => {
        if (!allComms || !allNews || !allEvents || !allTopics || !allMarketplace) return [];

        return allComms
            .filter(comm => comm.status !== 'inactive')
            .map(comm => {
                const newsCount = allNews.filter(n => n.communityId === comm.id).length;
                const eventCount = allEvents.filter(e => e.communityId === comm.id).length;
                const forumCount = allTopics.filter(t => t.communityId === comm.id).length;
                const marketplaceCount = allMarketplace.filter(m => m.communityId === comm.id).length;
                
                const scores = [
                    { key: 'news', val: newsCount, label: 'News' },
                    { key: 'events', val: eventCount, label: 'Events' },
                    { key: 'forums', val: forumCount, label: 'Forums' },
                    { key: 'marketplace', val: marketplaceCount, label: 'Marketplace' }
                ];
                
                const primaryHotspot = scores.sort((a, b) => b.val - a.val)[0];
                const totalEngagement = newsCount + eventCount + forumCount + marketplaceCount;

                return {
                    id: comm.id,
                    name: comm.name,
                    news: newsCount,
                    events: eventCount,
                    forums: forumCount,
                    marketplace: marketplaceCount,
                    totalEngagement,
                    primaryHotspot: totalEngagement > 0 ? primaryHotspot.label : 'None'
                };
            });
    }, [allComms, allNews, allEvents, allTopics, allMarketplace]);

    const safetyClimate = React.useMemo(() => {
        if (!allComms || !allFlags || !allReports || !allUsers) return [];

        return allComms
            .filter(comm => comm.status !== 'inactive')
            .map(comm => {
                const commFlags = allFlags.filter(f => f.contentPath?.includes(comm.id) || f.communityId === comm.id);
                const criticalCount = commFlags.filter(f => f.priority === 'critical').length;
                const normalCount = commFlags.filter(f => f.priority !== 'critical').length;
                
                const reportCount = allReports.filter(r => r.communityId === comm.id).length;
                
                const commMembers = allUsers.filter(u => u.homeCommunityId === comm.id);
                const memberOffenses = commMembers.reduce((acc, u) => acc + (u.offenseCount || 0), 0);

                const riskScore = (criticalCount * 10) + (normalCount * 2) + (reportCount * 3) + (memberOffenses * 1);
                
                let climate: 'Stable' | 'Volatile' | 'HighFriction' = 'Stable';
                if (riskScore > 30 || criticalCount > 0) climate = 'HighFriction';
                else if (riskScore > 10) climate = 'Volatile';

                return {
                    id: comm.id,
                    name: comm.name,
                    criticalFlags: criticalCount,
                    normalFlags: normalCount,
                    reports: reportCount,
                    memberOffenses,
                    riskScore,
                    climate
                };
            });
    }, [allComms, allFlags, allReports, allUsers]);

    const safetyDistribution = React.useMemo(() => {
        const counts = { Stable: 0, Volatile: 0, HighFriction: 0 };
        safetyClimate.forEach(s => counts[s.climate]++);
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [safetyClimate]);

    const filteredSafety = React.useMemo(() => {
        let filtered = [...safetyClimate];
        if (safetySearch) {
            filtered = filtered.filter(s => s.name.toLowerCase().includes(safetySearch.toLowerCase()));
        }
        return filtered.sort((a, b) => {
            const order = safetySorting.order === 'asc' ? 1 : -1;
            const valA = (a as any)[safetySorting.key];
            const valB = (b as any)[safetySorting.key];
            if (typeof valA === 'string') return valA.localeCompare(valB) * order;
            return (valA - valB) * order;
        });
    }, [safetyClimate, safetySearch, safetySorting]);

    const filteredComms = React.useMemo(() => {
        let filtered = [...communityPerformance];
        if (commSearch) {
            filtered = filtered.filter(c => c.name.toLowerCase().includes(commSearch.toLowerCase()));
        }
        return filtered.sort((a, b) => {
            const order = sorting.order === 'asc' ? 1 : -1;
            const valA = (a as any)[sorting.key];
            const valB = (b as any)[sorting.key];
            if (typeof valA === 'string') return valA.localeCompare(valB) * order;
            return (valA - valB) * order;
        });
    }, [communityPerformance, commSearch, sorting]);

    const filteredHotspots = React.useMemo(() => {
        let filtered = [...hotspotPerformance];
        if (hotspotSearch) {
            filtered = filtered.filter(c => c.name.toLowerCase().includes(hotspotSearch.toLowerCase()));
        }
        return filtered.sort((a, b) => {
            const order = hotspotSorting.order === 'asc' ? 1 : -1;
            const valA = (a as any)[hotspotSorting.key];
            const valB = (b as any)[hotspotSorting.key];
            if (typeof valA === 'string') return valA.localeCompare(valB) * order;
            return (valA - valB) * order;
        });
    }, [hotspotPerformance, hotspotSearch, hotspotSorting]);

    const paginatedUsers = researchedUsers.slice(userPagination.pageIndex * userPagination.pageSize, (userPagination.pageIndex + 1) * userPagination.pageSize);
    const paginatedRetention = atRiskUsers.slice(retentionPagination.pageIndex * retentionPagination.pageSize, (retentionPagination.pageIndex + 1) * retentionPagination.pageSize);
    const paginatedComms = filteredComms.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize);
    const paginatedHotspots = filteredHotspots.slice(hotspotPagination.pageIndex * hotspotPagination.pageSize, (hotspotPagination.pageIndex + 1) * hotspotPagination.pageSize);
    const paginatedSafety = filteredSafety.slice(safetyPagination.pageIndex * safetyPagination.pageSize, (safetyPagination.pageIndex + 1) * safetyPagination.pageSize);

    const userPageCount = Math.ceil(researchedUsers.length / userPagination.pageSize);
    const retentionPageCount = Math.ceil(atRiskUsers.length / retentionPagination.pageSize);
    const pageCount = Math.ceil(filteredComms.length / pagination.pageSize);
    const hotspotPageCount = Math.ceil(filteredHotspots.length / hotspotPagination.pageSize);
    const safetyPageCount = Math.ceil(filteredSafety.length / safetyPagination.pageSize);

    const handleSort = (key: string) => setSorting(prev => ({ key, order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc' }));
    const handleUserSort = (key: string) => setUserSorting(prev => ({ key, order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc' }));
    const handleRetentionSort = (key: string) => setRetentionSorting(prev => ({ key, order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc' }));
    const handleHotspotSort = (key: string) => setHotspotSorting(prev => ({ key, order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc' }));
    const handleSafetySort = (key: string) => setSafetySorting(prev => ({ key, order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc' }));

    const SortIcon = ({ currentKey, columnKey, order }: { currentKey: string, columnKey: string, order: 'asc' | 'desc' }) => {
        if (currentKey !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        return order === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-primary" /> : <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
    };

    if (usersLoading || commsLoading || bizLoading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600/10 via-purple-500/10 to-emerald-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Ecosystem Intelligence & Growth Analytics
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
                        <BarChart3 className="h-7 w-7 text-blue-600" />
                        Market Research & Telemetry
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Cross-community user acquisition cohorts, dormancy retention tracking, safety climate indexes, and revenue yield analytics.
                    </p>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Analyzed Members</p>
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                                <Users className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black">{allUsers?.length || 0}</div>
                        <p className="text-[10px] text-muted-foreground font-semibold">Registered user base</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Hubs</p>
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                                <Globe className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{allComms?.filter(c => c.status === 'active').length || 0}</div>
                        <p className="text-[10px] text-muted-foreground font-semibold">Managed ecosystems</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dormant Members</p>
                            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
                                <UserX className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{atRiskUsers.length}</div>
                        <p className="text-[10px] text-rose-500 font-semibold">Offline &gt; 30 days</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-purple-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg. Hub Yield</p>
                            <div className="p-1.5 rounded-lg bg-purple-600/10 text-purple-600">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                            £{(communityPerformance.reduce((acc, c) => acc + c.monthlyNet, 0) / (communityPerformance.length || 1)).toFixed(2)}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold">Monthly platform split</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="acquisition" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 max-w-5xl h-auto p-1 bg-muted/60">
                    <TabsTrigger value="acquisition" className="gap-1.5 text-xs uppercase font-bold tracking-wider py-2"><Users className="h-3.5 w-3.5 text-blue-500" /> Acquisition</TabsTrigger>
                    <TabsTrigger value="retention" className="gap-1.5 text-rose-600 text-xs uppercase font-bold tracking-wider py-2"><UserX className="h-3.5 w-3.5" /> Retention</TabsTrigger>
                    <TabsTrigger value="safety" className="gap-1.5 text-amber-600 text-xs uppercase font-bold tracking-wider py-2"><ShieldAlert className="h-3.5 w-3.5" /> Safety Audit</TabsTrigger>
                    <TabsTrigger value="hotspots" className="gap-1.5 text-orange-600 text-xs uppercase font-bold tracking-wider py-2"><Flame className="h-3.5 w-3.5" /> Hotspots</TabsTrigger>
                    <TabsTrigger value="communities" className="gap-1.5 text-emerald-600 text-xs uppercase font-bold tracking-wider py-2"><Globe className="h-3.5 w-3.5" /> Hubs Matrix</TabsTrigger>
                    <TabsTrigger value="demographics" className="gap-1.5 text-purple-600 text-xs uppercase font-bold tracking-wider py-2"><PieChartIcon className="h-3.5 w-3.5" /> Demographics</TabsTrigger>
                </TabsList>

                <TabsContent value="acquisition" className="space-y-6">
                    <Card className="border-t-4 border-t-blue-500 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-blue-500/5 via-transparent to-transparent rounded-t-lg">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-bold">Signup Analytics</CardTitle>
                                    <CardDescription>Coordinate ad campaigns with user join dates and locations.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">From</Label>
                                            <DatePicker date={fromDate} setDate={setFromDate} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">To</Label>
                                            <DatePicker date={toDate} setDate={setToDate} />
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => { setFromDate(undefined); setToDate(undefined); }} className="mt-5"><FilterX className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead><Button variant="ghost" onClick={() => handleUserSort('joined')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Joined <SortIcon currentKey={userSorting.key} columnKey="joined" order={userSorting.order} /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => handleUserSort('name')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Name <SortIcon currentKey={userSorting.key} columnKey="name" order={userSorting.order} /></Button></TableHead>
                                            <TableHead className="text-xs uppercase tracking-widest">Email</TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => handleUserSort('accountType')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Type <SortIcon currentKey={userSorting.key} columnKey="accountType" order={userSorting.order} /></Button></TableHead>
                                            <TableHead className="text-xs uppercase tracking-widest">Hub</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-widest">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedUsers.length > 0 ? paginatedUsers.map((u) => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-mono text-xs">{format(resolveDate(u.joined), 'dd MMM yyyy')}</TableCell>
                                                <TableCell className="font-bold">{u.name}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                                                <TableCell><Badge variant="outline" className="capitalize text-[10px] font-black">{u.accountType}</Badge></TableCell>
                                                <TableCell className="text-xs">{u.communityName || 'Platform'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={`/admin/manage-users?userId=${u.id}`}><ArrowRight className="h-4 w-4"/></Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">No acquisition data for this period.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>
                            <PaginationControls pagination={userPagination} setPagination={setUserPagination} pageCount={userPageCount} totalRows={researchedUsers.length} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="retention" className="space-y-6">
                    <Card className="border-t-4 border-t-rose-500 shadow-sm bg-rose-500/5">
                        <CardHeader className="bg-gradient-to-r from-rose-500/10 via-transparent to-transparent rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-rose-600 text-lg font-bold"><UserX className="h-5 w-5" /> At-Risk Member Analysis</CardTitle>
                            <CardDescription>Identifying dormant users who are currently offline to coordinate "We Miss You" campaigns.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="rounded-md border bg-background overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead><Button variant="ghost" onClick={() => handleRetentionSort('name')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">User <SortIcon currentKey={retentionSorting.key} columnKey="name" order={retentionSorting.order} /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => handleRetentionSort('daysInactive')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Dormancy <SortIcon currentKey={retentionSorting.key} columnKey="daysInactive" order={retentionSorting.order} /></Button></TableHead>
                                            <TableHead className="text-xs uppercase tracking-widest font-bold">Hub</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-widest font-bold">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedRetention.length > 0 ? paginatedRetention.map((u) => (
                                            <TableRow key={u.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{u.name}</span>
                                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="destructive" className="font-black uppercase text-[10px]">{u.daysInactive} Days</Badge>
                                                </TableCell>
                                                <TableCell className="text-xs">{u.communityName || 'Platform'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm" asChild className="gap-2 border-primary/20 text-primary uppercase text-[10px] font-black hover:bg-primary/10">
                                                        <Link href={`/admin/manage-users?userId=${u.id}`}>Re-Engage</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="h-24 text-center italic text-muted-foreground">Retention is currently 100% for all active members.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>
                            <PaginationControls pagination={retentionPagination} setPagination={setRetentionPagination} pageCount={retentionPageCount} totalRows={atRiskUsers.length} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="safety" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-1 border-t-4 border-t-amber-500 shadow-sm">
                            <CardHeader className="bg-gradient-to-r from-amber-500/5 via-transparent to-transparent rounded-t-lg">
                                <CardTitle className="text-lg font-bold flex items-center gap-2"><Gavel className="h-5 w-5 text-amber-500" /> Safety Distribution</CardTitle>
                                <CardDescription>Community safety health profiling.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={safetyDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                            {safetyDistribution.map((entry, index) => (
                                                <Cell key={index} fill={SAFETY_COLORS[entry.name as keyof typeof SAFETY_COLORS]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-2 border-t-4 border-t-rose-600 shadow-sm">
                            <CardHeader className="bg-gradient-to-r from-rose-600/5 via-transparent to-transparent rounded-t-lg">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg font-bold flex items-center gap-2"><ShieldAlert className="text-rose-600 h-5 w-5" /> Community Volatility Index</CardTitle>
                                        <CardDescription>Correlating AI detection, member reports, and safety violations.</CardDescription>
                                    </div>
                                    <div className="relative w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Search hubs..." className="pl-8" value={safetySearch} onChange={(e) => setSafetySearch(e.target.value)} />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead><Button variant="ghost" onClick={() => handleSafetySort('name')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Hub <SortIcon currentKey={safetySorting.key} columnKey="name" order={safetySorting.order} /></Button></TableHead>
                                                <TableHead className="text-center text-xs uppercase tracking-widest font-bold">Critical</TableHead>
                                                <TableHead className="text-center text-xs uppercase tracking-widest font-bold">Reports</TableHead>
                                                <TableHead><Button variant="ghost" onClick={() => handleSafetySort('riskScore')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Score <SortIcon currentKey={safetySorting.key} columnKey="riskScore" order={safetySorting.order} /></Button></TableHead>
                                                <TableHead className="text-right text-xs uppercase tracking-widest pr-6 font-bold">Climate</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedSafety.map((s) => (
                                                <TableRow key={s.id}>
                                                    <TableCell className="font-bold">{s.name}</TableCell>
                                                    <TableCell className="text-center">
                                                        {s.criticalFlags > 0 ? (
                                                            <Badge variant="destructive" className="animate-pulse">{s.criticalFlags}</Badge>
                                                        ) : <span className="text-xs text-muted-foreground">0</span>}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs font-medium">{s.reports}</TableCell>
                                                    <TableCell className="font-mono text-xs font-black">{s.riskScore}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Badge 
                                                            variant="outline" 
                                                            className={cn(
                                                                "uppercase font-black text-[9px]",
                                                                s.climate === 'Stable' && "border-emerald-500 text-emerald-700 bg-emerald-50",
                                                                s.climate === 'Volatile' && "border-amber-500 text-amber-700 bg-amber-50",
                                                                s.climate === 'HighFriction' && "border-rose-500 text-rose-700 bg-rose-50"
                                                            )}
                                                        >
                                                            {s.climate}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <PaginationControls pagination={safetyPagination} setPagination={setSafetyPagination} pageCount={safetyPageCount} totalRows={filteredSafety.length} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="hotspots" className="space-y-6">
                    <Card className="border-t-4 border-t-orange-500 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-orange-500/5 via-transparent to-transparent rounded-t-lg">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <CardTitle className="text-lg font-bold flex items-center gap-2"><Flame className="text-orange-500 h-5 w-5" /> Content Hotspot Analysis</CardTitle>
                                    <CardDescription>Identifying high-engagement sectors per community to optimize leader advisory.</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search hubs..." className="pl-8" value={hotspotSearch} onChange={(e) => setHotspotSearch(e.target.value)} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                             <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead><Button variant="ghost" onClick={() => handleHotspotSort('name')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Hub <SortIcon currentKey={hotspotSorting.key} columnKey="name" order={hotspotSorting.order} /></Button></TableHead>
                                            <TableHead className="text-center text-xs uppercase tracking-widest font-bold">News</TableHead>
                                            <TableHead className="text-center text-xs uppercase tracking-widest font-bold">Events</TableHead>
                                            <TableHead className="text-center text-xs uppercase tracking-widest font-bold">Forums</TableHead>
                                            <TableHead className="text-center text-xs uppercase tracking-widest font-bold">Market</TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => handleHotspotSort('totalEngagement')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Total <SortIcon currentKey={hotspotSorting.key} columnKey="totalEngagement" order={hotspotSorting.order} /></Button></TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-widest pr-6 font-bold">Primary Hotspot</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedHotspots.map((h) => {
                                            const isGhostHub = h.totalEngagement === 0;
                                            return (
                                                <TableRow key={h.id} className={cn(isGhostHub && "bg-slate-50 dark:bg-slate-900/50 opacity-60")}>
                                                    <TableCell className="font-bold">{h.name}</TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        <div className="flex flex-col items-center gap-1">
                                                            {h.news > 0 ? <Newspaper className="h-3 w-3 text-purple-500" /> : null}
                                                            {h.news}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        <div className="flex flex-col items-center gap-1">
                                                            {h.events > 0 ? <CalendarIcon className="h-3 w-3 text-blue-500" /> : null}
                                                            {h.events}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        <div className="flex flex-col items-center gap-1">
                                                            {h.forums > 0 ? <MessageSquare className="h-3 w-3 text-teal-500" /> : null}
                                                            {h.forums}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        <div className="flex flex-col items-center gap-1">
                                                            {h.marketplace > 0 ? <ShoppingCart className="h-3 w-3 text-orange-500" /> : null}
                                                            {h.marketplace}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs font-black">{h.totalEngagement}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        {isGhostHub ? (
                                                            <Badge variant="outline" className="text-[9px] uppercase font-black border-dashed">Ghost Hub</Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-[10px] uppercase font-black bg-orange-100 text-orange-800 border-orange-200">
                                                                {h.primaryHotspot}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <PaginationControls pagination={hotspotPagination} setPagination={setPagination} pageCount={hotspotPageCount} totalRows={filteredHotspots.length} />
                        </CardContent>
                        <CardFooter className="bg-muted/30 border-t p-4">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <Info className="h-4 w-4 text-primary" />
                                <span><strong>Staff Strategy:</strong> Focus on &quot;Ghost Hubs&quot; with &gt; 100 members to initiate content drives. Hubs with high &quot;Forum&quot; engagement are prime targets for local business recruitment.</span>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="communities" className="space-y-6">
                    <Card className="border-t-4 border-t-emerald-500 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent rounded-t-lg">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-bold">Hub Performance & Safety Matrix</CardTitle>
                                    <CardDescription>Correlating population, revenue, and safety metrics for strategic planning.</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search hubs..." className="pl-8" value={commSearch} onChange={(e) => setCommSearch(e.target.value)} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead><Button variant="ghost" onClick={() => handleSort('name')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Hub <SortIcon currentKey={sorting.key} columnKey="name" order={sorting.order} /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => handleSort('memberCount')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Residents <SortIcon currentKey={sorting.key} columnKey="memberCount" order={sorting.order} /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => handleSort('businessCount')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Businesses <SortIcon currentKey={sorting.key} columnKey="businessCount" order={sorting.order} /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => handleSort('safetyIndex')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Safety Index <SortIcon currentKey={sorting.key} columnKey="safetyIndex" order={sorting.order} /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => handleSort('monthlyNet')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Est. Net <SortIcon currentKey={sorting.key} columnKey="monthlyNet" order={sorting.order} /></Button></TableHead>
                                            <TableHead className="text-right pr-6 text-xs uppercase tracking-widest font-bold">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedComms.map((c) => {
                                            const needsHelp = c.memberCount > 50 && c.businessCount < 2;
                                            const isFrictionHub = c.safetyIndex > 5;
                                            return (
                                                <TableRow key={c.id} className={cn(needsHelp && "bg-amber-50 dark:bg-amber-950/20", isFrictionHub && "bg-rose-50 dark:bg-rose-950/10")}>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{c.name}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase font-black">{c.type}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{c.memberCount}</TableCell>
                                                    <TableCell className="font-mono text-xs">{c.businessCount}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("font-bold text-xs", isFrictionHub ? "text-rose-600" : "text-emerald-600")}>{c.safetyIndex}</span>
                                                            {isFrictionHub && <ShieldAlert className="h-3 w-3 text-rose-600 animate-pulse" />}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-xs">£{c.monthlyNet.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        {needsHelp ? <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[9px] uppercase font-black">Target for 90%</Badge> : <Badge variant="outline" className="capitalize text-[10px] font-black">{c.status}</Badge>}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={filteredComms.length} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="demographics" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="border-t-4 border-t-purple-500 shadow-sm">
                            <CardHeader className="bg-gradient-to-r from-purple-500/5 via-transparent to-transparent rounded-t-lg">
                                <CardTitle className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5 text-purple-500" /> Age Distribution</CardTitle>
                                <CardDescription>Platform-wide age groups for National Ad targeting.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={demographicStats.ageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                            {demographicStats.ageData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card className="border-t-4 border-t-blue-500 shadow-sm">
                            <CardHeader className="bg-gradient-to-r from-blue-500/5 via-transparent to-transparent rounded-t-lg">
                                <CardTitle className="text-lg font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-blue-500" /> Gender Breakdown</CardTitle>
                                <CardDescription>Analyzing primary user demographics.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={demographicStats.genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                            {demographicStats.genderData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Alert className="bg-primary/5 border-primary/20">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <AlertTitle className="text-xs font-black uppercase tracking-widest">Advertiser Pitch Tip</AlertTitle>
                            <AlertDescription className="text-xs italic leading-relaxed">
                                Use these charts to provide high-value demographic reports to potential National Advertisers. Proving a density in specific age brackets allows for premium campaign pricing.
                            </AlertDescription>
                        </Alert>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function DatePicker({ date, setDate }: { date: Date | undefined; setDate: (date: Date | undefined) => void }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent 
                    mode="single" 
                    selected={date} 
                    onSelect={setDate} 
                    initialFocus 
                    captionLayout="dropdown-buttons"
                    fromYear={2020}
                    toYear={new Date().getFullYear() + 1}
                />
            </PopoverContent>
        </Popover>
    );
}