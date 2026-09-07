'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  User,
  Bell,
  Menu,
  LogOut,
  Building,
  Briefcase,
  Users,
  Star,
  Megaphone,
  Calendar,
  GalleryHorizontal,
  CreditCard,
  Handshake,
  Building2,
  ShoppingCart,
  Eye,
  Map,
  Loader2,
  HomeIcon,
  Crown,
  ShieldAlert,
  Smartphone,
  Settings as SettingsIcon,
} from 'lucide-react';
import { signOut } from 'firebase/auth';

import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, collection, onSnapshot, query, where, getDoc } from 'firebase/firestore';
import { type Notification } from '@/lib/types/notifications';
import { Badge } from '../ui/badge';
import { MobileNav } from './mobile-nav';
import { Cart } from '../cart';
import { useCart } from '@/contexts/cart-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetTrigger } from '../ui/sheet';
import { CommunitySelector, type CommunitySelection } from '../community-selector';
import { useToast } from '@/hooks/use-toast';
import { updateUserCommunityAction, returnToHomeCommunityAction } from '@/lib/actions/userActions';
import { runAddCommunityToLeadership } from '@/lib/actions/teamActions';
import { isValid, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';


const navItems = [
  { href: '/enterprise/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/enterprise/groups', label: 'Groups', icon: Handshake },
  { href: '/enterprise/adverts', label: 'Adverts', icon: Megaphone },
  { href: '/enterprise/events', label: 'Events', icon: Calendar },
  { href: '/enterprise/gallery', label: 'Gallery', icon: GalleryHorizontal },
  { href: '/enterprise/billing', label: 'Billing', icon: CreditCard },
];

const accountTypeIcons = {
    personal: User,
    business: Briefcase,
    leader: Users,
    enterprise: Building,
    advertiser: Star,
    admin: LayoutDashboard
}

export default function EnterpriseHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isClient, setIsClient] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = React.useState(true);
  const { cartCount } = useCart();
  const [isCommunityDialogOpen, setIsCommunityDialogOpen] = useState(false);
  const [communitySelection, setCommunitySelection] = useState<CommunitySelection | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const { toast } = useToast();
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [visitedCommunityId, setVisitedCommunityId] = useState<string | null>(null);
  const isMobile = useIsMobile();


  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const visitedCommunityRef = useMemoFirebase(() => {
    if (!visitedCommunityId || !firestore) return null;
    return doc(firestore, 'communities', visitedCommunityId);
  }, [visitedCommunityId, firestore]);
  const { data: visitedCommunityData } = useDoc(visitedCommunityRef);


  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      setVisitedCommunityId(sessionStorage.getItem('visitedCommunityId') || userProfile?.communityId);
    } else {
      setVisitedCommunityId(userProfile?.communityId);
    }
  }, [userProfile?.communityId]);
  
  useEffect(() => {
    if (!user || !firestore) {
      setLoadingNotifications(false);
      return;
    }
    const q = query(collection(firestore, "notifications"), where("recipientId", "==", user.uid), where("status", "==", "new"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
        setLoadingNotifications(false);
    });
    return () => unsubscribe();
  }, [user, firestore]);


  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'CH';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const CurrentAccountIcon = userProfile?.accountType ? accountTypeIcons[userProfile.accountType as keyof typeof accountTypeIcons] || User : User;
  const isVisiting = userProfile && userProfile.communityId !== userProfile.homeCommunityId;
  const visitedCommunityHasNoLeader = isVisiting && visitedCommunityData?.leaderCount === 0;

  const handleCommunitySwitch = async () => {
    if (!communitySelection?.community || communitySelection.community === 'other' || !user) {
      toast({ title: 'No Community Selected', description: 'Please select a community to switch to.', variant: 'destructive' });
      return;
    }
    
    setIsSwitching(true);
    const result = await updateUserCommunityAction({ userId: user.uid, communityId: communitySelection.community });
    setIsSwitching(false);

    if (result.success && result.communityName) {
      setIsCommunityDialogOpen(false);
      sessionStorage.setItem('visitedCommunityId', communitySelection.community);
      sessionStorage.setItem('visitedCommunityName', result.communityName);
      toast({ title: 'Community Switched!', description: `You are now viewing the ${result.communityName} hub.` });
      window.location.reload();
    } else {
      toast({ title: 'Switch Failed', description: result.error || 'Could not switch communities.', variant: 'destructive' });
    }
  }

    const handleReturnHome = async () => {
    if (!user) return;

    setIsSwitching(true);
    const result = await returnToHomeCommunityAction({ userId: user.uid });
    setIsSwitching(false);

    if (result.success) {
      sessionStorage.removeItem('visitedCommunityId');
      sessionStorage.removeItem('visitedCommunityName');
      setVisitedCommunityId(null);
      toast({ title: 'Returned Home', description: `You are now back in your home community.` });
      window.location.reload();
    } else {
      toast({ title: "Error Returning Home", description: result.error, variant: 'destructive' });
    }
  }
  
  const handleClaimLeadership = async () => {
    if (!user || !visitedCommunityId) {
        toast({ title: "Error", description: "You must be logged in to claim a community.", variant: "destructive"});
        return;
    }
    setIsSwitching(true);
    const result = await runAddCommunityToLeadership({ userId: user.uid, communityId: visitedCommunityId });
    if (result.success) {
        toast({ title: "Congratulations!", description: "You are now the leader of this community. It is now available in your Leadership Hubs on your profile." });
        window.location.reload();
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsSwitching(false);
  }

  return (
    <header className="sticky top-0 z-30 flex h-auto min-h-16 flex-col justify-center border-b bg-card px-4 sm:px-6">
       {isClient && isVisiting && (
        <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-2 text-sm flex items-center justify-center gap-4">
          <p>
            You are currently visiting the <strong>{visitedCommunityData?.name || 'a community'}</strong> hub.
          </p>
          <div className="flex gap-2">
            {visitedCommunityHasNoLeader ? (
              <Button size="sm" onClick={handleClaimLeadership} disabled={isSwitching} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isSwitching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
                  Become the Leader
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="border-amber-300 dark:border-amber-700 bg-amber-200 dark:bg-amber-800/50 hover:bg-amber-300 dark:hover:bg-amber-800" onClick={handleReturnHome} disabled={isSwitching}>
                {isSwitching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HomeIcon className="mr-2 h-4 w-4" />}
                Return to Home
            </Button>
          </div>
        </div>
      )}
      <div className="flex w-full items-center gap-4">
        <MobileNav menuItems={navItems} />

        <div className="flex items-center gap-2 mr-4">
            <Link href="/enterprise/dashboard" className="flex items-center gap-2 font-semibold">
                <Logo className="h-6 w-6" />
                <span className="">Enterprise Dashboard</span>
            </Link>
        </div>

        <nav className="hidden w-full flex-1 md:flex">
            <div className="flex w-full items-center justify-center gap-1 flex-wrap">
                {navItems.map((item) => (
                <Button
                    key={item.href}
                    variant="ghost"
                    asChild
                    size="sm"
                    className={cn('justify-start text-xs', pathname === item.href && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground')}
                >
                    <Link href={item.href}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                    </Link>
                </Button>
                ))}
            </div>
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
            {isClient && (
                <>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                            <Bell className="h-5 w-5" />
                            {!loadingNotifications && notifications.length > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">{notifications.length}</Badge>}
                            <span className="sr-only">View notifications</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80" align="end">
                        <DropdownMenuItem asChild>
                            <Link href="/notifications" className="cursor-pointer w-full">
                                <DropdownMenuLabel>See All Notifications</DropdownMenuLabel>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={userProfile?.avatar} alt={userProfile?.name || 'User Avatar'} />
                                <AvatarFallback>{userProfile ? getInitials(userProfile.name) : '...'}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{userProfile?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Sheet>
                          <SheetTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  <span>My Basket</span>
                                  {cartCount > 0 && <Badge variant="secondary" className="ml-auto">{cartCount}</Badge>}
                              </DropdownMenuItem>
                          </SheetTrigger>
                          <Cart />
                        </Sheet>
                        <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                            <a href="https://www.my-community-hub.co.uk/home">
                                <Home className="mr-2 h-4 w-4" />
                                Public Home
                            </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <a href={user ? `https://www.my-community-hub.co.uk/profile/${user.uid}` : '#'}>
                                <User className="mr-2 h-4 w-4" />
                                <span>My Profile</span>
                            </a>
                        </DropdownMenuItem>
                        <Dialog open={isCommunityDialogOpen} onOpenChange={setIsCommunityDialogOpen}>
                            <DialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Map className="mr-2 h-4 w-4" />
                                    <span>Visit Another Community</span>
                                </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg grid-rows-[auto,minmax(0,1fr),auto] p-0 max-h-[90vh]">
                                <DialogHeader className="p-6 pb-0">
                                    <DialogTitle>Switch Community</DialogTitle>
                                    <DialogDescription>Select a new community to view its content.</DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="h-auto">
                                    <div className="p-6">
                                        <CommunitySelector 
                                            selection={communitySelection} 
                                            onSelectionChange={setCommunitySelection} 
                                            isLocationVerified={isLocationVerified} 
                                            onVerificationChange={setIsLocationVerified} 
                                            allowCreation={false}
                                        />
                                    </div>
                                </ScrollArea>
                                <DialogFooter className="p-6 pt-0 border-t">
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={handleCommunitySwitch} disabled={isSwitching || !communitySelection?.community || communitySelection.community === 'other'}>
                                        {isSwitching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Switch Community
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <DropdownMenuItem disabled>
                            <CurrentAccountIcon className="mr-2 h-4 w-4" />
                            <span className='capitalize'>{userProfile?.role || 'Personal'}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn(isVisiting && "cursor-not-allowed")}>
                                <DropdownMenuItem onClick={handleLogout} disabled={isVisiting}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                                </div>
                            </TooltipTrigger>
                            {isVisiting && (
                                <TooltipContent>
                                <p>Return to your home community before logging out.</p>
                                </TooltipContent>
                            )}
                            </Tooltip>
                        </TooltipProvider>
                    </DropdownMenuContent>
                </DropdownMenu>
                </>
            )}
        </div>
      </div>
    </header>
  );
}
