"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    UserCog,
    ArrowLeft,
    Save,
    Loader2,
    Users,
    ChevronDown,
    ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStaffProfile, saveStaffProfileAction } from "@/lib/actions/teamActions";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Address = {
    addressLine1: string;
    addressLine2: string;
    city: string;
    stateCounty: string;
    postcode: string;
};

type EditableStaffProfile = {
    workEmail: string;
    phone: string;
    address: Address;
    canDrive: string;
    nextOfKin: {
        name: string;
        relationship: string;
        contactNumber: string;
        email: string;
        address: Address;
    };
};

type StaffMemberOption = {
    id: string;
    name: string;
    role: string;
    title?: string;
};

const DEFAULT_ADDRESS = { addressLine1: "", addressLine2: "", city: "", stateCounty: "", postcode: "" };
const DEFAULT_NOK = { name: "", relationship: "", contactNumber: "", email: "", address: { ...DEFAULT_ADDRESS } };

export default function EditEmployeePage() {
    const params = useParams();
    const router = useRouter();
    const { employeeId } = params;
    const { toast } = useToast();
    const db = useFirestore();
    const { user: authUser } = useUser();

    const [employeeName, setEmployeeName] = React.useState("");
    const [reportsTo, setReportsTo] = React.useState<string | null>(null);
    const [profile, setProfile] = React.useState<Partial<EditableStaffProfile>>({
        address: { ...DEFAULT_ADDRESS },
        nextOfKin: { ...DEFAULT_NOK }
    });
    const [loading, setLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [staffOptions, setStaffOptions] = React.useState<StaffMemberOption[]>([]);

    const userProfileRef = useMemoFirebase(() => (authUser ? doc(db, 'users', authUser.uid) : null), [authUser, db]);
    const { data: userProfile } = useDoc<any>(userProfileRef);

    const isOwnProfile = authUser?.uid === employeeId;
    
    const canManageAll = React.useMemo(() => {
        if (!userProfile) return false;
        return userProfile.role?.toLowerCase() === 'owner' || userProfile.permissions?.actionViewStaffProfiles === true;
    }, [userProfile]);

    React.useEffect(() => {
        if (!employeeId || !db) return;

        const fetchEmployeeData = async () => {
            setLoading(true);
            try {
                const { name, reportsTo: initialReportsTo, profile: initialProfile } = await getStaffProfile(employeeId as string);
                setEmployeeName(name);
                setReportsTo(initialReportsTo);
                
                // Defensive initialization of nested objects
                const sanitizedProfile: Partial<EditableStaffProfile> = {
                    ...initialProfile,
                    address: {
                        ...DEFAULT_ADDRESS,
                        ...(initialProfile.address || {})
                    },
                    nextOfKin: {
                        ...DEFAULT_NOK,
                        ...(initialProfile.nextOfKin || {}),
                        address: {
                            ...DEFAULT_ADDRESS,
                            ...(initialProfile.nextOfKin?.address || {})
                        }
                    }
                };
                
                setProfile(sanitizedProfile);
            } catch (error: any) {
                console.error("Fetch failure:", error);
                toast({ title: "Fetch Failure", description: "The platform could not retrieve the required staff documents.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        const q = query(
            collection(db, "users"),
            where("role", "in", ["owner", "admin", "administrator", "moderator", "support", "finance", "investigator", "accountant", "support-specialist"])
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const staff = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as StaffMemberOption))
                .filter(s => s.id !== employeeId); 
            setStaffOptions(staff);
        });

        fetchEmployeeData();
        return () => unsub();
    }, [employeeId, toast, db]);

    const handleInputChange = (field: keyof Omit<EditableStaffProfile, 'nextOfKin' | 'address'>, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };
    
    const handleAddressChange = (field: keyof EditableStaffProfile['address'], value: string) => {
        setProfile(prev => ({
            ...prev,
            address: {
                ...(prev.address || DEFAULT_ADDRESS),
                [field]: value
            }
        }));
    };

    const handleNextOfKinChange = (field: keyof Omit<EditableStaffProfile['nextOfKin'], 'address'>, value: string) => {
        setProfile(prev => ({
            ...prev,
            nextOfKin: {
                ...(prev.nextOfKin || DEFAULT_NOK),
                [field]: value
            }
        }));
    };
    
    const handleNextOfKinAddressChange = (field: keyof EditableStaffProfile['nextOfKin']['address'], value: string) => {
         setProfile(prev => ({
            ...prev,
            nextOfKin: {
                ...prev.nextOfKin!,
                address: {
                    ...prev.nextOfKin!.address,
                    [field]: value
                }
            }
        }));
    };


    const handleSave = async () => {
        if (!employeeId) return;
        setIsSaving(true);
        const result = await saveStaffProfileAction(employeeId as string, profile, canManageAll ? reportsTo : undefined);
        if (result.success) {
            toast({ title: "Profile Updated", description: "Your staff record has been successfully saved." });
            router.push(`/admin/team/${employeeId}`);
        } else {
            console.error("Error saving profile:", result.error);
            toast({ title: "Error", description: "Failed to save employee profile.", variant: "destructive" });
        }
        setIsSaving(false);
    };
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!canManageAll && !isOwnProfile) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4">
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You do not have permission to edit this staff profile.
                    </AlertDescription>
                </Alert>
                <Button asChild variant="outline" className="mt-6 w-full">
                    <Link href="/admin/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
            <div>
                 <Button asChild variant="ghost" className="mb-4">
                    <Link href={`/admin/team/${employeeId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Profile
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <UserCog className="h-8 w-8" />
                    Edit Record: {employeeName}
                </h1>
            </div>

            {canManageAll && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Managerial Control: Chain of Command
                        </CardTitle>
                        <CardDescription>Update reporting lines within the platform administrative hierarchy.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-w-sm">
                            <Label htmlFor="reports-to-select">Line Manager</Label>
                            <Select onValueChange={(val) => setReportsTo(val === 'none' ? null : val)} value={reportsTo || 'none'}>
                                <SelectTrigger id="reports-to-select" className="bg-background">
                                    <SelectValue placeholder="Select a manager..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nobody (Top of Hierarchy)</SelectItem>
                                    {staffOptions.map(option => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.name} ({option.title || option.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Personal Professional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="work-email">Official Work Email</Label>
                            <Input id="work-email" type="email" value={profile.workEmail || ''} onChange={(e) => handleInputChange('workEmail', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Contact Number</Label>
                            <Input id="phone" type="tel" value={profile.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Home Address</Label>
                        <div className="grid gap-2 border p-4 rounded-md bg-muted/20">
                            <div className="space-y-1">
                                <Label htmlFor="address-1" className="text-[10px] uppercase font-bold text-muted-foreground">Address Line 1</Label>
                                <Input id="address-1" value={profile.address?.addressLine1 || ''} onChange={(e) => handleAddressChange('addressLine1', e.target.value)} className="bg-background" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="address-2" className="text-[10px] uppercase font-bold text-muted-foreground">Address Line 2</Label>
                                <Input id="address-2" value={profile.address?.addressLine2 || ''} onChange={(e) => handleAddressChange('addressLine2', e.target.value)} className="bg-background" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="city" className="text-[10px] uppercase font-bold text-muted-foreground">City</Label>
                                    <Input id="city" value={profile.address?.city || ''} onChange={(e) => handleAddressChange('city', e.target.value)} className="bg-background" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="state-county" className="text-[10px] uppercase font-bold text-muted-foreground">State / County</Label>
                                    <Input id="state-county" value={profile.address?.stateCounty || ''} onChange={(e) => handleAddressChange('stateCounty', e.target.value)} className="bg-background" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="postcode" className="text-[10px] uppercase font-bold text-muted-foreground">Postcode</Label>
                                    <Input id="postcode" value={profile.address?.postcode || ''} onChange={(e) => handleAddressChange('postcode', e.target.value)} className="bg-background" />
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="can-drive">Driving Authorization</Label>
                        <Select value={profile.canDrive || ''} onValueChange={(value) => handleInputChange('canDrive', value)}>
                            <SelectTrigger id="can-drive">
                                <SelectValue placeholder="Do you possess a valid license?" />
                            </SelectTrigger>
                             <SelectContent>
                                <SelectItem value="Yes">Yes, Authorized Driver</SelectItem>
                                <SelectItem value="No">No / Not Applicable</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Next of Kin (Emergency Dispatch)</CardTitle>
                    <CardDescription>Critical information required for platform duty-of-care.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="nok-name">Full Name</Label>
                            <Input id="nok-name" value={profile.nextOfKin?.name || ''} onChange={(e) => handleNextOfKinChange('name', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nok-relationship">Relationship</Label>
                            <Input id="nok-relationship" value={profile.nextOfKin?.relationship || ''} onChange={(e) => handleNextOfKinChange('relationship', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="nok-phone">Contact Number</Label>
                            <Input id="nok-phone" type="tel" value={profile.nextOfKin?.contactNumber || ''} onChange={(e) => handleNextOfKinChange('contactNumber', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="nok-email">Email Address</Label>
                            <Input id="nok-email" type="email" value={profile.nextOfKin?.email || ''} onChange={(e) => handleNextOfKinChange('email', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Emergency Contact Address</Label>
                         <div className="grid gap-2 border p-4 rounded-md bg-muted/20">
                            <div className="space-y-1">
                                <Label htmlFor="nok-address-1" className="text-[10px] uppercase font-bold text-muted-foreground">Address Line 1</Label>
                                <Input id="nok-address-1" value={profile.nextOfKin?.address?.addressLine1 || ''} onChange={(e) => handleNextOfKinAddressChange('addressLine1', e.target.value)} className="bg-background" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="nok-address-2" className="text-[10px] uppercase font-bold text-muted-foreground">Address Line 2</Label>
                                <Input id="nok-address-2" value={profile.nextOfKin?.address?.addressLine2 || ''} onChange={(e) => handleNextOfKinAddressChange('addressLine2', e.target.value)} className="bg-background" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="nok-city" className="text-[10px] uppercase font-bold text-muted-foreground">City</Label>
                                    <Input id="nok-city" value={profile.nextOfKin?.address?.city || ''} onChange={(e) => handleNextOfKinAddressChange('city', e.target.value)} className="bg-background" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="nok-state-county" className="text-[10px] uppercase font-bold text-muted-foreground">State / County</Label>
                                    <Input id="nok-state-county" value={profile.nextOfKin?.address?.stateCounty || ''} onChange={(e) => handleNextOfKinAddressChange('stateCounty', e.target.value)} className="bg-background" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="nok-postcode" className="text-[10px] uppercase font-bold text-muted-foreground">Postcode</Label>
                                    <Input id="nok-postcode" value={profile.nextOfKin?.address?.postcode || ''} onChange={(e) => handleNextOfKinAddressChange('postcode', e.target.value)} className="bg-background" />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-2">
                 <Button onClick={handleSave} disabled={isSaving} className="font-bold px-8">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Commit Changes
                </Button>
                <Button variant="outline" asChild className="font-bold">
                    <Link href={`/admin/team/${employeeId}`}>Discard</Link>
                </Button>
            </div>
        </div>
    )
}
