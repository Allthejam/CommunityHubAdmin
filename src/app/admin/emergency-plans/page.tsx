'use client';

import * as React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Flame,
  Building2,
  Waves,
  Zap,
  Droplets,
  Users,
  Shield,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Eye,
  FileText,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Server,
  Key,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  getNationalEmergencyPlansOverviewAction,
  type CommunityEmergencyOverview,
  type EmergencyBroadcastItem,
  type HazardCompletion,
} from '@/lib/actions/adminEmergencyPlanActions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const HAZARD_CONFIG = [
  { key: 'wildfire', label: 'Wildfire', icon: Flame, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  { key: 'urbanfire', label: 'Urban Fire', icon: Building2, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { key: 'flood', label: 'Flood & Surge', icon: Waves, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { key: 'power', label: 'Power Outage', icon: Zap, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { key: 'drought', label: 'Water Shortage', icon: Droplets, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  { key: 'unrest', label: 'Civil Unrest', icon: Users, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  { key: 'defence', label: 'Civil Defence', icon: Shield, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
] as const;

export default function AdminEmergencyPlansPage() {
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [overview, setOverview] = React.useState<CommunityEmergencyOverview[]>([]);
  const [activeAlerts, setActiveAlerts] = React.useState<CommunityEmergencyOverview[]>([]);
  const [broadcasts, setBroadcasts] = React.useState<EmergencyBroadcastItem[]>([]);
  const [stats, setStats] = React.useState({
    totalWithLeader: 0,
    totalCertified: 0,
    fullyReadyCount: 0,
    inProgressCount: 0,
    missingPlanCount: 0,
    activeIncidentsCount: 0,
  });

  const [searchQuery, setSearchQuery] = React.useState('');
  const [threatFilter, setThreatFilter] = React.useState<'all' | 'green' | 'amber' | 'red' | 'incident'>('all');
  const [readinessFilter, setReadinessFilter] = React.useState<'all' | 'certified' | 'ready' | 'progress' | 'missing'>('all');

  const [selectedCommunity, setSelectedCommunity] = React.useState<CommunityEmergencyOverview | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const loadData = React.useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getNationalEmergencyPlansOverviewAction();
      if (res.success) {
        setOverview(res.overview);
        setActiveAlerts(res.activeAlerts);
        setBroadcasts(res.broadcasts);
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load emergency plans:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtering
  const filteredOverview = React.useMemo(() => {
    return overview.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.communityName.toLowerCase().includes(q);
        const matchLeader = item.leader.name.toLowerCase().includes(q) || item.leader.email.toLowerCase().includes(q);
        const matchRegion = (item.region || '').toLowerCase().includes(q) || (item.county || '').toLowerCase().includes(q);
        if (!matchName && !matchLeader && !matchRegion) return false;
      }

      // Threat filter
      if (threatFilter === 'incident') {
        if (item.threatStatus === 'green') return false;
      } else if (threatFilter !== 'all') {
        if (item.threatStatus !== threatFilter) return false;
      }

      // Readiness filter
      if (readinessFilter === 'certified') {
        if (!item.certified) return false;
      } else if (readinessFilter === 'ready') {
        if (item.completedCount !== 7) return false;
      } else if (readinessFilter === 'progress') {
        if (!item.hasPlan || item.completedCount === 0 || item.completedCount === 7) return false;
      } else if (readinessFilter === 'missing') {
        if (item.hasPlan && item.completedCount > 0) return false;
      }

      return true;
    });
  }, [overview, searchQuery, threatFilter, readinessFilter]);

  const getThreatBadge = (status: string) => {
    switch (status) {
      case 'red':
      case 'black':
        return (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase tracking-widest font-black text-[10px] animate-pulse">
            🚨 RED / CRITICAL
          </Badge>
        );
      case 'amber':
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-widest font-black text-[10px]">
            ⚠️ AMBER / ALERT
          </Badge>
        );
      default:
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-widest font-black text-[10px]">
            🟢 GREEN / NORMAL
          </Badge>
        );
    }
  };

  const getBroadcastLevelBadge = (level: string) => {
    switch (level) {
      case 'Critical':
        return <Badge className="bg-rose-500 text-white font-bold">Critical Alert</Badge>;
      case 'Warning':
        return <Badge className="bg-amber-500 text-white font-bold">Warning Notice</Badge>;
      case 'Advisory':
        return <Badge className="bg-blue-500 text-white font-bold">Advisory</Badge>;
      default:
        return <Badge className="bg-slate-500 text-white font-bold">Informational</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-primary/10 border border-red-500/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            ISO 22301 Civil Contingencies Command
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2.5 text-foreground">
            <ShieldAlert className="h-8 w-8 text-rose-600 dark:text-rose-500 shrink-0" />
            Emergency Plans & Threat Matrix
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            National audit oversight of community emergency plans, 7-hazard threat readiness, and real-time incident broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => loadData(true)}
            variant="outline"
            size="sm"
            disabled={refreshing || loading}
            className="font-bold gap-2 shadow-sm"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing...' : 'Refresh Telemetry'}
          </Button>
        </div>
      </div>

      {/* Active Incidents Alert Banner (if any) */}
      {activeAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/15 border-2 border-rose-500/30 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0" />
            <div>
              <span className="font-black text-sm uppercase tracking-wide">
                {activeAlerts.length} Active Community Incident{activeAlerts.length > 1 ? 's' : ''} Escalated!
              </span>
              <p className="text-xs text-rose-800 dark:text-rose-200 mt-0.5">
                The following communities have triggered an elevated threat status: {activeAlerts.map(a => a.communityName).join(', ')}.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="font-bold text-xs shrink-0"
            onClick={() => {
              setThreatFilter('incident');
            }}
          >
            Filter to Active Incidents
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Total Lead Communities */}
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Appointed Hubs</span>
            <CardTitle className="text-2xl font-black">{stats.totalWithLeader}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">Communities with President</p>
          </CardContent>
        </Card>

        {/* 2. ISO 22301 Certified */}
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Certified Plans</span>
            <CardTitle className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="h-5 w-5" />
              {stats.totalCertified}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">ISO 22301 Signed Off</p>
          </CardContent>
        </Card>

        {/* 3. Fully Ready (7/7) */}
        <Card className="border-t-4 border-t-blue-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">7/7 Hazards Ready</span>
            <CardTitle className="text-2xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5" />
              {stats.fullyReadyCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">All Scenarios Complete</p>
          </CardContent>
        </Card>

        {/* 4. In Progress */}
        <Card className="border-t-4 border-t-amber-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">In Progress</span>
            <CardTitle className="text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="h-5 w-5" />
              {stats.inProgressCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">1 to 6 Scenarios Done</p>
          </CardContent>
        </Card>

        {/* 5. Missing Plan */}
        <Card className="border-t-4 border-t-slate-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Missing Plan</span>
            <CardTitle className="text-2xl font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <AlertCircle className="h-5 w-5 text-slate-500" />
              {stats.missingPlanCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">Not Started / 0 Complete</p>
          </CardContent>
        </Card>

        {/* 6. Active Incidents */}
        <Card className="border-t-4 border-t-rose-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Threat Alerts</span>
            <CardTitle className="text-2xl font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Radio className="h-5 w-5" />
              {stats.activeIncidentsCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">Amber / Red Incidents</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="matrix" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 max-w-xl h-auto p-1 bg-muted/60">
          <TabsTrigger value="matrix" className="font-bold text-xs py-2 gap-1.5">
            <ShieldAlert className="h-4 w-4 text-primary" />
            7-Hazard Matrix ({overview.length})
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="font-bold text-xs py-2 gap-1.5">
            <Radio className="h-4 w-4 text-rose-500" />
            Emergency Bulletins ({broadcasts.length})
          </TabsTrigger>
          <TabsTrigger value="iso" className="font-bold text-xs py-2 gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            ISO 22301 Briefing
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: 7-Hazard Matrix Table */}
        <TabsContent value="matrix" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="p-5 pb-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    Community Emergency Plans & Threat Matrix
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Monitoring all communities with an appointed president across all 7 civil emergency hazard vectors.
                  </CardDescription>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search community, leader..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>

                  <select
                    value={threatFilter}
                    onChange={(e) => setThreatFilter(e.target.value as any)}
                    className="h-9 px-2 text-xs rounded-md border bg-background font-medium"
                  >
                    <option value="all">All Threat Statuses</option>
                    <option value="incident">Active Incidents (Amber/Red)</option>
                    <option value="green">Green (Normal)</option>
                    <option value="amber">Amber (Elevated)</option>
                    <option value="red">Red (Critical)</option>
                  </select>

                  <select
                    value={readinessFilter}
                    onChange={(e) => setReadinessFilter(e.target.value as any)}
                    className="h-9 px-2 text-xs rounded-md border bg-background font-medium"
                  >
                    <option value="all">All Readiness</option>
                    <option value="certified">ISO Certified Only</option>
                    <option value="ready">7/7 Hazards Ready</option>
                    <option value="progress">In Progress (1-6)</option>
                    <option value="missing">Missing Plan (0/7)</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-[200px] font-bold text-xs">Community</TableHead>
                      <TableHead className="w-[220px] font-bold text-xs">Appointed Leader</TableHead>
                      <TableHead className="w-[140px] font-bold text-xs text-center">Threat Status</TableHead>
                      <TableHead className="font-bold text-xs text-center">7 Hazard Matrix Completion</TableHead>
                      <TableHead className="w-[120px] font-bold text-xs text-center">Readiness</TableHead>
                      <TableHead className="w-[120px] font-bold text-xs text-center">ISO 22301</TableHead>
                      <TableHead className="w-[100px] font-bold text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOverview.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                          {loading ? 'Loading emergency plans data...' : 'No communities found matching the selected filters.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOverview.map((item) => (
                        <TableRow
                          key={item.communityId}
                          className={cn(
                            'hover:bg-muted/30 transition-colors',
                            (item.threatStatus === 'red' || item.threatStatus === 'black') && 'bg-rose-500/5',
                            item.threatStatus === 'amber' && 'bg-amber-500/5'
                          )}
                        >
                          {/* Community Column */}
                          <TableCell className="font-medium">
                            <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              {item.communityName}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {item.region || item.county || 'UK Region'}
                            </div>
                          </TableCell>

                          {/* Leader Column */}
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 border">
                                <AvatarImage src={item.leader.avatar} />
                                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                  {item.leader.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-foreground truncate flex items-center gap-1">
                                  {item.leader.name}
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                                    {item.leader.title || 'President'}
                                  </Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                  <Mail className="h-2.5 w-2.5" />
                                  {item.leader.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Threat Status Badge */}
                          <TableCell className="text-center">
                            {getThreatBadge(item.threatStatus)}
                            {item.threatNotes && (
                              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic max-w-[130px] mx-auto">
                                "{item.threatNotes}"
                              </p>
                            )}
                          </TableCell>

                          {/* 7 Hazards Checklist Grid */}
                          <TableCell>
                            <div className="flex items-center justify-center gap-1.5">
                              {HAZARD_CONFIG.map((hz) => {
                                const isDone = item.hazards[hz.key as keyof HazardCompletion];
                                const HzIcon = hz.icon;
                                return (
                                  <div
                                    key={hz.key}
                                    title={`${hz.label}: ${isDone ? 'Completed' : 'Missing'}`}
                                    className={cn(
                                      'flex flex-col items-center justify-center p-1.5 rounded-lg border transition-transform hover:scale-110 w-9 h-11',
                                      isDone
                                        ? hz.color
                                        : 'bg-muted/40 border-dashed border-border/60 text-muted-foreground/40 opacity-40'
                                    )}
                                  >
                                    <HzIcon className="h-3.5 w-3.5" />
                                    <span className="text-[8px] font-bold mt-0.5">
                                      {isDone ? '✓' : '—'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>

                          {/* Readiness Column */}
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={cn(
                                  'font-black text-xs',
                                  item.completedCount === 7
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : item.completedCount > 0
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                )}
                              >
                                {item.completedCount} / 7 ({item.completionPercentage}%)
                              </span>
                              <Progress value={item.completionPercentage} className="h-1.5 w-16" />
                              <span className="text-[9px] text-muted-foreground">
                                {item.keyholderCount} Keyholders
                              </span>
                            </div>
                          </TableCell>

                          {/* ISO Certification Badge */}
                          <TableCell className="text-center">
                            {item.certified ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Certified
                              </Badge>
                            ) : item.hasPlan ? (
                              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                                In Progress
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] font-bold">
                                Missing Plan
                              </Badge>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-bold gap-1 shadow-sm hover:bg-primary hover:text-primary-foreground"
                              onClick={() => {
                                setSelectedCommunity(item);
                                setDialogOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Inspect
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Live Emergency Bulletins */}
        <TabsContent value="broadcasts" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="p-5 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Radio className="h-5 w-5 text-rose-500" />
                    Live Community Emergency Bulletins & Broadcasts
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Aggregated live feed of all emergency notices and contingency alerts published by community leaders.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-bold text-xs">
                  {broadcasts.length} Recorded Broadcasts
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {broadcasts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Radio className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  No emergency broadcasts have been logged on the platform yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-start justify-between gap-4',
                        msg.level === 'Critical'
                          ? 'bg-rose-500/10 border-rose-500/30'
                          : msg.level === 'Warning'
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-card border-border'
                      )}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getBroadcastLevelBadge(msg.level)}
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {msg.communityName}
                          </Badge>
                          {msg.active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active Live Broadcast
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Archived / Retracted
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-base text-foreground">{msg.title}</h4>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>
                      </div>

                      <div className="text-right shrink-0 text-xs text-muted-foreground">
                        <div className="font-semibold text-foreground">{msg.createdByName || 'Community Leader'}</div>
                        <div className="text-[10px] mt-0.5">
                          {msg.createdAt ? format(new Date(msg.createdAt), 'dd MMM yyyy HH:mm') : 'Recent'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: ISO 22301 Auditor Briefing */}
        <TabsContent value="iso" className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="p-6 border-b bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">
                    ISO 22301 Graceful Degradation Architecture & Auditor Defence Brief
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Formal 4-tier resilience hierarchy ensuring continuity across total grid, cellular, or cloud service collapse.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* 4-Tier Degradation Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Tier 1 */}
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-500 text-white font-bold text-[10px]">Tier 1</Badge>
                    <Server className="h-4 w-4 text-emerald-500" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Cloud & Edge Telemetry</h4>
                  <p className="text-xs text-muted-foreground">
                    Normal operating conditions. Real-time Firestore sync, automated push broadcasts, and leadership dashboards.
                  </p>
                </div>

                {/* Tier 2 */}
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-500 text-white font-bold text-[10px]">Tier 2</Badge>
                    <Radio className="h-4 w-4 text-blue-500" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">P2P Mesh & BLE Relay</h4>
                  <p className="text-xs text-muted-foreground">
                    Cellular blackout scenario. Localized device-to-device Bluetooth Low Energy (BLE) message relay between community members.
                  </p>
                </div>

                {/* Tier 3 */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500 text-white font-bold text-[10px]">Tier 3</Badge>
                    <Zap className="h-4 w-4 text-amber-500" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Satellite Gateway Relay</h4>
                  <p className="text-xs text-muted-foreground">
                    Regional infrastructure failure. Designated community emergency shelters equipped with satellite backhaul Uplinks.
                  </p>
                </div>

                {/* Tier 4 */}
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-purple-500 text-white font-bold text-[10px]">Tier 4</Badge>
                    <FileText className="h-4 w-4 text-purple-500" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Physical Binder & QR SIB</h4>
                  <p className="text-xs text-muted-foreground">
                    Zero-power absolute contingency. Hardcopy emergency dossier, physical keyholder registers, and printed QR evacuation cards.
                  </p>
                </div>
              </div>

              {/* Auditor Defence Summary */}
              <div className="p-5 rounded-xl bg-muted/40 border space-y-3">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Auditor Compliance & Governance Statement
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Under the Civil Contingencies Act and ISO 22301 Business Continuity standards, this platform guarantees that every registered community with an appointed president maintains a fully actionable, multi-hazard emergency plan. The 7 hazard vectors (Wildfire, Urban Fire, Flood, Power Outage, Water Shortage, Civil Unrest, and Civil Defence) require identified shelter facilities, trusted keyholders, and vetted evacuation collection points before receiving certified accreditation.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Community Emergency Plan Dossier Inspection Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedCommunity && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <ShieldAlert className="h-6 w-6 text-primary" />
                      {selectedCommunity.communityName} — Emergency Dossier
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-1">
                      {selectedCommunity.region || selectedCommunity.county || 'UK Region'} • Appointed Leader: {selectedCommunity.leader.name} ({selectedCommunity.leader.title || 'President'})
                    </DialogDescription>
                  </div>
                  {getThreatBadge(selectedCommunity.threatStatus)}
                </div>
              </DialogHeader>

              {/* Plan Status Banner */}
              <div className="p-4 rounded-xl border bg-muted/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2.5 rounded-lg font-bold text-xs',
                    selectedCommunity.certified ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
                  )}>
                    {selectedCommunity.certified ? 'ISO 22301 CERTIFIED' : 'PLAN IN DEVELOPMENT'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      {selectedCommunity.completedCount} of 7 Hazards Addressed ({selectedCommunity.completionPercentage}%)
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {selectedCommunity.certifiedAt
                        ? `Certified on ${format(new Date(selectedCommunity.certifiedAt), 'dd MMM yyyy')} by ${selectedCommunity.certifiedBy || 'Auditor'}`
                        : 'Awaiting completion of remaining hazard modules.'}
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="font-bold text-foreground">{selectedCommunity.keyholderCount} Keyholders</span>
                  <div className="text-[10px] text-muted-foreground">{selectedCommunity.facilityCount} Facilities</div>
                </div>
              </div>

              {/* 7 Hazard Matrix Breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground">7-Hazard Threat Module Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {HAZARD_CONFIG.map((hz) => {
                    const isDone = selectedCommunity.hazards[hz.key as keyof HazardCompletion];
                    const HzIcon = hz.icon;
                    return (
                      <div
                        key={hz.key}
                        className={cn(
                          'p-3 rounded-lg border flex items-center justify-between text-xs',
                          isDone ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-muted/30 border-dashed opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <HzIcon className={cn('h-4 w-4', isDone ? 'text-emerald-500' : 'text-muted-foreground')} />
                          <span className="font-bold text-foreground">{hz.label}</span>
                        </div>
                        {isDone ? (
                          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                            Configured
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Not Configured
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Keyholders & Facilities */}
              {selectedCommunity.planData && (
                <div className="space-y-4 pt-2 border-t">
                  {/* Keyholders List */}
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2">
                      <Key className="h-4 w-4 text-amber-500" />
                      Designated Emergency Keyholders ({selectedCommunity.keyholderCount})
                    </h4>
                    {selectedCommunity.planData.keyholders?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedCommunity.planData.keyholders.map((k: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg border bg-card text-xs flex flex-col justify-between">
                            <span className="font-bold text-foreground">{k.name || 'Keyholder'}</span>
                            <span className="text-[10px] text-muted-foreground">{k.role || k.notes || 'Facility Access'}</span>
                            <span className="text-[10px] font-mono text-primary mt-1">{k.phone || k.contact || 'No direct phone'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No keyholders specified yet.</p>
                    )}
                  </div>

                  {/* Evacuation Points */}
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-rose-500" />
                      Collection & Evacuation Points ({selectedCommunity.evacuationPointCount})
                    </h4>
                    {selectedCommunity.planData.collectionPoints?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedCommunity.planData.collectionPoints.map((cp: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg border bg-card text-xs">
                            <span className="font-bold text-foreground">{cp.name || cp.location || 'Assembly Point'}</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{cp.description || cp.address || 'Designated assembly zone'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No evacuation collection points specified yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Leader Direct Contact Banner */}
              <div className="p-4 rounded-xl border bg-primary/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={selectedCommunity.leader.avatar} />
                    <AvatarFallback className="text-xs font-bold bg-primary/20 text-primary">
                      {selectedCommunity.leader.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xs font-bold text-foreground">{selectedCommunity.leader.name}</div>
                    <div className="text-[10px] text-muted-foreground">Appointed {selectedCommunity.leader.title || 'President'}</div>
                    <div className="text-[10px] text-primary mt-0.5">{selectedCommunity.leader.email}</div>
                  </div>
                </div>

                {selectedCommunity.leader.phone && (
                  <Button asChild size="sm" variant="outline" className="text-xs font-bold gap-1.5">
                    <a href={`tel:${selectedCommunity.leader.phone}`}>
                      <Phone className="h-3.5 w-3.5" />
                      {selectedCommunity.leader.phone}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
