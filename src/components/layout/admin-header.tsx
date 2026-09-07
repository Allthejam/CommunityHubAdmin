'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building,
  ClipboardList,
  Volume2,
  ShieldCheck,
  Users2,
  CreditCard,
  Megaphone,
  ShieldAlert,
  ListOrdered,
  MessageSquare,
  DollarSign,
  KeyRound,
  Shield,
  Code,
  Settings,
  Home,
  User,
  List,
  FileText as FileTextIcon,
  FileClock,
  ChevronDown,
  LogOut,
  GalleryHorizontal,
  Sparkles,
  Mic,
  Presentation,
  LineChart,
  Map,
  ShoppingCart,
  Layers,
  BookOpen,
  Crown,
  Route,
  Briefcase,
  UserX,
  UserCircle,
  BarChart3,
  Fingerprint,
  Stethoscope,
  ShieldAlert as ShieldAlertIcon,
  Contact2,
  Star
} from 'lucide-react';
import { signOut } from 'firebase/auth';

import { useAuth, useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from '@/firebase';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, collection, query, where, Timestamp } from 'firebase/firestore';
import { AdminNotifications } from '../admin-notifications';
import { MobileNav } from './mobile-nav';
import { differenceInMonths } from 'date-fns';

const MASTER_OWNER_EMAIL = 'allan_jamieson@outlook.com';

const mainAdminMenuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Users',
    icon: Users,
    subItems: [
      { href: '/admin/manage-users', label: 'Active Directory', icon: UserCircle },
      { href: '/admin/deleted-users', label: 'Deleted Accounts', icon: UserX },
    ]
  },
  {
    label: 'Communities',
    icon: Building,
    subItems: [
      { href: '/admin/communities', label: 'Community List', icon: List },
      { href: '/admin/communities/map', label: 'Community Map', icon: Map },
      { href: '/admin/businesses', label: 'Business Directory', icon: Briefcase },
      { href: '/admin/emergency-plans', label: 'Emergency Plans & Threat Matrix', icon: ShieldAlert },
    ]
  },
  {
    label: 'Applications',
    icon: ClipboardList,
    subItems: [
      { href: '/admin/applications', label: 'Leadership Applications', icon: Crown },
      { href: '/admin/applications/police-liaison', label: 'Police Liaison', icon: ShieldCheck },
    ]
  },
  { href: '/admin/reports', label: 'Platform Reports', icon: LineChart },
  {
    href: '/admin/national-advertisers',
    label: 'National Advertisers',
    icon: ShieldCheck,
  },
  {
    label: 'Shopping',
    icon: ShoppingCart,
    subItems: [
      { href: '/admin/shopping/categories', label: 'Categories & Tags', icon: Layers },
      { href: '/admin/shopping/controls', label: 'Featured Config', icon: Star },
    ]
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    subItems: [
      { href: '/admin/marketing', label: 'Content Generation', icon: Sparkles },
      { href: '/admin/market-research', label: 'Market Research', icon: BarChart3 },
      { href: '/admin/marketing/manuals', label: 'Instruction Manuals', icon: BookOpen },
      { href: '/admin/marketing/gallery', label: 'Image Gallery', icon: GalleryHorizontal },
      { href: '/admin/audio-hub', label: 'Audio Hub', icon: Mic },
      { href: '/admin/platform-overview', label: 'Platform Overview', icon: Presentation },
      { href: '/admin/careers', label: 'Careers Board', icon: Briefcase },
    ]
  },
];

const teamManagementMenuItems = [
    { href: '/admin/team-management', label: 'Manage Team', icon: Users2 },
    { href: '/admin/team-management/appraisals-and-pay', label: 'Appraisals & Pay', icon: Stethoscope },
    { href: '/admin/staff-chat', label: 'Staff Chat', icon: MessageSquare },
    { href: '/admin/audit-log', label: 'Audit Log', icon: ListOrdered },
    { href: '/admin/owner-adverts', label: 'Owner Adverts', icon: Volume2 },
    { href: '/admin/financials', label: 'Financials', icon: CreditCard },
];

