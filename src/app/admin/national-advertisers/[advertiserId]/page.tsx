
"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    Loader2,
    User,
    Building,
    Mail,
    Phone,
    Globe,
    FileText,
    XCircle,
    FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { doc, getDoc, updateDoc, writeBatch } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { updateNationalAdvertiserStatusAction } from "@/lib/actions/advertiserActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { type NationalAdvertiser } from "../page";
import { cn } from "@/lib/utils";

const DetailItem = ({ label, value }: { label: string; value?: string | null; }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value || 'N/A'}</p>
    </div>
);

type AdvertiserStatus = "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Suspended" | "Draft";

const StatusBadge = ({ status }: { status: AdvertiserStatus }) => {
  const statusConfig: Record<AdvertiserStatus, string> = {
    "Pending Approval": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    "Approved": "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    "Requires Amendment": "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
    "Declined": "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    "Suspended": "bg-red-500 text-white",
    "Draft": "border-dashed",
  };
  return <Badge className={cn(statusConfig[status])}>{status}</Badge>;
};

export default function AdvertiserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { advertiserId } = params;
    const { toast } = useToast();
    const db = useFirestore();

    const [isProcessing, setIsProcessing] = React.useState(false);
    const [isAmendmentDialogOpen, setIsAmendmentDialogOpen] = React.useState(false);
    const [amendmentReason, setAmendmentReason] = React.useState('');
    
    const userRef = useMemoFirebase(() => (advertiserId ? doc(db, 'users', advertiserId as string) : null), [advertiserId, db]);
    const { data: userData, isLoading } = useDoc(userRef);

    const advertiser = userData?.companyProfile;

    const handleUpdateStatus = async (status: AdvertiserStatus) => {
        setIsProcessing(true);
        const result = await updateNationalAdvertiserStatusAction({
            userId: advertiserId as string,
            status,
        });
        if (result.success) {
            toast({ title: 'Status Updated', description: `Advertiser has been ${status.toLowerCase()}.`});
            router.push('/admin/national-advertisers');
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive'});
        }
        setIsProcessing(false);
    };

    const handleRequestAmendment = () => {
        if (!amendmentReason.trim()) {
            toast({ title: 'Reason Required', description: 'Please provide a reason for the amendment request.', variant: 'destructive' });
            return;
        }
        setIsProcessing(true);
        // This functionality needs to be added to an action
        // For now, we just update the status.
        updateNationalAdvertiserStatusAction({
            userId: advertiserId as string,
            status: 'Requires Amendment',
            // amendmentReason: amendmentReason // This would be saved to the profile
        }).then((result) => {
            if (result.success) {
                toast({ title: 'Amendment Requested', description: `Advertiser has been notified.`});
                setIsAmendmentDialogOpen(false);
                setAmendmentReason('');
                 router.push('/admin/national-advertisers');
            } else {
                 toast({ title: 'Error', description: result.error, variant: 'destructive'});
            }
             setIsProcessing(false);
        });
    };


    if (isLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!advertiser) {
        return (
             <div className="text-center">
                <h1 className="text-2xl font-bold">Advertiser Profile Not Found</h1>
                <p className="text-muted-foreground">The requested advertiser profile could not be found.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/admin/national-advertisers">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Advertiser List
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center">
                 <Button asChild variant="ghost">
                    <Link href="/admin/national-advertisers">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to List
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        <Avatar className="h-20 w-20 border">
                            <AvatarImage src={userData?.avatar} />
                            <AvatarFallback>{userData?.name?.charAt(0) || 'A'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center gap-4">
                                <CardTitle className="text-3xl">{advertiser.companyName}</CardTitle>
                                <StatusBadge status={advertiser.status} />
                            </div>
                            <CardDescription>Submitted by {userData?.name} ({userData?.email})</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Separator />
                    <div className="grid md:grid-cols-2 gap-4">
                        <DetailItem label="Website" value={advertiser.website} />
                        <DetailItem label="Contact Email" value={advertiser.contactEmail} />
                    </div>
                     <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Short Description</p>
                        <p className="text-sm p-4 bg-muted/50 rounded-md">{advertiser.shortDescription}</p>
                    </div>
                     <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Company Overview</p>
                         <div className="prose dark:prose-invert max-w-none text-sm p-4 bg-muted/50 rounded-md" dangerouslySetInnerHTML={{ __html: advertiser.longDescription }} />
                    </div>
                </CardContent>
                {advertiser.status === 'Pending Approval' && (
                    <CardFooter className="flex justify-end gap-4">
                         <Dialog open={isAmendmentDialogOpen} onOpenChange={setIsAmendmentDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><FileEdit className="mr-2 h-4 w-4" /> Request Amendment</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Request Amendment</DialogTitle>
                                    <DialogDescription>Provide a reason for the requested changes. This will be sent to the advertiser.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Label htmlFor="amendment-reason">Reason</Label>
                                    <Textarea id="amendment-reason" value={amendmentReason} onChange={e => setAmendmentReason(e.target.value)} />
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={handleRequestAmendment} disabled={!amendmentReason || isProcessing}>
                                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Send Request
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button variant="destructive" onClick={() => handleUpdateStatus('Declined')} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />}
                            Decline
                        </Button>
                        <Button onClick={() => handleUpdateStatus('Approved')} disabled={isProcessing}>
                             {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Approve
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    )
}
