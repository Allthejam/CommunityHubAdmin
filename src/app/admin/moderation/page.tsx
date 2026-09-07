"use client";

import * as React from "react";
import { 
    ShieldAlert, 
    AlertTriangle, 
    MoreHorizontal, 
    CheckCircle, 
    X, 
    PlusCircle, 
    Loader2, 
    Trash2, 
    Ban, 
    Scale, 
    Gavel, 
    ShieldCheck, 
    Info, 
    Sparkles,
    Eye,
    Activity,
    Calendar,
    User as UserIcon,
    FileText,
    ChevronDown,
    Settings2,
    Search,
    FilterX,
    Clock,
    History,
    Zap,
    Tag,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
    ContextMenu, 
    ContextMenuContent, 
    ContextMenuItem, 
    ContextMenuLabel, 
    ContextMenuSeparator, 
    ContextMenuTrigger 
} from "@/components/ui/context-menu";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    doc,
    orderBy,
    limit
} from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { 
    getModerationKeywords, 
    updateModerationKeywords, 
    runGlobalContentScanAction,
    applyModerationAction
} from "@/lib/actions/moderationActions";
import { CRITICAL_TERMS } from "@/lib/moderation-rules";
import { ModerationForm } from "@/components/moderation-form";
import { cn } from "@/lib/utils";

type FlaggedContent = {
    id: string;
    content: string;
    contentType: string;
    keywordMatched: string;
    authorId: string;
    authorName: string;
    contentId: string;
    contentPath?: string;
    status: 'new' | 'resolved' | 'pending';
    priority?: 'normal' | 'critical';
    createdAt: any;
    resolvedAt?: any;
    resolvedBy?: string;
};

const stripHtml = (html: string) => {
    if (!html) return "No content available";
    if (typeof window === 'undefined') return html;
    try {
        const div = document.createElement('div');
        div.innerHTML = html;
        const text = div.textContent || div.innerText || "";
        return text.trim();
    } catch (e) {
        return html;
    }
};

