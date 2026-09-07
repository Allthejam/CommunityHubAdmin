
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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getPricingPlans, savePricingPlan, type Plan, type AdvertiserPlan, type StorefrontPlan } from "@/lib/actions/pricingActions";
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
    const [businessPlan, setBusinessPlan] = useState<Plan | null>(null);
    const [storefrontPlan, setStorefrontPlan] = useState<StorefrontPlan | null>(null);
    const [enterprisePlan, setEnterprisePlan] = useState<Plan | null>(null);
    const [advertiserPlan, setAdvertiserPlan] = useState<AdvertiserPlan | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [savingStates, setSavingStates] = useState({
        business: false,
        storefront: false,
        enterprise: false,
        advertiser: false,
    });
    
    const { toast } = useToast();
    
    useEffect(() => {
        const fetchPlans = async () => {
            setIsLoading(true);
            const plans = await getPricingPlans();
            if (plans.business) setBusinessPlan(plans.business);
            if (plans.storefront) setStorefrontPlan(plans.storefront);
            if (plans.enterprise) setEnterprisePlan(plans.enterprise);
            if (plans.advertiser) setAdvertiserPlan(plans.advertiser);
            setIsLoading(false);
        };
        fetchPlans();
    }, []);

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


        const result = await savePricingPlan(planName, dataToSave);

        if (result.success) {
             toast({
                title: "Pricing Saved",
                description: `The pricing for ${planName} has been updated.`,
            });
        } else {
             toast({
                title: "Error",
                description: result.error,
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
        </div>
    );
}

  