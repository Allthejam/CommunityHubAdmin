"use client";

import * as React from "react";
import {
  LineChart,
  Eye,
  CheckCircle,
  Archive,
  MoreHorizontal,
  Loader2,
  ArrowUpDown,
  User,
  ShieldAlert,
  Save,
  Clock,
  AlertTriangle,
  FileWarning,
  CheckCircle2,
  ExternalLink,
  FileText,
  Calendar,
  ImageIcon,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";

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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateReportStatusAction } from "@/lib/actions/reportActions";

type ReportStatus = "New" | "In Progress" | "Resolved" | "Archived";

type Report = {
  id: string;
  subject: string;
  reporterName: string;
  createdAt: { toDate: () => Date };
  status: ReportStatus;
  description: string;
  severity: "Low" | "Moderate" | "Severe";
  image?: string;
  reporterId: string;
  resolutionNotes?: string;
  resolvedAt?: { toDate: () => Date };
  resolvedBy?: string;
  communityId?: string; // Optional for platform reports
};

const StatusBadge = ({ status }: { status: ReportStatus }) => {
  const statusStyles: { [key in ReportStatus]: string } = {
    New: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 font-bold",
    "In Progress": "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold",
    Resolved: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold",
    Archived: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-semibold",
  };
  return <Badge variant="outline" className={cn("shadow-2xs text-xs px-2 py-0.5", statusStyles[status])}>{status}</Badge>;
};

const SeverityBadge = ({ severity }: { severity: Report["severity"] }) => {
    const severityStyles = {
        Low: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
        Moderate: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold",
        Severe: "bg-rose-600 text-white font-black shadow-xs",
    };
    return <Badge variant={severity === 'Severe' ? 'default' : 'outline'} className={cn("text-[11px] px-2 py-0.5", severityStyles[severity])}>{severity}</Badge>;
};

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "New", label: "New" },
  { value: "In Progress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Archived", label: "Archived" },
];

