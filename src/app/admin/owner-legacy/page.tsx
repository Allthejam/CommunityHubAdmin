'use client';

import * as React from 'react';
import { 
    Fingerprint, 
    ShieldAlert, 
    Users, 
    Lock, 
    Key, 
    ShieldCheck, 
    Loader2, 
    Save, 
    Printer, 
    Copy,
    UserCircle,
    PlusCircle,
    Info,
    Trash2,
    Eye,
    EyeOff,
    Unlock,
    FileText,
    Clock,
    ArrowRight,
    Gavel,
    AlertTriangle,
    Siren,
    CheckCircle2,
    PenTool,
    Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, setDoc, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import CryptoJS from 'crypto-js';

const MASTER_OWNER_EMAIL = 'allan_jamieson@outlook.com';

export default function OwnerLegacyPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    // Authorization check
    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    // Load Legacy Config
    const legacyRef = useMemoFirebase(() => db ? doc(db, 'owner_legacy', 'settings') : null, [db]);
    const { data: legacyData, isLoading: legacyLoading } = useDoc<any>(legacyRef);

    // Load Staff Members
    const staffQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(collection(db, 'users'), where('role', 'in', ['owner', 'admin', 'administrator', 'moderator', 'support', 'finance', 'investigator', 'accountant', 'support-specialist']));
    }, [db]);
    const { data: staffMembers } = useCollection(staffQuery);

    const [successorId, setSuccessorId] = React.useState<string>("");
    const [inactivityMonths, setInactivityMonths] = React.useState<string>("6");
    
    // Encryption State
    const [passphrase, setPassphrase] = React.useState("");
    const [isVaultUnlocked, setIsVaultUnlocked] = React.useState(false);
    const [vaultContent, setVaultContent] = React.useState("");
    const [foundersMessage, setFoundersMessage] = React.useState("");
    const [recoveryKeys, setRecoveryKeys] = React.useState<string[]>([]);
    const [debugShowEasterEgg, setDebugShowEasterEgg] = React.useState(false);
    
    const [isSaving, setIsSaving] = React.useState(false);
    const [isGeneratingKeys, setIsGeneratingKeys] = React.useState(false);
    const [showPassphrase, setShowPassphrase] = React.useState(false);

    // Preview Logic State (Simulator)
    const [previewStep, setPreviewStep] = React.useState<'instructions' | 'authentication' | 'revealed'>('instructions');

    // Initial Load Logic
    React.useEffect(() => {
        if (legacyData) {
            setSuccessorId(legacyData.successorId || "");
            setInactivityMonths(String(legacyData.inactivityMonths || "6"));
            setFoundersMessage(legacyData.foundersMessage || "");
            setDebugShowEasterEgg(!!legacyData.debugShowEasterEgg);
        }
    }, [legacyData]);

    const handleUnlockVault = () => {
        if (!passphrase.trim()) {
            toast({ title: "Key Required", description: "Enter your master passphrase to unlock the instructions.", variant: 'destructive' });
            return;
        }

        try {
            if (legacyData?.vaultContent) {
                if (legacyData.vaultContent.startsWith('U2FsdGVkX1')) {
                    const decryptedContent = CryptoJS.AES.decrypt(legacyData.vaultContent, passphrase).toString(CryptoJS.enc.Utf8);
                    if (!decryptedContent) throw new Error("Incorrect key");
                    setVaultContent(decryptedContent);
                } else {
                    setVaultContent(legacyData.vaultContent);
                }
            }
            setIsVaultUnlocked(true);
        } catch (e) {
            toast({ title: "Access Denied", description: "The passphrase provided is incorrect.", variant: 'destructive' });
            setIsVaultUnlocked(false);
        }
    };

    const handleSaveVault = async () => {
        if (!db || !isVaultUnlocked) return;

        setIsSaving(true);
        try {
            const encryptedContent = CryptoJS.AES.encrypt(vaultContent, passphrase).toString();

            await setDoc(doc(db, 'owner_legacy', 'settings'), {
                successorId,
                inactivityMonths: Number(inactivityMonths),
                vaultContent: encryptedContent,
                foundersMessage,
                debugShowEasterEgg,
                updatedAt: Timestamp.now(),
            }, { merge: true });
            
            toast({ title: "Vault Secured", description: "Manual instructions have been encrypted and saved." });
        } catch (e: any) {
            toast({ title: "Save Failed", description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateKeys = async () => {
        if (!db || !isVaultUnlocked || !passphrase) {
            toast({ title: "Vault Locked", description: "Unlock the vault before generating recovery shards.", variant: 'destructive' });
            return;
        }

        setIsGeneratingKeys(true);
        try {
            const keys: string[] = [];
            const pack: { hash: string; encryptedPassphrase: string }[] = [];

            for (let i = 0; i < 8; i++) {
                const randomKey = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + 
                                  Math.random().toString(36).substring(2, 10).toUpperCase();
                
                keys.push(randomKey);
                
                const hash = CryptoJS.SHA256(randomKey).toString();
                const encryptedPassphrase = CryptoJS.AES.encrypt(passphrase, randomKey).toString();
                
                pack.push({ hash, encryptedPassphrase });
            }

            await setDoc(doc(db, 'owner_legacy', 'settings'), {
                recoveryPack: pack,
                keysGeneratedAt: Timestamp.now()
            }, { merge: true });
            
            setRecoveryKeys(keys);
            toast({ title: "Forensic Keys Generated", description: "Provide these 8 shards to your legal executor." });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: 'destructive' });
        } finally {
            setIsGeneratingKeys(false);
        }
    };

    const handleCopyKeys = () => {
        navigator.clipboard.writeText(recoveryKeys.join('\n'));
        toast({ title: "Copied to Clipboard" });
    };

    if (isUserLoading || profileLoading || legacyLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    const isMaster = user?.email?.toLowerCase().trim() === MASTER_OWNER_EMAIL;

    if (!isMaster && userProfile?.role !== 'owner') {
        return (
            <div className="flex h-screen items-center justify-center p-8 bg-slate-950">
                <Card className="max-w-lg border-destructive bg-slate-900 text-white shadow-2xl">
                    <CardHeader className="text-center">
                        <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4 animate-pulse" />
                        <CardTitle className="text-3xl font-black uppercase tracking-tighter text-destructive">UNAUTHORIZED PROTOCOL</CardTitle>
                        <CardDescription className="text-slate-400 font-bold">Access strictly forbidden for non-owner accounts.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const selectedSuccessor = staffMembers?.find(m => m.id === successorId);

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-slate-900 dark:text-white">
                        <Fingerprint className="h-10 w-10 text-destructive" />
                        Owner Legacy Vault
                    </h1>
                    <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-[0.2em]">Platform Succession & Zero-Knowledge Instruction Vault</p>
                </div>
                <div className="flex gap-2 no-print">
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 font-bold uppercase text-[10px]">
                        <Printer className="h-4 w-4" /> Print Protocol
                    </Button>
                    <Button onClick={handleSaveVault} disabled={isSaving || !isVaultUnlocked} className="shadow-lg font-black uppercase text-xs px-8">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Encrypted Vault
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="owner" className="space-y-8">
                <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 h-12 w-full max-w-md border shadow-sm">
                    <TabsTrigger value="owner" className="flex-1 font-bold uppercase text-[10px] tracking-widest">
                        Owner Console
                    </TabsTrigger>
                    <TabsTrigger value="protocol" className="flex-1 font-bold uppercase text-[10px] tracking-widest">
                        Successor Protocol Preview
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="owner" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <Card className={cn(
                                "border-2 transition-all duration-500 shadow-xl",
                                isVaultUnlocked ? "border-green-500 bg-green-50/10" : "border-amber-500 bg-amber-50/10"
                            )}>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {isVaultUnlocked ? <Unlock className="text-green-500" /> : <Lock className="text-amber-500" />}
                                            Passphrase-Locked Encryption
                                        </CardTitle>
                                        <CardDescription>
                                            Enter your master key to unlock or update your secure instructions.
                                        </CardDescription>
                                    </div>
                                    <Badge variant={isVaultUnlocked ? "default" : "outline"} className={isVaultUnlocked ? "bg-green-600 text-white" : "border-amber-500 text-amber-600"}>
                                        {isVaultUnlocked ? "UNLOCKED" : "LOCKED"}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <Input 
                                                type={showPassphrase ? "text" : "password"}
                                                placeholder="Enter Master Key..." 
                                                value={passphrase}
                                                onChange={(e) => setPassphrase(e.target.value)}
                                                className="h-12 border-2 font-mono"
                                            />
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                                onClick={() => setShowPassphrase(!showPassphrase)}
                                            >
                                                {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        <Button size="lg" onClick={handleUnlockVault} className="px-8 font-black uppercase text-xs" disabled={isVaultUnlocked && !!passphrase}>
                                            Unlock Vault
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2">
                                <CardHeader className="bg-muted/30">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        1. Designation of Successor
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Designated Staff Successor</Label>
                                            <Select value={successorId} onValueChange={setSuccessorId}>
                                                <SelectTrigger className="h-12 border-2">
                                                    <SelectValue placeholder="Choose trusted member..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {staffMembers?.map(member => (
                                                        <SelectItem key={member.id} value={member.id}>
                                                            {member.name} ({member.title || member.role})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Inactivity Threshold (Months)</Label>
                                            <Select value={inactivityMonths} onValueChange={setInactivityMonths}>
                                                <SelectTrigger className="h-12 border-2">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="3">3 Months</SelectItem>
                                                    <SelectItem value="6">6 Months</SelectItem>
                                                    <SelectItem value="12">12 Months</SelectItem>
                                                    <SelectItem value="24">24 Months</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {selectedSuccessor && (
                                        <Alert className="bg-primary/5 border-primary/20">
                                            <UserCircle className="h-4 w-4 text-primary" />
                                            <AlertTitle className="text-xs font-black uppercase">Confirmed Heir</AlertTitle>
                                            <AlertDescription className="text-xs">
                                                <strong>{selectedSuccessor.name}</strong> will be granted access to the Legacy Handover protocol if you are inactive for <strong>{inactivityMonths} months</strong>.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-2">
                                <CardHeader className="bg-muted/30">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <PenTool className="h-5 w-5 text-primary" />
                                        2. Founder's Message (Easter Egg)
                                    </CardTitle>
                                    <CardDescription>A personal note that appears in the footer for the staff once the protocol triggers.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">The Handover Note</Label>
                                        <Textarea 
                                            value={foundersMessage}
                                            onChange={(e) => setFoundersMessage(e.target.value)}
                                            placeholder="Write your final words to the team..."
                                            className="min-h-[150px] border-2 italic"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2">
                                <CardHeader className="bg-muted/30">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        3. Master Instructions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {!isVaultUnlocked ? (
                                        <div className="p-20 text-center border-2 border-dashed rounded-xl bg-muted/20">
                                            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                            <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Zero-Knowledge Container</p>
                                            <p className="text-[10px] text-muted-foreground mt-2 italic">Unlock the vault to view your encrypted instructions.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in zoom-in-95">
                                            <Label className="text-xs uppercase font-bold text-primary">Succession Payload</Label>
                                            <Textarea 
                                                value={vaultContent}
                                                onChange={(e) => setVaultContent(e.target.value)}
                                                placeholder="Enter master account credentials, Stripe keys, and legal intent..."
                                                className="min-h-[400px] font-mono text-sm leading-relaxed border-2"
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-8">
                            <Card className="border-2 border-primary/20 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Key className="h-4 w-4" />
                                        Recovery Keys
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!isVaultUnlocked ? (
                                        <div className="text-center py-8 bg-muted/30 rounded border border-dashed opacity-50">
                                            <Lock className="h-6 w-6 mx-auto mb-2 opacity-20" />
                                            <span className="text-[9px] font-black uppercase">Keys Encrypted</span>
                                        </div>
                                    ) : recoveryKeys.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="p-3 bg-muted rounded-lg font-mono text-[9px] leading-relaxed border space-y-1">
                                                {recoveryKeys.map((k, i) => <p key={i}>{k}</p>)}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={handleCopyKeys} className="flex-1 text-[10px] uppercase font-black"><Copy className="h-3 w-3 mr-1" /> Copy</Button>
                                                <Button variant="outline" size="sm" onClick={handleGenerateKeys} className="flex-1 text-[10px] uppercase font-black text-destructive"><Trash2 className="h-3 w-3 mr-1" /> Reset</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button onClick={handleGenerateKeys} disabled={isGeneratingKeys} className="w-full h-12">
                                            {isGeneratingKeys ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                                            Generate 8 Recovery Keys
                                        </Button>
                                    )}
                                    <p className="text-[10px] text-muted-foreground italic leading-tight text-center px-4">
                                        These 8 keys are required for manual handover. Successor needs at least 2.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-dashed bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Protocol Simulation & Testing
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-background rounded-lg border shadow-sm">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="debug-egg" className="text-sm font-bold">Force Reveal Founder's Message</Label>
                                            <p className="text-[10px] text-muted-foreground uppercase">Enable this to see the Easter Egg in the footer immediately.</p>
                                        </div>
                                        <Switch 
                                            id="debug-egg" 
                                            checked={debugShowEasterEgg} 
                                            onCheckedChange={setDebugShowEasterEgg} 
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic leading-tight text-center">
                                        This setting is only accessible to you, the Platform Owner.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-amber-50 border-amber-200">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <Info className="h-6 w-6 text-amber-600" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-tighter text-amber-800">Final Verification</p>
                                        <p className="text-[11px] text-amber-700 leading-tight">These protocols are legally binding within the digital infrastructure of Local Pulse.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="protocol" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-3">
                            {previewStep === 'instructions' && (
                                <Card className="border-2 shadow-2xl overflow-hidden">
                                    <CardHeader className="bg-slate-900 text-white p-8">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-primary flex items-center gap-3">
                                            <ShieldCheck className="h-8 w-8" />
                                            Successor Handover Checklist
                                        </h2>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        <div className="space-y-12 pl-6 border-l-2 border-primary/30 relative">
                                            <div className="relative">
                                                <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />
                                                <div className="space-y-2">
                                                    <Badge variant="secondary" className="bg-primary/10 text-primary text-[9px] uppercase font-black tracking-widest">Step 01: Watch Period</Badge>
                                                    <h3 className="text-lg font-bold">Inactivity Verification</h3>
                                                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                                                        The system has monitored the Owner's activity and no longer has a login recorded for {inactivityMonths} months. This hidden recovery terminal is enabled for <strong>{selectedSuccessor?.name || "[SUCCESSOR]"}</strong>.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-amber-500 ring-4 ring-background" />
                                                <div className="space-y-2">
                                                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 text-[9px] uppercase font-black tracking-widest">Step 02: Verification</Badge>
                                                    <h3 className="text-lg font-bold">Manual 2-Key Security Gate</h3>
                                                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                                                        As the successor, you must retrieve the physical recovery shards from your legal estate. They are required; you will have to enter at least <strong>two unique Keys</strong> and your <strong>own password</strong> to prove your identity and intent.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-destructive ring-4 ring-background" />
                                                <div className="space-y-2">
                                                    <Badge variant="secondary" className="bg-red-500/10 text-red-500 text-[9px] uppercase font-black tracking-widest">Step 03: Control</Badge>
                                                    <h3 className="text-lg font-bold">Full Authority Handover</h3>
                                                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                                                        Upon successful key verification, you, the successor, will instantly be promoted to the new Platform Owner. You will gain immediate access to the encrypted instructions and all platform financials.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/30 p-8 border-t flex flex-col items-center gap-4">
                                        <p className="text-sm font-bold text-center">If you agree to these terms and are ready to proceed with the legal assumption of control, click "Next".</p>
                                        <Button size="lg" className="w-full h-14 text-lg font-black uppercase tracking-tighter gap-2 shadow-md" onClick={() => setPreviewStep('authentication')}>
                                            Next <ArrowRight className="h-5 w-5" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}

                            {previewStep === 'authentication' && (
                                <Card className="border-2 shadow-xl animate-in zoom-in-95 duration-500">
                                    <CardHeader className="bg-muted/30 border-b">
                                        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-slate-900">
                                            <Gavel className="h-6 w-6 text-primary" />
                                            Manual Role Handover Gate (Simulation)
                                        </CardTitle>
                                        <CardDescription>This is where the successor enters the security tokens from your legal will.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-8">
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                                <Lock className="h-3 w-3" />
                                                1. Master Passphrase from Will
                                            </Label>
                                            <Input type="password" placeholder="Enter passphrase for simulation..." className="h-12 border-2" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                                    <Key className="h-3 w-3" />
                                                    2. Recovery Key Alpha
                                                </Label>
                                                <Input placeholder="XXXXXXXX-XXXXXXXX" className="h-14 border-2 font-mono text-center text-lg tracking-[0.2em]" />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                                    <Key className="h-3 w-3" />
                                                    3. Recovery Key Beta
                                                </Label>
                                                <Input placeholder="XXXXXXXX-XXXXXXXX" className="h-14 border-2 font-mono text-center text-lg tracking-[0.2em]" />
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-4">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                                <UserCircle className="h-3 w-3" />
                                                4. Successor Personal Password
                                            </Label>
                                            <Input type="password" placeholder="••••••••••••" className="h-12 border-2" />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50 dark:bg-slate-900/50 p-8 border-t flex flex-col gap-4">
                                        <Button onClick={() => setPreviewStep('revealed')} className="w-full h-16 text-xl font-black uppercase tracking-tighter shadow-xl">
                                            Verify & Open Master Instructions
                                        </Button>
                                        <Button variant="ghost" onClick={() => setPreviewStep('instructions')} className="text-xs uppercase font-bold tracking-widest opacity-50">Back to Step 1</Button>
                                    </CardFooter>
                                </Card>
                            )}

                            {previewStep === 'revealed' && (
                                <Card className="border-2 border-green-500 shadow-2xl bg-green-50/5 animate-in slide-in-from-right-4 duration-700">
                                    <CardHeader className="bg-green-600 text-white p-6">
                                        <CardTitle className="text-xl font-black uppercase flex items-center gap-3">
                                            <FileText className="h-6 w-6" />
                                            Decrypted Master Instructions (Simulation)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        <div className="prose dark:prose-invert max-w-none text-foreground font-mono text-sm leading-relaxed bg-white dark:bg-black p-8 rounded-xl border-2 border-dashed whitespace-pre-wrap">
                                            {vaultContent || "[Your private instructions would be revealed here after decryption...]"}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-900 p-10 flex flex-col gap-6 text-white border-t-2 border-green-500">
                                        <div className="space-y-2 text-center">
                                            <h3 className="text-lg font-black uppercase tracking-tighter text-primary">Final Assumption of Authority</h3>
                                            <p className="text-sm text-slate-400">By clicking the button below, you officially accept full commercial and administrative responsibility for the Community Hub platform as the new Platform Owner.</p>
                                        </div>
                                        <Button size="lg" className="w-full h-20 text-2xl font-black uppercase tracking-tighter bg-primary text-white shadow-[0_0_50px_rgba(var(--primary),0.3)] animate-pulse" onClick={() => { toast({ title: "Simulation Complete" }); setPreviewStep('instructions'); }}>
                                            <ShieldCheck className="mr-3 h-8 w-8" />
                                            Accept Responsibility for the Community APP
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}
                        </div>

                        <aside className="space-y-6">
                            <Card className="border-2 border-primary/20">
                                <CardHeader className="bg-primary/5 pb-3 text-center">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Handover Node</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold uppercase text-muted-foreground">Active Heir</p>
                                        <p className="text-sm font-black truncate">{selectedSuccessor?.name || "UNASSIGNED"}</p>
                                    </div>
                                    <Separator />
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold uppercase text-muted-foreground">Auth Protocol</p>
                                        <p className="text-sm font-black">Manual 2 Keys plus your password</p>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-dashed space-y-4">
                                <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4 text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Preview Mode</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                                    This tab provides a safe simulation of the successor's experience. Use it to verify that your instructions and protocol are clear.
                                </p>
                            </div>
                        </aside>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
