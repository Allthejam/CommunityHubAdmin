"use client";

import * as React from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { 
    Calendar, 
    Clock, 
    Send, 
    Siren, 
    Loader2, 
    Upload, 
    Camera, 
    Bell, 
    X, 
    Users, 
    Globe, 
    Mail, 
    Info, 
    Target, 
    Building,
    CheckCircle2,
    ShieldCheck,
    AlertTriangle,
    AlertCircle,
    UserCircle,
    Shield
} from "lucide-react";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { DatePicker } from "./ui/date-picker";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "./rich-text-editor";
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import { createPlatformAnnouncementAction, getTargetAudienceCountAction } from "@/lib/actions/announcementActions";
import { MultiSelect } from "./ui/multi-select";
import { CommunitySelector, type CommunitySelection } from "./community-selector";
import { Badge } from "./ui/badge";
import { useDoc, useMemoFirebase } from "@/firebase";
import { doc, getDoc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDebouncedCallback } from 'use-debounce';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";


type BroadcastTier = 'standard' | 'urgent' | 'emergency';

const userRoles = [
  { value: "leader", label: "Community Leaders" },
  { value: "business", label: "Business Owners" },
  { value: "personal", label: "Personal Accounts" },
  { value: "reporter", label: "Reporters" },
  { value: "courier", label: "Local Couriers" },
];

const MASTER_OWNER_EMAIL = 'allan_jamieson@outlook.com';

