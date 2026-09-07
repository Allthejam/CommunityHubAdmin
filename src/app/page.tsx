'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword, sendEmailVerification, signOut as firebaseSignOut } from 'firebase/auth';
import { Eye, EyeOff, Loader2, Megaphone, ShieldAlert, Lock, ShieldCheck, Code, User, Info, AlertTriangle, ArrowRight, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { type Announcement } from '@/lib/announcement-data';
import { AnnouncementBanners } from '@/components/announcement-banners';
import { Logo } from '@/components/icons';
import { cn } from "@/lib/utils";

const MASTER_OWNER_EMAIL = 'allan_jamieson@outlook.com';

function SignInForm() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const emailParam = searchParams.get('email');
  const isDevMode = searchParams.get('dev') === 'true';
  
  const [email, setEmail] = useState(emailParam || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isUnauthorizedAttempt, setIsUnauthorizedAttempt] = useState(false);

  // SECURITY PROTOCOL: Explicit Authorization Check
  const isAuthorized = !!emailParam || isDevMode;
  const isEmailLocked = !!emailParam;

  const userProfileRef = useMemoFirebase(() => (user ? doc(db!, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const loginAnnouncementsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
        collection(db, "announcements"),
        where("scope", "==", "platform"),
        where("status", "==", "Live"),
        where("showOnLoginPage", "==", true)
    );
  }, [db]);

  const { data: loginAnnouncementsData } = useCollection<Announcement>(loginAnnouncementsQuery);

  const filteredAnnouncements = useMemo(() => {
    if (!loginAnnouncementsData) return [];
    return loginAnnouncementsData.filter(ann => ann.audience === 'All Users' || (typeof ann.audience === 'object' && ann.audience.type === 'all'));
  }, [loginAnnouncementsData]);

  const hasAnnouncements = filteredAnnouncements.length > 0;

  useEffect(() => {
    setInitialized(true);
  }, []);

  /**
   * SECURITY ENFORCEMENT EFFECT
   * Monitors the auth state and ensures whitelisting is respected.
   */
  useEffect(() => {
    const handleLoginRedirect = async () => {
      if (!isUserLoading && user && db) {
        
        if (profileLoading) return;

        // 1. MASTER & OWNER BYPASS
        const normalizedEmail = user.email?.toLowerCase().trim();
        const isMaster = normalizedEmail === MASTER_OWNER_EMAIL;
        const isOwner = (userProfile?.role || '').toLowerCase() === 'owner' || isMaster;

        if (isOwner) {
            window.location.href = '/admin/dashboard';
            return;
        }

        // 2. STAFF WHITELIST CHECK
        const authLoginId = normalizedEmail?.replace(/[^a-z0-9]/g, '_');
        if (!authLoginId) return;

        const authDocRef = doc(db, 'authorized_logins', authLoginId);
        const authDocSnap = await getDoc(authDocRef);

        if (!authDocSnap.exists() || authDocSnap.data()?.status !== 'active') {
            setError("Unauthorized Session: Your account is not whitelisted for administrative access.");
            setIsUnauthorizedAttempt(true);
            if (auth) {
                await firebaseSignOut(auth);
            }
            return;
        }

        // 3. AUTHORIZED REDIRECTS
        if (user.emailVerified || isOwner) {
          const role = (userProfile?.role || '').toLowerCase();
          const title = (userProfile?.title || '').toLowerCase();

          const isAdmin = role === 'admin' || 
                          role === 'administrator' ||
                          role === 'moderator' ||
                          role === 'support' ||
                          role === 'finance' ||
                          role === 'investigator' ||
                          role === 'accountant' ||
                          role === 'support-specialist' ||
                          title.includes('platform');

          if (isAdmin) {
            window.location.href = '/admin/dashboard';
            return;
          }

          if (role === 'leader' || role === 'president') {
            window.location.href = '/leader/dashboard';
            return;
          }

          window.location.href = '/home';
        }
      }
    };
    handleLoginRedirect();
  }, [user, isUserLoading, userProfile, profileLoading, router, db, auth]);

  const handleResendVerification = async () => {
    if (!auth || !email || !password) {
        toast({ title: "Error", description: "Email and password are required.", variant: "destructive" });
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        const userToVerify = userCredential.user;

        if (userToVerify) {
            await sendEmailVerification(userToVerify);
            toast({
                title: "Verification Email Sent",
                description: "Please check your inbox.",
            });
            await firebaseSignOut(auth);
            setShowResend(false);
        }
    } catch (error: any) {
        toast({
            title: "Error Sending Email",
            description: "Could not send verification email.",
            variant: "destructive",
        });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);
    setShowResend(false);
    setIsUnauthorizedAttempt(false);
    setLoading(true);

    if (!auth || !db) {
      setError('Authentication service is not available.');
      setLoading(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // 1. Initial Handshake
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const signedInUser = userCredential.user;

      // 2. Fetch Profile immediately to check role
      let profileData: any = null;
      try {
        const profileSnap = await getDoc(doc(db, 'users', signedInUser.uid));
        profileData = profileSnap.data();
      } catch (profileErr) {
        console.warn("Could not fetch user profile immediately:", profileErr);
      }

      // 3. SECURE GATE: Owners bypass whitelist.
      const isMaster = normalizedEmail === MASTER_OWNER_EMAIL;
      const isOwner = isMaster || (profileData?.role || '').toLowerCase() === 'owner';
      
      if (!isOwner) {
          const authLoginId = normalizedEmail.replace(/[^a-z0-9]/g, '_');
          const authDocRef = doc(db, 'authorized_logins', authLoginId);
          const authDocSnap = await getDoc(authDocRef);

          if (!authDocSnap.exists() || authDocSnap.data()?.status !== 'active') {
              setError("System Enforcement: Access Denied. Your account is not on the administrative whitelist.");
              setIsUnauthorizedAttempt(true);
              await firebaseSignOut(auth);
              setLoading(false);
              return;
          }
      }

      if (!signedInUser.emailVerified && !isOwner) {
        setError("Please verify your email before logging in.");
        setShowResend(true);
        await firebaseSignOut(auth);
        setLoading(false);
        return;
      }

      // 4. Immediate redirection upon verified credentials
      const role = (profileData?.role || '').toLowerCase();
      const title = (profileData?.title || '').toLowerCase();
      const isAdmin = isOwner ||
                      role === 'admin' || 
                      role === 'administrator' ||
                      role === 'moderator' ||
                      role === 'support' ||
                      role === 'finance' ||
                      role === 'investigator' ||
                      role === 'accountant' ||
                      role === 'support-specialist' ||
                      title.includes('platform');

      if (isAdmin) {
        window.location.href = '/admin/dashboard';
        return;
      }

      if (role === 'leader' || role === 'president') {
        window.location.href = '/leader/dashboard';
        return;
      }

      window.location.href = '/admin/dashboard';
      
    } catch (e: any) {
      console.error("Sign-in error:", e);
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Security Error: Invalid credentials.');
      } else {
        setError(e.message || "Sign-in failed. Please ensure you are initiating from the main application.");
      }
      setLoading(false);
    }
  };

  if (isUserLoading || !initialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <Card className="w-full max-w-lg border-red-500/20 bg-slate-900 text-white shadow-2xl">
          <CardHeader className="items-center text-center">
            <div className="mb-6 p-4 rounded-full bg-red-500/10 ring-2 ring-red-500/20">
              <ShieldAlert className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-3xl font-black uppercase tracking-tighter">Access Restricted</CardTitle>
            <CardDescription className="text-red-400 font-medium">Administrative Handshake Required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="p-4 rounded-lg bg-black/40 border border-white/5 space-y-4">
              <div className="flex justify-center">
                 <Lock className="h-8 w-8 text-white/20" />
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Direct entry to this console is restricted. This terminal only accepts verified sessions initiated from the primary application.
              </p>
              <div className="pt-2">
                 <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Protocol: Direct Entry Prohibited</p>
                 <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Action: Authentication Gate Locked</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button asChild className="w-full h-12 font-black uppercase tracking-widest bg-white text-black hover:bg-slate-200 border-0">
              <a href={process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://www.my-community-hub.co.uk"}>
                Return to Primary Hub
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 text-slate-900">
      <div className="w-full max-w-md space-y-6">
        <Card className="shadow-xl border-primary/20">
            <CardHeader className="items-center text-center">
                <div className="mb-4">
                    <Logo className="h-16 w-16" />
                </div>
                <CardTitle className="text-2xl font-headline uppercase tracking-tight">Backend Access</CardTitle>
                <CardDescription>
                Community Hub Admin & Leadership Hub
                </CardDescription>
                {hasAnnouncements && (
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="text-sm mt-2">
                                <Megaphone className="mr-2 h-4 w-4" />
                                View Platform Announcements
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                             <DialogHeader>
                                <DialogTitle>Platform Announcements</DialogTitle>
                            </DialogHeader>
                             <div className="py-4">
                                <AnnouncementBanners allAnnouncements={filteredAnnouncements} />
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            
            <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                    {isDevMode && (
                        <Alert className="mb-4 border-amber-200 bg-amber-50">
                            <Code className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800 text-xs font-bold uppercase">Developer Override</AlertTitle>
                            <AlertDescription className="text-amber-700 text-[10px]">
                                Whitelist enforcement remains active. Ensure your test email is pre-authorized.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                            {isEmailLocked ? "Authorized Identity" : "Login Email"}
                            <User className="h-3 w-3" />
                        </Label>
                        
                        <div className="relative">
                            <Input
                                type="email"
                                required
                                placeholder="Enter email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isEmailLocked}
                                className={cn(
                                    "h-12 pr-10", 
                                    isEmailLocked && "bg-muted/50 border-primary/20 opacity-100 text-muted-foreground cursor-not-allowed",
                                )}
                            />
                            {isEmailLocked && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />}
                        </div>
                        {isEmailLocked && <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Handshake Successful: Identity Locked</p>}
                    </div>
                    
                    <div className="space-y-2 pt-2">
                        <Label htmlFor="password">Security Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                placeholder="Enter backend password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pr-10 h-12"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(!!checked)} />
                        <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">Stay signed in on this terminal</Label>
                    </div>
                    
                    {error && (
                        <div className={cn(
                            "text-sm font-medium p-4 rounded-lg border mt-4 space-y-3",
                            isUnauthorizedAttempt ? "bg-red-50 border-red-200 text-red-900" : "bg-destructive/10 border-destructive/20 text-destructive"
                        )}>
                            <div className="flex items-start gap-2">
                                {isUnauthorizedAttempt ? <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0 text-red-600" /> : <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />}
                                <div className="space-y-3">
                                    <p className="font-bold">{error}</p>
                                    {isUnauthorizedAttempt && (
                                        <Button asChild variant="destructive" size="sm" className="w-full uppercase font-black tracking-widest text-[10px]">
                                            <a href={process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://www.my-community-hub.co.uk"}>
                                                <Home className="mr-2 h-3 w-3" />
                                                Return to Main App
                                            </a>
                                        </Button>
                                    )}
                                    {showResend && (
                                        <Button type="button" variant="link" className="p-0 h-auto text-destructive text-sm" onClick={handleResendVerification}>
                                            Resend verification link.
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                {!isUnauthorizedAttempt && (
                    <CardFooter className="flex flex-col gap-4">
                        <Button type="submit" className="w-full h-12 font-black uppercase tracking-widest shadow-md" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            AUTHENTICATE
                        </Button>
                    </CardFooter>
                )}
            </form>
        </Card>
        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
            Secure Backend Access &bull; Whitelist Enforcement Active
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
