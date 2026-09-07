'use client';

import * as React from "react";
import { 
    DollarSign, 
    Stethoscope, 
    ArrowLeft, 
    Loader2, 
    Save, 
    History, 
    TrendingUp, 
    ShieldAlert, 
    Gavel, 
    CheckCircle2, 
    Crown, 
    UserMinus, 
    AlertTriangle, 
    Activity, 
    FileText,
    Star
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, Timestamp, collection, addDoc, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { format, addYears } from "date-fns";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import Link from "next/link";

type AppraisalHistory = {
    id: string;
    date: any;
    score: number;
    moderatorName: string;
    notes: string;
    salaryAtTime: number;
};

export default function EmployeeAppraisalTerminal() {
    const params = useParams();
    const router = useRouter();
    const { employeeId } = params;
    const { toast } = useToast();
    const db = useFirestore();
    const { user: adminUser } = useUser();

    // Data Hooks
    const userRef = useMemoFirebase(() => (employeeId && db ? doc(db, 'users', employeeId as string) : null), [employeeId, db]);
    const { data: userData, isLoading: userLoading } = useDoc(userRef);

    const profileRef = useMemoFirebase(() => (employeeId && db ? doc(db, 'staff_profiles', employeeId as string) : null), [employeeId, db]);
    const { data: profileData, isLoading: profileLoading } = useDoc(profileRef);

    // Appraisal Form State - Standardized on 7 Metrics
    const [productivity, setProductivity] = React.useState(5);
    const [leadership, setLeadership] = React.useState(5);
    const [jobKnowledge, setJobKnowledge] = React.useState(5);
    const [clientServices, setClientServices] = React.useState(5);
    const [safety, setSafety] = React.useState(5);
    const [reliability, setReliability] = React.useState(5);
    const [initiative, setInitiative] = React.useState(5);
    
    const [appraisalNotes, setAppraisalNotes] = React.useState("");
    const [appraisalHistory, setAppraisalHistory] = React.useState<AppraisalHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = React.useState(true);

    // Financial Form State
    const [salary, setSalary] = React.useState<number>(0);
    const [payType, setPayType] = React.useState<'monthly' | 'hourly'>('monthly');
    const [bonus, setBonus] = React.useState<number>(0);
    
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (profileData) {
            setSalary(profileData.salary || 0);
            setPayType(profileData.payType || 'monthly');
        }
    }, [profileData]);

    React.useEffect(() => {
        if (!employeeId || !db) return;
        setLoadingHistory(true);
        const q = query(
            collection(db, `staff_profiles/${employeeId}/appraisals`),
            orderBy('date', 'desc'),
            limit(10)
        );
        const unsub = onSnapshot(q, (snap) => {
            setAppraisalHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppraisalHistory)));
            setLoadingHistory(false);
        });
        return () => unsub();
    }, [employeeId, db]);

    const handleSaveAppraisal = async () => {
        if (!db || !adminUser || !employeeId) return;
        
        setIsSaving(true);
        try {
            // Calculate Average of 7 metrics
            const total = productivity + leadership + jobKnowledge + clientServices + safety + reliability + initiative;
            const compositeScore = Math.round(total / 7);
            const now = Timestamp.now();
            
            // 1. Add to History
            const appraisalRef = collection(db, `staff_profiles/${employeeId}/appraisals`);
            await addDoc(appraisalRef, {
                date: now,
                productivity,
                leadership,
                jobKnowledge,
                clientServices,
                safety,
                reliability,
                initiative,
                score: compositeScore,
                notes: appraisalNotes,
                moderatorName: adminUser.displayName || adminUser.email,
                salaryAtTime: salary
            });

            // 2. Update Profile Snapshot
            await setDoc(doc(db, 'staff_profiles', employeeId as string), {
                salary,
                payType,
                lastAppraisalDate: now,
                lastAppraisalScore: compositeScore,
                updatedAt: now
            }, { merge: true });

            // 3. Log to Audit
            await addDoc(collection(db, 'audit_log'), {
                adminId: adminUser.uid,
                action: 'staff_appraisal_conducted',
                details: `Conducted appraisal for ${userData?.name}. Composite Score: ${compositeScore}/10.`,
                timestamp: now,
                targetUser: { id: employeeId, name: userData?.name }
            });

            toast({ title: "Appraisal Logged", description: "Performance metrics and financials have been updated." });
            setAppraisalNotes("");
        } catch (error: any) {
            toast({ title: "Operation Failed", description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (userLoading || profileLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    const metrics = [
        { label: 'Productivity & Efficiency', value: productivity, setter: setProductivity, desc: 'Output volume vs platform growth targets.' },
        { label: 'Administrative Leadership', value: leadership, setter: setLeadership, desc: 'Ability to coordinate community hub leaders and team members.' },
        { label: 'Job Knowledge', value: jobKnowledge, setter: setJobKnowledge, desc: 'Understanding of platform tools, database structures, and protocols.' },
        { label: 'Client Services', value: clientServices, setter: setClientServices, desc: 'Quality of support provided to residents and business owners.' },
        { label: 'Safety', value: safety, setter: setSafety, desc: 'Adherence to content moderation and jurisdictional security protocols.' },
        { label: 'Reliability', value: reliability, setter: setReliability, desc: 'Attendance, consistency, and meeting deadlines for platform maintenance.' },
        { label: 'Initiative & Aptitude', value: initiative, setter: setInitiative, desc: 'Proactive problem solving and learning speed for new features.' },
    ];

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
            <div className="flex items-center justify-between">
                <Button asChild variant="ghost">
                    <Link href="/admin/team-management/appraisals-and-pay">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Payroll Hub
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    <Card className="border-t-4 border-t-emerald-600 shadow-md overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-indigo-600/10 border-b py-8">
                            <div className="flex items-center gap-6">
                                <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                                    <AvatarImage src={userData?.avatar} />
                                    <AvatarFallback>{userData?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <CardTitle className="text-3xl font-black uppercase tracking-tight">{userData?.name}</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-black uppercase text-[10px] tracking-widest bg-background/80">{userData?.title || userData?.role}</Badge>
                                        <span className="text-xs text-muted-foreground font-semibold">{userData?.email}</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-12">
                            {/* SECTION 1: REMUNERATION */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <DollarSign className="h-5 w-5 text-emerald-600" />
                                    <h3 className="text-sm font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">1. Active Remuneration Structure</h3>
                                </div>
                                <div className="grid md:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Base Rate (£)</Label>
                                        <Input 
                                            type="number" 
                                            value={salary} 
                                            onChange={(e) => setSalary(Number(e.target.value))} 
                                            className="h-12 border-2 font-black text-lg text-emerald-600 dark:text-emerald-400 bg-background"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cycle</Label>
                                        <Select value={payType} onValueChange={(v: any) => setPayType(v)}>
                                            <SelectTrigger className="h-12 border-2 bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Monthly Salary</SelectItem>
                                                <SelectItem value="hourly">Hourly Rate</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Discretionary Bonus (£)</Label>
                                        <Input 
                                            type="number" 
                                            value={bonus} 
                                            onChange={(e) => setBonus(Number(e.target.value))} 
                                            placeholder="One-off award..." 
                                            className="h-12 border-2 border-emerald-500/30 bg-emerald-500/5 font-bold"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 2: PERFORMANCE AUDIT */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <Stethoscope className="h-5 w-5 text-emerald-600" />
                                    <h3 className="text-sm font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">2. Forensic Performance Appraisal</h3>
                                </div>
                                
                                <div className="space-y-12">
                                    {metrics.map((metric) => (
                                        <div key={metric.label} className="space-y-4">
                                            <div className="flex justify-between items-baseline">
                                                <div>
                                                    <Label className="text-sm font-bold">{metric.label}</Label>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">{metric.desc}</p>
                                                </div>
                                                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{metric.value} <span className="text-[10px] text-muted-foreground">/ 10</span></span>
                                            </div>
                                            <Slider 
                                                value={[metric.value]} 
                                                onValueChange={(val) => metric.setter(val[0])} 
                                                max={10} 
                                                step={1} 
                                                className="py-4"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3 pt-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Appraisal Findings &amp; Notes</Label>
                                    <Textarea 
                                        value={appraisalNotes}
                                        onChange={(e) => setAppraisalNotes(e.target.value)}
                                        placeholder="Detail the reasons for the scores and any specific achievements or violations..."
                                        className="min-h-[150px] border-2 shadow-inner bg-background"
                                    />
                                </div>
                            </section>
                        </CardContent>
                        <CardFooter className="bg-muted/40 p-8 border-t flex justify-end gap-3">
                            <Button variant="outline" className="font-bold uppercase text-xs" onClick={() => router.back()}>Discard</Button>
                            <Button onClick={handleSaveAppraisal} disabled={isSaving} className="font-black uppercase tracking-widest text-xs px-10 h-12 shadow-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Commit Audit &amp; Update Pay
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <aside className="space-y-8">
                    <Card className="border-t-4 border-t-purple-600 shadow-md">
                        <CardHeader className="pb-3 border-b bg-purple-500/5">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                <History className="h-3.5 w-3.5" />
                                Review History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {loadingHistory ? (
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-20" />
                            ) : appraisalHistory.length > 0 ? (
                                <div className="space-y-4">
                                    {appraisalHistory.map((log) => (
                                        <div key={log.id} className="p-3 bg-background rounded-lg border shadow-sm space-y-2 group">
                                            <div className="flex justify-between items-center">
                                                <Badge className="font-black text-[9px] px-1.5 h-4 bg-emerald-600 text-white">{log.score} / 10</Badge>
                                                <span className="text-[9px] text-muted-foreground font-mono">{format(log.date.toDate(), 'dd/MM/yy')}</span>
                                            </div>
                                            <p className="text-[10px] italic line-clamp-2 text-muted-foreground group-hover:line-clamp-none transition-all">{log.notes}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 opacity-40">
                                    <FileText className="h-8 w-8 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">No previous audits found</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-rose-600 shadow-md overflow-hidden">
                        <CardHeader className="bg-rose-500/10 pb-3 border-b border-rose-500/20">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                <Gavel className="h-3.5 w-3.5" />
                                Restricted Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <Button variant="outline" className="w-full justify-start gap-2 h-11 text-[10px] uppercase font-black border-2 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600">
                                <TrendingUp className="h-4 w-4" />
                                Promote Rank
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-2 h-11 text-[10px] uppercase font-black border-2 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600">
                                <UserMinus className="h-4 w-4" />
                                Demote Rank
                            </Button>
                            <Separator />
                            <div className="p-3 bg-muted/40 rounded-lg border-2 border-dashed border-rose-500/30">
                                <p className="text-[9px] font-bold text-rose-600 uppercase leading-tight mb-2 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Security Notice
                                </p>
                                <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                                    Role changes are applied instantly and synchronized with the security whitelist.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-4 bg-slate-900 text-white rounded-xl shadow-lg space-y-4 border border-slate-800">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-emerald-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Platform Lifecycle</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase text-slate-400">Next Review Target</p>
                            <p className="text-sm font-black">{format(addYears(new Date(), 0.25), 'MMMM yyyy')}</p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