const announcementMenuItems = [
    { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/admin/emergency-broadcasts', label: 'Broadcast Log', icon: FileClock },
    { href: '/admin/special-access', label: 'Special Access', icon: KeyRound },
];

export default function AdminHeader() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const legacyRef = useMemoFirebase(() => db ? doc(db, 'owner_legacy', 'settings') : null, [db]);
  const { data: legacyData } = useDoc<any>(legacyRef);

  // OWNER ACTIVITY CHECK
  const ownerQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', '==', 'owner'));
  }, [db]);
  const { data: owners } = useCollection(ownerQuery);

  const isOwner = React.useMemo(() => {
    if (!user) return false;
    const normalizedEmail = user.email?.toLowerCase().trim();
    return normalizedEmail === MASTER_OWNER_EMAIL || userProfile?.role?.toLowerCase() === 'owner';
  }, [user, userProfile]);

  const isOwnerInactive = React.useMemo(() => {
    if (!owners || owners.length === 0 || !legacyData) return false;
    const owner = owners[0];
    const lastActive = owner.lastActive?.toDate ? owner.lastActive.toDate() : (owner.lastActive ? new Date(owner.lastActive) : new Date(0));
    const months = differenceInMonths(new Date(), lastActive);
    return months >= (legacyData.inactivityMonths || 6);
  }, [owners, legacyData]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://www.my-community-hub.co.uk';
    window.location.href = mainAppUrl;
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const settingsMenuItems = [
    { href: '/admin/platform-settings', label: 'Platform Settings', icon: Settings },
    { href: '/admin/pricing', label: 'Pricing', icon: DollarSign },
    { href: '/admin/moderation', label: 'Moderation', icon: ShieldAlert },
    { href: '/admin/site-map', label: 'Site Map', icon: Route },
    { href: '/admin/app-development', label: 'App Development', icon: Code },
    { href: '/admin/terms-and-conditions', label: 'T&Cs', icon: FileTextIcon },
    { href: '/admin/dropdown-management', label: 'Dropdowns', icon: List },
    { href: '/admin/law-enforcement', label: 'Law Enforcement', icon: Shield },
  ];
  
  const allMenuItems = [...mainAdminMenuItems, ...teamManagementMenuItems, ...announcementMenuItems, ...settingsMenuItems];
  
  const showLeaderDashboard = isOwner || 
                             userProfile?.role?.toLowerCase() === 'admin' || 
                             userProfile?.permissions?.actionImpersonateLeader;

  const isDesignatedSuccessor = user?.uid === legacyData?.successorId;
  const showHandoverLink = isDesignatedSuccessor && isOwnerInactive && !isOwner;

  return (
    <header className="sticky top-0 z-30 flex flex-col justify-center border-b bg-card/95 backdrop-blur shadow-sm">
      {/* Top Brand Gradient Accent Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-amber-400" />
      <div className="flex w-full items-center gap-4 px-4 sm:px-6 py-2.5">
        <MobileNav menuItems={allMenuItems} />
        <Link href="/admin/dashboard" className="mr-4 flex items-center gap-2 text-lg font-bold shrink-0 group">
            <div className="p-1 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Logo className="h-7 w-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-primary font-black tracking-tight text-base leading-none hidden sm:inline-block">Admin Console</span>
              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest hidden sm:inline-block">Platform Management</span>
            </div>
        </Link>
        
        <nav className="hidden md:flex flex-1 items-center justify-center overflow-hidden">
             {isMounted && (
               <div className="flex items-center gap-1 justify-center flex-wrap">
                {mainAdminMenuItems.map((item) => (
                   item.subItems ? (
                    <DropdownMenu key={item.label}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={cn(
                                "justify-start text-xs",
                                item.subItems.some(si => pathname === si.href) && "bg-accent text-accent-foreground"
                            )}>
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {item.subItems.map(subItem => (
                                <DropdownMenuItem key={subItem.href} asChild className={cn(pathname === subItem.href && "bg-accent")}>
                                    <Link href={subItem.href}>
                                        <subItem.icon className="mr-2 h-4 w-4" />
                                        {subItem.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
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
                        <Link href={item.href!}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                        </Link>
                    </Button>
                )
                ))}
                <>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="justify-start text-xs">
                                <Users2 className="mr-2 h-4 w-4" />
                                Team Management
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {teamManagementMenuItems.map(item => (
                                <DropdownMenuItem key={item.href} asChild>
                                    <Link href={item.href}>
                                        <item.icon className="mr-2 h-4 w-4" />
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="justify-start text-xs">
                                <Megaphone className="mr-2 h-4 w-4" />
                                Announcements
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {announcementMenuItems.map(item => (
                                <DropdownMenuItem key={item.href} asChild>
                                    <Link href={item.href}>
                                        <item.icon className="mr-2 h-4 w-4" />
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="justify-start text-xs">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {settingsMenuItems.map(item => (
                                <DropdownMenuItem key={item.href} asChild>
                                    <Link href={item.href}>
                                        <item.icon className="mr-2 h-4 w-4" />
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            </div>
             )}
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {isMounted && (
            <>
              {showHandoverLink && (
                  <Button asChild variant="destructive" size="sm" className="animate-pulse font-black uppercase text-[10px] tracking-widest gap-2 h-10 border-2 border-red-500 shadow-xl">
                      <Link href="/admin/legacy-handover">
                        <ShieldAlertIcon className="h-4 w-4" />
                        Handover Active
                      </Link>
                  </Button>
              )}
              <AdminNotifications />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                  >
                      <Avatar className="h-8 w-8">
                      <AvatarImage
                          src={userProfile?.avatar}
                          alt="User Avatar"
                      />
                      <AvatarFallback>{userProfile ? getInitials(userProfile.name) : 'A'}</AvatarFallback>
                      </Avatar>
                  </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userProfile?.name || 'Admin User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                      </p>
                      </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                      <Link href={user ? `/admin/team/${user.uid}` : '#'}>
                        <Contact2 className="mr-2 h-4 w-4" />
                        <span>My Staff Profile</span>
                      </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                      <Link href={user ? `/admin/manage-users?userId=${user.uid}` : '#'}>
                        <User className="mr-2 h-4 w-4" />
                        <span>My Account</span>
                      </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                      <a href="https://www.my-community-hub.co.uk/home">
                        <Home className="mr-2 h-4 w-4" />
                        <span>Return to Main App</span>
                      </a>
                  </DropdownMenuItem>
                  {showLeaderDashboard && (
                    <DropdownMenuItem asChild>
                        <Link href="/leader/dashboard">
                            <Crown className="mr-2 h-4 w-4 text-primary" />
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
