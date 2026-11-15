
"use client";

import { useState, useEffect } from "react";
import {
    DollarSign,
    Building2,
    HeartHandshake,
    Globe,
    Save,
    Loader2,
    ShoppingBag,
    Calendar,
    GalleryHorizontal,
    BadgeCheck,
    Store,
    ArrowRightLeft,
    Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useFirestore } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { 
    getPricingPlans, 
    savePricingPlan, 
    type Plan, 
    type AdvertiserPlan, 
    type StorefrontPlan,
    DEFAULT_BUSINESS_PLAN,
    DEFAULT_STOREFRONT_PLAN,
    DEFAULT_ENTERPRISE_PLAN,
    DEFAULT_ADVERTISER_PLAN,
} from "@/lib/actions/pricingActions";
import { Skeleton } from "@/components/ui/skeleton";


const PlanFeature = ({ icon, children }: { icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <div className="mt-1 text-primary">{icon}</div>
        <div className="text-sm w-full">{children}</div>
    </div>
);


const PricingCard = ({ title, description, icon, children, onSave, isSaving }: { title: string, description: string, icon: React.ReactNode, children: React.ReactNode, onSave: () => void, isSaving: boolean }) => (
    <Card className="flex flex-col">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                {icon}
                {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 flex-grow">
            {children}
        </CardContent>
        <CardFooter>
            <Button onClick={onSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
            </Button>
        </CardFooter>
    </Card>
);

const PricingCardSkeleton = () => (
     <Card className="flex flex-col">
        <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-6 flex-grow">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
            <Separator />
            <div className="space-y-4">
                 <Skeleton className="h-5 w-1/4" />
                 <Skeleton className="h-16 w-full" />
                 <Skeleton className="h-16 w-full" />
            </div>
        </CardContent>
        <CardFooter>
            <Skeleton className="h-10 w-32" />
        </CardFooter>
    </Card>
)


export default function AdminPricingPage() {
    const db = useFirestore();
    const [businessPlan, setBusinessPlan] = useState<Plan>(DEFAULT_BUSINESS_PLAN);
    const [storefrontPlan, setStorefrontPlan] = useState<StorefrontPlan>(DEFAULT_STOREFRONT_PLAN);
    const [enterprisePlan, setEnterprisePlan] = useState<Plan>(DEFAULT_ENTERPRISE_PLAN);
    const [advertiserPlan, setAdvertiserPlan] = useState<AdvertiserPlan>(DEFAULT_ADVERTISER_PLAN);
    
    const [isLoading, setIsLoading] = useState(true);
    const [savingStates, setSavingStates] = useState({
        business: false,
        storefront: false,
        enterprise: false,
        advertiser: false,
    });
    
    const { toast } = useToast();
    
    useEffect(() => {
        let isMounted = true;

        const fetchPlans = async () => {
            setIsLoading(true);

            // 1. Try client Firestore SDK first (direct, authenticated, bypasses server actions)
            if (db) {
                try {
                    const [bSnap, sSnap, eSnap, aSnap] = await Promise.all([
                        getDoc(doc(db, 'pricing_plans', 'business')),
                        getDoc(doc(db, 'pricing_plans', 'storefront')),
                        getDoc(doc(db, 'pricing_plans', 'enterprise')),
                        getDoc(doc(db, 'pricing_plans', 'advertiser')),
                    ]);

                    if (isMounted) {
                        if (bSnap.exists()) setBusinessPlan({ ...DEFAULT_BUSINESS_PLAN, ...(bSnap.data() as Plan) });
                        if (sSnap.exists()) setStorefrontPlan({ ...DEFAULT_STOREFRONT_PLAN, ...(sSnap.data() as StorefrontPlan) });
                        if (eSnap.exists()) setEnterprisePlan({ ...DEFAULT_ENTERPRISE_PLAN, ...(eSnap.data() as Plan) });
                        if (aSnap.exists()) setAdvertiserPlan({ ...DEFAULT_ADVERTISER_PLAN, ...(aSnap.data() as AdvertiserPlan) });
                        setIsLoading(false);
                        return;
                    }
                } catch (clientErr) {
                    console.warn("Client Firestore fetch failed, trying server action:", clientErr);
                }
            }

            // 2. Fallback to server action
            try {
                const plans = await getPricingPlans();
                if (isMounted) {
                    if (plans.business) setBusinessPlan({ ...DEFAULT_BUSINESS_PLAN, ...plans.business });
                    if (plans.storefront) setStorefrontPlan({ ...DEFAULT_STOREFRONT_PLAN, ...plans.storefront });
                    if (plans.enterprise) setEnterprisePlan({ ...DEFAULT_ENTERPRISE_PLAN, ...plans.enterprise });
                    if (plans.advertiser) setAdvertiserPlan({ ...DEFAULT_ADVERTISER_PLAN, ...plans.advertiser });
                }
            } catch (err) {
                console.error("Error fetching pricing plans:", err);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchPlans();

        return () => {
            isMounted = false;
        };
    }, [db]);

    const handleSave = async (planName: 'business' | 'storefront' | 'enterprise' | 'advertiser') => {
        setSavingStates(prev => ({ ...prev, [planName]: true }));
        
        let dataToSave;
        if (planName === 'business' && businessPlan) {
            dataToSave = {
                monthlyPrice: Number(businessPlan.monthlyPrice) || 0,
                annualPrice: Number(businessPlan.annualPrice) || 0,
                adverts: Number(businessPlan.adverts) || 0,
                events: Number(businessPlan.events) || 0,
                galleryImages: Number(businessPlan.galleryImages) || 0,
                additionalAdvertPrice: Number(businessPlan.additionalAdvertPrice) || 0,
                additionalEventPrice: Number(businessPlan.additionalEventPrice) || 0,
            };
        } else if (planName === 'storefront' && storefrontPlan) {
            dataToSave = {
                monthlyPrice: Number(storefrontPlan.monthlyPrice) || 0,
                annualPrice: Number(storefrontPlan.annualPrice) || 0,
            };
        } else if (planName === 'enterprise' && enterprisePlan) {
            dataToSave = {
                monthlyPrice: Number(enterprisePlan.monthlyPrice) || 0,
                annualPrice: Number(enterprisePlan.annualPrice) || 0,
                adverts: Number(enterprisePlan.adverts) || 0,
                events: Number(enterprisePlan.events) || 0,
                galleryImages: Number(enterprisePlan.galleryImages) || 0,
                featuredPartner: enterprisePlan.featuredPartner || false,
                additionalAdvertPrice: Number(enterprisePlan.additionalAdvertPrice) || 0,
                additionalEventPrice: Number(enterprisePlan.additionalEventPrice) || 0,
            };
        } else if (planName === 'advertiser' && advertiserPlan) {
            dataToSave = {
                featuredAdPrice: Number(advertiserPlan.featuredAdPrice) || 0,
                partnerAdPrice: Number(advertiserPlan.partnerAdPrice) || 0,
                galleryImages: Number(advertiserPlan.galleryImages) || 0,
            };
        } else {
            toast({ title: "Error", description: "No data to save.", variant: "destructive" });
            setSavingStates(prev => ({ ...prev, [planName]: false }));
            return;
        }

        // Try saving directly via client Firestore SDK first
        if (db) {
            try {
                await setDoc(doc(db, 'pricing_plans', planName), {
                    ...dataToSave,
                    updatedAt: serverTimestamp(),
                }, { merge: true });

                toast({
                    title: "Pricing Saved",
                    description: `The pricing for ${planName} has been updated successfully.`,
                });
                setSavingStates(prev => ({ ...prev, [planName]: false }));
                return;
            } catch (clientSaveErr: any) {
                console.warn("Client Firestore save failed, trying server action:", clientSaveErr);
            }
        }

        // Fallback to server action
        const result = await savePricingPlan(planName, dataToSave);

        if (result.success) {
             toast({
                title: "Pricing Saved",
                description: `The pricing for ${planName} has been updated.`,
            });
        } else {
             toast({
                title: "Error",
                description: result.error || "Failed to save pricing plan.",
                variant: "destructive",
            });
        }
       
        setSavingStates(prev => ({ ...prev, [planName]: false }));
    };

    if (isLoading) {
        return (
             <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <DollarSign className="h-8 w-8" />
                        Pricing Management
                    </h1>
                    <p className="text-muted-foreground">
                        Set and manage pricing for subscriptions and services across the platform.
                    </p>
                </div>
                <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-8 items-start">
                    <PricingCardSkeleton />
                    <PricingCardSkeleton />
                    <PricingCardSkeleton />
                    <PricingCardSkeleton />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <DollarSign className="h-8 w-8" />
                    Pricing Management
                </h1>
                <p className="text-muted-foreground">
                    Set and manage pricing for subscriptions and services across the platform.
                </p>
            </div>
            
            <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-8 items-start">
                 <PricingCard
                    title="Business Listing"
                    description="Base subscription for local businesses."
                    icon={<Building2 className="h-6 w-6" />}
                    onSave={() => handleSave('business')}
                    isSaving={savingStates.business}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="business-monthly">Monthly Price (£)</Label>
                            <Input id="business-monthly" type="number" value={businessPlan?.monthlyPrice ?? 0} onChange={e => setBusinessPlan(p => ({...(p || {}), monthlyPrice: Number(e.target.value)} as Plan))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="business-annual">Annual Price (£)</Label>
                            <Input id="business-annual" type="number" value={businessPlan?.annualPrice ?? 0} onChange={e => setBusinessPlan(p => ({...(p || {}), annualPrice: Number(e.target.value)} as Plan))} />
                        </div>
                    </div>
                     <Separator />
                     <div className="space-y-4">
                        <h4 className="font-medium">Included Features</h4>
                        <PlanFeature icon={<ShoppingBag />}>
                             <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="business-adverts" className="whitespace-nowrap">Free adverts</Label>
                                    <Input id="business-adverts" type="number" className="h-8 w-20" value={businessPlan?.adverts ?? 0} onChange={e => setBusinessPlan(p => ({...(p || {}), adverts: Number(e.target.value)} as Plan))} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="business-add-advert" className="text-xs whitespace-nowrap">Price per additional (£)</Label>
                                    <Input id="business-add-advert" type="number" value={businessPlan?.additionalAdvertPrice ?? 0} onChange={e => setBusinessPlan(p => ({...(p || {}), additionalAdvertPrice: Number(e.target.value)} as Plan))} className="h-8 w-20" />
                                </div>
                            </div>
                        </PlanFeature>
                        <PlanFeature icon={<Calendar />}>
                             <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="business-events" className="whitespace-nowrap">Free events / year</Label>
                                    <Input id="business-events" type="number" className="h-8 w-20" value={businessPlan?.events ?? 0} onChange={e => setBusinessPlan(p => ({...(p || {}), events: Number(e.target.value)} as Plan))} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="business-add-event" className="text-xs whitespace-nowrap">Price per additional (£)</Label>
                                    <Input id="business-add-event" type="number" value={businessPlan?.additionalEventPrice ?? 0} onChange={e => setBusinessPlan(p => ({...(p || {}), additionalEventPrice: Number(e.target.value)} as Plan))} className="h-8 w-20" />
                                </div>
                            </div>
                        </PlanFeature>
                         <PlanFeature icon={<GalleryHorizontal />}>
                             <div className="flex items-center gap-2">
                                <Label htmlFor="business-gallery" className="whitespace-nowrap">Gallery images</Label>
                                <Input id="business-gallery" type="number" className="h-8 w-20" value={businessPlan?.galleryImages ?? 0} onChange={e => setBusinessPlan(p => ({...(p || {}), galleryImages: Number(e.target.value)} as Plan))} />
                            </div>
                        </PlanFeature>
                     </div>
                </PricingCard>

                 <PricingCard
                    title="Storefront Add-on"
                    description="Optional e-commerce storefront for businesses."
                    icon={<Store className="h-6 w-6" />}
                    onSave={() => handleSave('storefront')}
                    isSaving={savingStates.storefront}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="store-monthly">Monthly Price (£)</Label>
                            <Input id="store-monthly" type="number" value={storefrontPlan?.monthlyPrice ?? 0} onChange={e => setStorefrontPlan(p => ({...(p || {}), monthlyPrice: Number(e.target.value)} as StorefrontPlan))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="store-annual">Annual Price (£)</Label>
                            <Input id="store-annual" type="number" value={storefrontPlan?.annualPrice ?? 0} onChange={e => setStorefrontPlan(p => ({...(p || {}), annualPrice: Number(e.target.value)} as StorefrontPlan))} />
                        </div>
                    </div>
                </PricingCard>

                 <PricingCard
                    title="Enterprise Account"
                    description="Pricing for enterprise partnerships."
                    icon={<HeartHandshake className="h-6 w-6" />}
                    onSave={() => handleSave('enterprise')}
                    isSaving={savingStates.enterprise}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="enterprise-monthly">Monthly Price (£)</Label>
                            <Input id="enterprise-monthly" type="number" value={enterprisePlan?.monthlyPrice ?? 0} onChange={e => setEnterprisePlan(p => ({...(p || {}), monthlyPrice: Number(e.target.value)} as Plan))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="enterprise-annual">Annual Price (£)</Label>
                            <Input id="enterprise-annual" type="number" value={enterprisePlan?.annualPrice ?? 0} onChange={e => setEnterprisePlan(p => ({...(p || {}), annualPrice: Number(e.target.value)} as Plan))} />
                        </div>
                    </div>
                     <Separator />
                     <div className="space-y-4">
                        <h4 className="font-medium">Included Features</h4>
                       <PlanFeature icon={<ShoppingBag />}>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="enterprise-adverts" className="whitespace-nowrap">Included adverts</Label>
                                    <Input id="enterprise-adverts" type="number" className="h-8 w-20" value={enterprisePlan?.adverts ?? 0} onChange={e => setEnterprisePlan(p => ({...(p || {}), adverts: Number(e.target.value)} as Plan))} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="enterprise-add-advert" className="text-xs whitespace-nowrap">Price per additional (£)</Label>
                                    <Input id="enterprise-add-advert" type="number" value={enterprisePlan?.additionalAdvertPrice ?? 0} onChange={e => setEnterprisePlan(p => ({...(p || {}), additionalAdvertPrice: Number(e.target.value)} as Plan))} className="h-8 w-20" />
                                </div>
                            </div>
                        </PlanFeature>
                        <PlanFeature icon={<Calendar />}>
                             <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="enterprise-events" className="whitespace-nowrap">Included events / year</Label>
                                    <Input id="enterprise-events" type="number" className="h-8 w-20" value={enterprisePlan?.events ?? 0} onChange={e => setEnterprisePlan(p => ({...(p || {}), events: Number(e.target.value)} as Plan))} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="enterprise-add-event" className="text-xs whitespace-nowrap">Price per additional (£)</Label>
                                    <Input id="enterprise-add-event" type="number" value={enterprisePlan?.additionalEventPrice ?? 0} onChange={e => setEnterprisePlan(p => ({...(p || {}), additionalEventPrice: Number(e.target.value)} as Plan))} className="h-8 w-20" />
                                </div>
                            </div>
                        </PlanFeature>
                        <PlanFeature icon={<GalleryHorizontal />}>
                             <div className="flex items-center gap-2">
                                <Label htmlFor="enterprise-gallery" className="whitespace-nowrap">Gallery images</Label>
                                <Input id="enterprise-gallery" type="number" className="h-8 w-20" value={enterprisePlan?.galleryImages ?? 0} onChange={e => setEnterprisePlan(p => ({...(p || {}), galleryImages: Number(e.target.value)} as Plan))} />
                            </div>
                        </PlanFeature>
                        <div className="flex items-center justify-between text-sm">
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <BadgeCheck />
                                <span>Featured Partner Status</span>
                            </div>
                           <Switch checked={enterprisePlan?.featuredPartner ?? false} onCheckedChange={c => setEnterprisePlan(p => ({...(p || {}), featuredPartner: c} as Plan))} />
                        </div>
                     </div>
                </PricingCard>

                <PricingCard
                    title="National Advertiser"
                    description="Pricing for platform-wide adverts."
                    icon={<Globe className="h-6 w-6" />}
                    onSave={() => handleSave('advertiser')}
                    isSaving={savingStates.advertiser}
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="featured-ad">Featured Ad Price (£)</Label>
                            <Input id="featured-ad" type="number" value={advertiserPlan?.featuredAdPrice ?? 0} onChange={e => setAdvertiserPlan(p => ({...(p || {}), featuredAdPrice: Number(e.target.value)} as AdvertiserPlan))} />
                             <p className="text-xs text-muted-foreground">Price per country, per month.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="partner-ad">Partner Ad Price (£)</Label>
                            <Input id="partner-ad" type="number" value={advertiserPlan?.partnerAdPrice ?? 0} onChange={e => setAdvertiserPlan(p => ({...(p || {}), partnerAdPrice: Number(e.target.value)} as AdvertiserPlan))} />
                             <p className="text-xs text-muted-foreground">Price per country, per month.</p>
                        </div>
                        <Separator />
                        <PlanFeature icon={<GalleryHorizontal />}>
                             <div className="flex items-center gap-2">
                                <Label htmlFor="advertiser-gallery" className="whitespace-nowrap">Gallery images</Label>
                                <Input id="advertiser-gallery" type="number" value={advertiserPlan?.galleryImages ?? 0} onChange={e => setAdvertiserPlan(p => ({...(p || {}), galleryImages: Number(e.target.value)} as AdvertiserPlan))} />
                            </div>
                        </PlanFeature>
                    </div>
                </PricingCard>
            </div>

            {/* Payment Split & Revenue Distribution Breakdown */}
            <Card className="border-2 shadow-sm">
                <CardHeader className="bg-muted/10 border-b">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ArrowRightLeft className="h-5 w-5 text-primary" />
                                Payment Split & Automated Revenue Distribution
                            </CardTitle>
                            <CardDescription>
                                Exact payment splits and transfer mechanisms currently implemented in the codebase.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs py-1 px-3 w-fit">
                            Live Codebase Routing
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="font-bold text-foreground">Payment Type</TableHead>
                                    <TableHead className="font-bold text-foreground">Community Leader</TableHead>
                                    <TableHead className="font-bold text-foreground">Community Courier</TableHead>
                                    <TableHead className="font-bold text-foreground">Business / Merchant</TableHead>
                                    <TableHead className="font-bold text-foreground">Platform (You)</TableHead>
                                    <TableHead className="font-bold text-foreground">How It Transfers</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        <div className="font-semibold text-foreground">Event Till / QR Donations</div>
                                        <div className="text-xs font-mono text-muted-foreground">community_pos, community_donation</div>
                                    </TableCell>
                                    <TableCell className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        100%
                                        <span className="text-xs font-normal text-muted-foreground block">(minus third-party Stripe fee only)</span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">—</TableCell>
                                    <TableCell className="text-muted-foreground">—</TableCell>
                                    <TableCell className="text-xs">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">0% (£0)</span>
                                        <span className="text-muted-foreground block font-medium">Platform takes nothing (0% platform fee; only Stripe processing fees apply)</span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <Badge variant="secondary" className="font-normal text-[11px] leading-tight text-left">
                                            Automatic Destination Charge (transfer_data.destination) at payment time
                                        </Badge>
                                    </TableCell>
                                </TableRow>

                                <TableRow>
                                    <TableCell className="font-medium">
                                        <div className="font-semibold text-foreground">Storefront Subscriptions</div>
                                        <div className="text-xs font-mono text-muted-foreground">storefront, enterprise_storefront</div>
                                    </TableCell>
                                    <TableCell className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        10%
                                        <span className="text-xs font-normal text-muted-foreground block">of amount_paid</span>
                                    </TableCell>
                                    <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                                        40%
                                        <span className="text-xs font-normal text-muted-foreground block">of amount_paid</span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">—</TableCell>
                                    <TableCell className="text-xs">
                                        <span className="font-semibold text-purple-600 dark:text-purple-400">50%</span>
                                        <span className="text-muted-foreground block">(covers Stripe fees)</span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <Badge variant="secondary" className="font-normal text-[11px] leading-tight text-left">
                                            Webhook transfer on invoice.payment_succeeded
                                        </Badge>
                                    </TableCell>
                                </TableRow>

                                <TableRow>
                                    <TableCell className="font-medium">
                                        <div className="font-semibold text-foreground">Business / Enterprise Listing Subscriptions</div>
                                        <div className="text-xs font-mono text-muted-foreground">listing, enterprise</div>
                                    </TableCell>
                                    <TableCell className="text-amber-600 dark:text-amber-400 font-medium">
                                        0% automatic
                                        <span className="text-xs text-muted-foreground block">(UI estimates 40%, see note below)</span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">—</TableCell>
                                    <TableCell className="text-muted-foreground">—</TableCell>
                                    <TableCell className="text-xs">
                                        <span className="font-semibold text-purple-600 dark:text-purple-400">100%</span>
                                        <span className="text-muted-foreground block">(unless paid out separately)</span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <Badge variant="outline" className="font-normal text-[11px] text-muted-foreground leading-tight text-left">
                                            Not split in webhook
                                        </Badge>
                                    </TableCell>
                                </TableRow>

                                <TableRow>
                                    <TableCell className="font-medium">
                                        <div className="font-semibold text-foreground">Shopping Cart Checkout</div>
                                        <div className="text-xs font-mono text-muted-foreground">cart_checkout</div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">—</TableCell>
                                    <TableCell className="text-blue-600 dark:text-blue-400 text-xs">
                                        <span className="font-semibold">Delivery fee</span>
                                        <span className="text-muted-foreground block">(minus proportional Stripe fee, if local_courier)</span>
                                    </TableCell>
                                    <TableCell className="text-foreground text-xs">
                                        <span className="font-semibold">Item subtotal</span>
                                        <span className="text-muted-foreground block">(minus proportional Stripe fee)</span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <span className="font-semibold text-foreground">1.5% + 20p</span>
                                        <span className="text-muted-foreground block">(covers Stripe fee; 0% markup)</span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <Badge variant="secondary" className="font-normal text-[11px] leading-tight text-left">
                                            Webhook transfer on checkout.session.completed
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <Alert className="bg-primary/5 border-primary/20">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-xs font-black uppercase tracking-widest">
                            Important Implementation Note: Listing Subscriptions vs. Financials Dashboard
                        </AlertTitle>
                        <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
                            In <code className="text-xs font-mono font-semibold text-foreground">financials/page.tsx</code>, the dashboard calculates an estimated <strong>40% community share</strong> (or <code className="text-xs font-mono text-foreground">communityData.revenueShare</code>) on listing subscriptions for leadership performance metrics. However, in the Stripe webhook layer, listing subscriptions currently route 100% to the platform account and are not automatically split unless distributed via manual payout.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}

  