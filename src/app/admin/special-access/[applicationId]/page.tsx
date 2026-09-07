"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    Loader2,
    User,
    Mail,
    Phone,
    Printer,
    Check,
    Satellite,
    Bell,
    Siren,
    PlusCircle,
    X,
    Globe,
    ShieldCheck,
    FileEdit,
    History,
    MessageSquare,
    Scale,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, addYears, isValid } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { CommunitySelector, type CommunitySelection } from "@/components/community-selector";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { grantSpecialAccessAction } from "@/lib/actions/accessActions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ApplicationDetail = ({ label, value, onCheckedChange, isChecked, children }: { 
    label: string; 
    value?: string | undefined; 
    onCheckedChange: (checked: boolean) => void; 
    isChecked: boolean; 
    children?: React.ReactNode 
}) => (
    <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_3fr_1fr] gap-4 py-3 items-center border-b last:border-0">
        <dt className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{label}</dt>
        <dd className="text-sm font-medium">{children || value || 'N/A'}</dd>
        <div className="flex items-center space-x-2 justify-self-end">
            <Checkbox 
                id={`check-${label}`} 
                checked={isChecked} 
                onCheckedChange={(checked) => onCheckedChange(!!checked)} 
            />
            <label htmlFor={`check-${label}`} className="text-[10px] font-bold uppercase tracking-tighter cursor-pointer opacity-70">
                Verified
            </label>
        </div>
    </div>
);

const ScopeLabel = ({ scope }: { scope: CommunitySelection }) => {
  const [label, setLabel] = React.useState('');
  const db = useFirestore();

  React.useEffect(() => {
    const resolveHierarchy = async () => {
      if (!db) return;
      const names: string[] = [];

      try {
          if (scope.community) {
              const snap = await getDoc(doc(db, 'communities', scope.community));
              if (snap.exists()) {
                  const data = snap.data();
                  if (data.country) names.push(data.country);
                  if (data.state) names.push(data.state);
                  if (data.region) names.push(data.region);
                  names.push(data.name);
              }
          } else if (scope.region) {
              const regionSnap = await getDoc(doc(db, 'locations', scope.region));
              if (regionSnap.exists()) {
                  const regionData = regionSnap.data();
                  const stateSnap = await getDoc(doc(db, 'locations', regionData.parent));
                  if (stateSnap.exists()) {
                      const stateData = stateSnap.data();
                      const countrySnap = await getDoc(doc(db, 'locations', stateData.parent));
                      if (countrySnap.exists()) names.push(countrySnap.data().name);
                      names.push(stateData.name);
                  }
                  names.push(regionData.name);
              }
          } else if (scope.state) {
              const stateSnap = await getDoc(doc(db, 'locations', scope.state));
              if (stateSnap.exists()) {
                  const stateData = stateSnap.data();
                  const countrySnap = await getDoc(doc(db, 'locations', stateData.parent));
                  if (countrySnap.exists()) names.push(countrySnap.data().name);
                  names.push(stateData.name);
              }
          } else if (scope.country) {
              const snap = await getDoc(doc(db, 'locations', scope.country));
              if (snap.exists()) names.push(snap.data().name);
          }
      } catch (e) {
          console.error("Error resolving scope names:", e);
      }

      setLabel(names.filter(Boolean).join(" › "));
    };
    resolveHierarchy();
  }, [scope, db]);

  return <span className="font-bold">{label || 'Resolving geography...'}</span>;
};