export default function LeaderReportsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState("all");
  const [viewingReport, setViewingReport] = React.useState<Report | null>(null);
  const [resolutionNotes, setResolutionNotes] = React.useState("");
  const [sorting, setSorting] = React.useState<{ key: keyof Report; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });

  const reportsQuery = useMemoFirebase(() => {
    if (!db) return null;
     return query(collection(db, "platform_reports"));
  }, [db]);
  
  const { data: reports, isLoading } = useCollection<Report>(reportsQuery);

  const handleUpdateStatus = async (report: Report, status: ReportStatus, notes?: string) => {
    try {
        const result = await updateReportStatusAction({ reportId: report.id, status, resolutionNotes: notes, resolvedBy: userProfile?.name, reportType: 'platform' });
        if(result.success) {
            toast({ title: 'Success', description: `Report status updated to ${status}.`});
            return;
        } else {
            throw new Error(result.error);
        }
    } catch(error: any) {
        console.warn("[Reports] Server update error, executing client fallback:", error);
        try {
            if (!db) throw error;
            const updateData: any = { status, updatedAt: new Date() };
            if (status === 'Resolved') {
                updateData.resolvedAt = new Date();
                updateData.resolvedBy = userProfile?.name || 'Platform Administration';
                if (notes) updateData.resolutionNotes = notes;
            }
            await updateDoc(doc(db, 'platform_reports', report.id), updateData);
            toast({ title: 'Success', description: `Report status updated to ${status}.` });
        } catch (fallbackError: any) {
            console.error("Error updating report status:", fallbackError);
            toast({ title: 'Error', description: error.message || fallbackError.message || 'Failed to update report status.', variant: 'destructive'});
        }
    }
  };

  const handleSaveAndResolve = () => {
    if (viewingReport) {
      handleUpdateStatus(viewingReport, "Resolved", resolutionNotes);
      setViewingReport(null);
      setResolutionNotes("");
    }
  };

  const handleSort = (key: keyof Report) => {
    setSorting(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const normalizeReportStatus = (status: string | undefined): ReportStatus => {
    if (!status) return "New";
    const s = status.toLowerCase();
    if (s === "new" || s === "pending") return "New";
    if (s === "in progress" || s === "inprogress") return "In Progress";
    if (s === "resolved" || s === "complete") return "Resolved";
    if (s === "archived") return "Archived";
    return status as ReportStatus;
  };

  const getReportDate = (d: any): Date => {
    if (!d) return new Date(0);
    if (d instanceof Date) return d;
    if (typeof d?.toDate === 'function') return d.toDate();
    const parsed = new Date(d);
    return !isNaN(parsed.getTime()) ? parsed : new Date(0);
  };

  const filteredAndSortedReports = React.useMemo(() => {
    if (!reports) return [];
    let filtered = reports;
    if (activeTab !== "all") {
        filtered = reports.filter((report) => normalizeReportStatus(report.status) === activeTab);
    }
    
    return [...filtered].sort((a, b) => {
        const key = sorting.key;
        const order = sorting.order === 'asc' ? 1 : -1;
        
        let valA = a[key as keyof Report] as any;
        let valB = b[key as keyof Report] as any;

        if (key === 'createdAt') {
            valA = getReportDate(a.createdAt);
            valB = getReportDate(b.createdAt);
            return (valA.getTime() - valB.getTime()) * order;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * order;
        }
        return 0;
    });
  }, [reports, activeTab, sorting]);

  const ArchiveCountdown = ({ resolvedAt }: { resolvedAt?: { toDate: () => Date } }) => {
    if (!resolvedAt) return null;
    const resolvedDate = resolvedAt.toDate();
    const deletionDate = addDays(resolvedDate, 28);
    const daysRemaining = differenceInDays(deletionDate, new Date());
    
    if (daysRemaining <= 0) {
        return <span className="text-xs text-muted-foreground">Ready for archival</span>;
    }
    
    return <span className="text-xs text-muted-foreground">Archives in {daysRemaining} days</span>;
  };

  const reportStats = React.useMemo(() => {
    const list = reports || [];
    return {
      total: list.length,
      newReports: list.filter(r => r.status === 'New').length,
      inProgress: list.filter(r => r.status === 'In Progress').length,
      resolved: list.filter(r => r.status === 'Resolved').length,
    };
  }, [reports]);

  return (
    <>
      <div className="space-y-8">
        {/* Header Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-500/10 via-primary/5 to-amber-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
              <FileWarning className="h-3.5 w-3.5" />
              Safety, Moderation & Resolution
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-7 w-7 text-rose-600" />
              Platform Reports & Incidents
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review and resolve safety complaints, user infringements, and platform bug submissions.
            </p>
          </div>
        </div>

        {/* KPI Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-t-4 border-t-slate-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between space-y-0 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Reports</p>
                <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-600">
                  <FileWarning className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black">{reportStats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between space-y-0 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New / Unresolved</p>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
                  <AlertTriangle className="h-4 w-4 animate-pulse" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{reportStats.newReports}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between space-y-0 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">In Progress</p>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{reportStats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between space-y-0 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resolved</p>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{reportStats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-t-4 border-t-rose-500 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-rose-500/5 via-transparent to-transparent rounded-t-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <CardTitle className="text-lg font-bold">Incident Queue</CardTitle>
                <CardDescription>Review and action incident reports with full audit history.</CardDescription>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-xs sm:text-sm font-semibold"
                  >
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
                    <TableHead><Button variant="ghost" onClick={() => handleSort('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('severity')}>Severity <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('reporterName')}>Reported By <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('createdAt')}>Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading reports...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAndSortedReports.length > 0 ? (
                    filteredAndSortedReports.map((report) => (
                      <ContextMenu key={report.id}>
                        <ContextMenuTrigger asChild>
                          <TableRow className="cursor-context-menu hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium">{report.subject}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <StatusBadge status={report.status} />
                                {report.status === 'Resolved' && report.resolvedAt && (
                                    <ArchiveCountdown resolvedAt={report.resolvedAt} />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                                <SeverityBadge severity={report.severity} />
                            </TableCell>
                             <TableCell>
                               {report.reporterName ? (
                                    <div className="flex items-center gap-2 text-xs">
                                        <User className="h-3 w-3" />
                                        {report.reporterName}
                                    </div>
                               ) : <span className="text-xs text-muted-foreground">Anonymous</span>}
                            </TableCell>
                            <TableCell>
                              {report.createdAt ? format(report.createdAt.toDate(), "PPP") : 'N/A'}
                            </TableCell>
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
                                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setViewingReport(report); }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {report.status === "New" && (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(report, "In Progress")}>
                                          <CheckCircle className="mr-2 h-4 w-4" /> Acknowledge &amp; Begin
                                      </DropdownMenuItem>
                                  )}
                                  {report.status === "In Progress" && (
                                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setViewingReport(report); }}>
                                          <CheckCircle className="mr-2 h-4 w-4" /> Mark as Resolved
                                      </DropdownMenuItem>
                                  )}
                                  {report.status === "Resolved" && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(report, "Archived")}>
                                      <Archive className="mr-2 h-4 w-4" /> Archive
                                    </DropdownMenuItem>
                                  )}
                                  {report.status !== "Archived" && report.status !== "Resolved" && (
                                    <DropdownMenuItem
                                      onClick={() => handleUpdateStatus(report, "Archived")}
                                    >
                                      <Archive className="mr-2 h-4 w-4" />
                                      Archive
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-64">
                          <ContextMenuLabel>Actions for {report.subject}</ContextMenuLabel>
                          <ContextMenuSeparator />
                          <ContextMenuItem onSelect={() => setViewingReport(report)}>
                            <Eye className="mr-2 h-4 w-4" /> View Full Details
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          {report.status === "New" && (
                              <ContextMenuItem onClick={() => handleUpdateStatus(report, "In Progress")}>
                                  <CheckCircle className="mr-2 h-4 w-4" /> Acknowledge & Begin
                              </ContextMenuItem>
                          )}
                          {report.status === "In Progress" && (
                              <ContextMenuItem onSelect={() => setViewingReport(report)}>
                                  <CheckCircle className="mr-2 h-4 w-4" /> Mark as Resolved
                              </ContextMenuItem>
                          )}
                          {report.status === "Resolved" && (
                            <ContextMenuItem onClick={() => handleUpdateStatus(report, "Archived")}>
                              <Archive className="mr-2 h-4 w-4" /> Archive Report
                            </ContextMenuItem>
                          )}
                          {report.status !== "Archived" && report.status !== "Resolved" && (
                            <ContextMenuItem onClick={() => handleUpdateStatus(report, "Archived")}>
                              <Archive className="mr-2 h-4 w-4" /> Archive Report
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No reports in this category.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

       <Dialog open={!!viewingReport} onOpenChange={() => { setViewingReport(null); setResolutionNotes(""); }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-2">
                {viewingReport && (
                  <>
                    {/* Header with Severity Tint */}
                    <div className={cn(
                        "p-5 border-b relative",
                        viewingReport.severity === 'Severe' 
                            ? "bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent border-rose-200 dark:border-rose-900/50" 
                            : viewingReport.severity === 'Moderate'
                            ? "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-200 dark:border-amber-900/50"
                            : "bg-gradient-to-r from-sky-500/15 via-sky-500/5 to-transparent border-sky-200 dark:border-sky-900/50"
                    )}>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <SeverityBadge severity={viewingReport.severity} />
                                <StatusBadge status={viewingReport.status} />
                                <span className="text-[10px] font-mono font-bold bg-muted/80 text-muted-foreground px-2 py-0.5 rounded-md">
                                    ID: {viewingReport.id.substring(0, 8)}
                                </span>
                            </div>
                            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                                {viewingReport.subject}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                Submitted on {viewingReport.createdAt ? format(getReportDate(viewingReport.createdAt), "PPP 'at' p") : "Unknown date"}
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Scrollable Content Body */}
                    <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                        {/* 4 Quick Stat Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Status</span>
                                <StatusBadge status={viewingReport.status} />
                            </div>
                            <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Severity</span>
                                <SeverityBadge severity={viewingReport.severity} />
                            </div>
                            <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Reported By</span>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate">
                                    <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                    <span className="truncate">{viewingReport.reporterName || 'Anonymous'}</span>
                                </div>
                            </div>
                            <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Incident Date</span>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                    <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                    <span>{viewingReport.createdAt ? format(getReportDate(viewingReport.createdAt), "dd MMM yyyy") : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attached Evidence / Photo - Completely separated & protected from overlapping */}
                        {viewingReport.image && (
                            <div className="rounded-xl border border-sky-200/90 dark:border-sky-800/60 bg-gradient-to-b from-sky-50/60 to-slate-50/40 dark:from-sky-950/20 dark:to-slate-900/40 p-3 shadow-xs">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-sky-100 dark:border-sky-900/40">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-300">
                                        <ImageIcon className="h-4 w-4 text-sky-600" />
                                        <span>Incident Photo / Attached Evidence</span>
                                    </div>
                                    <a 
                                        href={viewingReport.image} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-[11px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-1 hover:underline cursor-pointer"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Open Full Size
                                    </a>
                                </div>
                                <div className="flex items-center justify-center bg-black/5 dark:bg-black/30 rounded-lg p-2 overflow-hidden border border-sky-100/60 dark:border-sky-900/30">
                                    <img 
                                        src={viewingReport.image} 
                                        alt="Report attachment" 
                                        className="max-h-[300px] w-auto max-w-full rounded-md object-contain shadow-sm cursor-zoom-in hover:brightness-105 transition-all"
                                        onClick={() => window.open(viewingReport.image, '_blank')}
                                        title="Click to open full resolution in new tab"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Incident Description Card */}
                        <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-1.5 shadow-2xs">
                            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                <span>Incident Description</span>
                            </div>
                            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap pt-0.5">
                                {viewingReport.description || "No written description provided."}
                            </p>
                        </div>

                        {/* Resolved State Information */}
                        {viewingReport.status === 'Resolved' && viewingReport.resolutionNotes && (
                            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 space-y-2 shadow-2xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-emerald-200/60 dark:border-emerald-800/60">
                                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>Official Resolution</span>
                                    </div>
                                    {viewingReport.resolvedAt && (
                                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                            Resolved {format(getReportDate(viewingReport.resolvedAt), "PPP 'at' p")}
                                        </span>
                                    )}
                                </div>
                                {viewingReport.resolvedBy && (
                                    <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 font-medium">
                                        Actioned by: <strong>{viewingReport.resolvedBy}</strong>
                                    </p>
                                )}
                                <div className="text-sm text-foreground/90 bg-white/90 dark:bg-emerald-950/60 p-3 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 whitespace-pre-wrap leading-relaxed">
                                    {viewingReport.resolutionNotes}
                                </div>
                            </div>
                        )}

                        {/* Action Panel for New or In-Progress Reports */}
                        {(viewingReport.status === 'In Progress' || viewingReport.status === 'New') && (
                            <div className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-gradient-to-b from-amber-50/50 to-amber-50/20 dark:from-amber-950/30 dark:to-amber-950/10 p-4 space-y-3 shadow-2xs">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <Label htmlFor="resolution-notes" className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                                        <CheckCircle className="h-4 w-4 text-amber-600" />
                                        Action &amp; Resolution
                                    </Label>
                                    {viewingReport.status === 'New' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50"
                                            onClick={() => handleUpdateStatus(viewingReport, 'In Progress')}
                                        >
                                            <Clock className="mr-1.5 h-3.5 w-3.5" />
                                            Acknowledge &amp; Mark In Progress
                                        </Button>
                                    )}
                                </div>
                                <Textarea
                                    id="resolution-notes"
                                    placeholder="Enter detailed outcome, actions taken, or instructions before closing this incident..."
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    className="min-h-[90px] bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800 focus-visible:ring-amber-500 text-sm"
                                />
                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <Button 
                                        onClick={handleSaveAndResolve} 
                                        disabled={!resolutionNotes.trim()}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 shadow-sm"
                                    >
                                        <Save className="mr-1.5 h-3.5 w-3.5" />
                                        Save &amp; Mark as Resolved
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clean Footer */}
                    <DialogFooter className="p-3.5 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
                        <span className="text-[11px] text-muted-foreground font-mono">
                            Status: <strong className="font-semibold text-foreground">{viewingReport.status}</strong>
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setViewingReport(null)} className="h-8 font-semibold">
                            Close
                        </Button>
                    </DialogFooter>
                  </>
                )}
            </DialogContent>
        </Dialog>
    </>
  );
}