const highlightKeyword = (text: string, keyword: string) => {
    if (!text) return "Full Content Transcript: Content missing or could not be retrieved.";
    if (!keyword) return text;
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\b${escapedKeyword}\\b)`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black underline shadow-sm">$1</mark>');
};

const PRESET_RULE_CATEGORIES = [
    { label: "Spam & Scams", keywords: ["crypto", "forex", "whatsapp", "telegram", "guaranteed profit", "free cash", "investment"] },
    { label: "Harassment & Hate", keywords: ["harass", "threat", "abuse", "bully", "slur", "racist"] },
    { label: "Commercial Policy", keywords: ["discount code", "promo", "affiliate", "pyramid", "mlm"] },
];

export default function ModerationPage() {
    const { user } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);
    
    // State
    const [keywords, setKeywords] = React.useState<string[]>([]);
    const [newKeywordInput, setNewKeywordInput] = React.useState("");
    const [loadingKeywords, setLoadingKeywords] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    
    const [flaggedContent, setFlaggedContent] = React.useState<FlaggedContent[]>([]);
    const [resolvedContent, setResolvedContent] = React.useState<FlaggedContent[]>([]);
    const [loadingFlags, setLoadingFlags] = React.useState(true);
    const [isScanning, setIsScanning] = React.useState(false);
    const { toast } = useToast();

    // Filters
    const [activeTab, setActiveTab] = React.useState("queue");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedContentType, setSelectedContentType] = React.useState<string>("all");
    const [selectedPriority, setSelectedPriority] = React.useState<string>("all");
    
    // Modals
    const [storyToAction, setStoryToAction] = React.useState<FlaggedContent | null>(null);
    const [viewingFlag, setViewingFlag] = React.useState<FlaggedContent | null>(null);
    const [actionType, setActionType] = React.useState<'dismiss' | 'remove' | 'suspend' | null>(null);
    const [moderationReason, setModerationReason] = React.useState("");

    const canManage = userProfile?.role === 'admin' || userProfile?.role === 'owner' || userProfile?.role === 'moderator' || (userProfile?.title && userProfile.title.includes('Platform'));

    // Fetch Keywords and Flags
    React.useEffect(() => {
        const fetchKeywords = async () => {
            setLoadingKeywords(true);
            try {
                const currentKeywords = await getModerationKeywords();
                setKeywords(Array.isArray(currentKeywords) ? currentKeywords : []);
            } catch (err) {
                console.error("Failed to load keywords", err);
            } finally {
                setLoadingKeywords(false);
            }
        };
        fetchKeywords();

        if (!db) return;

        // 1. Pending Flags Query
        const pendingQuery = query(
            collection(db, "moderation_flags"), 
            where("status", "in", ["new", "New", "pending", "Pending"])
        );
        
        const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
            const flags = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlaggedContent));
            flags.sort((a, b) => {
                const priorityOrder = { critical: 0, normal: 1 };
                const pA = priorityOrder[a.priority || 'normal'];
                const pB = priorityOrder[b.priority || 'normal'];
                if (pA !== pB) return pA - pB;
                const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                return dateB.getTime() - dateA.getTime();
            });
            setFlaggedContent(flags);
            setLoadingFlags(false);
        });

        // 2. Resolved Flags Query (Recent History)
        const resolvedQuery = query(
            collection(db, "moderation_flags"),
            where("status", "==", "resolved"),
            limit(50)
        );

        const unsubscribeResolved = onSnapshot(resolvedQuery, (snapshot) => {
            const resolved = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlaggedContent));
            resolved.sort((a, b) => {
                const dateA = a.resolvedAt?.toDate?.() || new Date(a.resolvedAt || 0);
                const dateB = b.resolvedAt?.toDate?.() || new Date(b.resolvedAt || 0);
                return dateB.getTime() - dateA.getTime();
            });
            setResolvedContent(resolved);
        });
        
        return () => {
            unsubscribePending();
            unsubscribeResolved();
        };
    }, [db]);

    // KPI Metrics calculation
    const kpiStats = React.useMemo(() => {
        const criticalCount = flaggedContent.filter(f => f.priority === 'critical').length;
        const pendingCount = flaggedContent.length;
        const activeKeywordsCount = keywords.length;
        const hardcodedSafetyCount = CRITICAL_TERMS.length;
        const resolvedCount = resolvedContent.length;
        return { criticalCount, pendingCount, activeKeywordsCount, hardcodedSafetyCount, resolvedCount };
    }, [flaggedContent, keywords, resolvedContent]);

    // Filtered Queue
    const filteredQueue = React.useMemo(() => {
        let list = [...flaggedContent];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(item => 
                (item.authorName || '').toLowerCase().includes(q) ||
                (item.keywordMatched || '').toLowerCase().includes(q) ||
                (item.contentType || '').toLowerCase().includes(q) ||
                (stripHtml(item.content) || '').toLowerCase().includes(q)
            );
        }

        if (selectedContentType !== 'all') {
            list = list.filter(item => item.contentType === selectedContentType);
        }

        if (selectedPriority !== 'all') {
            list = list.filter(item => (item.priority || 'normal') === selectedPriority);
        }

        return list;
    }, [flaggedContent, searchQuery, selectedContentType, selectedPriority]);

    // Unique Content Types present
    const availableContentTypes = React.useMemo(() => {
        const types = new Set<string>();
        flaggedContent.forEach(f => { if (f.contentType) types.add(f.contentType); });
        resolvedContent.forEach(f => { if (f.contentType) types.add(f.contentType); });
        return Array.from(types);
    }, [flaggedContent, resolvedContent]);

    const handleAddKeyword = async (wordToAdd?: string) => {
        const word = (wordToAdd || newKeywordInput).trim().toLowerCase();
        if (!word) return;

        if (keywords.includes(word)) {
            toast({ title: "Keyword Exists", description: `"${word}" is already in your ruleset.` });
            setNewKeywordInput("");
            return;
        }

        const updated = [...keywords, word];
        setIsSaving(true);
        const result = await updateModerationKeywords(updated);
        if (result.success) {
            setKeywords(updated);
            setNewKeywordInput("");
            toast({ title: "Keyword Added", description: `"${word}" is now actively monitored.` });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleRemoveKeyword = async (keywordToRemove: string) => {
        const updatedKeywords = keywords.filter(k => k !== keywordToRemove);
        setIsSaving(true);
        const result = await updateModerationKeywords(updatedKeywords);
        if (result.success) {
            setKeywords(updatedKeywords);
            toast({ title: "Keyword Removed", description: `"${keywordToRemove}" was removed from active filters.` });
        }
        setIsSaving(false);
    };
    
    const handleActionClick = (item: FlaggedContent, action: 'dismiss' | 'remove' | 'suspend') => {
        setStoryToAction(item);
        setActionType(action);
    };
    
    const handleConfirmEnforcement = async () => {
        if (!storyToAction || !actionType || !user || !userProfile) return;
        
        if ((actionType === 'remove' || actionType === 'suspend') && !storyToAction.contentPath) {
            toast({ 
                title: "Path Missing", 
                description: "This flag is missing its database path. Run a Platform Audit to repair it before taking action.", 
                variant: "destructive" 
            });
            return;
        }

        setIsSaving(true);
        try {
            const result = await applyModerationAction({
                flagId: storyToAction.id,
                action: actionType,
                contentPath: storyToAction.contentPath,
                authorId: storyToAction.authorId,
                moderatorId: user.uid,
                moderatorName: userProfile.name || 'Platform Administrator',
                reason: moderationReason || "Violation of community safety standards.",
                contentType: storyToAction.contentType,
                contentId: storyToAction.contentId
            });

            if (result.success) {
                toast({ title: "Action Applied", description: `Enforcement successful: ${actionType.toUpperCase()}` });
                setStoryToAction(null);
                setActionType(null);
                setModerationReason("");
            } else {
                toast({ title: "Enforcement Failed", description: result.error, variant: "destructive" });
            }
        } catch (err: any) {
            console.error("Enforcement failed:", err);
            toast({ title: "Error", description: "An unexpected error occurred during enforcement.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRunScan = async () => {
        setIsScanning(true);
        toast({ title: "Scanning Platform...", description: "Crawling recently created platform content for violations. This may take a few seconds." });
        const result = await runGlobalContentScanAction();
        setIsScanning(false);
        if (result.success) {
            toast({ title: "Scan Complete", description: `Platform audit complete. Found & refreshed flags.` });
        } else {
            toast({ title: "Scan Failed", description: result.error, variant: "destructive" });
        }
    };

    const criticalFlags = filteredQueue.filter(f => f.priority === 'critical');
    const standardFlags = filteredQueue.filter(f => f.priority !== 'critical');

    return (
    <div className="space-y-8 pb-20">
       {/* Hero Banner */}
       <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-rose-600/15 via-red-600/10 to-indigo-950/15 border-2 border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
            <div>
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest mb-1.5">
                    <ShieldAlert className="h-4 w-4 text-rose-500 animate-pulse" />
                    AI Safety Shield • Automated Content Moderation Suite
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                    <Gavel className="h-8 w-8 text-rose-600" />
                    Content Moderation &amp; Safety
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                    Automated whole-word matching, zero-tolerance safety layers, AI content diagnostics, and swift enforcement protocols.
                </p>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button 
                    onClick={handleRunScan} 
                    disabled={isScanning} 
                    className="font-black gap-2 shadow-lg h-12 px-6 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white uppercase text-xs tracking-wider"
                >
                    {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                    Run Platform Audit
                </Button>
            </div>
      </div>

      {/* 5 Real-Time KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="border-t-4 border-t-rose-600 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3.5">
                <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Critical Flags</p>
                    <div className="p-1 rounded-md bg-rose-500/10 text-rose-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                </div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400">{kpiStats.criticalCount}</div>
                <p className="text-[9px] text-muted-foreground font-semibold">Zero-tolerance alerts</p>
            </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3.5">
                <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Queue</p>
                    <div className="p-1 rounded-md bg-amber-500/10 text-amber-600">
                        <Clock className="h-3.5 w-3.5" />
                    </div>
                </div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400">{kpiStats.pendingCount}</div>
                <p className="text-[9px] text-muted-foreground font-semibold">Awaiting investigation</p>
            </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3.5">
                <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monitored Terms</p>
                    <div className="p-1 rounded-md bg-blue-500/10 text-blue-600">
                        <Tag className="h-3.5 w-3.5" />
                    </div>
                </div>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400">{kpiStats.activeKeywordsCount}</div>
                <p className="text-[9px] text-muted-foreground font-semibold">Active custom keywords</p>
            </CardContent>
        </Card>

        <Card className="border-t-4 border-t-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3.5">
                <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Safety Baseline</p>
                    <div className="p-1 rounded-md bg-slate-800/10 text-slate-800 dark:text-slate-200">
                        <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                </div>
                <div className="text-xl font-black text-foreground">{kpiStats.hardcodedSafetyCount}</div>
                <p className="text-[9px] text-muted-foreground font-semibold">Hardcoded safety rules</p>
            </CardContent>
        </Card>

        <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
            <CardContent className="p-3.5">
                <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actioned Items</p>
                    <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{kpiStats.resolvedCount}</div>
                <p className="text-[9px] text-muted-foreground font-semibold">Resolved in history</p>
            </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-11 bg-muted/60 p-1 rounded-xl border">
            <TabsTrigger value="queue" className="font-bold text-xs gap-1.5">
                <Scale className="h-4 w-4 text-rose-500" /> Enforcement Queue ({flaggedContent.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="font-bold text-xs gap-1.5">
                <History className="h-4 w-4 text-emerald-500" /> Resolution Log ({resolvedContent.length})
            </TabsTrigger>
            <TabsTrigger value="rules" className="font-bold text-xs gap-1.5">
                <Gavel className="h-4 w-4 text-blue-500" /> Ruleset &amp; Terms
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="font-bold text-xs gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" /> AI Diagnostic Lab
            </TabsTrigger>
        </TabsList>

        {/* TAB 1: ENFORCEMENT QUEUE */}
        <TabsContent value="queue" className="space-y-6">
            {/* Critical High-Risk Alert Callout (if any) */}
            {criticalFlags.length > 0 && (
                <div className="p-4 rounded-xl border-2 border-rose-500 bg-rose-500/10 space-y-3 shadow-md animate-pulse">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm uppercase tracking-wider">
                            <AlertTriangle className="h-5 w-5 text-rose-600" />
                            Emergency Safety Violations Detected ({criticalFlags.length})
                        </div>
                        <Badge variant="destructive" className="font-mono text-[10px] font-black uppercase">Immediate Action Required</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                        These submissions matched zero-tolerance critical safety triggers and pose immediate platform risk.
                    </p>
                </div>
            )}

            {/* Filter Toolbar */}
            <Card className="border-t-4 border-t-rose-600 shadow-md">
                <CardHeader className="bg-gradient-to-r from-rose-500/5 via-transparent to-transparent space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold">Flagged Submissions Queue</CardTitle>
                            <CardDescription>Content automatically trapped by keyword boundary detection requiring moderator resolution.</CardDescription>
                        </div>
                        {(searchQuery || selectedContentType !== 'all' || selectedPriority !== 'all') && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSearchQuery(""); setSelectedContentType("all"); setSelectedPriority("all"); }} 
                                className="font-bold text-xs uppercase text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                            >
                                <FilterX className="mr-1.5 h-4 w-4" /> Reset Filters
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search author, keyword, snippet..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 border-2 bg-background font-medium text-xs"
                            />
                        </div>

                        <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                            <SelectTrigger className="h-10 border-2 bg-background font-bold text-xs">
                                <SelectValue placeholder="All Content Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Content Types</SelectItem>
                                {availableContentTypes.map(type => (
                                    <SelectItem key={type} value={type} className="text-xs font-semibold">{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                            <SelectTrigger className="h-10 border-2 bg-background font-bold text-xs">
                                <SelectValue placeholder="All Priorities" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="critical">🚨 Critical / High Risk Only</SelectItem>
                                <SelectItem value="normal">⚖️ Normal Review</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Flagged Term</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Source Domain</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Content Snippet</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Author</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Timestamp</TableHead>
                                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest pr-6">Enforcement</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingFlags ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center">
                                            <Loader2 className="animate-spin h-8 w-8 mx-auto text-rose-500" />
                                            <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest">Checking safety queue...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredQueue.length > 0 ? (
                                    filteredQueue.map((item) => {
                                        const isCritical = item.priority === 'critical';
                                        return (
                                        <ContextMenu key={item.id}>
                                            <ContextMenuTrigger asChild>
                                                <TableRow className={cn("hover:bg-muted/40 cursor-context-menu transition-colors", isCritical && "bg-rose-500/5")}>
                                                    <TableCell>
                                                        <Badge variant={isCritical ? "destructive" : "outline"} className={cn("font-black text-[10px] uppercase tracking-wider", !isCritical && "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30")}>
                                                            {isCritical && "🚨 "}{item.keywordMatched}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="font-bold text-[10px] uppercase">
                                                            {item.contentType || 'Submission'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs italic text-muted-foreground max-w-xs truncate font-medium">
                                                        {stripHtml(item.content)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{item.authorName}</span>
                                                            <span className="text-[10px] font-mono text-muted-foreground">{item.authorId.substring(0, 8)}...</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono text-muted-foreground">
                                                        {item.createdAt?.toDate ? format(item.createdAt.toDate(), "dd MMM HH:mm") : (item.createdAt ? format(new Date(item.createdAt), "dd MMM HH:mm") : 'N/A')}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => setViewingFlag(item)} 
                                                                className="h-8 font-black uppercase text-[10px] border-2 border-rose-500/30 hover:border-rose-500 hover:bg-rose-500 hover:text-white"
                                                            >
                                                                <Eye className="mr-1 h-3.5 w-3.5" /> Inspect
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-52">
                                                                    <DropdownMenuLabel>Enforcement Options</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => setViewingFlag(item)}>
                                                                        <Eye className="mr-2 h-4 w-4" /> Investigate Transcript
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => handleActionClick(item, 'dismiss')} className="text-emerald-600 font-bold">
                                                                        <CheckCircle className="mr-2 h-4 w-4" /> Approve &amp; Dismiss
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleActionClick(item, 'remove')} className="text-amber-600 font-bold">
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Remove &amp; Warn Author
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleActionClick(item, 'suspend')} className="text-destructive font-bold">
                                                                        <Ban className="mr-2 h-4 w-4" /> Suspend User Account
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent className="w-56">
                                                <ContextMenuLabel>{item.authorName} ({item.contentType})</ContextMenuLabel>
                                                <ContextMenuSeparator />
                                                <ContextMenuItem onSelect={() => setViewingFlag(item)}><Eye className="mr-2 h-4 w-4" /> Inspect Content</ContextMenuItem>
                                                <ContextMenuSeparator />
                                                <ContextMenuItem onSelect={() => handleActionClick(item, 'dismiss')} className="text-emerald-600 font-bold"><CheckCircle className="mr-2 h-4 w-4" /> Approve &amp; Dismiss</ContextMenuItem>
                                                <ContextMenuItem onSelect={() => handleActionClick(item, 'remove')} className="text-amber-600 font-bold"><Trash2 className="mr-2 h-4 w-4" /> Remove &amp; Warn</ContextMenuItem>
                                                <ContextMenuItem onSelect={() => handleActionClick(item, 'suspend')} className="text-destructive font-bold"><Ban className="mr-2 h-4 w-4" /> Suspend User</ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <ShieldCheck className="h-8 w-8 text-emerald-500" />
                                                <p className="text-sm font-bold text-foreground">Enforcement Queue is Clear!</p>
                                                <p className="text-xs text-muted-foreground">All flagged submissions have been investigated and resolved.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* TAB 2: RESOLUTION HISTORY LOG */}
        <TabsContent value="history">
            <Card className="border-t-4 border-t-emerald-600 shadow-md">
                <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
                    <CardTitle className="text-lg font-bold">Historical Sanctions &amp; Approvals Log</CardTitle>
                    <CardDescription>Immutable record of all resolved moderation decisions, investigator signatures, and applied actions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Matched Term</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Content Type</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Author</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Investigator</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest">Resolution Date</TableHead>
                                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest pr-6">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resolvedContent.length > 0 ? (
                                    resolvedContent.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-muted/30">
                                            <TableCell>
                                                <Badge variant="outline" className="font-bold text-xs font-mono">{item.keywordMatched}</Badge>
                                            </TableCell>
                                            <TableCell className="font-bold text-xs">{item.contentType}</TableCell>
                                            <TableCell className="text-xs font-medium">{item.authorName}</TableCell>
                                            <TableCell className="text-xs font-bold text-foreground">{item.resolvedBy || 'Platform Administrator'}</TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {item.resolvedAt?.toDate ? format(item.resolvedAt.toDate(), "dd MMM yyyy HH:mm") : (item.resolvedAt ? format(new Date(item.resolvedAt), "dd MMM yyyy HH:mm") : 'N/A')}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-black uppercase">
                                                    Resolved
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                                            No resolved flags recorded in recent history.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* TAB 3: KEYWORD & RULESET MANAGER */}
        <TabsContent value="rules" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Interactive Keyword Cloud */}
                <Card className="lg:col-span-2 border-t-4 border-t-blue-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-blue-500/5 via-transparent to-transparent space-y-4">
                        <div>
                            <CardTitle className="text-lg font-bold">Active Filter Ruleset</CardTitle>
                            <CardDescription>Custom keywords monitored across all community feeds, businesses, and marketplace listings.</CardDescription>
                        </div>
                        {/* Quick Add Inline Form */}
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Add a new keyword (e.g., scam, phishing, offensive term)..." 
                                value={newKeywordInput}
                                onChange={(e) => setNewKeywordInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddKeyword(); }}
                                className="h-10 border-2 font-medium text-xs bg-background"
                            />
                            <Button onClick={() => handleAddKeyword()} disabled={!newKeywordInput.trim() || isSaving} className="font-bold text-xs uppercase bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                                <PlusCircle className="mr-1.5 h-4 w-4" /> Add Keyword
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Preset Category Injectors */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Quick-Add Keyword Presets</Label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_RULE_CATEGORIES.map(cat => (
                                    <DropdownMenu key={cat.label}>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-7 text-[11px] font-bold rounded-lg border-2">
                                                <Tag className="mr-1 h-3 w-3 text-blue-500" /> {cat.label} <ChevronDown className="ml-1 h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuLabel>Add {cat.label} Keywords</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {cat.keywords.map(kw => (
                                                <DropdownMenuItem key={kw} onClick={() => handleAddKeyword(kw)} className="text-xs font-medium">
                                                    + {kw}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ))}
                            </div>
                        </div>

                        {/* Keyword Cloud Container */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Active Term Cloud ({keywords.length})</Label>
                                <span className="text-[11px] text-muted-foreground">Click &apos;X&apos; to instantly remove term</span>
                            </div>
                            <div className="flex flex-wrap gap-2 p-4 border-2 rounded-xl min-h-32 bg-muted/20 items-start">
                                {loadingKeywords ? (
                                    <Loader2 className="animate-spin mx-auto text-blue-500" />
                                ) : keywords.map(keyword => (
                                    <Badge key={keyword} variant="secondary" className="text-xs font-bold gap-1.5 py-1.5 px-3 bg-background border shadow-sm">
                                        <span>{keyword}</span>
                                        {canManage && (
                                            <button 
                                                onClick={() => handleRemoveKeyword(keyword)} 
                                                className="rounded-full hover:bg-rose-500/20 hover:text-rose-600 p-0.5 transition-colors"
                                                title={`Remove "${keyword}"`}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Hardcoded Zero-Tolerance Layer */}
                <Card className="border-t-4 border-t-slate-800 bg-slate-950 text-white shadow-md">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                            <ShieldCheck className="h-4 w-4" /> Core Protection
                        </div>
                        <CardTitle className="text-lg font-black text-white">Hardcoded Safety Layer</CardTitle>
                        <CardDescription className="text-slate-400 text-xs leading-relaxed">
                            Zero-tolerance safety terms that automatically trigger emergency critical priority flags across the entire platform.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto p-2 bg-white/5 rounded-xl border border-white/10">
                            {CRITICAL_TERMS.map(term => (
                                <Badge key={term} className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono">
                                    {term}
                                </Badge>
                            ))}
                        </div>
                        <Alert className="bg-white/5 border-white/10 text-white">
                            <Info className="h-4 w-4 text-amber-400" />
                            <AlertTitle className="text-amber-400 text-xs font-bold">Protected Safety Standard</AlertTitle>
                            <AlertDescription className="text-[11px] text-slate-300">
                                These terms bypass custom rule deletion to ensure zero-tolerance platform compliance.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        {/* TAB 4: AI DIAGNOSTIC LAB */}
        <TabsContent value="sandbox">
            <Card className="border-t-4 border-t-amber-500 shadow-md">
                <CardHeader className="bg-gradient-to-r from-amber-500/5 via-transparent to-transparent">
                    <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="h-4 w-4" /> AI Diagnostics
                    </div>
                    <CardTitle className="text-lg font-bold">Interactive Gemini AI Sandbox</CardTitle>
                    <CardDescription>Test raw text, drafts, or suspected content against Gemini AI content safety classifiers in real time.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    <ModerationForm />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

        {/* Investigation Full Modal */}
        <Dialog open={!!viewingFlag} onOpenChange={(open) => { if (!open) setViewingFlag(null); }}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant={viewingFlag?.priority === 'critical' ? 'destructive' : 'secondary'} className="font-bold text-[10px] uppercase">
                            {viewingFlag?.priority?.toUpperCase() || 'NORMAL'} PRIORITY
                        </Badge>
                        <Badge variant="outline" className="font-bold text-[10px] uppercase">{viewingFlag?.contentType}</Badge>
                    </div>
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        <FileText className="h-6 w-6 text-rose-600" />
                        Forensic Content Investigation
                    </DialogTitle>
                    <DialogDescription>
                        Triggered by matched boundary keyword: <span className="font-black text-rose-600">&quot;{viewingFlag?.keywordMatched}&quot;</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Highlighted Transcript */}
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" /> Full Transcript with Matched Term Highlight
                        </Label>
                        <div 
                            className="p-4 rounded-xl bg-muted/40 border-2 prose dark:prose-invert max-w-none text-sm leading-relaxed max-h-60 overflow-y-auto" 
                            dangerouslySetInnerHTML={{ __html: viewingFlag ? highlightKeyword(viewingFlag.content, viewingFlag.keywordMatched) : "" }} 
                        />
                    </div>

                    {/* Metadata Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border bg-background">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5">
                                <UserIcon className="h-3.5 w-3.5" /> Submitting Author
                            </Label>
                            <p className="text-sm font-bold text-foreground">{viewingFlag?.authorName}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">UID: {viewingFlag?.authorId}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" /> Captured Timestamp
                            </Label>
                            <p className="text-sm font-bold text-foreground">
                                {viewingFlag?.createdAt ? format(viewingFlag.createdAt.toDate?.() || new Date(viewingFlag.createdAt), "PPP p") : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {!viewingFlag?.contentPath && (
                        <Alert variant="destructive" className="bg-destructive/10">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="font-bold">Missing Content Path</AlertTitle>
                            <AlertDescription className="text-xs">
                                This flag was imported without a direct database path. Run &quot;Platform Audit&quot; from the top header to automatically resolve paths.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter className="bg-muted/30 p-4 -mx-6 -mb-6 border-t mt-4 gap-2">
                    <Button variant="outline" onClick={() => setViewingFlag(null)} className="font-bold text-xs uppercase">Close</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="font-bold text-xs uppercase bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
                                Action Submission <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => { setViewingFlag(null); handleActionClick(viewingFlag!, 'dismiss'); }} className="text-emerald-600 font-bold">
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve &amp; Dismiss Flag
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setViewingFlag(null); handleActionClick(viewingFlag!, 'remove'); }} className="text-amber-600 font-bold">
                                <Trash2 className="mr-2 h-4 w-4" /> Remove Content &amp; Warn
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setViewingFlag(null); handleActionClick(viewingFlag!, 'suspend'); }} className="text-destructive font-bold">
                                <Ban className="mr-2 h-4 w-4" /> Suspend Author Account
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Action Enforcement Modal */}
        <Dialog open={!!storyToAction} onOpenChange={(isOpen) => { if (!isOpen) setStoryToAction(null); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black">
                        {actionType === 'dismiss' ? <CheckCircle className="text-emerald-600" /> : <ShieldAlert className="text-destructive" />}
                        Confirm Enforcement: {actionType?.toUpperCase()}
                    </DialogTitle>
                    <DialogDescription>Executing safety policy enforcement for author: <span className="font-bold">{storyToAction?.authorName}</span>.</DialogDescription>
                </DialogHeader>
                {(actionType === 'remove' || actionType === 'suspend') && (
                    <div className="py-4 space-y-4">
                        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                            <Info className="h-4 w-4" />
                            <AlertTitle className="text-xs font-black uppercase">Public Safety Notification</AlertTitle>
                            <AlertDescription className="text-xs leading-relaxed">
                                The author will be notified automatically that their submission was removed for violating the **User Policy Agreement**.
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            <Label className="font-bold text-xs uppercase tracking-wider">Moderator Note (Sent to Author)</Label>
                            <Textarea 
                                placeholder="Explain the specific safety violation reason to the author..."
                                value={moderationReason} 
                                onChange={(e) => setModerationReason(e.target.value)} 
                                className="border-2 font-medium text-xs bg-background"
                            />
                        </div>
                    </div>
                )}
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setStoryToAction(null)} disabled={isSaving} className="font-bold text-xs uppercase">Cancel</Button>
                    <Button 
                        variant={actionType === 'dismiss' ? 'default' : 'destructive'} 
                        onClick={handleConfirmEnforcement} 
                        disabled={isSaving}
                        className="font-black text-xs uppercase"
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm &amp; Execute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