export function BroadcastComposer() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !db) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);

    const { data: userProfile } = useDoc(userProfileRef);

    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [selectedTier, setSelectedTier] = React.useState<BroadcastTier>('standard');
    
    // Form State
    const [subject, setSubject] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [activateImmediately, setActivateImmediately] = React.useState(true);
    const [startDate, setStartDate] = React.useState<Date>();
    const [endDate, setEndDate] = React.useState<Date>();
    const [image, setImage] = React.useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const [showOnLoginPage, setShowOnLoginPage] = React.useState(false);
    const [sendAsEmail, setSendAsEmail] = React.useState(false);
    const [senderIdentity, setSenderIdentity] = React.useState<string>("");
    
    const [audienceType, setAudienceType] = React.useState('all');
    const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);
    const [selectedLocation, setSelectedLocation] = React.useState<CommunitySelection>({
        id: "broadcast-target", 
        country: null, state: null, region: null, community: null,
        countries: [], states: [], regions: [], communities: []
    });

    const [targetedUserCount, setTargetedUserCount] = React.useState<number | null>(null);
    const [targetedCommunityCount, setTargetedCommunityCount] = React.useState<number | null>(null);
    const [isCalculatingCount, setIsCalculatingCount] = React.useState(false);
    
    const [resolvedNames, setResolvedNames] = React.useState<string[]>([]);

    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Dynamic Permission Logic
    const normalizedEmail = user?.email?.toLowerCase().trim();
    const isMaster = normalizedEmail === MASTER_OWNER_EMAIL;
    const userRole = (userProfile?.role || "").toLowerCase();
    
    // Explicit Authority Check
    const isFullAdmin = isMaster || userRole === 'admin' || userRole === 'owner' || userRole === 'administrator';
    
    const canSendStandard = isFullAdmin || userProfile?.permissions?.canSendStandard === true;
    const canSendEmergency = isFullAdmin || userProfile?.permissions?.canSendEmergency === true;
    
    React.useEffect(() => {
        if (!canSendEmergency && selectedTier === 'emergency') {
            setSelectedTier('standard');
        }
    }, [canSendEmergency, selectedTier]);

    React.useEffect(() => {
        if (isCameraOpen) {
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (error) {
                    console.error('Error accessing camera:', error);
                    setHasCameraPermission(false);
                    setIsCameraOpen(false);
                    toast({ 
                        variant: "destructive", 
                        title: "Camera Access Denied", 
                        description: "Please enable camera permissions in your browser settings to use this feature." 
                    });
                }
            };
            getCameraPermission();
        } else if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, [isCameraOpen, toast]);

    const debouncedFetchCount = useDebouncedCallback(async (type: string, roles: string[], location: CommunitySelection) => {
        setIsCalculatingCount(true);
        try {
            const result = await getTargetAudienceCountAction({
                audienceType: type,
                selectedRoles: roles,
                selectedLocation: location
            });
            setTargetedUserCount(result.userCount);
            setTargetedCommunityCount(result.communityCount);
            
            if (type === 'location' && db) {
                const names: string[] = [];
                if (location.countries?.length) {
                    for (const id of location.countries) {
                        const snap = await getDoc(doc(db, 'locations', id));
                        if (snap.exists()) names.push(snap.data().name);
                    }
                }
                if (location.states?.length) {
                    for (const id of location.states) {
                        const snap = await getDoc(doc(db, 'locations', id));
                        if (snap.exists()) names.push(snap.data().name);
                    }
                }
                if (location.regions?.length) {
                    for (const id of location.regions) {
                        const snap = await getDoc(doc(db, 'locations', id));
                        if (snap.exists()) names.push(snap.data().name);
                    }
                }
                if (location.communities?.length) {
                    for (const id of location.communities) {
                        const snap = await getDoc(doc(db, 'communities', id));
                        if (snap.exists()) names.push(snap.data().name);
                    }
                }
                setResolvedNames(names);
            } else {
                setResolvedNames([]);
            }
        } catch (error) {
            console.error("Count tally error:", error);
        } finally {
            setIsCalculatingCount(false);
        }
    }, 500);

    React.useEffect(() => {
        debouncedFetchCount(audienceType, selectedRoles, selectedLocation);
    }, [audienceType, selectedRoles, selectedLocation, debouncedFetchCount]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            setImage(canvas.toDataURL('image/jpeg', 0.9));
            setIsCameraOpen(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const resetForm = () => {
        setSubject("");
        setMessage("");
        setActivateImmediately(true);
        setStartDate(undefined);
        setEndDate(undefined);
        setImage(null);
        setShowOnLoginPage(false);
        setSendAsEmail(false);
        setSenderIdentity("");
        setAudienceType('all');
        setSelectedRoles([]);
        setSelectedLocation({
            id: "broadcast-target", 
            country: null, state: null, region: null, community: null,
            countries: [], states: [], regions: [], communities: []
        });
    };
    
    const getPrunedAudience = () => {
        if (audienceType === 'all') return { type: 'all' };
        if (audienceType === 'roles') return { type: 'roles', roles: selectedRoles };
        
        return {
            type: 'location',
            countries: selectedLocation.communities?.length ? [] : (selectedLocation.regions?.length ? [] : (selectedLocation.states?.length ? [] : selectedLocation.countries || [])),
            states: selectedLocation.communities?.length ? [] : (selectedLocation.regions?.length ? [] : selectedLocation.states || []),
            regions: selectedLocation.communities?.length ? [] : selectedLocation.regions || [],
            communities: selectedLocation.communities || []
        };
    };
    
    const handleSubmit = async () => {
        if (!user || !userProfile) {
            toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
            return;
        }
        if (!subject || !message) {
            toast({ title: "Error", description: "Subject and message are required.", variant: "destructive" });
            return;
        }
        if (!senderIdentity) {
            toast({ title: "Selection Required", description: "Please select a Sender Identity before deploying.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const isImmediate = activateImmediately || selectedTier === 'urgent' || selectedTier === 'emergency';
        
        try {
            const finalAudience = getPrunedAudience();
            
            const result = await createPlatformAnnouncementAction({
                userId: user.uid,
                subject,
                message,
                image,
                type: selectedTier === 'emergency' ? 'Emergency' : 'Standard',
                severity: selectedTier === 'urgent' ? 'urgent' : 'normal',
                status: isImmediate ? "Live" : "Scheduled",
                audience: finalAudience as any,
                showOnLoginPage,
                sendEmail: sendAsEmail,
                scheduledDates: isImmediate ? new Date().toLocaleDateString() : (startDate && endDate ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` : "Not specified"),
                startDate: !isImmediate ? startDate : null,
                endDate: !isImmediate ? endDate : null,
                scope: 'platform',
                sentBy: senderIdentity,
            });

            if (result.success) {
                toast({ title: "Broadcast Dispatched", description: "Announcement is live or scheduled." });
                resetForm();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveTarget = (name: string) => {
        const newLocation = { ...selectedLocation };
        const updateArray = async (collectionName: string, arrayKey: 'countries' | 'states' | 'regions' | 'communities') => {
            const ids = newLocation[arrayKey] || [];
            for (const id of ids) {
                const collection = db ? (arrayKey === 'communities' ? 'communities' : 'locations') : '';
                const snap = await getDoc(doc(db!, collection, id));
                if (snap.exists() && snap.data().name === name) {
                    newLocation[arrayKey] = ids.filter(i => i !== id);
                    setSelectedLocation(newLocation);
                    return true;
                }
            }
            return false;
        };
        if (db) {
            updateArray('locations', 'countries').then(found => {
                if (!found) updateArray('locations', 'states').then(found => {
                    if (!found) updateArray('locations', 'regions').then(found => {
                        if (!found) updateArray('communities', 'communities');
                    });
                });
            });
        }
    };

    if (authLoading) return <Card className="p-12 flex justify-center"><Loader2 className="animate-spin"/></Card>;
    
    return (
        <Card className={cn(
            "transition-all duration-500 shadow-lg",
            selectedTier === 'emergency' && "border-destructive bg-destructive/5 ring-2 ring-destructive/20",
            selectedTier === 'urgent' && "border-amber-500 bg-amber-50 dark:bg-amber-900/30 ring-2 ring-amber-500/20",
        )}>
            <CardHeader>
                <CardTitle className="font-black uppercase tracking-tight text-xl">Platform Broadcast Console</CardTitle>
                 <div className="grid md:grid-cols-3 gap-4 pt-4">
                    <div
                        className={cn(
                            "p-5 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between",
                            selectedTier === 'standard' ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/50",
                            !canSendStandard && "opacity-20 cursor-not-allowed grayscale"
                        )}
                        onClick={() => canSendStandard && setSelectedTier('standard')}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={cn("p-2 rounded-full", selectedTier === 'standard' ? "bg-primary text-white" : "bg-muted")}>
                                <Bell className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold">Standard</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">General updates, news, and community engagement posts.</p>
                    </div>

                    <div
                        className={cn(
                            "p-5 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between",
                            selectedTier === 'urgent' ? "border-amber-500 bg-amber-500/10 shadow-inner" : "border-border hover:border-amber-500/50",
                            !canSendStandard && "opacity-20 cursor-not-allowed grayscale"
                        )}
                        onClick={() => canSendStandard && setSelectedTier('urgent')}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={cn("p-2 rounded-full", selectedTier === 'urgent' ? "bg-amber-500 text-white" : "bg-muted")}>
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold">Urgent</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">High-priority notices. Bold highlighting. Immediate activation.</p>
                    </div>

                    <div
                        className={cn(
                            "p-5 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between",
                            selectedTier === 'emergency' ? "border-destructive bg-destructive/10 shadow-inner" : "border-border hover:border-destructive/50",
                            !canSendEmergency && "opacity-20 cursor-not-allowed grayscale"
                        )}
                        onClick={() => canSendEmergency && setSelectedTier('emergency')}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={cn("p-2 rounded-full", selectedTier === 'emergency' ? "bg-destructive text-white animate-pulse" : "bg-muted")}>
                                <Siren className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold">Emergency</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">Public safety alerts. System override. Non-dismissible.</p>
                    </div>
                </div>
            </CardHeader>
             <CardContent className="space-y-6">
                
                <div className="space-y-2">
                    <Label htmlFor="subject" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Subject</Label>
                    <Input id="subject" className="font-bold h-11" placeholder="Broadcast Title..." value={subject} onChange={e => setSubject(e.target.value)} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="message" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Message Body</Label>
                    <RichTextEditor value={message} onChange={setMessage} placeholder="Compose your announcement..." />
                </div>

                <div className="space-y-2">
                    <Label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Media Attachment</Label>
                    {image ? (
                        <div className="relative w-48 h-32">
                            <Image src={image} alt="Preview" fill className="rounded-md object-cover border" />
                            <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md" onClick={() => setImage(null)}><X className="h-4 w-4" /></Button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-3.5 w-3.5" /> Upload</Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsCameraOpen(true)}><Camera className="mr-2 h-3.5 w-3.5" /> Camera</Button>
                        </div>
                    )}
                </div>

                <div className={cn("space-y-2", !isCameraOpen && "hidden")}>
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                    <div className="flex gap-2">
                        <Button type="button" onClick={handleCapture} disabled={hasCameraPermission !== true}><Camera className="mr-2" /> Capture</Button>
                        <Button type="button" variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
                    </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />

                <div className="space-y-4 pt-4 border-t">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <Label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Audience Segmentation</Label>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="h-7 gap-2 bg-background border-primary/20 text-primary font-bold">
                                {isCalculatingCount ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
                                Target Audience: {targetedUserCount ?? '...'}
                            </Badge>
                            <Badge variant="outline" className="h-7 gap-2 bg-background border-primary/20 text-primary font-bold">
                                {isCalculatingCount ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3" />}
                                Target Hubs: {targetedCommunityCount ?? '...'}
                            </Badge>
                        </div>
                    </div>

                    {audienceType === 'location' && (
                        <Alert className="bg-amber-50 border-amber-200 animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800 text-xs font-bold uppercase">Critical Targeting Workflow</AlertTitle>
                            <AlertDescription className="text-amber-700 text-xs leading-relaxed">
                                Start by selecting broad <strong>Countries</strong>, then drill down to specific <strong>Regions</strong> or <strong>Hubs</strong>. Parent categories are automatically pruned if a sub-target is selected.
                            </AlertDescription>
                        </Alert>
                    )}

                    <RadioGroup defaultValue="all" value={audienceType} onValueChange={setAudienceType} className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="audience-all" />
                            <Label htmlFor="audience-all" className="font-medium text-sm">Full Platform</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="roles" id="audience-roles" />
                            <Label htmlFor="audience-roles" className="font-medium text-sm">By Role</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="location" id="audience-location" />
                            <Label htmlFor="audience-location" className="font-medium text-sm">By Geography</Label>
                        </div>
                    </RadioGroup>
                    
                    {audienceType === 'roles' && (
                        <MultiSelect options={userRoles} selected={selectedRoles} onChange={setSelectedRoles} className="max-w-md animate-in slide-in-from-left-2" />
                    )}
                    {audienceType === 'location' && (
                        <div className="space-y-4 animate-in slide-in-from-left-2">
                            <CommunitySelector selection={selectedLocation} onSelectionChange={setSelectedLocation} multi={true} allowCreation={false} />
                            
                            <div className="p-4 rounded-lg border bg-primary/5 border-primary/20 flex flex-col gap-3">
                                <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-primary" />
                                        <h4 className="text-xs font-black uppercase text-primary tracking-widest">Target Resolution</h4>
                                    </div>
                                    <Badge className="text-[9px] uppercase bg-primary text-white">{resolvedNames.length} Nodes</Badge>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {resolvedNames.length > 0 ? (
                                        resolvedNames.map((name, i) => (
                                            <Badge key={i} variant="secondary" className="flex items-center gap-1.5 h-7 px-2 bg-white dark:bg-slate-950 border shadow-sm">
                                                <span className="text-[10px] uppercase font-bold">{name}</span>
                                                <button onClick={() => handleRemoveTarget(name)} className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5" title="Remove from targets"><X className="h-3 w-3" /></button>
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground italic">Add Countries, Regions or Communities to begin resolution...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-all",
                        sendAsEmail ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30" : "bg-secondary/20 border-border"
                    )}>
                        <div className="space-y-0.5">
                            <Label htmlFor="email-dist" className="text-base flex items-center gap-2 font-bold">
                                <Mail className={cn("h-5 w-5", sendAsEmail ? "text-amber-600 dark:text-amber-400" : "text-primary")} />
                                Dispatch to Email
                            </Label>
                            <p className="text-xs text-muted-foreground">Simultaneously send as an email alert to targeted users.</p>
                        </div>
                        <Switch id="email-dist" checked={sendAsEmail} onCheckedChange={setSendAsEmail} />
                    </div>

                    {sendAsEmail && (
                        <Alert variant="destructive" className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-500/50 text-rose-900 dark:text-rose-200 animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <AlertTitle className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                    <span>⚠️ Financial Cost & Brevo Quota Warning — Use with Extreme Caution</span>
                                </AlertTitle>
                                <AlertDescription className="text-xs leading-relaxed text-rose-800 dark:text-rose-300 space-y-2">
                                    <p>
                                        Dispatches to email utilize the <strong>Brevo (Sendinblue) API</strong>, which is a <strong>paid, metered third-party service with per-email billing costs</strong>.
                                    </p>
                                    <div className="p-2.5 rounded bg-rose-100/70 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 text-[11px] font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            Target Recipient Load: <strong className="text-rose-900 dark:text-rose-100">{targetedUserCount ?? 'Calculating...'} user mailbox(es)</strong>
                                            {audienceType === 'all' && (
                                                <span className="block sm:inline sm:ml-1 text-rose-600 dark:text-rose-400 font-black uppercase">(Worldwide Full Platform Broadcast)</span>
                                            )}
                                        </div>
                                        <Badge className="bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider shrink-0">
                                            Metered Service
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] italic">
                                        Please ensure this email blast is strictly necessary before deploying. Consider narrowing down the audience by <strong>Geography (Hub / Region)</strong> or <strong>Account Role</strong> rather than selecting &quot;Full Platform&quot; to conserve Brevo email quotas.
                                    </p>
                                </AlertDescription>
                            </div>
                        </Alert>
                    )}
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <Label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Scheduling</Label>
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center space-x-2">
                            <Switch id="activation-mode" checked={activateImmediately} onCheckedChange={setActivateImmediately} />
                            <Label htmlFor="activation-mode">{activateImmediately ? "Activate Immediately" : "Activate by Date"}</Label>
                        </div>
                        {!activateImmediately && selectedTier === 'standard' && (
                            <div className="flex gap-2 animate-in slide-in-from-top-2">
                                <DatePicker date={startDate} setDate={setStartDate} />
                                <DatePicker date={endDate} setDate={setEndDate} />
                            </div>
                        )}
                    </div>
                </div>

                <Separator />

                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <Label className="font-black uppercase text-[10px] tracking-widest text-primary">Official Sender Identity *</Label>
                    </div>
                    <Select value={senderIdentity} onValueChange={setSenderIdentity}>
                        <SelectTrigger className="h-12 border-2">
                            <SelectValue placeholder="Select official authority name..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Platform Admin">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Platform Admin</span>
                                </div>
                            </SelectItem>
                            <SelectItem value={userProfile?.name || 'My Name'}>
                                <div className="flex items-center gap-2">
                                    <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Personal Name: {userProfile?.name}</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Platform Announcement">
                                <div className="flex items-center gap-2">
                                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Platform Announcement</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-[9px] text-muted-foreground uppercase italic font-bold">This name will be displayed as the primary source of the broadcast.</p>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-6">
                 <Button 
                    className="w-full h-12 text-md font-black uppercase tracking-tighter shadow-md"
                    variant={selectedTier === 'emergency' ? 'destructive' : (selectedTier === 'urgent' ? 'default' : 'default')} 
                    style={selectedTier === 'urgent' ? {backgroundColor: '#f59e0b', color: 'white'} : {}}
                    onClick={handleSubmit}
                    disabled={isSubmitting || !senderIdentity}
                >
                    {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {isSubmitting ? "PROCESSING DISPATCH..." : `Deploy ${selectedTier.toUpperCase()} Broadcast`}
                </Button>
            </CardFooter>
        </Card>
    );
}
