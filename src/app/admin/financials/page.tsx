"use client";

import * as React from "react";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { DateRange } from "react-day-picker";
import {
    Landmark,
    Download,
    Calendar as CalendarIcon,
    BadgeCheck,
    Clock,
    Loader2,
    ArrowUpDown,
    TrendingUp,
    DollarSign,
    Store,
    XCircle,
    Building2,
    Globe,
    Briefcase,
    Handshake,
    Star,
    Search,
    FilterX,
    CreditCard,
    ShieldCheck,
    AlertCircle,
    Layers,
    ChevronDown,
    ArrowUpRight,
} from "lucide-react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getPricingPlans, type Plan, type StorefrontPlan, type AdvertiserPlan } from "@/lib/actions/pricingActions";
import { PaginationControls } from "@/components/ui/pagination";

export type Payout = {
  transactionId: string;
  date: string;
  amount: number;
  status: "Paid" | "In transit" | "Failed" | "Pending";
  community: string;
  communityId: string;
  isEligible: boolean;
  businessCount: number;
  stripeAccountId?: string;
};

const PayoutStatusBadge = ({ status }: { status: Payout['status'] }) => {
  switch (status) {
    case 'Paid':
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 w-fit">
          <BadgeCheck className="h-3.5 w-3.5" />
          Paid Out
        </Badge>
      );
    case 'In transit':
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 w-fit">
          <Clock className="h-3.5 w-3.5 animate-spin" />
          In Transit
        </Badge>
      );
    case 'Pending':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 w-fit">
          <Clock className="h-3.5 w-3.5" />
          Pending Cycle
        </Badge>
      );
    case 'Failed':
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 w-fit">
          <XCircle className="h-3.5 w-3.5" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline" className="font-bold uppercase text-[10px] tracking-wider">{status}</Badge>;
  }
};

