
"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    UserCog,
    ArrowLeft,
    Mail,
    Phone,
    Shield,
    Home,
    Car,
    Heart,
    Pencil,
    Printer,
    Send,
    Users,
    Loader2,
    History,
    DollarSign,
    Star,
    TrendingUp,
    ShieldAlert,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type UserData = {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
    reportsTo?: string | null;
    status: 'active' | 'pending';
    title?: string;
    permissions?: any;
};

type Address = {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    stateCounty?: string;
    postcode?: string;
};

type NextOfKin = {
    name: string;
    relationship: string;
    contactNumber: string;
    email: string;
    address: Address;
};

type StaffProfileData = {
    workEmail?: string;
    phone?: string;
    address?: Address;
    canDrive?: string;
    nextOfKin?: NextOfKin;
    salary?: number;
    payType?: 'monthly' | 'hourly';
    lastAppraisalScore?: number;
};

type Appraisal = {
    id: string;
    date: any;
    score: number;
    notes: string;
    moderatorName: string;
};

const TeamMemberCard = ({ member }: { member: UserData }) => (
    <div className="flex items-center gap-3 p-3 border rounded-md">
        <Avatar className="h-10 w-10">
            <AvatarImage src={member.avatar} alt={member.name} />
            <AvatarFallback>{member.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div>
            <Link href={`/admin/team/${member.id}`} className="font-semibold hover:underline">
                {member.name || 'Unknown User'}
            </Link>
            <p className="text-xs text-muted-foreground">{member.role}</p>
        </div>
    </div>
)


export default function EmployeeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { employeeId } = params;
    const { toast } = useToast();
    const db = useFirestore();
    const { user: authUser } = useUser();

    // Data Hooks
    const userProfileRef = useMemoFirebase(() => (authUser ? doc(db, 'users', authUser.uid) : null), [authUser, db]);
    const { data: currentUserProfile, isLoading: profileLoading } = useDoc<UserData>(userProfileRef);

    const employeeRef = useMemoFirebase(() => (db && employeeId ? doc(db, "users", employeeId as string) : null), [db, employeeId]);
    const staffProfileRef = useMemoFirebase(() => (db && employeeId ? doc(db, "staff_profiles", employeeId as string) : null), [db, employeeId]);
    
    const { data: employeeData, isLoading: employeeLoading } = useDoc<UserData>(employeeRef);
    const { data: staffProfile, isLoading: staffProfileLoading } = useDoc<StaffProfileData>(staffProfileRef);
    
    const managerRef = useMemoFirebase(() => (db && employeeData?.reportsTo ? doc(db, "users", employeeData.reportsTo) : null), [db, employeeData]);
    const { data: manager, isLoading: managerLoading } = useDoc<UserData>(managerRef);

    const reportsQuery = useMemoFirebase(() => (db && employeeId ? query(collection(db, "users"), where("reportsTo", "==", employeeId)) : null), [db, employeeId]);
    const { data: directReports, isLoading: reportsLoading } = useCollection<UserData>(reportsQuery);

    const appraisalQuery = useMemoFirebase(() => {
        if (!db || !employeeId) return null;
        return query(
            collection(db, `staff_profiles/${employeeId}/appraisals`),
            orderBy('date', 'desc'),
            limit(5)
        );
    }, [db, employeeId]);
    const { data: appraisals, isLoading: appraisalsLoading } = useCollection<Appraisal>(appraisalQuery);

    const isOwnProfile = authUser?.uid === employeeId;
    
    // SOVEREIGN AUTHORIZATION: Owner role or Master email bypasses granular flags
    const isOwner = currentUserProfile?.role?.toLowerCase() === 'owner' || authUser?.email?.toLowerCase().trim() === 'allan_jamieson@outlook.com';
    const canManageAll = isOwner || currentUserProfile?.permissions?.actionViewStaffProfiles === true;
    const canPerformAppraisals = isOwner || currentUserProfile?.permissions?.actionManageAppraisalsAndPay === true;
    
    // Staff can see their own performance history in read-only mode. Managers can see everyone's.
    const canSeeAppraisals = canPerformAppraisals || isOwnProfile;

    const loading = employeeLoading || profileLoading || staffProfileLoading || managerLoading || reportsLoading || appraisalsLoading;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!canManageAll && !isOwnProfile) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4">
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Access Restricted</AlertTitle>
                    <AlertDescription>
                        Security Protocol: You do not have the clearance level required to view this staff record.
                    </AlertDescription>
                </Alert>
                <Button asChild variant="outline" className="mt-6 w-full">
                    <Link href="/admin/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        );
    }

    if (!employeeData) {
        return (
             <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Employee Not Found</h1>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/admin/team-management">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Team Management
                    </Link>
                </Button>
            </div>
        )
    }

    const formatAddress = (address?: Address) => {
        if (!address) return 'Not Provided';
        const parts = [
            address.addressLine1,
            address.addressLine2,
            address.city,
            address.stateCounty,
            address.postcode,
        ];
        return parts.filter(Boolean).join(', ');
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
             <div className="flex justify-between items-center no-print">
                <Button asChild variant="ghost" className="mb-4">
                    <Link href={canManageAll ? "/admin/team-management" : "/admin/dashboard"}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {canManageAll ? 'Back to Team Management' : 'Back to Dashboard'}
                    </Link>
                </Button>
                 <div className="flex gap-2">
                    <Button variant="outline" asChild className="shadow-sm">
                         <Link href={`/admin/team-management/edit/${employeeId}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Profile
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={() => window.print()} className="shadow-sm">
                        <Printer className="mr-2 h-4 w-4" />
                        Print Record
                    </Button>
                </div>
            </div>
             <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2 text-foreground">
                <UserCog className="h-8 w-8 text-primary" />
                Staff Record: {employeeData.name || 'Unknown'}
                {isOwnProfile && <Badge variant="secondary" className="ml-2 uppercase font-black text-[10px]">Your Profile</Badge>}
            </h1>

            <Card className="border-2 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row items-start gap-6">
                    <Avatar className="w-24 h-24 border-4 border-background shadow-md">
                        <AvatarImage src={employeeData.avatar} alt={employeeData.name} />
                        <AvatarFallback>{employeeData.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex flex-col sm:flex-row justify-between items-start">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-2xl mb-1">{employeeData.name || 'No Name Provided'}</CardTitle>
                                <Badge variant={employeeData.status === 'active' ? 'default' : 'secondary'}>{employeeData.status}</Badge>
                            </div>
                        </div>
                        <CardDescription className="text-lg text-muted-foreground">{employeeData.title || employeeData.role}</CardDescription>
                        <div className="flex flex-col sm:flex-row gap-x-4 gap-y-2 text-sm text-muted-foreground mt-4">
                            {employeeData.email && (
                                <a href={`mailto:${employeeData.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                    <Mail className="h-4 w-4" />
                                    <span>{employeeData.email} (Personal)</span>
                                </a>
                            )}
                            {staffProfile?.workEmail && (
                                <a href={`mailto:${staffProfile.workEmail}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                    <Mail className="h-4 w-4" />
                                    <span>{staffProfile.workEmail} (Work)</span>
                                </a>
                            )}
                            {staffProfile?.phone && (
                                <a href={`tel:${staffProfile.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                    <Phone className="h-4 w-4" />
                                    <span>{staffProfile.phone}</span>
                                </a>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Separator className="my-4" />
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Personal Details</h3>
                            <div className="grid gap-4 text-sm">
                                <div className="flex items-start gap-3">
                                    <Home className="h-4 w-4 mt-1 text-muted-foreground" />
                                    <div>
                                        <p className="font-bold">Primary Address</p>
                                        <p className="text-muted-foreground">{formatAddress(staffProfile?.address)}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Car className="h-4 w-4 mt-1 text-muted-foreground" />
                                     <div>
                                        <p className="font-bold">Driving Status</p>
                                        <p className="text-muted-foreground">{staffProfile?.canDrive || 'Not Provided'}</p>
                                    </div>
                                </div>
                                 <div className="flex items-start gap-3">
                                    <Shield className="h-4 w-4 mt-1 text-muted-foreground" />
                                     <div>
                                        <p className="font-bold">Official Designation</p>
                                        <p className="text-muted-foreground capitalize">{employeeData.title || employeeData.role}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div className="space-y-4">
                            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Heart className="h-4 w-4" />Emergency Contact</h3>
                            {staffProfile?.nextOfKin ? (
                                <div className="grid gap-3 text-sm p-4 border rounded-xl bg-muted/20">
                                    <p className="font-bold">{staffProfile.nextOfKin.name} <span className="text-muted-foreground font-normal">({staffProfile.nextOfKin.relationship})</span></p>
                                    {staffProfile.nextOfKin.email && (
                                        <a href={`mailto:${staffProfile.nextOfKin.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span>{staffProfile.nextOfKin.email}</span>
                                        </a>
                                    )}
                                    {staffProfile.nextOfKin.contactNumber && (
                                        <a href={`tel:${staffProfile.nextOfKin.contactNumber}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>{staffProfile.nextOfKin.contactNumber}</span>
                                        </a>
                                    )}
                                    <div className="flex items-start gap-2">
                                        <Home className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <span>{formatAddress(staffProfile.nextOfKin.address)}</span>
                                    </div>
                                </div>
                            ) : <p className="text-sm text-muted-foreground italic">No emergency contact information provided.</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-primary" />
                            Chain of Command
                        </CardTitle>
                        <CardDescription>
                            Reporting lines within the platform administrative hierarchy.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Line Manager</h3>
                            {manager ? (
                                <TeamMemberCard member={manager} />
                            ) : (
                                <div className="p-3 border-2 border-dashed rounded-lg text-center bg-muted/20">
                                    <p className="text-xs text-muted-foreground font-medium uppercase italic">Top of Hierarchy / No Manager</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Direct Reports ({directReports?.length || 0})</h3>
                            {directReports && directReports.length > 0 ? (
                                <div className="space-y-2">
                                    {directReports.map(report => (
                                        <TeamMemberCard key={report.id} member={report} />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-3 border rounded-lg text-center bg-muted/10 opacity-50">
                                    <p className="text-xs text-muted-foreground italic">No direct reports currently assigned.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Performance & Pay: Read-only for self, editable for managers */}
                {canSeeAppraisals && (
                    <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <TrendingUp className="h-5 w-5 text-primary" />
                                        Remuneration & Performance
                                    </CardTitle>
                                    <CardDescription>Confidential pay structure and review history.</CardDescription>
                                </div>
                                {canPerformAppraisals && (
                                    <Button asChild variant="outline" size="sm" className="h-8 text-[10px] uppercase font-black no-print shadow-sm bg-white">
                                        <Link href={`/admin/team-management/appraisals-and-pay/${employeeId}`}>
                                            Perform Audit
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-background border shadow-sm space-y-1">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" /> Remuneration
                                    </p>
                                    <p className="text-xl font-black">
                                        £{(staffProfile?.salary || 0).toLocaleString()}
                                    </p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{staffProfile?.payType || 'monthly'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-background border shadow-sm space-y-1">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                                        <Star className="h-3 w-3" /> Last Review
                                    </p>
                                    <p className="text-xl font-black">
                                        {staffProfile?.lastAppraisalScore ? `${staffProfile.lastAppraisalScore}/10` : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase italic">Forensic Index</p>
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <History className="h-3 w-3" />
                                    Audit Log: Review History
                                </h3>
                                {appraisals && appraisals.length > 0 ? (
                                    <div className="space-y-3">
                                        {appraisals.map((appraisal) => (
                                            <div key={appraisal.id} className="p-3 rounded-lg bg-background border shadow-sm flex justify-between items-center group">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold">{format(appraisal.date?.toDate ? appraisal.date.toDate() : new Date(appraisal.date), 'dd MMM yyyy')}</span>
                                                    <span className="text-[10px] text-muted-foreground italic">Auditor: {appraisal.moderatorName}</span>
                                                </div>
                                                <Badge className={cn(
                                                    "font-black text-[10px]",
                                                    appraisal.score >= 8 ? "bg-green-600" : appraisal.score >= 5 ? "bg-amber-600" : "bg-destructive"
                                                )}>
                                                    {appraisal.score}/10
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-6 text-center border-2 border-dashed rounded-xl opacity-30">
                                        <p className="text-xs font-bold uppercase tracking-widest italic">No historical audits recorded.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
