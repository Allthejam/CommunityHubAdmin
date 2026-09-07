'use client';

import React, { useState, useEffect } from 'react';
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
  Newspaper,
  Siren,
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


const reporterNavItems = [
  { href: '/reporter/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leader/news', label: 'News Management', icon: Newspaper },
];

const accountTypeIcons = {
    personal: User,
    business: Briefcase,
    leader: Users,
    president: Crown,
    enterprise: Building,
    advertiser: Star,
    admin: LayoutDashboard,
    owner: LayoutDashboard
}


export default function ReporterHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isClient, setIsClient] = React.useState(false);
  const { toast } = useToast();
  
  const [visitedCommunityId, setVisitedCommunityId] = useState<string | null>(null);


  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

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


  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    window.location.href = 'https://www.my-community-hub.co.uk';
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'CH';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const CurrentAccountIcon = userProfile?.role ? accountTypeIcons[userProfile.role as keyof typeof accountTypeIcons] || User : User;
  const isVisiting = userProfile && userProfile.communityId !== userProfile.homeCommunityId;

  return (
    <header className="sticky top-0 z-30 flex h-auto min-h-16 flex-col justify-center border-b bg-card px-4 sm:px-6">
      <div className="flex w-full items-center gap-4">
        <MobileNav menuItems={reporterNavItems} />
        
        <Link href="/reporter/dashboard" className="mr-4 flex items-center gap-2 text-lg font-bold shrink-0">
            <Logo className="h-8 w-8" />
            <span className="text-primary hidden sm:inline-block">Reporter Panel</span>
        </Link>
        
        <div className="flex w-full items-center">
            <nav className="hidden w-full flex-1 md:flex">
                <div className="flex w-full items-center justify-center gap-1 flex-wrap">
                    {reporterNavItems.map((item) => (
                    <Button
                        key={item.href}
                        variant="ghost"
                        asChild
                        size="sm"
                        className={cn(
                        'justify-start text-xs',
                        pathname === item.href &&
                            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                        )}
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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                                <AvatarFallback>{userProfile ? getInitials(userProfile.name) : '...'}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            {isUserLoading || profileLoading ? (
                                <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">Loading...</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    Please wait
                                </p>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                </div>
                            )}
                        </DropdownMenuLabel>
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
                        {userProfile?.settings?.hasBroadcastAccess && (
                            <DropdownMenuItem asChild>
                                <Link href="/broadcast">
                                    <Siren className="mr-2 h-4 w-4 text-destructive" />
                                    <span>Broadcast System</span>
                                </Link>
                            </DropdownMenuItem>
                        )}
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
            )}
            </div>
        </div>
      </div>
    </header>
  );
}