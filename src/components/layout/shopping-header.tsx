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
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Sheet, SheetTrigger, SheetContent } from '../ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
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


const menuItems = [
    {
        href: 'https://www.my-community-hub.co.uk/home',
        label: 'Back to App',
        icon: Home,
        isExternal: true,
    },
  {
    href: '/shopping',
    label: 'Shop Home',
    icon: Store,
  },
  {
    href: '/shopping/highstreet',
    label: 'The Highstreet',
    icon: Store,
    subItems: [
        { href: '/shopping/featured', label: 'Featured Selections' },
        { href: '/shopping/highstreet', label: 'The Highstreet' },
        { href: '/shopping/favourites/local', label: 'Local Favourites' },
        { href: '/shopping/favourites/all', label: 'All Favourites' },
    ]
  },
   {
    href: '/chat',
    label: 'Community Chat',
    icon: MessagesSquare,
  },
  {
    href: '/shopping/offers',
    label: 'Special Offers',
    icon: Tag,
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

const mockNotifications = [
    { id: 1, title: 'Order Shipped!', description: 'Your order from The Daily Grind has shipped.', time: '1h ago' },
    { id: 2, title: 'New Offer Available', description: 'Page Turners has a new 2-for-1 deal.', time: '5h ago' },
];


export default function ShoppingHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = React.useState(false);
  const { cartCount } = useCart();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc(userProfileRef);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth)
    router.push('/')
  }

  const getInitials = (name: string | undefined) => {
    if (!name) return 'CH';
    return name.split(' ').map(n => n[0]).join('');
  }
  
  const CurrentAccountIcon = userProfile?.accountType ? accountTypeIcons[userProfile.accountType as keyof typeof accountTypeIcons] || User : User;
  const isBusinessAccount = userProfile?.accountType === 'business';
  const isVisiting = userProfile && userProfile.communityId !== userProfile.homeCommunityId;

  return (
    <header className="sticky top-0 z-30 flex h-auto min-h-16 flex-col justify-center border-b bg-background px-4 sm:px-6">
       <div className="flex w-full items-center gap-4 py-2">
        {isClient && isMobile ? (
            <MobileNav menuItems={menuItems.map(item => ({ ...item, href: item.href }))} />
        ) : (
          <Link href="/shopping" className="flex items-center gap-2 font-bold text-lg mr-4">
              <Store className="w-8 h-8 text-primary" />
              <div>
                 <span className="text-primary hidden sm:inline-block leading-tight">
                    Community Marketplace
                </span>
                <p className="text-xs text-muted-foreground font-normal hidden sm:block leading-tight">Shop Local</p>
              </div>
            </Link>
        )}

          <div className="flex w-full items-center">
            <nav className="hidden w-full flex-1 md:flex">
                <div className="flex w-full flex-wrap items-center justify-center gap-1">
                {menuItems.map((item) => (
                    item.subItems ? (
                        <DropdownMenu key={item.label}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="justify-start text-xs">
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                    <ChevronDown className="ml-1 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {item.subItems.map(subItem => (
                                    <DropdownMenuItem key={subItem.href} asChild>
                                        <Link href={subItem.href}>{subItem.label}</Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        item.isExternal ? (
                            <Button key={item.href} variant="ghost" size="sm" asChild className={cn('justify-start text-xs')}>
                                <a href={item.href}>
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                </a>
                            </Button>
                        ) : (
                            <Button key={item.href} variant="ghost" size="sm" asChild className={cn('justify-start text-xs', pathname === item.href && "bg-accent text-accent-foreground")}>
                                <Link href={item.href}>
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                </Link>
                            </Button>
                        )
                    )
                ))}
                {isBusinessAccount && (
                    <Button variant="ghost" size="sm" asChild className={cn('justify-start', pathname === '/business/storefront' && "bg-accent text-accent-foreground")}>
                        <Link href="/business/storefront">
                            <Briefcase className="mr-2 h-4 w-4" />
                            Your Storefront
                        </Link>
                    </Button>
                )}
                </div>
            </nav>


            <div className="ml-auto flex items-center gap-2">
                
                {isClient && (
                    <>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                                <ShoppingCart className="h-5 w-5" />
                                {cartCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">{cartCount}</Badge>}
                                <span className="sr-only">Open basket</span>
                            </Button>
                        </SheetTrigger>
                        <Cart />
                    </Sheet>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage
                                src={userProfile?.avatar}
                                alt={userProfile?.name || "User Avatar"}
                                />
                                <AvatarFallback>{userProfile ? getInitials(userProfile.name) : 'CH'}</AvatarFallback>
                            </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                            {isUserLoading || !userProfile ? (
                                <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">Loading...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {userProfile.email}
                                </p>
                                </div>
                            )}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                            <Link href="/shopping/basket">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                <span>My Basket</span>
                                {cartCount > 0 && <Badge variant="secondary" className="ml-auto">{cartCount}</Badge>}
                            </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a href="https://www.my-community-hub.co.uk/home">
                                    <Home className="mr-2 h-4 w-4" />
                                    <span>Community Home</span>
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                            <a href={user ? `https://www.my-community-hub.co.uk/profile/${user.uid}` : '#'}>
                                <User className="mr-2 h-4 w-4" />
                                My Profile
                            </a>
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
       </div>
    </header>
  )
}