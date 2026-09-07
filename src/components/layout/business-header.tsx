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
  Store,
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
import { doc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { type Notification } from '@/lib/types/notifications';
import { Badge } from '../ui/badge';
import { MobileNav } from './mobile-nav';
import { Cart } from '../cart';
import { useCart } from '@/contexts/cart-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetTrigger } from '../ui/sheet';


const businessNavItems = [
  { href: '/business/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/business/listings', label: 'My Business Listings', icon: Building2 },
  { href: '/business/storefront', label: 'Storefront', icon: Store },
  { href: '/business/adverts', label: 'My Adverts', icon: Megaphone },
  { href: '/business/events', label: 'My Events', icon: Calendar },
  { href: '/business/gallery', label: 'Gallery', icon: GalleryHorizontal },
  { href: '/business/billing', label: 'Billing', icon: CreditCard },
];

const accountTypeIcons = {
    personal: User,
    business: Briefcase,
    leader: Users,
    enterprise: Building,
    advertiser: Star,
    admin: LayoutDashboard
}

export default function BusinessHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isClient, setIsClient] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = React.useState(true);
  const { cartCount } = useCart();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
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
    window.location.href = '/';
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'CH';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const CurrentAccountIcon = userProfile?.accountType ? accountTypeIcons[userProfile.accountType as keyof typeof accountTypeIcons] || User : User;
  const isVisiting = userProfile && userProfile.communityId !== userProfile.homeCommunityId;

  return (
    <header className="sticky top-0 z-30 flex h-auto min-h-16 flex-col justify-center border-b bg-card px-4 sm:px-6">
      <div className="flex w-full items-center gap-4">
        <MobileNav menuItems={businessNavItems} />

        <div className="flex items-center gap-2 mr-4">
            <Link href="/business/dashboard" className="flex items-center gap-2 font-semibold">
                <Logo className="h-6 w-6" />
                <span className="">Business Dashboard</span>
            </Link>
        </div>

        <nav className="hidden md:flex flex-1 items-center justify-center overflow-hidden">
            <div className="flex items-center gap-1 justify-center flex-wrap">
                {businessNavItems.map((item) => (
                <Button
                    key={item.href}
                    variant="ghost"
                    asChild
                    size="sm"
                    className={cn(
                    'justify-start text-xs',
                    pathname === item.href &&
                        'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
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