export default function ApplicationViewPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user: authUser } = useUser();
    const db = useFirestore();
    const { applicationId } = params;

    const [isAmendMode, setIsAmendMode] = React.useState(false);
    const [isDeclineDialogOpen, setIsDeclineDialogOpen] = React.useState(false);
    const [declineReason, setDeclineReason] = React.useState("");

    const userProfileRef = useMemoFirebase(() => (authUser ? doc(db, 'users', authUser.uid) : null), [authUser, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const requestRef = useMemoFirebase(() => (applicationId && db ? doc(db, "access_requests", applicationId as string) : null), [applicationId, db]);
    const { data: request, isLoading: loading } = useDoc<any>(requestRef);

    const [isProcessing, setIsProcessing] = React.useState(false);
    const [vettingChecks, setVettingChecks] = React.useState({
        name: false, title: false, agency: false, country: false, govLevel: false, email: false,
        phone: false, refName: false, refTitle: false, refEmail: false, refPhone: false,
        justification: false, agreedToTerms: false, credentials: false
    });
    
    const [broadcastScopes, setBroadcastScopes] = React.useState<CommunitySelection[]>([]);
    const [currentSelection, setCurrentSelection] = React.useState<CommunitySelection>({
        id: null, country: null, state: null, region: null, community: null,
        countries: [], states: [], regions: [], communities: []
    });
    const [canSendStandard, setCanSendStandard] = React.useState(false);
    const [canSendEmergency, setCanSendEmergency] = React.useState(true);
    const [expiryDate, setExpiryDate] = React.useState<Date | undefined>(addYears(new Date(), 1));

    const [vettingComments, setVettingComments] = React.useState({
        applicant: "", contact: "", reference: "", justification: ""
    });
    
    React.useEffect(() => {
        if (request) {
            if (request.vettingChecks) setVettingChecks(prev => ({ ...prev, ...request.vettingChecks }));
            if (request.vettingComments) setVettingComments(prev => ({ ...prev, ...request.vettingComments }));
            if (request.broadcastScopes) setBroadcastScopes(request.broadcastScopes);
            if (request.permissions) {
                setCanSendStandard(request.permissions.standard ?? false);
                setCanSendEmergency(request.permissions.emergency ?? true);
            }
            if (request.accessExpiresAt) {
                const date = request.accessExpiresAt.toDate ? request.accessExpiresAt.toDate() : new Date(request.accessExpiresAt);
                setExpiryDate(isValid(date) ? date : addYears(new Date(), 1));
            }
        }
    }, [request]);

    const handleCheckChange = (field: keyof typeof vettingChecks) => (checked: boolean) => {
        setVettingChecks(prev => ({...prev, [field]: checked}));
    }

    const handleCommentChange = (field: keyof typeof vettingComments, value: string) => {
        setVettingComments(prev => ({ ...prev, [field]: value }));
    };
    
    const handleGrantAccess = async () => {
        if (!applicationId || !authUser || !request?.userId || !db) return;
        
        setIsProcessing(true);
        try {
            const adminName = userProfile?.name || authUser.displayName || authUser.email || 'Administrator';
            const reqRef = doc(db, 'access_requests', applicationId as string);
            
            const permissions = { standard: canSendStandard, emergency: canSendEmergency };

            await updateDoc(reqRef, {
                status: 'Approved', 
                processedBy: adminName, 
                processedAt: serverTimestamp(),
                suspendedBy: null, 
                suspendedAt: null, 
                broadcastScopes, 
                permissions, 
                accessExpiresAt: expiryDate,
                vettingChecks, 
                vettingComments,
                declineReason: null
            });

            const grantResult = await grantSpecialAccessAction({
                userId: request.userId,
                requestId: applicationId as string,
            });
            
            if (!grantResult.success) throw new Error(grantResult.error);
            
            toast({ title: isAmendMode ? "Access Amended" : "Access Approved", description: `Permissions for ${request?.applicantName} have been updated.` });
            setIsAmendMode(false);
            router.push('/admin/special-access');
            
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Could not process access.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    }

    const handleDeclineRequest = async () => {
        if (!applicationId || !db || !authUser) return;
        
        if (!declineReason.trim()) {
            toast({ variant: 'destructive', title: "Reason Required", description: "Please explain why the application is being declined." });
            return;
        }

        setIsProcessing(true);
        try {
            const reqRef = doc(db, 'access_requests', applicationId as string);
            const adminName = userProfile?.name || authUser.displayName || authUser.email || 'Administrator';

            await updateDoc(reqRef, {
                status: 'Declined',
                processedBy: adminName,
                processedAt: serverTimestamp(),
                declineReason: declineReason,
            });

            if (request?.userId) {
                await addDoc(collection(db, 'notifications'), {
                    recipientId: request.userId,
                    type: 'Special Access Request',
                    subject: 'Your broadcast access request was declined.',
                    from: 'Platform Administration',
                    date: new Date().toISOString(),
                    status: 'new',
                    details: { message: `Reason: ${declineReason}` }
                });
            }

            toast({ title: "Request Declined", description: "The applicant has been notified of the decision." });
            setIsDeclineDialogOpen(false);
            router.push('/admin/special-access');
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSuspendAccess = async () => {
        if (!applicationId || !authUser || !db) return;
        setIsProcessing(true);
        try {
            const adminName = userProfile?.name || authUser.displayName || authUser.email || 'Administrator';
            const reqRef = doc(db, 'access_requests', applicationId as string);
            await updateDoc(reqRef, { status: 'Suspended', suspendedBy: adminName, suspendedAt: new Date() });
            toast({ title: "Access Suspended", description: `The user's broadcast rights have been revoked.` });
            router.push('/admin/special-access');
        } catch (error) {
             toast({ title: "Error", description: "Could not suspend access.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    }

    const handleAddPrunedScopes = (level: 'country' | 'state' | 'region' | 'community', ids: string[]) => {
        if (!ids.length) return;
        
        const newScopes = ids.map(id => ({
            id: `${id}-${Date.now()}`,
            country: currentSelection.countries?.[0] || null,
            state: level === 'state' ? id : (currentSelection.states?.[0] || null),
            region: level === 'region' ? id : (currentSelection.regions?.[0] || null),
            community: level === 'community' ? id : null,
            targetLevel: level
        } as CommunitySelection));

        setBroadcastScopes(prev => [...prev, ...newScopes]);
    }

    const handleRemoveScope = (id: string | null) => {
        setBroadcastScopes(prev => prev.filter(scope => scope.id !== id));
    }

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    
    if (!request) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Request Not Found</h1>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/admin/special-access">Return to Access Requests</Link>
                </Button>
            </div>
        )
    }

    const allChecksCompleted = Object.values(vettingChecks).every(Boolean);
    const hasScope = broadcastScopes.length > 0;
    const hasPermission = canSendStandard || canSendEmergency;
    const isGrantButtonDisabled = !allChecksCompleted || !hasScope || !hasPermission || isProcessing;
    const isApproved = request?.status === 'Approved';
    const isDeclined = request?.status === 'Declined';
    const showApprovalForm = request?.status === 'Pending' || request?.status === 'Suspended' || isAmendMode;

    return (
        <div className="max-w-5xl mx-auto py-8 space-y-8 px-4">
             <div className="flex justify-between items-center print:hidden">
                <Button asChild variant="ghost"><Link href="/admin/special-access"><ArrowLeft className="mr-2 h-4 w-4" /> Back to list</Link></Button>
                 <Button variant="outline" onClick={() => window.print()} className="font-bold uppercase tracking-tighter text-xs shadow-sm"><Printer className="mr-2 h-4 w-4" /> Print Vetting Doc</Button>
            </div>

            <Card className="border-2 shadow-xl overflow-hidden">
                <CardHeader className="text-center py-10 bg-primary/5 border-b">
                    <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter">Special Access Vetting</CardTitle>
                    <CardDescription>Targeted Geographical Broadcast System (TGBS) Credentials</CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 space-y-12">
                     <section>
                        <h2 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2 mb-4 border-b pb-2"><User className="h-4 w-4" /> Official Identity</h2>
                        <div className="rounded-lg border bg-muted/20 px-4">
                            <ApplicationDetail label="Full Name" value={request?.applicantName} isChecked={vettingChecks.name} onCheckedChange={handleCheckChange('name')} />
                            <ApplicationDetail label="Role / Rank" value={request?.applicantTitle} isChecked={vettingChecks.title} onCheckedChange={handleCheckChange('title')} />
                            <ApplicationDetail label="Gov Agency" value={request?.agency} isChecked={vettingChecks.agency} onCheckedChange={handleCheckChange('agency')} />
                            <ApplicationDetail label="Gov Level" value={request?.govLevel} isChecked={vettingChecks.govLevel} onCheckedChange={handleCheckChange('govLevel')} />
                        </div>
                    </section>
                    
                    <section>
                        <h2 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2 mb-4 border-b pb-2"><Mail className="h-4 w-4" /> Secured Contact</h2>
                        <div className="rounded-lg border bg-muted/20 px-4">
                           <ApplicationDetail label="Work Email" value={request?.email} isChecked={vettingChecks.email} onCheckedChange={handleCheckChange('email')} />
                           <ApplicationDetail label="Direct Phone" value={request?.phone} isChecked={vettingChecks.phone} onCheckedChange={handleCheckChange('phone')} />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2 mb-4 border-b pb-2"><Globe className="h-4 w-4" /> Jurisdiction & Justification</h2>
                        <div className="rounded-lg border bg-muted/20 px-4">
                           <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_3fr_1fr] gap-4 py-3 items-center border-b last:border-0">
                                <dt className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Requested Coverage</dt>
                                <dd className="text-sm font-bold text-primary">{request?.coverageArea || 'No specific region specified'}</dd>
                                <div className="flex items-center space-x-2 justify-self-end">
                                    <Checkbox id="check-coverage" checked={vettingChecks.credentials} onCheckedChange={handleCheckChange('credentials')} />
                                    <label htmlFor="check-coverage" className="text-[10px] font-bold uppercase tracking-tighter cursor-pointer opacity-70">Verified</label>
                                </div>
                           </div>
                           <ApplicationDetail label="Stated Justification" isChecked={vettingChecks.justification} onCheckedChange={handleCheckChange('justification')}>
                                 <p className="text-xs leading-relaxed italic bg-background p-3 rounded border border-dashed whitespace-pre-wrap">{request?.justification}</p>
                            </ApplicationDetail>
                        </div>
                    </section>
                    
                    <section>
                        <h2 className="text-sm font-black uppercase text-primary tracking-widest mb-4 border-b pb-2">Professional Reference</h2>
                         <div className="rounded-lg border bg-muted/20 px-4">
                            <ApplicationDetail label="Referee" value={request?.refName} isChecked={vettingChecks.refName} onCheckedChange={handleCheckChange('refName')} />
                            <ApplicationDetail label="Relationship" value={request?.refTitle} isChecked={vettingChecks.refTitle} onCheckedChange={handleCheckChange('refTitle')} />
                            <ApplicationDetail label="Ref Email" value={request?.refEmail} isChecked={vettingChecks.refEmail} onCheckedChange={handleCheckChange('refEmail')} />
                            <ApplicationDetail label="Ref Phone" value={request?.refPhone} isChecked={vettingChecks.refPhone} onCheckedChange={handleCheckChange('refPhone')} />
                        </div>
                    </section>

                    <Separator />

                    <section className="space-y-4">
                        <h2 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2 mb-4"><History className="h-4 w-4" /> Administrative Vetting Archives</h2>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="comments" className="border-none">
                                <AccordionTrigger className="p-4 bg-muted/30 rounded-lg hover:no-underline border border-dashed">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-bold text-xs uppercase tracking-wider">Read Full Vetting History & Comments</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4 px-2">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <Card className="bg-background">
                                            <CardHeader className="p-3 bg-muted/10 border-b">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Applicant Notes</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 text-xs italic min-h-12">
                                                {request?.vettingComments?.applicant || "No specific applicant notes recorded."}
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-background">
                                            <CardHeader className="p-3 bg-muted/10 border-b">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Contact Verification</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 text-xs italic min-h-12">
                                                {request?.vettingComments?.contact || "No contact verification notes recorded."}
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-background">
                                            <CardHeader className="p-3 bg-muted/10 border-b">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Reference Check</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 text-xs italic min-h-12">
                                                {request?.vettingComments?.reference || "No reference check notes recorded."}
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-background">
                                            <CardHeader className="p-3 bg-muted/10 border-b">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Decision Justification</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 text-xs italic min-h-12">
                                                {request?.vettingComments?.justification || "No decision justification recorded."}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </section>
                </CardContent>
            </Card>
            
            {showApprovalForm && (
                <Card className="print:hidden border-2 border-primary/20 shadow-lg animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader className="bg-primary/5">
                        <CardTitle className="flex items-center gap-2 font-black uppercase tracking-tight">
                            <Satellite className="h-6 w-6 text-primary" />
                            {isAmendMode ? 'Amend Granted Authority' : 'Initial Access Grant'}
                        </CardTitle>
                        <CardDescription>Define the permitted geographical dispatches and alert tiers for this official.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-10">
                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <Label className="font-black uppercase text-[10px] tracking-widest text-primary mb-4 block underline underline-offset-4">Jurisdictional Map Navigator</Label>
                                    <div className="mb-4">
                                        <CommunitySelector 
                                            selection={currentSelection} 
                                            onSelectionChange={setCurrentSelection} 
                                            renderAction={(level, ids) => (
                                                <Button 
                                                    onClick={() => handleAddPrunedScopes(level, ids)} 
                                                    variant="secondary" 
                                                    size="sm"
                                                    disabled={!ids.length}
                                                    className="h-10 font-bold uppercase text-[10px] shadow-sm border-2 border-primary/20"
                                                >
                                                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> 
                                                    Add {ids.length || ''} {level.charAt(0).toUpperCase() + level.slice(1)}
                                                </Button>
                                            )}
                                        />
                                    </div>
                                    
                                    <Separator className="my-6" />
                                    
                                    <Label className="font-black uppercase text-[10px] tracking-widest text-primary mb-4 block underline underline-offset-4">Granted Authority Scopes</Label>
                                    {broadcastScopes.length > 0 ? (
                                        <div className="space-y-2 rounded-xl border p-4 bg-muted/30 border-dashed">
                                            {broadcastScopes.map(scope => (
                                                <div className="flex items-center justify-between p-3 rounded-md bg-background border shadow-sm" key={scope.id}>
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <Badge variant="outline" className="text-[8px] uppercase font-black px-1.5 py-0 h-4 border-primary/40 text-primary">{scope.targetLevel || 'Hub'}</Badge>
                                                        <ScopeLabel scope={scope} />
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveScope(scope.id)}><X className="h-4 w-4" /></Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/10">
                                            <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-xs font-bold text-muted-foreground uppercase italic">No authority granted yet. Select a map path above.</p>
                                        </div>
                                    )}
                                </div>
                                
                                <Separator />

                                <div>
                                    <Label className="font-black uppercase text-[10px] tracking-widest text-primary mb-4 block">2. Permitted Broadcast Tiers</Label>
                                    <div className="grid gap-3">
                                        <div className="flex items-center justify-between p-4 border rounded-xl bg-card shadow-sm">
                                            <Label htmlFor="standard-broadcast" className="flex items-center gap-3 cursor-pointer">
                                                <Bell className="h-5 w-5 text-muted-foreground" />
                                                <div><p className="font-bold text-sm">Standard Tier</p><p className="text-[10px] text-muted-foreground uppercase">General Updates</p></div>
                                            </Label>
                                            <Switch id="standard-broadcast" checked={canSendStandard} onCheckedChange={setCanSendStandard} />
                                        </div>
                                        <div className="flex items-center justify-between p-4 border rounded-xl bg-card shadow-sm">
                                            <Label htmlFor="emergency-broadcast" className="flex items-center gap-3 cursor-pointer">
                                                <Siren className="h-5 w-5 text-destructive" />
                                                <div><p className="font-bold text-sm">Emergency Tier</p><p className="text-[10px] text-destructive uppercase font-black tracking-tighter">Critical Override Alerts</p></div>
                                            </Label>
                                            <Switch id="emergency-broadcast" checked={canSendEmergency} onCheckedChange={setCanSendEmergency} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <Label className="font-black uppercase text-[10px] tracking-widest text-primary mb-4 block">3. Internal Vetting Comments</Label>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Identity & Background</Label>
                                        <Textarea value={vettingComments.applicant} onChange={(e) => handleCommentChange('applicant', e.target.value)} placeholder="Summary of identity verification steps..." className="min-h-[100px] text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Contact & Reference Notes</Label>
                                        <Textarea value={vettingComments.contact} onChange={(e) => handleCommentChange('contact', e.target.value)} placeholder="Notes from phone/email follow-ups..." className="min-h-[100px] text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Reference Verification</Label>
                                        <Textarea value={vettingComments.reference} onChange={(e) => handleCommentChange('reference', e.target.value)} placeholder="Outcome of reference check..." className="min-h-[100px] text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Access Justification</Label>
                                        <Textarea value={vettingComments.justification} onChange={(e) => handleCommentChange('justification', e.target.value)} placeholder="Reason for specific scope grant..." className="min-h-[100px] text-xs" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />
                        <div className="grid md:grid-cols-2 gap-8">
                             <div className="space-y-3">
                                <Label className="font-black uppercase text-[10px] tracking-widest text-primary">4. Authority Life Cycle</Label>
                                <DatePicker date={expiryDate} setDate={setExpiryDate} />
                                <p className="text-[9px] text-muted-foreground uppercase italic tracking-tighter">Authority is automatically revoked at 00:00 on the selected date.</p>
                            </div>
                            <div className="space-y-3">
                                <Label className="font-black uppercase text-[10px] tracking-widest text-primary">5. Final Attestation</Label>
                                <div className="p-4 rounded-lg bg-green-50 border border-green-100 flex items-center gap-3">
                                    <Scale className="h-5 w-5 text-green-600" />
                                    <p className="text-xs font-bold text-green-800">Administrator Sig: {userProfile?.name || authUser?.email || "System"}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t p-6 flex flex-wrap justify-end gap-3">
                        {request?.status === 'Pending' && (
                            <Dialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/5 font-bold uppercase text-xs">
                                        <XCircle className="mr-2 h-4 w-4" /> Decline Request
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Decline Special Access Request</DialogTitle>
                                        <DialogDescription>Provide a reason for the rejection. This will be sent to the applicant.</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-2">
                                        <Label htmlFor="decline-reason">Reason for Rejection</Label>
                                        <Textarea 
                                            id="decline-reason" 
                                            placeholder="e.g. Identity could not be verified through official channels..." 
                                            value={declineReason}
                                            onChange={(e) => setDeclineReason(e.target.value)}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsDeclineDialogOpen(false)}>Cancel</Button>
                                        <Button 
                                            variant="destructive" 
                                            onClick={handleDeclineRequest} 
                                            disabled={isProcessing || !declineReason.trim()}
                                        >
                                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                            Confirm Decline
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                        {isAmendMode && <Button variant="outline" onClick={() => setIsAmendMode(false)} className="font-bold uppercase text-xs">Discard Changes</Button>}
                        <Button onClick={handleGrantAccess} disabled={isGrantButtonDisabled} size="lg" className="px-8 font-black uppercase tracking-tighter shadow-md">
                             {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                             {isAmendMode ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                            {isAmendMode ? 'Publish Amendments' : 'Final Approve & Grant Access'}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {(isApproved || isDeclined) && !isAmendMode && (
                 <Card className={cn(
                     "print:hidden border-2 shadow-lg",
                     isApproved ? "border-green-500/20 bg-green-50/10" : "border-destructive/20 bg-destructive/5"
                 )}>
                    <CardHeader className={cn("border-b", isApproved ? "bg-green-50/50" : "bg-destructive/10")}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg text-white", isApproved ? "bg-green-600" : "bg-destructive")}>
                                    {isApproved ? <ShieldCheck className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black uppercase tracking-tighter">
                                        {isApproved ? 'Active Broadcast Authority' : 'Request Declined'}
                                    </CardTitle>
                                    <CardDescription className={cn("text-[10px] font-bold uppercase tracking-widest", isApproved ? "text-green-700" : "text-destructive")}>
                                        {isApproved ? `Valid until ${expiryDate ? format(expiryDate, "PPP") : 'Indefinite'}` : 'Application was not approved'}
                                    </CardDescription>
                                </div>
                            </div>
                            <Badge className={cn("text-white font-black uppercase text-[10px] tracking-widest shadow-sm", isApproved ? "bg-green-600" : "bg-destructive")}>
                                {isApproved ? 'Active Credentials' : 'Request Rejected'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        {isApproved ? (
                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Granting Official</p>
                                    <p className="font-bold text-sm">{request?.processedBy}</p>
                                    <p className="text-[10px] text-muted-foreground italic">{request?.processedAt?.toDate ? format(request.processedAt.toDate(), "PPPp") : 'N/A'}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Dispatch Permissions</p>
                                    <div className="flex gap-2">
                                        {canSendStandard && <Badge variant="secondary" className="text-[9px] uppercase font-black border-blue-200 text-blue-700 bg-blue-50">Standard</Badge>}
                                        {canSendEmergency && <Badge variant="destructive" className="text-[9px] uppercase font-black bg-red-600 text-white shadow-sm">Emergency Override</Badge>}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Jurisdictional Reach</p>
                                    <p className="text-xs font-bold text-primary">{broadcastScopes?.length || 0} Defined Scopes/Hubs</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-destructive font-bold">
                                    <AlertTriangle className="h-5 w-5" />
                                    Reason for Rejection:
                                </div>
                                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm italic">
                                    "{request?.declineReason || "No specific reason provided."}"
                                </div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Processed by {request?.processedBy} on {request?.processedAt?.toDate ? format(request.processedAt.toDate(), "PPPp") : 'N/A'}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t p-6 flex flex-wrap justify-end gap-3">
                         {isApproved && (
                             <Button variant="outline" className="font-bold uppercase tracking-tighter text-xs text-primary border-primary/20 hover:bg-primary/5" onClick={() => setIsAmendMode(true)}>
                                <FileEdit className="mr-2 h-4 w-4" /> Amend Granted Scopes
                             </Button>
                         )}
                         {isApproved && (
                            <Button variant="destructive" onClick={handleSuspendAccess} disabled={isProcessing} className="font-bold uppercase tracking-tighter text-xs shadow-md">
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <X className="mr-2 h-4 w-4" /> Suspend Authority
                            </Button>
                         )}
                         {isDeclined && (
                             <Button variant="outline" className="font-bold uppercase text-xs" onClick={() => setIsAmendMode(true)}>
                                 <PlusCircle className="mr-2 h-4 w-4" /> Re-open & Approve
                             </Button>
                         )}
                    </CardFooter>
                </Card>
            )}
        </div>
    )
}