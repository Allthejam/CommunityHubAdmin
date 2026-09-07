'use client';

import * as React from "react";
import { 
    Briefcase, 
    PlusCircle, 
    Loader2, 
    FileEdit, 
    Trash2, 
    Globe, 
    Clock3,
    CalendarDays,
    RotateCw,
    AlertTriangle,
    ShieldCheck,
    Users,
    Info,
    ShieldAlert,
    Sparkles,
    Rocket,
    Zap,
    HeartHandshake,
    CheckCircle2,
    Flame,
    Award
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { deleteCareerAction, runCareerCleanupAction } from "@/lib/actions/careerActions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function AdminCareersPage() {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [isCleaning, setIsCleaning] = React.useState(false);

    // Absolute Ownership Priority: Owner role bypasses all flags
    const isOwner = React.useMemo(() => {
        if (!userProfile) return false;
        return userProfile.role?.toLowerCase() === 'owner';
    }, [userProfile]);

    const canView = isOwner || userProfile?.permissions?.viewCareers === true;
    const canManage = isOwner || userProfile?.permissions?.actionManageCareers === true;

    const careersQuery = useMemoFirebase(() => {
        if (!db || !canView) return null;
        return query(collection(db, 'careers'), orderBy('createdAt', 'desc'));
    }, [db, canView]);

    const { data: careers, isLoading: careersLoading } = useCollection(careersQuery);

    const handleDelete = async (id: string) => {
        if (!canManage) return;
        if (!confirm("Are you sure you want to permanently delete this job listing?")) return;
        const result = await deleteCareerAction(id);
        if (result.success) toast({ title: "Career Deleted" });
        else toast({ title: "Error", description: result.error, variant: "destructive" });
    };

    const handleMaintenanceSweep = async () => {
        if (!canManage) return;
        if (!confirm("Archive all vacancies where the closing date has passed? This will set their status to 'Closed' in the database.")) return;
        setIsCleaning(true);
        const result = await runCareerCleanupAction();
        if (result.success) {
            toast({ title: "Maintenance Complete", description: `Closed ${result.count} expired vacancies.` });
        } else {
            toast({ title: "Sweep Failed", description: result.error, variant: "destructive" });
        }
        setIsCleaning(false);
    };

    const stats = React.useMemo(() => {
        if (!careers) return { total: 0, open: 0, expired: 0, internal: 0, public: 0 };
        const today = startOfDay(new Date());
        return careers.reduce((acc, c) => {
            acc.total++;
            const cDate = c.closingDate?.toDate ? c.closingDate.toDate() : (c.closingDate ? new Date(c.closingDate) : null);
            if (c.status === 'Open' && cDate && isBefore(cDate, today)) {
                acc.expired++;
            }
            if (c.status === 'Open') acc.open++;
            if (c.isInternalOnly) acc.internal++;
            else acc.public++;
            return acc;
        }, { total: 0, open: 0, expired: 0, internal: 0, public: 0 });
    }, [careers]);

    if (profileLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
    }

    if (!canView) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4">
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You do not have the required permissions to view the recruitment board. Please contact the platform owner.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Fun & Vibrant Careers Hero Banner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border-2 border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest mb-1.5">
                        <Sparkles className="h-4 w-4 text-amber-500 animate-spin-slow" />
                        Dream Team Talent Engine • We&apos;re Building Something Epic!
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                        <Rocket className="h-8 w-8 text-rose-500" />
                        Careers &amp; Talent Launchpad 🚀✨
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                        Discover, recruit, and assemble the passionate innovators bringing our vibrant community ecosystem to life!
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <Card className={cn(
                        "border-2 transition-all shadow-sm flex items-center p-2",
                        stats.expired > 0 ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-border"
                    )}>
                        <div className="flex items-center gap-3 px-2">
                            <RotateCw className={cn("h-4 w-4", stats.expired > 0 ? "text-amber-500 animate-spin-slow" : "text-muted-foreground")} />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-muted-foreground">Hiring Velocity</span>
                                <span className="text-xs font-bold">{stats.expired > 0 ? `${stats.expired} Expired Roles` : "Recruitment active"}</span>
                            </div>
                            {stats.expired > 0 && canManage && (
                                <Button size="sm" onClick={handleMaintenanceSweep} disabled={isCleaning} className="h-7 text-[9px] font-black uppercase bg-amber-600 hover:bg-amber-700 ml-2">
                                    {isCleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sweep"}
                                </Button>
                            )}
                        </div>
                    </Card>
                    {canManage && (
                        <Button asChild className="shadow-lg h-12 px-6 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white font-black uppercase tracking-wider text-xs border-0">
                            <Link href="/admin/careers/create">
                                <PlusCircle className="mr-2 h-5 w-5" /> Post Epic Vacancy
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* 4 Colorful & Fun KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Open Vacancies</p>
                            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600">
                                <Flame className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.open} Active</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Dream roles live</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Internal Roles</p>
                            <div className="p-1 rounded-md bg-blue-500/10 text-blue-600">
                                <ShieldCheck className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-blue-600 dark:text-blue-400">{stats.internal}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Ops &amp; leadership board</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-purple-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Public Hub Roles</p>
                            <div className="p-1 rounded-md bg-purple-500/10 text-purple-600">
                                <Users className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-purple-600 dark:text-purple-400">{stats.public}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Open to community residents</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Action Needed</p>
                            <div className="p-1 rounded-md bg-amber-500/10 text-amber-600">
                                <Award className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.expired} Expired</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Ready for sweep / review</p>
                    </CardContent>
                </Card>
            </div>

            {/* Fun Culture & Visibility Protocol Alert */}
            <Alert className="bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-amber-500/5 border-pink-500/20 shadow-sm">
                <HeartHandshake className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                <AlertTitle className="text-xs font-black uppercase tracking-widest text-pink-700 dark:text-pink-300">Culture &amp; Opportunity Philosophy</AlertTitle>
                <AlertDescription className="text-xs italic leading-relaxed text-muted-foreground">
                    Vacancies marked as <strong>Internal Only</strong> are reserved for core administration and verified staff. <strong>Public Hub</strong> listings are visible to every local resident, giving equal opportunity to our amazing community talent!
                </AlertDescription>
            </Alert>

            <Card className="border-t-4 border-t-amber-500 shadow-md">
                <CardHeader className="bg-gradient-to-r from-amber-500/5 via-rose-500/5 to-transparent rounded-t-lg">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-600" />
                        Recruitment Oversight &amp; Job Board
                    </CardTitle>
                    <CardDescription>Review and monitor all active platform job listings. Expired roles are highlighted for archival.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Role Title</TableHead>
                                <TableHead>Environment</TableHead>
                                <TableHead>Closing Date</TableHead>
                                <TableHead>Target Visibility</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {careersLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto h-6 w-6" /></TableCell></TableRow>
                            ) : careers && careers.length > 0 ? (
                                careers.map((career) => {
                                    const today = startOfDay(new Date());
                                    const cDate = career.closingDate?.toDate ? career.closingDate.toDate() : (career.closingDate ? new Date(career.closingDate) : null);
                                    const isExpired = cDate && isBefore(cDate, today);
                                    
                                    return (
                                        <TableRow key={career.id} className={cn("group transition-colors", isExpired && career.status === 'Open' ? "bg-amber-50/50 hover:bg-amber-100/50" : "hover:bg-muted/50")}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{career.title}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{career.department}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs font-medium">
                                                        <Clock3 className="h-3 w-3 text-muted-foreground" />
                                                        {career.employmentType || 'Full-time'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-black">
                                                        <Globe className="h-3 w-3" />
                                                        {career.location}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className={cn("flex items-center gap-1.5 text-xs font-bold", isExpired ? "text-destructive" : "text-primary")}>
                                                    {isExpired ? <AlertTriangle className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                                                    {cDate ? format(cDate, 'dd MMM yyyy') : 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {career.isInternalOnly ? (
                                                    <Badge variant="outline" className="text-[10px] uppercase font-black bg-blue-50 text-blue-700 border-blue-200">Internal Only</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] uppercase font-black bg-green-50 text-green-700 border-green-200">Public Hub</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isExpired && career.status === 'Open' ? (
                                                    <Badge variant="destructive" className="uppercase font-black text-[10px] animate-pulse">Expired</Badge>
                                                ) : (
                                                    <Badge className={cn(
                                                        "uppercase font-black text-[10px]",
                                                        career.status === 'Open' ? "bg-green-600 text-white" : 
                                                        career.status === 'Draft' ? "bg-amber-500 text-white" : "bg-slate-500 text-white"
                                                    )}>{career.status}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {canManage && (
                                                        <>
                                                            <Button asChild variant="ghost" size="icon" title="Edit">
                                                                <Link href={`/admin/careers/edit/${career.id}`}>
                                                                    <FileEdit className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(career.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground italic">No vacancies posted yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}