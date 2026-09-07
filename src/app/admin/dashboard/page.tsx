'use client';

import {
  LayoutDashboard,
  Users,
  Building,
  ClipboardList,
  Volume2,
  Bell,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Radio,
  Loader2,
  TrendingUp,
  PieChart as PieChartIcon,
  Flag,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as React from "react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, or, and } from "firebase/firestore";
import { type Announcement } from "@/lib/announcement-data";
import { type Notification } from "@/lib/types/notifications";
import UserSignupsChart from "@/components/admin-dashboard/user-signups-chart";
import AccountTypesChart from "@/components/admin-dashboard/account-types-chart";
import AdvertTypesChart from "@/components/admin-dashboard/advert-types-chart";
import { getNationalEmergencyPlansOverviewAction } from "@/lib/actions/adminEmergencyPlanActions";

import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
    const db = useFirestore();
    const { user } = useUser();

    const usersQuery = useMemoFirebase(() => db ? collection(db, "users") : null, [db]);
    const { data: users, isLoading: usersLoading } = useCollection(usersQuery);

    const deletedUsersQuery = useMemoFirebase(() => db ? collection(db, "deleted_users") : null, [db]);
    const { data: deletedUsers, isLoading: deletedLoading } = useCollection(deletedUsersQuery);

    const communitiesQuery = useMemoFirebase(() => db ? query(collection(db, "communities"), where("status", "==", "active")) : null, [db]);
    const { data: communities, isLoading: communitiesLoading } = useCollection(communitiesQuery);
    
    const applicationsQuery = useMemoFirebase(() => db ? query(collection(db, "leadership_applications"), where("status", "==", "Pending")) : null, [db]);
    const { data: applications, isLoading: applicationsLoading } = useCollection(applicationsQuery);

    const announcementsQuery = useMemoFirebase(() => db ? query(collection(db, "announcements"), where("status", "==", "Live")) : null, [db]);
    const { data: announcements, isLoading: announcementsLoading } = useCollection<Announcement>(announcementsQuery);
    
    const notificationsQuery = useMemoFirebase(() => {
        if (!db || !user) return null;
        return query(
            collection(db, "notifications"), 
            and(
                where("status", "in", ["New", "new", "unread", "Unread"]),
                or(
                    where("recipientId", "==", "platform_admin"),
                    where("recipientId", "==", user.uid)
                )
            )
        );
    }, [db, user?.uid]);
    const { data: adminNotifications, isLoading: notificationsLoading } = useCollection<Notification>(notificationsQuery);
    
    const moderationQuery = useMemoFirebase(() => db ? query(collection(db, "moderation_flags"), where("status", "in", ["new", "New", "pending", "Pending"])) : null, [db]);
    const { data: moderationItems, isLoading: moderationLoading } = useCollection(moderationQuery);

    const platformReportsQuery = useMemoFirebase(() => db ? query(collection(db, "platform_reports"), where("status", "in", ["New", "new", "pending", "Pending"])) : null, [db]);
    const { data: platformReports, isLoading: platformReportsLoading } = useCollection(platformReportsQuery);

    const communityReportsQuery = useMemoFirebase(() => db ? query(collection(db, "community_reports"), where("status", "in", ["New", "new", "pending", "Pending"])) : null, [db]);
    const { data: communityReports, isLoading: communityReportsLoading } = useCollection(communityReportsQuery);


    const standardBroadcasts = React.useMemo(() => announcements?.filter(a => a.type === 'Standard' && (!a.severity || a.severity === 'normal')).length || 0, [announcements]);
    const urgentBroadcasts = React.useMemo(() => announcements?.filter(a => a.type === 'Standard' && a.severity === 'urgent').length || 0, [announcements]);
    const emergencyBroadcasts = React.useMemo(() => announcements?.filter(a => a.type === 'Emergency').length || 0, [announcements]);

    const totalUsers = users ? users.length : 0;
    const totalDeleted = deletedUsers ? deletedUsers.length : 0;
    const totalCommunities = communities ? communities.length : 0;
    const pendingApplications = applications ? applications.length : 0;
    const newNotifications = adminNotifications ? adminNotifications.length : 0;
    const pendingModeration = moderationItems ? moderationItems.length : 0;
    
    const pendingPlatformReports = platformReports ? platformReports.length : 0;
    const pendingCommunityReports = communityReports ? communityReports.length : 0;
    
    // Emergency Plans & Threat Matrix Telemetry
    const [emergencyStats, setEmergencyStats] = React.useState<{
      totalWithLeader: number;
      totalCertified: number;
      fullyReadyCount: number;
      inProgressCount: number;
      missingPlanCount: number;
      activeIncidentsCount: number;
    } | null>(null);
    const [emergencyLoading, setEmergencyLoading] = React.useState(true);

    React.useEffect(() => {
      let isSubscribed = true;
      getNationalEmergencyPlansOverviewAction()
        .then(res => {
          if (isSubscribed && res.success) {
            setEmergencyStats(res.stats);
          }
        })
        .catch(err => console.error("Failed to load emergency stats on dashboard:", err))
        .finally(() => {
          if (isSubscribed) setEmergencyLoading(false);
        });
      return () => { isSubscribed = false; };
    }, []);

    const loading = usersLoading || communitiesLoading || applicationsLoading || announcementsLoading || notificationsLoading || moderationLoading || platformReportsLoading || communityReportsLoading || deletedLoading;

    const dashboardCards = [
        { 
            title: "Users", 
            description: usersLoading ? <Loader2 className="h-5 w-5 animate-spin text-blue-500"/> : `${totalUsers} Active`, 
            icon: Users, 
            href: "/admin/manage-users",
            accentBg: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
            borderTop: "border-t-4 border-t-blue-500",
            badgeText: "Directory"
        },
        { 
            title: "Deleted Accounts", 
            description: deletedLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500"/> : `${totalDeleted} Records`, 
            icon: UserX, 
            href: "/admin/deleted-users",
            accentBg: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400",
            borderTop: "border-t-4 border-t-slate-500",
            badgeText: "Archive"
        },
        { 
            title: "Communities", 
            description: communitiesLoading ? <Loader2 className="h-5 w-5 animate-spin text-emerald-500"/> : `${totalCommunities} Active`, 
            icon: Building, 
            href: "/admin/communities",
            accentBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
            borderTop: "border-t-4 border-t-emerald-500",
            badgeText: "Active Hubs"
        },
        { 
            title: "Applications", 
            description: applicationsLoading ? <Loader2 className="h-5 w-5 animate-spin text-amber-500"/> : `${pendingApplications} Pending`, 
            icon: ClipboardList, 
            href: "/admin/applications",
            accentBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
            borderTop: "border-t-4 border-t-amber-500",
            badgeText: "Review Queue"
        },
        { 
            title: "Global Reports", 
            description: (platformReportsLoading || communityReportsLoading) 
                ? <Loader2 className="h-5 w-5 animate-spin text-indigo-500"/> 
                : (
                    <div className="flex items-center gap-4">
                        <div>
                            <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{pendingPlatformReports}</span>
                            <span className="text-xs text-muted-foreground ml-1">Platform</span>
                        </div>
                        <div>
                            <span className="font-bold text-lg text-purple-600 dark:text-purple-400">{pendingCommunityReports}</span>
                            <span className="text-xs text-muted-foreground ml-1">Local</span>
                        </div>
                    </div>
                ), 
            icon: Flag, 
            href: "/admin/reports",
            accentBg: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
            borderTop: "border-t-4 border-t-indigo-500",
            badgeText: "Safety"
        },
        { 
            title: "Broadcasts", 
            description: announcementsLoading 
                ? <Loader2 className="h-5 w-5 animate-spin text-cyan-500"/> 
                : (
                    <div className="flex items-center gap-3">
                        <div>
                            <span className="font-bold text-lg text-cyan-600 dark:text-cyan-400">{standardBroadcasts}</span>
                            <span className="text-xs text-muted-foreground ml-1">Std</span>
                        </div>
                        <div>
                            <span className="font-bold text-lg text-amber-600 dark:text-amber-400">{urgentBroadcasts}</span>
                            <span className="text-xs text-muted-foreground ml-1">Urg</span>
                        </div>
                        <div>
                            <span className="font-bold text-lg text-rose-600 dark:text-rose-400">{emergencyBroadcasts}</span>
                            <span className="text-xs text-muted-foreground ml-1">Emg</span>
                        </div>
                    </div>
                ), 
            icon: Volume2, 
            href: "/admin/emergency-broadcasts",
            accentBg: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400",
            borderTop: "border-t-4 border-t-cyan-500",
            badgeText: "Live Feed"
        },
        { 
            title: "Notifications", 
            description: notificationsLoading ? <Loader2 className="h-5 w-5 animate-spin text-rose-500"/> : `${newNotifications} New`, 
            icon: Bell, 
            href: "/admin/notifications",
            accentBg: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
            borderTop: "border-t-4 border-t-rose-500",
            badgeText: "Alerts"
        },
        { 
            title: "Moderation Queue", 
            description: moderationLoading ? <Loader2 className="h-5 w-5 animate-spin text-red-500"/> : `${pendingModeration} Items`, 
            icon: ShieldAlert, 
            href: "/admin/moderation",
            accentBg: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
            borderTop: "border-t-4 border-t-red-500",
            badgeText: "Action Needed"
        },
        { 
            title: "Emergency Readiness", 
            description: emergencyLoading 
                ? <Loader2 className="h-5 w-5 animate-spin text-rose-500"/> 
                : (
                    <div className="flex items-center gap-3">
                        <div>
                            <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{emergencyStats?.totalCertified || 0}</span>
                            <span className="text-xs text-muted-foreground ml-1">Cert</span>
                        </div>
                        <div>
                            <span className="font-bold text-lg text-amber-600 dark:text-amber-400">{emergencyStats?.inProgressCount || 0}</span>
                            <span className="text-xs text-muted-foreground ml-1">Prog</span>
                        </div>
                        <div>
                            <span className={cn("font-bold text-lg", (emergencyStats?.activeIncidentsCount || 0) > 0 ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-muted-foreground")}>
                                {emergencyStats?.activeIncidentsCount || 0}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">Alert</span>
                        </div>
                    </div>
                ), 
            icon: ShieldCheck, 
            href: "/admin/emergency-plans",
            accentBg: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
            borderTop: "border-t-4 border-t-rose-500",
            badgeText: "Threat Matrix"
        },
    ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-amber-500/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Platform Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
              <LayoutDashboard className="h-7 w-7 text-primary" />
              Admin Command Console
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
              Real-time platform metrics, governance queues, and community oversight.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button asChild size="sm" className="font-bold shadow-sm">
            <Link href="/admin/announcements">
              Create Broadcast
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {dashboardCards.map((card) => (
          <Card 
            key={card.title} 
            className={cn(
              "group relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-card/90 backdrop-blur-sm border",
              card.borderTop
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{card.badgeText}</span>
                <CardTitle className="text-base font-semibold">{card.title}</CardTitle>
              </div>
              <div className={cn("p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110 shadow-sm", card.accentBg)}>
                <card.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-black tracking-tight">{card.description}</div>
              <Button asChild variant="ghost" size="sm" className="px-0 pt-3 text-xs font-semibold text-primary group-hover:underline">
                <Link href={card.href} className="inline-flex items-center gap-1">
                  Manage {card.title}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Emergency Readiness & Threat Matrix Widget */}
      <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-r from-rose-500/5 via-card to-amber-500/5">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">ISO 22301 Emergency Plans & Threat Matrix</CardTitle>
                {(emergencyStats?.activeIncidentsCount || 0) > 0 ? (
                  <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider animate-pulse">
                    🚨 {emergencyStats?.activeIncidentsCount} Active Threat Escalations
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    🟢 Normal Status (All Green)
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5">
                Monitoring 7-hazard civil emergency readiness across all registered communities with an appointed president.
              </CardDescription>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="font-bold text-xs gap-1.5 shrink-0 border-rose-500/30 hover:bg-rose-500 hover:text-white">
            <Link href="/admin/emergency-plans">
              Open Command Centre →
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl border bg-card/60 text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Appointed Hubs</span>
              <div className="text-xl font-black text-foreground mt-0.5">{emergencyStats?.totalWithLeader || 0}</div>
              <span className="text-[10px] text-muted-foreground">With President</span>
            </div>
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">ISO Certified</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{emergencyStats?.totalCertified || 0}</div>
              <span className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70">Full Sign-off</span>
            </div>
            <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 text-center">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">7/7 Hazards</span>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{emergencyStats?.fullyReadyCount || 0}</div>
              <span className="text-[10px] text-blue-700/70 dark:text-blue-300/70">100% Complete</span>
            </div>
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">In Progress</span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{emergencyStats?.inProgressCount || 0}</div>
              <span className="text-[10px] text-amber-700/70 dark:text-amber-300/70">1-6 Scenarios</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-500/30 bg-slate-500/5 text-center">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Missing Plan</span>
              <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5">{emergencyStats?.missingPlanCount || 0}</div>
              <span className="text-[10px] text-slate-500">Not Started ⚠️</span>
            </div>
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-center">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Threat Alerts</span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{emergencyStats?.activeIncidentsCount || 0}</div>
              <span className="text-[10px] text-rose-700/70 dark:text-rose-300/70">Amber / Red</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Analytics & Graphs */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-transparent rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg font-bold"><TrendingUp className="h-5 w-5 text-primary" /> Growth vs. Churn (Last 7 Days)</CardTitle>
                <CardDescription>Visualizing new signups against account deletions across the platform.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <UserSignupsChart />
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-gradient-to-r from-amber-500/5 via-transparent to-transparent rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg font-bold"><PieChartIcon className="h-5 w-5 text-amber-500" /> Account Type Distribution</CardTitle>
            <CardDescription>A breakdown of all user account types on the platform.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <AccountTypesChart />
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg font-bold"><PieChartIcon className="h-5 w-5 text-emerald-500" /> National Ad Campaign Types</CardTitle>
            <CardDescription>A breakdown of submitted national advertising campaigns.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <AdvertTypesChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
