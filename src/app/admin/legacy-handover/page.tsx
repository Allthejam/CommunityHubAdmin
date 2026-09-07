'use client';

import * as React from 'react';
import { 
    Fingerprint, 
    ShieldAlert, 
    Lock, 
    Loader2, 
    Gavel, 
    ShieldCheck, 
    Key,
    Siren,
    ArrowRight,
    FileText,
    CheckCircle2,
    Unlock,
    UserCircle,
    Info,
    PenTool,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { verifyLegacyCredentialsAction, finalizeLegacyHandoverAction } from '@/lib/actions/teamActions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import CryptoJS from 'crypto-js';

type HandoverStep = 'instructions' | 'authentication' | 'revealed';

export default function LegacyHandoverPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [step, setStep] = React.useState<HandoverStep>('instructions');
    const [vaultPassphrase, setVaultPassphrase] = React.useState("");
    const [key1, setKey1] = React.useState("");
    const [key2, setKey2] = React.useState("");
    const [personalPassword, setPersonalPassword] = React.useState("");
    const [decryptedInstructions, setDecryptedInstructions] = React.useState("");
    const [foundersMessage, setFoundersMessage] = React.useState("");
    const [isProcessing, setIsProcessing] = React.useState(false);

    // Load Handover Config
    const legacyRef = useMemoFirebase(() => db ? doc(db, 'owner_legacy', 'settings') : null, [db]);
    const { data: legacyData, isLoading: legacyLoading } = useDoc<any>(legacyRef);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !legacyData) return;
        
        if (!vaultPassphrase || !key1 || !key2 || !personalPassword) {
            toast({ 
                title: "Credentials Required", 
                description: "All security fields are mandatory for forensic recovery.", 
                variant: 'destructive' 
            });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await verifyLegacyCredentialsAction({
                userId: user.uid,
                key1: key1.trim().toUpperCase(),
                key2: key2.trim().toUpperCase(),
                personalPassword
            });

            if (result.success && result.vaultContent) {
                try {
                    const decrypted = CryptoJS.AES.decrypt(result.vaultContent, vaultPassphrase).toString(CryptoJS.enc.Utf8);
                    if (!decrypted) throw new Error("Invalid Master Passphrase");
                    
                    setDecryptedInstructions(decrypted);
                    setFoundersMessage(legacyData.foundersMessage || "");
                    setStep('revealed');
                    toast({ title: "Verification Successful", description: "Master Instructions Decrypted." });
                } catch (e) {
                    throw new Error("The Master Passphrase from the will is incorrect for this vault.");
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Access Denied", description: error.message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFinalize = async () => {
        if (!user) return;
        setIsProcessing(true);
        try {
            const result = await finalizeLegacyHandoverAction({ userId: user.uid });
            if (result.success) {
                toast({ title: "Sovereignty Established", description: "You are now the Platform Owner." });
                router.push('/admin/dashboard');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Promotion Failed", description: error.message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isUserLoading || legacyLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    // AUTH CHECK: Must be the designated successor
    if (!legacyData || legacyData.successorId !== user?.uid) {
        return (
            <div className="flex h-screen items-center justify-center p-8 bg-slate-950">
                <Card className="max-w-md text-center border-destructive bg-slate-900 text-white shadow-2xl">
                    <CardHeader>
                        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-2" />
                        <CardTitle className="uppercase tracking-tighter">Access Forbidden</CardTitle>
                        <CardDescription className="text-slate-400">You are not the designated heir for this protocol.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" className="text-white border-white/20">
                            <a href="https://www.my-community-hub.co.uk">Return to Public Hub</a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
            <div className="text-center space-y-2">
                <Siren className="h-16 w-16 text-destructive mx-auto mb-4 animate-pulse" />
                <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Manual Account Recovery</h1>
                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-[0.2em]">Emergency Authority Transfer Protocol</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    
                    {step === 'instructions' && (
                        <Card className="border-2 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                                                The system has monitored the Owner's activity and no longer has a login recorded for <strong>{legacyData.inactivityMonths || 6} months</strong>. This hidden recovery terminal is enabled for you.
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
                                <Button size="lg" className="w-full h-14 text-lg font-black uppercase tracking-tighter gap-2 shadow-md" onClick={() => setStep('authentication')}>
                                    Next <ArrowRight className="h-5 w-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {step === 'authentication' && (
                        <Card className="border-2 shadow-xl animate-in zoom-in-95 duration-500">
                            <CardHeader className="bg-muted/30 border-b">
                                <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Gavel className="h-6 w-6 text-primary" />
                                    Manual Role Handover
                                </CardTitle>
                                <CardDescription>Enter the physical security tokens provided in the owner's legal will.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                        <Lock className="h-3 w-3" />
                                        1. Master Passphrase from Will
                                    </Label>
                                    <Input 
                                        type="password"
                                        placeholder="Enter the master encryption key..." 
                                        value={vaultPassphrase} 
                                        onChange={e => setVaultPassphrase(e.target.value)}
                                        className="h-12 border-2"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                            <Key className="h-3 w-3" />
                                            2. Recovery Key Alpha
                                        </Label>
                                        <Input 
                                            placeholder="XXXXXXXX-XXXXXXXX" 
                                            value={key1} 
                                            onChange={e => setKey1(e.target.value.toUpperCase())} 
                                            className="h-14 border-2 font-mono text-center uppercase text-lg tracking-[0.2em] bg-muted/20"
                                            maxLength={17}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                            <Key className="h-3 w-3" />
                                            3. Recovery Key Beta
                                        </Label>
                                        <Input 
                                            placeholder="XXXXXXXX-XXXXXXXX" 
                                            value={key2} 
                                            onChange={e => setKey2(e.target.value.toUpperCase())} 
                                            className="h-14 border-2 font-mono text-center uppercase text-lg tracking-[0.2em] bg-muted/20"
                                            maxLength={17}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                        <UserCircle className="h-3 w-3" />
                                        4. Confirm Your Personal Password
                                    </Label>
                                    <Input 
                                        type="password" 
                                        placeholder="Re-authenticate with your account password..." 
                                        value={personalPassword}
                                        onChange={e => setPersonalPassword(e.target.value)}
                                        className="h-12 border-2"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 p-8 border-t flex flex-col gap-4">
                                <Button 
                                    onClick={handleVerify} 
                                    disabled={isProcessing || !vaultPassphrase || key1.length < 17 || key2.length < 17 || !personalPassword} 
                                    className="w-full h-16 text-xl font-black uppercase tracking-tighter shadow-2xl"
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Unlock className="mr-2 h-6 w-6" />}
                                    Verify & Open Master Instructions
                                </Button>
                                <Button variant="ghost" onClick={() => setStep('instructions')} className="text-xs uppercase font-bold tracking-widest opacity-50">Back to Checklist</Button>
                            </CardFooter>
                        </Card>
                    )}

                    {step === 'revealed' && (
                        <Card className="border-2 border-green-500 shadow-2xl bg-green-50/5 animate-in slide-in-from-right-4 duration-700">
                            <CardHeader className="bg-green-600 text-white p-6">
                                <CardTitle className="text-xl font-black uppercase flex items-center gap-3">
                                    <FileText className="h-6 w-6" />
                                    Decrypted Master Instructions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-12">
                                <section className="space-y-4">
                                    <h3 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2 border-b pb-2">
                                        <PenTool className="h-4 w-4" />
                                        Final Message from the Founder
                                    </h3>
                                    <div className="bg-amber-50/30 dark:bg-slate-950 p-8 rounded-2xl border-2 border-dashed font-serif italic text-lg leading-relaxed shadow-inner whitespace-pre-wrap">
                                        {foundersMessage || "Good luck, you've got this. The community is in your hands now."}
                                    </div>
                                </section>

                                <Separator />

                                <section className="space-y-4">
                                    <h3 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2 border-b pb-2">
                                        <Lock className="h-4 w-4" />
                                        Technical & Financial Instructions
                                    </h3>
                                    <div className="prose dark:prose-invert max-w-none text-foreground font-mono text-sm leading-relaxed bg-white dark:bg-black p-8 rounded-xl border-2 whitespace-pre-wrap">
                                        {decryptedInstructions}
                                    </div>
                                </section>
                            </CardContent>
                            <CardFooter className="bg-slate-900 p-10 flex flex-col gap-6 text-white border-t-2 border-green-500">
                                <div className="space-y-2 text-center">
                                    <h3 className="text-lg font-black uppercase tracking-tighter text-primary">Final Assumption of Authority</h3>
                                    <p className="text-sm text-slate-400">By clicking the button below, you officially accept full commercial and administrative responsibility for the Community Hub platform as the new Platform Owner.</p>
                                </div>
                                <Button 
                                    size="lg" 
                                    variant="default" 
                                    className="w-full h-20 text-2xl font-black uppercase tracking-tighter bg-primary hover:bg-primary/90 text-white shadow-[0_0_50px_rgba(var(--primary),0.3)] animate-pulse"
                                    onClick={handleFinalize}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 className="mr-3 h-8 w-8 animate-spin" /> : <ShieldCheck className="mr-3 h-8 w-8" />}
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
                                <p className="text-sm font-black truncate">{user?.displayName || "VERIFIED SUCCESSOR"}</p>
                            </div>
                            <Separator />
                            <div className="space-y-1">
                                <p className="text-[9px] font-bold uppercase text-muted-foreground">Auth Protocol</p>
                                <p className="text-sm font-black">Manual 2 Keys plus your password</p>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border space-y-4">
                        <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Support</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                            This terminal is part of the Platform Inheritance Protocol. If you are having trouble with recovery shards, refer to the physical legal documents provided by the previous owner.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
