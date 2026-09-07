'use client';

import * as React from "react";
import { 
    Briefcase, 
    ArrowLeft, 
    Loader2, 
    Save, 
    UserCircle,
    CalendarDays,
    Wallet,
    ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { saveCareerAction, type CareerData } from "@/lib/actions/careerActions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useRouter } from "next/navigation";
import { addDays } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { doc } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

const EOE_STATEMENT = "My Community App is an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all employees.";

export default function CreateCareerPage() {
    const router = useRouter();
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [isSaving, setIsSaving] = React.useState(false);

    // Form State
    const [title, setTitle] = React.useState("");
    const [department, setDepartment] = React.useState("");
    const [reportsTo, setReportsTo] = React.useState("");
    const [location, setLocation] = React.useState("Hybrid (UK Based)");
    const [employmentType, setEmploymentType] = React.useState<CareerData['employmentType']>("Full-time");
    const [salary, setSalary] = React.useState("");
    const [status, setStatus] = React.useState<'Draft' | 'Open' | 'Closed'>('Draft');
    const [closingDate, setClosingDate] = React.useState<Date | undefined>(addDays(new Date(), 14));
    const [isInternalOnly, setIsInternalOnly] = React.useState(false);
    const [description, setDescription] = React.useState(`<br/><br/><p><strong>${EOE_STATEMENT}</strong></p>`);

    // Absolute Ownership Priority
    const canManage = React.useMemo(() => {
        if (!userProfile) return false;
        const isOwner = userProfile.role?.toLowerCase() === 'owner';
        return isOwner || userProfile.permissions?.actionManageCareers === true;
    }, [userProfile]);

    React.useEffect(() => {
        if (!profileLoading && userProfile && !canManage) {
            router.replace('/admin/careers');
        }
    }, [profileLoading, userProfile, canManage, router]);

    const handleSave = async () => {
        if (!canManage) return;
        if (!title || !department || !description || !closingDate) {
            toast({ title: "Missing Fields", description: "Title, Department, Description, and Closing Date are required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const result = await saveCareerAction({
            title,
            department,
            reportsTo,
            location,
            employmentType,
            salary,
            status,
            closingDate,
            isInternalOnly,
            description
        });

        if (result.success) {
            toast({ title: "Career Posted", description: "The job listing has been successfully saved." });
            router.push('/admin/careers');
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    if (profileLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
    }

    if (!canManage) {
        return null;
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-12 px-4">
            <div className="flex items-center justify-between">
                <Button asChild variant="ghost">
                    <Link href="/admin/careers">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Vacancies
                    </Link>
                </Button>
            </div>

            <Card className="shadow-lg border-2">
                <CardHeader className="bg-muted/20 border-b">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Briefcase className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black uppercase tracking-tighter">Post New Vacancy</CardTitle>
                            <CardDescription>Define the role requirements and visibility settings for the platform.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="p-8 space-y-10">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Job Title *</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Regional Community Moderator" className="font-bold h-12 text-lg" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Department *</Label>
                            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., Trust & Safety" className="h-12" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                <UserCircle className="h-3 w-3" />
                                Reports To (Optional)
                            </Label>
                            <Input value={reportsTo} onChange={(e) => setReportsTo(e.target.value)} placeholder="e.g., Platform Operations Director" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-destructive tracking-widest flex items-center gap-1.5">
                                <CalendarDays className="h-3 w-3" />
                                Closing Date *
                            </Label>
                            <DatePicker date={closingDate} setDate={setClosingDate} />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Environment</Label>
                            <Select value={location} onValueChange={setLocation}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Remote">Remote</SelectItem>
                                    <SelectItem value="Hybrid (UK Based)">Hybrid (UK Based)</SelectItem>
                                    <SelectItem value="On-site">On-site</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Employment Type</Label>
                            <Select value={employmentType} onValueChange={(v: any) => setEmploymentType(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Full-time">Full-time</SelectItem>
                                    <SelectItem value="Part-time">Part-time</SelectItem>
                                    <SelectItem value="Contract">Contract</SelectItem>
                                    <SelectItem value="Job Share">Job Share</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Listing Status</Label>
                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Draft">Draft (Private)</SelectItem>
                                    <SelectItem value="Open">Open (Hiring)</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                <Wallet className="h-3 w-3" />
                                Monthly Salary / Hourly Rate
                            </Label>
                            <Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g., £4,000 / month or £15.00 / hour" />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/10">
                            <div className="space-y-0.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest">Internal Only</Label>
                                <p className="text-xs text-muted-foreground leading-none mt-1">Hide from public hub</p>
                            </div>
                            <Switch checked={isInternalOnly} onCheckedChange={setIsInternalOnly} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase text-primary tracking-widest block border-b pb-2">Detailed Job Specification *</Label>
                        <RichTextEditor value={description} onChange={setDescription} placeholder="Detail the responsibilities, salary, and requirements..." />
                    </div>
                </CardContent>

                <CardFooter className="p-8 bg-muted/20 border-t justify-end gap-3">
                    <Button asChild variant="outline" className="font-bold uppercase text-xs">
                        <Link href="/admin/careers">Cancel</Link>
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="font-black uppercase tracking-widest text-xs px-12 h-12 shadow-md">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Launch Listing
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}