const EligibilityBadge = ({ isEligible }: { isEligible: boolean }) => {
    if (isEligible) {
        return (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 w-fit">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Stripe Connected
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 w-fit">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            Stripe Required
        </Badge>
    );
};

export default function AdminFinancialsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedEligibility, setSelectedEligibility] = React.useState<string>("all");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  
  const [payouts, setPayouts] = React.useState<Payout[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [businessPlan, setBusinessPlan] = React.useState<Plan | null>(null);
  const [storefrontPlan, setStorefrontPlan] = React.useState<StorefrontPlan | null>(null);
  const [enterprisePlan, setEnterprisePlan] = React.useState<Plan | null>(null);
  const [advertiserPlan, setAdvertiserPlan] = React.useState<AdvertiserPlan | null>(null);

  const [sorting, setSorting] = React.useState<{ key: keyof Payout; order: 'asc' | 'desc' }>({ key: 'amount', order: 'desc' });
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  
  // Stream States
  const [businessNetIncome, setBusinessNetIncome] = React.useState(0);
  const [highstreetNetIncome, setHighstreetNetIncome] = React.useState(0);
  const [enterpriseNetIncome, setEnterpriseNetIncome] = React.useState(0);
  const [nationalNetIncome, setNationalNetIncome] = React.useState(0);
  
  const [communityShareTotal, setCommunityShareTotal] = React.useState(0);
  const [ownerShareTotal, setOwnerShareTotal] = React.useState(0);
  const [communityCount, setCommunityCount] = React.useState(0);
  
  // Platform Sub-stats
  const [standardCount, setStandardCount] = React.useState(0);
  const [enterpriseBizCount, setEnterpriseBizCount] = React.useState(0);
  const [highstreetCount, setHighstreetCount] = React.useState(0);
  const [payingAdvertiserCount, setPayingAdvertiserCount] = React.useState(0);

  const [allCommunities, setAllCommunities] = React.useState<Map<string, any>>(new Map());
  const [subscribedBusinesses, setSubscribedBusinesses] = React.useState<any[]>([]);
  const [activeNationalAds, setActiveNationalAds] = React.useState<any[]>([]);

  // Sovereign Authorization Check
  const isOwner = userProfile?.role?.toLowerCase() === 'owner' || user?.email?.toLowerCase().trim() === 'allan_jamieson@outlook.com';
  const canView = isOwner || userProfile?.permissions?.viewFinancials === true;

  React.useEffect(() => {
    if (!canView) return;
    const fetchPlans = async () => {
        const plans = await getPricingPlans();
        if (plans.business) setBusinessPlan(plans.business);
        if (plans.storefront) setStorefrontPlan(plans.storefront);
        if (plans.enterprise) setEnterprisePlan(plans.enterprise);
        if (plans.advertiser) setAdvertiserPlan(plans.advertiser);
    };
    fetchPlans();
  }, [canView]);

  React.useEffect(() => {
    if (!db || !canView) return;

    const communitiesUnsubscribe = onSnapshot(collection(db, "communities"), (snapshot) => {
        const map = new Map();
        snapshot.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        setAllCommunities(map);
        setCommunityCount(snapshot.size);
    });

    const businessesUnsubscribe = onSnapshot(
        query(collection(db, 'businesses'), where('status', '==', 'Subscribed')),
        (snapshot) => {
            setSubscribedBusinesses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
    );

    const nationalAdsUnsubscribe = onSnapshot(
        query(collection(db, 'adverts'), where('status', '==', 'Active'), where('scope', 'in', ['platform', 'national'])),
        (snapshot) => {
            setActiveNationalAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
    );

    return () => {
        communitiesUnsubscribe();
        businessesUnsubscribe();
        nationalAdsUnsubscribe();
    };
  }, [db, canView]);

  React.useEffect(() => {
    if (!businessPlan || !storefrontPlan || !enterprisePlan || !advertiserPlan) {
        return;
    }

    const stripeFeeMultiplier = 0.975; // 100% - 2.5% fee

    // 1. Business Listing Stream (Split 60/40)
    const standardBusinesses = subscribedBusinesses.filter(b => b.accountType === 'business' || !b.accountType);
    setStandardCount(standardBusinesses.length);
    
    const listingNetUnit = (businessPlan.monthlyPrice ?? 20) * stripeFeeMultiplier;
    const currentBusinessNet = standardBusinesses.length * listingNetUnit;
    setBusinessNetIncome(currentBusinessNet);

    // 2. Highstreet Rental Stream (100% Admin)
    const activeHighstreet = subscribedBusinesses.filter(b => b.storefrontSubscription === true);
    setHighstreetCount(activeHighstreet.length);
    
    const storefrontNetUnit = (storefrontPlan.monthlyPrice ?? 10) * stripeFeeMultiplier;
    const currentHighstreetNet = activeHighstreet.length * storefrontNetUnit;
    setHighstreetNetIncome(currentHighstreetNet);

    // 3. Enterprise Stream (100% Admin)
    const enterpriseBusinesses = subscribedBusinesses.filter(b => b.accountType === 'enterprise');
    setEnterpriseBizCount(enterpriseBusinesses.length);
    
    const enterpriseNetUnit = (enterprisePlan.monthlyPrice ?? 50) * stripeFeeMultiplier;
    const currentEnterpriseNet = enterpriseBusinesses.length * enterpriseNetUnit;
    setEnterpriseNetIncome(currentEnterpriseNet);

    // 4. National Advertiser Stream (100% Admin)
    let currentNationalNet = 0;
    const uniquePayingAdvertisers = new Set<string>();
    
    activeNationalAds.forEach(ad => {
        if (ad.totalCost > 0 && ad.campaignDurationMonths > 0) {
            const monthlyGross = ad.totalCost / ad.campaignDurationMonths;
            currentNationalNet += monthlyGross * stripeFeeMultiplier;
            if (ad.ownerId) uniquePayingAdvertisers.add(ad.ownerId);
        }
    });
    setNationalNetIncome(currentNationalNet);
    setPayingAdvertiserCount(uniquePayingAdvertisers.size);

    // Payout and Split Calculations
    const communityRevenue: Record<string, { name: string, total: number, businessCount: number, stripeAccountId?: string }> = {};
    let totalCommunityShare = 0;

    standardBusinesses.forEach(business => {
        const communityId = business.primaryCommunityId;
        const communityDoc = allCommunities.get(communityId);
        const shareRate = (communityDoc?.revenueShare ?? 40) / 100;
        
        const listingShare = listingNetUnit * shareRate;
        totalCommunityShare += listingShare;

        if (communityId) {
            if (!communityRevenue[communityId]) {
                const commName = communityDoc?.name || 'Unknown Community';
                communityRevenue[communityId] = { 
                    name: commName, 
                    total: 0, 
                    businessCount: 0,
                    stripeAccountId: communityDoc?.stripeAccountId 
                };
            }
            communityRevenue[communityId].total += listingShare;
            communityRevenue[communityId].businessCount++;
        }
    });

    setCommunityShareTotal(totalCommunityShare);
    
    const adminListingShare = currentBusinessNet - totalCommunityShare;
    setOwnerShareTotal(adminListingShare + currentHighstreetNet + currentEnterpriseNet + currentNationalNet);

    const generatedPayouts: Payout[] = Object.entries(communityRevenue).map(([id, data]) => {
        const communityInfo = allCommunities.get(id);
        const isEligible = communityInfo?.status === 'active' && !!communityInfo?.stripeAccountId;
        
        return {
            transactionId: `payout_${id.substring(0, 8)}_${new Date().getMonth() + 1}_${new Date().getFullYear()}`,
            date: new Date().toISOString(),
            amount: data.total,
            status: "Pending",
            community: data.name,
            communityId: id,
            isEligible: isEligible,
            businessCount: data.businessCount,
            stripeAccountId: communityInfo?.stripeAccountId
        };
    });
    
    setPayouts(generatedPayouts);
    setLoading(false);
  }, [subscribedBusinesses, allCommunities, businessPlan, storefrontPlan, enterprisePlan, advertiserPlan, activeNationalAds]);

  const handleSort = (key: keyof Payout) => {
    setSorting(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleQuickRange = (preset: 'today' | '1m' | '3m' | '6m' | '1y' | 'all') => {
      const now = new Date();
      switch (preset) {
          case 'today':
              setDateRange({ from: now, to: now });
              break;
          case '1m':
              setDateRange({ from: subMonths(now, 1), to: now });
              break;
          case '3m':
              setDateRange({ from: subMonths(now, 3), to: now });
              break;
          case '6m':
              setDateRange({ from: subMonths(now, 6), to: now });
              break;
          case '1y':
              setDateRange({ from: subYears(now, 1), to: now });
              break;
          case 'all':
              setDateRange(undefined);
              break;
      }
  };

  const isFiltered = searchQuery !== "" || selectedStatus !== "all" || selectedEligibility !== "all" || !!dateRange?.from;

  const handleClearFilters = () => {
      setSearchQuery("");
      setSelectedStatus("all");
      setSelectedEligibility("all");
      setDateRange(undefined);
  };

  const filteredAndSortedPayouts = React.useMemo(() => {
      let filtered = payouts;

      // 1. Keyword search
      if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(p => 
              p.community.toLowerCase().includes(q) || 
              p.communityId.toLowerCase().includes(q) ||
              p.transactionId.toLowerCase().includes(q)
          );
      }

      // 2. Status filter
      if (selectedStatus !== "all") {
          filtered = filtered.filter(p => p.status === selectedStatus);
      }

      // 3. Eligibility filter
      if (selectedEligibility !== "all") {
          const mustBeEligible = selectedEligibility === "eligible";
          filtered = filtered.filter(p => p.isEligible === mustBeEligible);
      }

      // 4. Date range filter
      if (dateRange?.from) {
          const fromDate = startOfDay(dateRange.from);
          const toDate = endOfDay(dateRange.to || dateRange.from);
          filtered = filtered.filter(p => {
              const pDate = new Date(p.date);
              return isWithinInterval(pDate, { start: fromDate, end: toDate });
          });
      }

      return [...filtered].sort((a, b) => {
          const valA = (a as any)[sorting.key] ?? '';
          const valB = (b as any)[sorting.key] ?? '';
          const order = sorting.order === 'asc' ? 1 : -1;
          
          if (sorting.key === 'date') return (new Date(valA as string).getTime() - new Date(valB as string).getTime()) * order;
          if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB) * order;
          if (typeof valA === 'number' && typeof valB === 'number') return (valA - valB) * order;
          if (typeof valA === 'boolean' && typeof valB === 'boolean') return (valA === valB ? 0 : valA ? -1 : 1) * order;

          return 0;
      });
  }, [payouts, searchQuery, selectedStatus, selectedEligibility, dateRange, sorting]);

  const paginatedPayouts = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredAndSortedPayouts.slice(start, end);
  }, [filteredAndSortedPayouts, pagination]);

  const pageCount = Math.ceil(filteredAndSortedPayouts.length / pagination.pageSize);

  const handleExportCSV = () => {
    if (filteredAndSortedPayouts.length === 0) {
        toast({ title: "No Records", description: "There are no payout records matching your current filters to export." });
        return;
    }

    const headers = ["Cycle Date", "Community Name", "Community ID", "Active Businesses", "Split Amount (GBP)", "Payout Status", "Stripe Eligibility", "Transaction ID"];
    const rows = filteredAndSortedPayouts.map(p => [
        `"${format(new Date(p.date), 'yyyy-MM-dd')}"`,
        `"${p.community.replace(/"/g, '""')}"`,
        `"${p.communityId}"`,
        p.businessCount,
        p.amount.toFixed(2),
        `"${p.status}"`,
        `"${p.isEligible ? 'Eligible (Stripe Connected)' : 'Ineligible (Missing Stripe)'}"`,
        `"${p.transactionId}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `community_hub_financial_ledger_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Financial Export Complete", description: `Exported ${filteredAndSortedPayouts.length} payout records to CSV.` });
  };

  if (profileLoading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
      );
  }

  if (!canView) {
    return (
      <div className="p-8 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold">Unauthorized Access</h2>
        <p className="text-sm text-muted-foreground">You do not have administrative clearance to inspect platform financials.</p>
      </div>
    ); 
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  return (
    <div className="space-y-8 pb-20">
        {/* Emerald & Indigo Hero Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-slate-900/15 border-2 border-emerald-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-md relative overflow-hidden">
            <div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest mb-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-500 animate-pulse" />
                    Platform Treasury &amp; Economics • Financial Ledger
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                    <Landmark className="h-8 w-8 text-emerald-600" />
                    Financial Overview &amp; Splits
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                    Itemized platform revenue ledger, retained net earnings, Stripe fee accounting (2.5%), and 40% community leader dividend distributions.
                </p>
            </div>

            {/* Active Platform Summary Pills */}
            <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Monetization Scope</p>
                <div className="flex flex-wrap lg:justify-end gap-1.5">
                    <Badge variant="outline" className="gap-1.5 font-bold text-xs bg-background border-2"><Globe className="h-3 w-3 text-blue-500"/> {communityCount} Hubs</Badge>
                    <Badge variant="outline" className="gap-1.5 font-bold text-xs bg-background border-2"><Briefcase className="h-3 w-3 text-emerald-500"/> {standardCount} Listings</Badge>
                    <Badge variant="outline" className="gap-1.5 font-bold text-xs bg-background border-2"><Handshake className="h-3 w-3 text-purple-500"/> {enterpriseBizCount} Enterprise</Badge>
                    <Badge variant="outline" className="gap-1.5 font-bold text-xs bg-background border-2"><Store className="h-3 w-3 text-teal-500"/> {highstreetCount} Highstreet</Badge>
                    <Badge variant="outline" className="gap-1.5 font-bold text-xs bg-background border-2"><Star className="h-3 w-3 text-amber-500"/> {payingAdvertiserCount} National</Badge>
                </div>
            </div>
        </div>

        {/* Executive Profit Distribution Dual Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Admin Platform Net Profit */}
            <Card className="border-t-4 border-t-emerald-600 bg-gradient-to-br from-emerald-500/10 via-background to-background shadow-lg overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-10 text-emerald-500 group-hover:scale-110 transition-transform">
                    <DollarSign className="h-28 w-28" />
                </div>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                            👑 Platform Owner Net
                        </Badge>
                        <span className="text-xs font-mono font-bold text-emerald-600">60% Listing + 100% Retained</span>
                    </div>
                    <CardTitle className="text-base font-black text-foreground mt-1">Total Platform Net Profit</CardTitle>
                    <CardDescription>Net retained income across all revenue channels after Stripe processing fees (2.5%).</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {formatCurrency(ownerShareTotal)}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/50 text-xs font-semibold text-muted-foreground">
                        <span>🏢 Highstreet: {formatCurrency(highstreetNetIncome)}</span>
                        <span>•</span>
                        <span>🤝 Enterprise: {formatCurrency(enterpriseNetIncome)}</span>
                        <span>•</span>
                        <span>📢 National: {formatCurrency(nationalNetIncome)}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Card 2: Community Revenue Share Pool */}
            <Card className="border-t-4 border-t-blue-500 bg-gradient-to-br from-blue-500/10 via-background to-background shadow-lg overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-10 text-blue-500 group-hover:scale-110 transition-transform">
                    <Globe className="h-28 w-28" />
                </div>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-black uppercase tracking-wider">
                            🌟 Community Dividend Pool
                        </Badge>
                        <span className="text-xs font-mono font-bold text-blue-600">40% Listing Share Pool</span>
                    </div>
                    <CardTitle className="text-base font-black text-foreground mt-1">Community Leader Dividend Share</CardTitle>
                    <CardDescription>Aggregate monthly dividend pool allocated to verified community hub leaders.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="text-4xl sm:text-5xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                        {formatCurrency(communityShareTotal)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50 font-medium leading-relaxed">
                        Calculated monthly and distributed directly to connected Stripe Connect accounts based on active business count.
                    </p>
                </CardContent>
            </Card>
        </div>
        
        {/* 4 Individual Revenue Stream KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Standard Listings</p>
                        <CardTitle className="text-base font-black mt-0.5">Business Subs</CardTitle>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                        <Building2 className="h-5 w-5" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-foreground">{formatCurrency(businessNetIncome)}</div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold mt-1.5 pt-1.5 border-t">
                        <span>{standardCount} active listings</span>
                        <Badge variant="outline" className="text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 border-blue-500/30">60/40 Split</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-teal-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Virtual Storefronts</p>
                        <CardTitle className="text-base font-black mt-0.5">Highstreet Rent</CardTitle>
                    </div>
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                        <Store className="h-5 w-5" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-foreground">{formatCurrency(highstreetNetIncome)}</div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold mt-1.5 pt-1.5 border-t">
                        <span>{highstreetCount} storefronts</span>
                        <Badge variant="outline" className="text-[9px] font-mono font-bold bg-teal-500/10 text-teal-600 border-teal-500/30">100% Admin</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-purple-600 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Multi-Hub Groups</p>
                        <CardTitle className="text-base font-black mt-0.5">Enterprise Hubs</CardTitle>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                        <Handshake className="h-5 w-5" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-foreground">{formatCurrency(enterpriseNetIncome)}</div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold mt-1.5 pt-1.5 border-t">
                        <span>{enterpriseBizCount} enterprise</span>
                        <Badge variant="outline" className="text-[9px] font-mono font-bold bg-purple-500/10 text-purple-600 border-purple-500/30">100% Admin</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Platform Campaigns</p>
                        <CardTitle className="text-base font-black mt-0.5">National Ads</CardTitle>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                        <Globe className="h-5 w-5" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-foreground">{formatCurrency(nationalNetIncome)}</div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold mt-1.5 pt-1.5 border-t">
                        <span>{payingAdvertiserCount} sponsors</span>
                        <Badge variant="outline" className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 border-amber-500/30">100% Admin</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Payouts Ledger Card */}
        <Card className="border-t-4 border-t-emerald-600 shadow-md">
            <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold">Community Payout Ledger</CardTitle>
                        <CardDescription>Verified listing fee splits and dividend distribution records across community hubs.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {isFiltered && (
                            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="font-bold text-xs uppercase text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10">
                                <FilterX className="mr-1.5 h-4 w-4" /> Reset Filters
                            </Button>
                        )}
                        <Button onClick={handleExportCSV} className="font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
                            <Download className="h-4 w-4" /> Export CSV Ledger
                        </Button>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    {/* Search input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search community, ID, transaction..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 border-2 bg-background font-medium text-xs"
                        />
                    </div>

                    {/* Status filter */}
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="h-10 border-2 bg-background font-bold text-xs">
                            <SelectValue placeholder="All Payout Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Payout Statuses</SelectItem>
                            <SelectItem value="Pending">Pending Cycle</SelectItem>
                            <SelectItem value="In transit">In Transit</SelectItem>
                            <SelectItem value="Paid">Paid Out</SelectItem>
                            <SelectItem value="Failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Eligibility filter */}
                    <Select value={selectedEligibility} onValueChange={setSelectedEligibility}>
                        <SelectTrigger className="h-10 border-2 bg-background font-bold text-xs">
                            <SelectValue placeholder="All Eligibility" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Communities</SelectItem>
                            <SelectItem value="eligible">Stripe Connected (Eligible)</SelectItem>
                            <SelectItem value="ineligible">Stripe Setup Missing</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Date Picker Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn("h-10 border-2 bg-background justify-start text-left font-bold text-xs truncate", !dateRange && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-emerald-500 shrink-0" />
                                {dateRange?.from ? (
                                    dateRange.to ? `${format(dateRange.from, "dd MMM")} - ${format(dateRange.to, "dd MMM yyyy")}` : format(dateRange.from, "dd MMM yyyy")
                                ) : (
                                    <span>Pick Cycle Window</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <div className="p-3 border-b bg-muted/40 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Quick Presets:</span>
                                <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('today')}>Today</Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('1m')}>1m</Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('3m')}>3m</Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => handleQuickRange('1y')}>1y</Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-emerald-600" onClick={() => handleQuickRange('all')}>All</Button>
                                </div>
                            </div>
                            <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead><Button variant="ghost" onClick={() => handleSort('date')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Cycle <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => handleSort('community')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Community Hub <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead className="text-center font-bold text-xs uppercase tracking-widest">Active Listings</TableHead>
                                <TableHead><Button variant="ghost" onClick={() => handleSort('amount')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Split Amount <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => handleSort('status')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => handleSort('isEligible')} className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest">Stripe Connect <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                <TableHead className="hidden md:table-cell text-right font-bold text-xs uppercase tracking-widest pr-6">Transaction ID</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loading ? (
                             <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                                    <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest">Calculating financial balances...</p>
                                </TableCell>
                            </TableRow>
                        ) : paginatedPayouts.length > 0 ? (
                            paginatedPayouts.map((payout) => (
                                <TableRow key={payout.transactionId} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium text-xs">
                                        {format(new Date(payout.date), "MMMM yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-foreground">{payout.community}</span>
                                            <span className="text-[10px] font-mono text-muted-foreground">{payout.communityId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="font-bold text-xs">
                                            {payout.businessCount} {payout.businessCount === 1 ? 'business' : 'businesses'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(payout.amount)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <PayoutStatusBadge status={payout.status} />
                                    </TableCell>
                                    <TableCell>
                                        <EligibilityBadge isEligible={payout.isEligible} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-right font-mono text-[10px] text-muted-foreground pr-6">
                                        {payout.transactionId}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={7} className="h-40 text-center text-muted-foreground italic">
                                No financial payout records matching the selected criteria.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
                <div className="pt-4">
                    <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={filteredAndSortedPayouts.length} />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
