'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Briefcase,
  Search,
  Star,
  User,
  Users,
  Building,
  LayoutDashboard,
  Menu,
  ShoppingCart,
  Calendar,
  Tv,
  Newspaper,
  MessagesSquare,
  Heart,
  BookText,
  Building2,
  Map,
  Loader2,
  HomeIcon,
  Store,
  Tag,
  LogOut,
  ChevronDown,
  Home,
  ShieldAlert,
  Smartphone,
  Settings as SettingsIcon,
  Crown,
  ShieldCheck,
  Fingerprint,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, onSnapshot, getDoc } from 'firebase/firestore';

import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { MobileNav } from './mobile-nav';
import { Badge } from '../ui/badge';
import { Sheet, SheetTrigger } from '../ui/sheet';
import { Cart } from '../cart';
import { useCart } from '@/contexts/cart-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { type Notification } from '@/lib/types/notifications';
import { isValid, formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { CommunitySelector, type CommunitySelection } from '../community-selector';
import { useToast } from '@/hooks/use-toast';
import { updateUserCommunityAction, returnToHomeCommunityAction } from '@/lib/actions/userActions';
import { runAddCommunityToLeadership } from '@/lib/actions/teamActions';
import { ScrollArea } from '../ui/scroll-area';

const MASTER_OWNER_EMAIL = 'allan_jamieson@outlook.com';

const menuItems = [
  {
    href: '/home',
    label: 'Home',
    icon: LayoutDashboard,
  },
  {
    href: '/feed',
    label: 'Community Feed',
    icon: Newspaper,
  },
  {
    href: '/shopping',
    label: 'The High Street',
    icon: Store,
  },
  {
    href: '/events',
    label: 'Events',
    icon: Calendar,
  },
  {
    href: '/whatson',
    label: "What's On",
    icon: Tv,
  },
  {
    href: '/news',
    label: 'News',
    icon: Newspaper,
  },
  {
    href: '/directory',
    label: 'Business Listings',
    icon: Building2,
  },
  {
    href: '/chat',
    label: 'Community Chat',
    icon: MessagesSquare,
  },
];

const accountTypeIcons = {
    personal: User,
    business: Briefcase,
    leader: Users,
    enterprise: Building,
    advertiser: Star,
    admin: LayoutDashboard
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);
  const { cartCount } = useCart();
  const [currentTime, setCurrentTime] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc(userProfileRef);

  useEffect(() => {
    setIsClient(true);
    const updateCurrentTime = () => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    updateCurrentTime();
    const timer = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user || !firestore) {
      setLoadingNotifications(false);
      return;
    }

    const q = query(
      collection(firestore, "notifications"),
      where("recipientId", "==", user.uid),
      where("status", "==", "new")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      notifs.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          if (isValid(dateA) && isValid(dateB)) {
            return dateB.getTime() - dateA.getTime();
          }
          return 0;
      });
      setNotifications(notifs);
      setLoadingNotifications(false);
    }, (error) => {
      setLoadingNotifications(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    window.location.href = 'https://www.my-community-hub.co.uk';
  }

  const getInitials = (name: string | undefined) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const isOwner = React.useMemo(() => {
      if (!user) return false;
      const normalizedEmail = user.email?.toLowerCase().trim();
      return normalizedEmail === MASTER_OWNER_EMAIL || userProfile?.role?.toLowerCase() === 'owner';
  }, [user, userProfile]);

  const role = (userProfile?.role || '').toLowerCase();
  const showAdminDashboard = isOwner || role === 'admin' || userProfile?.permissions?.isAdmin;
  const showLeaderDashboard = isOwner || ['leader', 'president'].includes(role) || userProfile?.permissions?.actionImpersonateLeader;

  const CurrentAccountIcon = userProfile?.role ? accountTypeIcons[userProfile.role as keyof typeof accountTypeIcons] || User : User;

  return (
    <header className="sticky top-0 z-30 flex h-auto min-h-16 flex-col justify-center border-b bg-card">
      <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 py-2">
        <Link href="/home" className="flex items-center gap-2 font-bold text-lg mr-4">
            <Logo className="w-8 h-8" />
            <div className="flex items-baseline gap-2">
              <span className="text-primary hidden sm:inline-block">Admin Hub</span>
              {isClient && <p className="text-xs font-mono text-muted-foreground hidden lg:inline-block">{currentTime}</p>}
            </div>
        </Link>
        
        <nav className="hidden flex-1 md:flex items-center justify-center gap-2">
            {menuItems.map(item => (
                <Button key={item.href} variant="ghost" size="sm" asChild className={cn(pathname.startsWith(item.href) && "bg-accent text-accent-foreground")}>
                    <Link href={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                    </Link>
                </Button>
            ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
            {isClient && user ? (
                <>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                            <Bell className="h-5 w-5" />
                            {!loadingNotifications && notifications.length > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">{notifications.length}</Badge>}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80" align="end">
                        <DropdownMenuLabel>Alerts</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/notifications" className="cursor-pointer w-full justify-center text-primary">
                                View all notifications
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full border">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={userProfile?.avatar} />
                            <AvatarFallback>{userProfile ? getInitials(userProfile.name) : 'A'}</AvatarFallback>
                        </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <a href={user ? `https://www.my-community-hub.co.uk/profile/${user.uid}` : '#'}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>My Profile</span>
                                </a>
                            </DropdownMenuItem>
                            {showAdminDashboard && (
                                <DropdownMenuItem asChild>
                                    <Link href="/admin/dashboard">
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        <span>Admin Back Office</span>
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            {showLeaderDashboard && (
                                <DropdownMenuItem asChild>
                                    <Link href="/leader/dashboard">
                                        <Crown className="mr-2 h-4 w-4" />
                                        <span>Leader Dashboard</span>
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            {isOwner && (
                                <DropdownMenuItem asChild className="text-destructive focus:text-destructive font-bold">
                                    <Link href="/admin/owner-legacy">
                                        <Fingerprint className="mr-2 h-4 w-4" />
                                        <span>Owner Legacy Vault</span>
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                                <Link href="/settings">
                                    <SettingsIcon className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <a href="https://www.my-community-hub.co.uk/home">
                                <Home className="mr-2 h-4 w-4" />
                                <span>Community Home</span>
                            </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
            </div>
          </div>
    </header>
  )
}
