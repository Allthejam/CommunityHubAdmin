'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Building,
  Building2,
  ClipboardList,
  ShieldCheck,
  LineChart,
  ShoppingCart,
  BookOpen,
  GalleryHorizontal,
  Mic,
  Presentation,
  Bell,
  FileClock,
  KeyRound,
  Settings,
  DollarSign,
  ShieldAlert,
  Code,
  FileText,
  List,
  Shield,
  Users2,
  MessageSquare,
  ListOrdered,
  Volume2,
  CreditCard,
  ChevronRight,
  Globe,
  Briefcase,
  Crown,
  Handshake,
  Star,
  Home,
  Store,
  Calendar,
  Tv,
  Newspaper,
  MessagesSquare,
  Heart,
  HeartHandshake,
  Map,
  Layers,
  UserRoundCheck,
  FileText as FileTextIcon,
  Sparkles,
  Route,
  User,
  Info,
  BarChart3,
  Fingerprint,
  Megaphone,
  Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

type SiteMapItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  description?: string;
  isExternal?: boolean;
  restrictedToOwner?: boolean;
};

type SiteMapSection = {
  title: string;
  icon: React.ElementType;
  items: SiteMapItem[];
  colorClass: string;
};

const adminSections: SiteMapSection[] = [
  {
    title: "Core Platform Management",
    icon: LayoutDashboard,
    colorClass: "border-l-primary",
    items: [
      { label: "Admin Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, description: "Overview of platform health and metrics." },
      { label: "Manage Users", href: "/admin/manage-users", icon: Users, description: "Directory of all users with role management." },
      { label: "Community List", href: "/admin/communities", icon: Building, description: "Table of all geographic and topic hubs." },
      { label: "Business Directory", href: "/admin/businesses", icon: Briefcase, description: "Global directory of all business listings and subscriptions." },
      { label: "Jurisdictional Map", href: "/admin/communities/map", icon: Map, description: "Interactive boundary manager." },
      { label: "Leadership Applications", href: "/admin/applications", icon: Crown, description: "Review pending hub leader requests." },
      { label: "Police Liaison Vetting", href: "/admin/applications/police-liaison", icon: UserRoundCheck, description: "Official law enforcement credential verification." },
      { label: "Platform Reports", href: "/admin/reports", icon: LineChart, description: "Manage global user-submitted incident reports." },
    ]
  },
  {
    title: "Commercial & Financial",
    icon: DollarSign,
    colorClass: "border-l-green-500",
    items: [
      { label: "Financial Overview", href: "/admin/financials", icon: CreditCard, description: "Net profit tracking and community split logs." },
      { label: "Pricing Tiers", href: "/admin/pricing", icon: DollarSign, description: "Configure subscription rates for all account types." },
      { label: "National Advertisers", href: "/admin/national-advertisers", icon: ShieldCheck, description: "Approve and manage platform-wide ad profiles." },
      { label: "Owner Adverts", href: "/admin/owner-adverts", icon: Volume2, description: "Create internal featured and partner campaigns." },
      { label: "Marketplace Taxonomy", href: "/admin/shopping/categories", icon: Layers, description: "Manage the 26 Master Verticals." },
    ]
  },
  {
    title: "Announcements & Broadcasts",
    icon: Megaphone,
    colorClass: "border-l-amber-500",
    items: [
      { label: "Platform Announcements", href: "/admin/announcements", icon: Megaphone, description: "Create and schedule system-wide updates." },
      { label: "Broadcast Log", href: "/admin/emergency-broadcasts", icon: FileClock, description: "History of all emergency and standard alerts." },
      { label: "Special Access", href: "/admin/special-access", icon: KeyRound, description: "Manage credentials for national alert systems." },
    ]
  },
  {
    title: "Marketing & Resources",
    icon: Sparkles,
    colorClass: "border-l-purple-500",
    items: [
      { label: "AI Content Generation", href: "/admin/marketing", icon: Sparkles, description: "Generate copy for features and audiences." },
      { label: "Market Research", href: "/admin/market-research", icon: BarChart3, description: "Strategic data analysis for growth and targeting." },
      { label: "Instruction Manuals", href: "/admin/marketing/manuals", icon: BookOpen, description: "Manage user guides and help content." },
      { label: "Image Gallery", href: "/admin/marketing/gallery", icon: GalleryHorizontal, description: "Central repository for marketing assets." },
      { label: "Audio Hub", href: "/admin/audio-hub", icon: Mic, description: "Broadcast voice-synthesized community briefings." },
      { label: "Platform Overview", href: "/admin/platform-overview", icon: Presentation, description: "Edit landing page content and features." },
      { label: "Careers Board", href: "/admin/careers", icon: Briefcase, description: "Manage platform vacancies and recruitment lifecycles." },
    ]
  },
  {
    title: "System Config & Security",
    icon: Settings,
    colorClass: "border-l-slate-500",
    items: [
      { label: "Platform Settings", href: "/admin/platform-settings", icon: Settings, description: "Staff permissions and hierarchy management." },
      { label: "Appraisals & Pay", href: "/admin/team-management/appraisals-and-pay", icon: Stethoscope, description: "Administrative performance cycles and remuneration management." },
      { label: "Content Moderation", href: "/admin/moderation", icon: ShieldAlert, description: "AI keyword filtering and user offense logs." },
      { label: "App Development", href: "/admin/app-development", icon: Code, description: "Project roadmap and feature tracking." },
      { label: "Legal Documentation", href: "/admin/terms-and-conditions", icon: FileTextIcon, description: "Master list of T&Cs and Privacy Policies." },
      { label: "Dropdown Management", href: "/admin/dropdown-management", icon: List, description: "Edit master taxonomies for the entire app." },
      { label: "Law Enforcement", href: "/admin/law-enforcement", icon: Shield, description: "Official data request guidelines." },
      { label: "Staff Chat", href: "/admin/staff-chat", icon: MessageSquare, description: "Internal administration messaging." },
      { label: "Audit Log", href: "/admin/audit-log", icon: ListOrdered, description: "Immutable record of all admin actions." },
      { label: "Owner Legacy Vault", href: "/admin/owner-legacy", icon: Fingerprint, description: "Restricted succession and legacy protocol. Owner only.", restrictedToOwner: true },
    ]
  }
];

const dashboardSections: SiteMapSection[] = [
    {
        title: "User Dashboards",
        icon: User,
        colorClass: "border-l-blue-400",
        items: [
            { label: "Leader Dashboard", href: "/leader/dashboard", icon: Crown, description: "Hub manager controls for community leaders." },
            { label: "Business Dashboard", href: "/business/dashboard", icon: Briefcase, description: "Listing and storefront tools for local shops." },
            { label: "Enterprise Dashboard", href: "/enterprise/dashboard", icon: Handshake, description: "Partnership management for large groups." },
            { label: "Advertiser Dashboard", href: "/national/dashboard", icon: Star, description: "Campaign tracking for national brands." },
            { label: "Reporter Dashboard", href: "/reporter/dashboard", icon: Newspaper, description: "Drafting and submission for local news." },
        ]
    }
];

const publicRoutes: SiteMapItem[] = [
    { label: "Public Home", href: "/home", icon: Home },
    { label: "Community Feed", href: "/feed", icon: Newspaper },
    { label: "Virtual Highstreet", href: "/shopping", icon: Store },
    { label: "Events Calendar", href: "/events", icon: Calendar },
    { label: "What's On", href: "/whatson", icon: Tv },
    { label: "Local News", href: "/news", icon: Newspaper },
    { label: "Business Directory", href: "/directory", icon: Building2 },
    { label: "Community Chat", href: "/chat", icon: MessagesSquare },
    { label: "Charities", href: "/charities", icon: Heart },
    { label: "Job Board", href: "/jobs", icon: Briefcase },
    { label: "Forums", href: "/forum", icon: Users },
    { label: "Lost & Found", href: "/lost-and-found", icon: HeartHandshake },
];

export default function SiteMapPage() {
  const { user } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const isOwner = userProfile?.role?.toLowerCase() === 'owner';

  return (
    <div className="space-y-12 max-w-7xl mx-auto py-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight font-headline flex items-center gap-3">
          <Route className="h-10 w-10 text-primary" />
          Application Site Map
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          A complete structural overview of the Community Hub platform ecosystem.
        </p>
      </div>

      <Separator />

      <div className="grid gap-12">
        {/* Admin Sections */}
        <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Administrative Back-Office
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {adminSections.map((section) => (
                    <Card key={section.title} className={cn("border-l-4 h-full", section.colorClass)}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <section.icon className="h-5 w-5 opacity-70" />
                                {section.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {section.items.map((item) => {
                                    if (item.restrictedToOwner && !isOwner) return null;
                                    
                                    return (
                                        <li key={item.href}>
                                            <Link href={item.href} className="group block">
                                                <div className="flex items-center gap-2 font-semibold group-hover:text-primary transition-colors">
                                                    <item.icon className={cn("h-4 w-4", item.restrictedToOwner && "text-destructive")} />
                                                    {item.label}
                                                    {item.restrictedToOwner && <Badge variant="destructive" className="ml-2 text-[8px] uppercase px-1 h-3.5">Owner Only</Badge>}
                                                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                                                </div>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed pl-6">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>

        {/* Dashboard Sections */}
        <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <LayoutDashboard className="h-6 w-6 text-primary" />
                Restricted Access Hubs
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
                {dashboardSections.map((section) => (
                    <Card key={section.title} className={cn("border-l-4 h-full", section.colorClass)}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <section.icon className="h-5 w-5 opacity-70" />
                                {section.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid sm:grid-cols-2 gap-6">
                            {section.items.map((item) => (
                                <Link key={item.href} href={item.href} className="group">
                                    <div className="flex items-center gap-2 font-semibold group-hover:text-primary transition-colors">
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 pl-6">
                                        {item.description}
                                    </p>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                ))}
                <Card className="border-l-4 border-l-orange-400 bg-muted/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 opacity-70" />
                            Access Note
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Dashboards are context-aware. A user will only see the dashboard associated with their primary <strong>Account Type</strong> or <strong>Custom Role</strong>.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </section>

        {/* Public Hub */}
        <section className="bg-muted/20 p-8 rounded-2xl border border-dashed">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Globe className="h-6 w-6 text-primary" />
                Primary Application (Public Hub)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {publicRoutes.map((item) => (
                    <Link 
                        key={item.href} 
                        href={item.href} 
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-background border hover:border-primary hover:shadow-md transition-all text-center gap-2"
                    >
                        <div className="p-2 bg-primary/5 rounded-full group-hover:bg-primary/10">
                            <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-xs font-bold">{item.label}</span>
                    </Link>
                ))}
            </div>
        </section>
      </div>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Route className="h-12 w-12 opacity-50" />
                <div>
                    <h3 className="text-xl font-bold">Platform Status</h3>
                    <p className="text-primary-foreground/80 text-sm">All core modules are currently operational.</p>
                </div>
            </div>
            <Button variant="secondary" asChild>
                <Link href="/admin/app-development">
                    View Development Roadmap
                    <ChevronRight className="mr-2 h-4 w-4" />
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
