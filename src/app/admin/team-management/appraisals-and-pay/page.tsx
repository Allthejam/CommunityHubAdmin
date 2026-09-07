'use client';

import * as React from "react";
import { 
    DollarSign, 
    Stethoscope, 
    Users, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    ChevronRight, 
    Loader2, 
    Search, 
    FilterX, 
    TrendingUp, 
    CalendarClock, 
    ShieldCheck, 
    Gavel,
    Info,
    Sparkles,
    Award,
    Wallet,
    CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, where, doc, getDocs, onSnapshot } from "firebase/firestore";
import { format, differenceInDays, isValid } from "date-fns";
import { PaginationControls } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StaffMember = {
    id: string;
    name: string;
    email: string;
    role: string;
    title: string;
    avatar: string;
    salary?: number;
    payType?: 'monthly' | 'hourly';
    lastAppraisalDate?: any;
    appraisalScore?: number;
};

export default function AppraisalsAndPayPage() {
    const { user } = useUser();
    const db = useFirestore();
    
    const [staff, setStaff] = React.useState<StaffMember[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [sorting, setSorting] = React.useState<{ key: keyof StaffMember; order: 'asc' | 'desc' }>({ key: 'name', order: 'asc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

    React.useEffect(() => {
        if (!db) return;
        setLoading(true);

        const adminRoles = ['owner', 'admin', 'administrator', 'moderator', 'support', 'finance', 'investigator', 'accountant', 'support-specialist'];
        const q = query(collection(db, "users"), where("role", "in", adminRoles));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const staffData: StaffMember[] = [];
            
            for (const userDoc of snapshot.docs) {
                const data = userDoc.data();
                // Fetch financial/appraisal data from staff_profiles
                const profileRef = doc(db, 'staff_profiles', userDoc.id);
                const profileSnap = await getDocs(query(collection(db, 'staff_profiles'), where('__name__', '==', userDoc.id)));
                const profileData = !profileSnap.empty ? profileSnap.docs[0].data() : {};

                staffData.push({
                    id: userDoc.id,
                    name: data.name || 'Unknown',
                    email: data.email || '',
                    role: data.role || 'Staff',
                    title: data.title || '',
                    avatar: data.avatar || '',
                    salary: profileData.salary || 0,
                    payType: profileData.payType || 'monthly',
                    lastAppraisalDate: profileData.lastAppraisalDate || null,
                    appraisalScore: profileData.lastAppraisalScore || 0,
                });
            }
            
            setStaff(staffData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    const stats = React.useMemo(() => {
        const totalMonthly = staff.reduce((acc, s) => acc + (s.payType === 'monthly' ? (s.salary || 0) : 0), 0);
        const pendingAppraisals = staff.filter(s => {
            if (!s.lastAppraisalDate) return true;
            const lastDate = s.lastAppraisalDate.toDate ? s.lastAppraisalDate.toDate() : new Date(s.lastAppraisalDate);
            return differenceInDays(new Date(), lastDate) > 90;
        }).length;
        const evaluatedStaff = staff.filter(s => !!s.appraisalScore);
        const avgScore = evaluatedStaff.length > 0 
            ? evaluatedStaff.reduce((acc, s) => acc + (s.appraisalScore || 0), 0) / evaluatedStaff.length 
            : 0;

        return { totalMonthly, pendingAppraisals, avgScore, totalStaff: staff.length };
    }, [staff]);

    const filteredAndSortedStaff = React.useMemo(() => {
        let filtered = staff.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            const order = sorting.order === 'asc' ? 1 : -1;
            const valA = (a as any)[sorting.key] ?? '';
            const valB = (b as any)[sorting.key] ?? '';
            
            if (typeof valA === 'string') return valA.localeCompare(valB) * order;
            return (valA > valB ? 1 : -1) * order;
        });
    }, [staff, searchTerm, sorting]);

    const paginatedStaff = filteredAndSortedStaff.slice(
        pagination.pageIndex * pagination.pageSize,
        (pagination.pageIndex + 1) * pagination.pageSize
    );

    const pageCount = Math.ceil(filteredAndSortedStaff.length / pagination.pageSize);

    const handleSort = (key: keyof StaffMember) => {
        setSorting(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Compensation & Appraisals Hero Banner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-indigo-600/15 border-2 border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest mb-1.5">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        Staff Remuneration &amp; Performance Audit Console • 90-Day Cadence
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                        <Stethoscope className="h-8 w-8 text-emerald-600" />
                        Staff Appraisals &amp; Payroll Console
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                        Comprehensive oversight of administrative payroll, forensic appraisal cycles, and team productivity scores.
                    </p>
                </div>
            </div>

            {/* 4 Top KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Expenditure</p>
                            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600">
                                <Wallet className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">£{stats.totalMonthly.toLocaleString()}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Fixed monthly payroll</p>
                    </CardContent>
                </Card>

                <Card className={cn("border-t-4 shadow-sm hover:shadow-md transition-shadow", stats.pendingAppraisals > 0 ? "border-t-amber-500" : "border-t-emerald-500")}>
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Appraisals</p>
                            <div className={cn("p-1 rounded-md", stats.pendingAppraisals > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600")}>
                                <CalendarClock className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className={cn("text-xl font-black", stats.pendingAppraisals > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                            {stats.pendingAppraisals}
                        </div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Reviews due (&gt; 90 days)</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-purple-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Performance Avg</p>
                            <div className="p-1 rounded-md bg-purple-500/10 text-purple-600">
                                <Award className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-purple-600 dark:text-purple-400">{stats.avgScore > 0 ? `${stats.avgScore.toFixed(1)} / 10` : 'Pending'}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Composite forensic score</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Staff on Roster</p>
                            <div className="p-1 rounded-md bg-blue-500/10 text-blue-600">
                                <Users className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-blue-600 dark:text-blue-400">{stats.totalStaff}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Active team operators</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-t-4 border-t-emerald-600 shadow-md">
                <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold">Staff Remuneration &amp; Performance</CardTitle>
                            <CardDescription>Oversight of salaries, hourly rates, and appraisal history.</CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search staff member..." 
                                className="pl-8 h-10 border-2 bg-background" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[30%]"><Button variant="ghost" onClick={() => handleSort('name')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Team Member <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead className="text-xs uppercase tracking-widest font-bold">Official Role</TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('salary')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Compensation <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('lastAppraisalDate')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Last Review <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead className="text-center text-xs uppercase tracking-widest font-bold">Score</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-widest font-bold pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="h-48 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></TableCell></TableRow>
                                ) : paginatedStaff.length > 0 ? (
                                    paginatedStaff.map((member) => (
                                        <TableRow key={member.id} className="hover:bg-muted/30 group">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border-2 border-emerald-500/20 shadow-sm">
                                                        <AvatarImage src={member.avatar} />
                                                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{member.name}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase">{member.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter bg-primary/5">{member.title || member.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-emerald-600 dark:text-emerald-400">£{member.salary?.toLocaleString()}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">{member.payType}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium">
                                                {member.lastAppraisalDate ? format(member.lastAppraisalDate.toDate ? member.lastAppraisalDate.toDate() : new Date(member.lastAppraisalDate), 'dd MMM yyyy') : <span className="text-muted-foreground italic">Never</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {member.appraisalScore ? (
                                                    <Badge className={cn(
                                                        "font-black text-[11px]",
                                                        member.appraisalScore >= 8 ? "bg-emerald-600 text-white" : member.appraisalScore >= 5 ? "bg-amber-600 text-white" : "bg-destructive text-white"
                                                    )}>{member.appraisalScore} / 10</Badge>
                                                ) : <span className="text-muted-foreground opacity-40 italic text-xs">Unassessed</span>}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button asChild variant="outline" size="sm" className="font-black uppercase text-[10px] gap-1.5 border-2 border-emerald-600/30 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
                                                    <Link href={`/admin/team-management/appraisals-and-pay/${member.id}`}>
                                                        Appraisal &rarr;
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground">No administrative staff records found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={filteredAndSortedStaff.length} />
                </CardContent>
                <CardFooter className="bg-muted/30 border-t p-6">
                    <Alert className="bg-emerald-500/5 border-emerald-500/20">
                        <Info className="h-4 w-4 text-emerald-600" />
                        <AlertTitle className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Protocol Standard</AlertTitle>
                        <AlertDescription className="text-xs leading-relaxed italic">
                            Platform guidelines recommend conducting a full forensic appraisal every **90 days**. Use the management terminal to update pay tiers based on productivity scores.
                        </AlertDescription>
                    </Alert>
                </CardFooter>
            </Card>
        </div>
    );
}
