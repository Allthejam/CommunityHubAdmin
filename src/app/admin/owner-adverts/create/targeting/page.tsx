"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { add, format } from "date-fns";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
    ArrowLeft, 
    Send, 
    Target, 
    Info, 
    ChevronDown, 
    Loader2, 
    Save, 
    X, 
    Calendar as CalendarIcon, 
    HelpCircle, 
    CheckCircle2, 
    Sparkles, 
    Globe, 
    Clock, 
    Users, 
    Tag,
    Rocket
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/lib/location-data";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveAdvertAsDraft, submitAdvertForApprovalAction } from "@/lib/actions/advertActions";
import { Badge } from "@/components/ui/badge";
import { doc } from "firebase/firestore";
import { DatePicker } from "@/components/ui/date-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const adCategories = [
    "Sports & Fitness", "Technology & Gaming", "Food & Drink", "Travel & Outdoors",
    "Arts & Culture", "Music & Concerts", "Film & Television", "Reading & Literature",
    "Health & Wellness", "Fashion & Beauty", "Home & Garden", "Business & Finance",
    "Science & Nature", "Education & Learning", "Photography & Video", "DIY & Crafts",
    "Pets & Animals", "Cars & Vehicles", "Family & Parenting", "History & Heritage",
    "Shopping & Retail", "Real Estate", "Environment & Sustainability", "Charity & Volunteering"
];

const ageRanges = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

const MAX_CATEGORIES = 15;
const MAX_COUNTRIES = 10;

type AdData = {
    id?: string;
    type: string;
    headline: string;
    shortDescription: string;
    fullDescription: string;
    primaryLinkType: string;
    websiteLink: string;
    emailAddress: string;
    image: string | null;
    targetCountries?: string[];
    targetCategories?: string[];
    targetGender?: string;
    targetAgeRanges?: string[];
    campaignDurationMonths?: number;
    startDate?: { toDate: () => Date };
    endDate?: { toDate: () => Date };
};

const TargetingAdvertPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const advertType = searchParams.get("type") || 'featured';
    const isOwnerAd = searchParams.get("owner") === 'true';
    const advertId = searchParams.get("id");

    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    
    const [adData, setAdData] = React.useState<AdData | null>(null);
    const [loading, setLoading] = React.useState(true);
    
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([
        "Sports & Fitness", "Technology & Gaming", "Food & Drink", "Arts & Culture", "Health & Wellness"
    ]);
    const [selectedCountries, setSelectedCountries] = React.useState<string[]>(['gb']); // Default UK
    const [campaignDuration, setCampaignDuration] = React.useState<number>(3);
    const [dateRange, setDateRange] = React.useState<{ from: Date | undefined, to: Date | undefined }>({ 
        from: new Date(), 
        to: add(new Date(), { months: 3 }) 
    });
    const [targetGender, setTargetGender] = React.useState('all');
    const [targetAgeRanges, setTargetAgeRanges] = React.useState<string[]>(["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSavingDraft, setIsSavingDraft] = React.useState(false);
    
    const advertRef = useMemoFirebase(() => {
        if (!advertId || !db) return null;
        return doc(db, 'adverts', advertId as string);
    }, [advertId, db]);

    const { data: existingAdvertData, isLoading: advertLoading } = useDoc<AdData>(advertRef);

    React.useEffect(() => {
        const storedData = sessionStorage.getItem('advertPreviewData');
        if (storedData) {
            setAdData(JSON.parse(storedData));
        } else if (existingAdvertData) {
            setAdData(existingAdvertData);
        }

        if (existingAdvertData) {
            if (existingAdvertData.targetCategories && existingAdvertData.targetCategories.length > 0) {
                setSelectedCategories(existingAdvertData.targetCategories);
            }
            if (existingAdvertData.targetGender) {
                setTargetGender(existingAdvertData.targetGender);
            }
            if (existingAdvertData.targetAgeRanges && existingAdvertData.targetAgeRanges.length > 0) {
                setTargetAgeRanges(existingAdvertData.targetAgeRanges);
            }
            const startDate = existingAdvertData.startDate?.toDate ? existingAdvertData.startDate.toDate() : new Date();
            const duration = existingAdvertData.campaignDurationMonths || 3;
            const endDate = existingAdvertData.endDate?.toDate ? existingAdvertData.endDate.toDate() : add(startDate, { months: duration });
            setDateRange({ from: startDate, to: endDate });
            setCampaignDuration(duration);
            if (existingAdvertData.targetCountries) {
                const countryValues = existingAdvertData.targetCountries
                    .map(name => countries.find(c => c.label === name)?.value)
                    .filter((value): value is string => !!value);
                if (countryValues.length > 0) {
                    setSelectedCountries(countryValues);
                }
            }
        }
        
        if (!advertLoading) {
            setLoading(false);
        }
    }, [existingAdvertData, advertLoading]);

    React.useEffect(() => {
        const newEndDate = dateRange.from ? add(dateRange.from, { months: campaignDuration }) : undefined;
        setDateRange(prev => ({ ...prev, to: newEndDate }));
    }, [campaignDuration, dateRange.from]);

    const getCampaignData = () => {
        if (!adData) return null;
        return {
            ...adData,
            title: adData.headline,
            ownerId: user?.uid,
            scope: 'platform',
            targetCategories: selectedCategories,
            targetCountries: selectedCountries.map(c => countries.find(country => country.value === c)?.label || c),
            targetGender,
            targetAgeRanges,
            campaignDurationMonths: campaignDuration,
            startDate: dateRange.from,
            endDate: dateRange.to,
            totalCost: 0, // 100% free for platform owner
        };
    };

    const handleSubmit = async () => {
        if (!user || !adData) {
             toast({ title: "Error", description: "You must be logged in to submit a campaign.", variant: "destructive" });
             return;
        }

        setIsSubmitting(true);
        const campaignData = getCampaignData();
        
        const result = await submitAdvertForApprovalAction({
            userId: user.uid,
            advertData: campaignData,
            targeting: {
                categories: selectedCategories,
                gender: targetGender,
                ageRanges: targetAgeRanges,
            }
        });
        
        if (result.success) {
            sessionStorage.removeItem('advertPreviewData');
            toast({ 
                title: 'Campaign Live & Published! 🚀', 
                description: 'Your internal ad campaign is now broadcasting across Community Hub.' 
            });
            router.push('/admin/owner-adverts');
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }

        setIsSubmitting(false);
    };
    
    const handleSaveDraft = async () => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save a draft.", variant: "destructive" });
            return;
        }
        const campaignData = getCampaignData();
        if (!campaignData) {
            toast({ title: "Error", description: "Advert data not found to save as draft.", variant: "destructive" });
            return;
        }

        setIsSavingDraft(true);
        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: { id: advertId, ...campaignData } });

        if (result.success) {
            toast({ title: "Draft Saved", description: "Your campaign progress has been safely stored." });
            sessionStorage.removeItem('advertPreviewData');
            router.push("/admin/owner-adverts");
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingDraft(false);
    };

    const handleCategoryChange = (category: string) => {
        setSelectedCategories(prev => {
            if (prev.includes(category)) {
                return prev.filter(c => c !== category);
            }
            if (prev.length < MAX_CATEGORIES) {
                return [...prev, category];
            }
            toast({
                title: "Category Limit Reached",
                description: `You can select a maximum of ${MAX_CATEGORIES} categories.`,
                variant: "destructive"
            });
            return prev;
        });
    };

    const handleCountryChange = (countryCode: string) => {
        setSelectedCountries(prev => {
            if (prev.includes(countryCode)) {
                return prev.filter(c => c !== countryCode);
            }
            if (prev.length < MAX_COUNTRIES) {
                return [...prev, countryCode];
            }
            toast({
                title: "Country Limit Reached",
                description: `You can select a maximum of ${MAX_COUNTRIES} countries.`,
                variant: "destructive"
            });
            return prev;
        });
    };

    const handleAgeRangeChange = (ageRange: string) => {
        setTargetAgeRanges(prev => 
            prev.includes(ageRange)
                ? prev.filter(c => c !== ageRange)
                : [...prev, ageRange]
        );
    };

    const limitReached = selectedCategories.length >= MAX_CATEGORIES;
    const isReadyForSubmit = 
        selectedCountries.length > 0 &&
        campaignDuration > 0 &&
        targetAgeRanges.length > 0 &&
        selectedCategories.length > 0;
    
    const handleBack = () => {
        let backUrl = `/admin/owner-adverts/create/preview?type=${advertType}`;
        if (isOwnerAd) backUrl += '&owner=true';
        if (advertId) backUrl += `&id=${advertId}`;
        router.push(backUrl);
    };
    
    if (loading || isUserLoading || advertLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }
    
    if (!adData) {
        return (
             <div className="text-center py-20 space-y-4">
                <h1 className="text-2xl font-black">Advert Data Not Found</h1>
                <p className="text-muted-foreground text-sm">It seems the session state was lost. Please return to the creative step.</p>
                <Button variant="outline" onClick={handleBack} className="font-bold text-xs uppercase">
                    Go Back to Preview
                </Button>
             </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Stepper Progress Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Button variant="ghost" size="sm" onClick={handleBack} className="font-bold text-xs uppercase w-fit">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Preview
                </Button>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>1. Content</span>
                    </div>
                    <span className="text-muted-foreground">➔</span>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>2. Preview</span>
                    </div>
                    <span className="text-muted-foreground">➔</span>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-sm">
                        <span>3</span>
                        <span>Targeting &amp; Launch</span>
                    </div>
                </div>
            </div>

            {/* Privilege Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-600/15 via-orange-600/10 to-indigo-950/15 border-2 border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-sm">
                        <Target className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-black text-[10px] uppercase">
                                ✨ Platform Owner Privilege • Free Broadcast
                            </Badge>
                            <span className="text-xs text-muted-foreground font-bold">• Step 3 of 3</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline text-foreground mt-1">
                            Audience Targeting &amp; Launch
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Form Card */}
            <Card className="border-t-4 border-t-amber-500 shadow-md">
                <CardHeader className="bg-gradient-to-r from-amber-500/5 via-transparent to-transparent">
                    <CardTitle className="text-lg font-bold">Configure Campaign Parameters</CardTitle>
                    <CardDescription>Select geographic reach, duration, demographic criteria, and interest tag matching.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-4">
                    {/* Section 1: Geographic & Timing */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <Globe className="h-5 w-5 text-amber-500" />
                            <h2 className="font-bold text-base text-foreground">1. Geographic Reach &amp; Timing</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 items-start">
                            {/* Country Selector */}
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label className="font-bold text-xs uppercase tracking-wider">Target Countries *</Label>
                                    <span className="text-[11px] text-muted-foreground font-semibold">Max {MAX_COUNTRIES}</span>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-10 border-2 font-bold text-xs bg-background">
                                            <span>Select Countries ({selectedCountries.length} active)</span>
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                        <ScrollArea className="h-72">
                                            {countries.map(country => (
                                                <DropdownMenuCheckboxItem
                                                    key={country.value}
                                                    checked={selectedCountries.includes(country.value)}
                                                    onCheckedChange={() => handleCountryChange(country.value)}
                                                    onSelect={(e) => e.preventDefault()}
                                                    className="font-medium text-xs"
                                                >
                                                    {country.label}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </ScrollArea>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {selectedCountries.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 p-2.5 border-2 rounded-xl bg-muted/30 min-h-11">
                                        {selectedCountries.map(val => {
                                            const country = countries.find(c => c.value === val);
                                            return (
                                                <Badge key={val} variant="secondary" className="flex items-center gap-1.5 font-bold text-xs py-1">
                                                    🇬🇧 {country?.label || val}
                                                    <button onClick={() => handleCountryChange(val)} className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 ml-1">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Schedule & Duration */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="font-bold text-xs uppercase tracking-wider">Start Date</Label>
                                    <DatePicker date={dateRange.from} setDate={(date) => setDateRange(prev => ({ ...prev, from: date }))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="font-bold text-xs uppercase tracking-wider">Duration</Label>
                                    <Select onValueChange={(value) => setCampaignDuration(Number(value))} value={String(campaignDuration)}>
                                        <SelectTrigger className="h-10 border-2 font-bold text-xs bg-background">
                                            <SelectValue placeholder="Select duration" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 6, 9, 12].map(month => (
                                                <SelectItem key={month} value={String(month)} className="font-semibold text-xs">
                                                    {month} Month{month > 1 ? 's' : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Demographic Targeting */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <Users className="h-5 w-5 text-blue-500" />
                            <h2 className="font-bold text-base text-foreground">2. Demographic Audience</h2>
                        </div>

                        {/* Gender */}
                        <div className="space-y-3">
                            <Label className="font-bold text-xs uppercase tracking-wider">Target Gender</Label>
                            <RadioGroup value={targetGender} onValueChange={setTargetGender} className="grid grid-cols-3 gap-3 max-w-md">
                                <div className={cn("flex items-center space-x-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all", targetGender === 'all' ? "border-primary bg-primary/5" : "border-border bg-background")}>
                                    <RadioGroupItem value="all" id="gender-all" />
                                    <Label htmlFor="gender-all" className="font-bold text-xs cursor-pointer">All Genders</Label>
                                </div>
                                <div className={cn("flex items-center space-x-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all", targetGender === 'male' ? "border-primary bg-primary/5" : "border-border bg-background")}>
                                    <RadioGroupItem value="male" id="gender-male" />
                                    <Label htmlFor="gender-male" className="font-bold text-xs cursor-pointer">Male</Label>
                                </div>
                                <div className={cn("flex items-center space-x-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all", targetGender === 'female' ? "border-primary bg-primary/5" : "border-border bg-background")}>
                                    <RadioGroupItem value="female" id="gender-female" />
                                    <Label htmlFor="gender-female" className="font-bold text-xs cursor-pointer">Female</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Age Ranges */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <Label className="font-bold text-xs uppercase tracking-wider">Target Age Groups</Label>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="link" className="text-xs p-0 h-auto font-bold text-amber-600">Advertising Compliance Notice</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="text-lg font-black">Age-Appropriate Advertising Policy</DialogTitle>
                                            <DialogDescription>Content Standards &amp; Protection</DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
                                            <p>As the platform administrator, ensure that creative content displayed to audiences aligns with UK advertising standards (ASA/CAP) and child safety guidance.</p>
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button className="font-bold text-xs uppercase">Understood</Button>
                                            </DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                {ageRanges.map(range => (
                                    <div key={range} className={cn("flex items-center space-x-2 p-3 rounded-xl border-2 transition-all cursor-pointer", targetAgeRanges.includes(range) ? "border-amber-500 bg-amber-500/5 font-bold" : "border-border bg-background")}>
                                        <Checkbox 
                                            id={`age-${range}`} 
                                            checked={targetAgeRanges.includes(range)}
                                            onCheckedChange={() => handleAgeRangeChange(range)}
                                        />
                                        <Label htmlFor={`age-${range}`} className="font-bold text-xs cursor-pointer">{range}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Category Matching */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <Tag className="h-5 w-5 text-emerald-500" />
                                <h2 className="font-bold text-base text-foreground">3. Interest &amp; Topic Categories</h2>
                            </div>
                            <Badge variant="outline" className={cn("font-mono font-bold text-xs", selectedCategories.length > MAX_CATEGORIES ? "text-destructive border-destructive" : "text-muted-foreground")}>
                                {selectedCategories.length} / {MAX_CATEGORIES} selected
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                            {adCategories.map(category => {
                                const isChecked = selectedCategories.includes(category);
                                return (
                                    <div 
                                        key={category} 
                                        onClick={() => {
                                            if (limitReached && !isChecked) {
                                                toast({
                                                    title: "Category Limit Reached",
                                                    description: `You can select up to ${MAX_CATEGORIES} categories.`,
                                                    variant: "destructive"
                                                });
                                                return;
                                            }
                                            handleCategoryChange(category);
                                        }}
                                        className={cn(
                                            "flex items-center space-x-2.5 p-3 rounded-xl border-2 transition-all cursor-pointer select-none",
                                            isChecked ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold" : "border-border/70 hover:border-border bg-background text-muted-foreground",
                                            (limitReached && !isChecked) && "opacity-40 cursor-not-allowed"
                                        )}
                                    >
                                        <Checkbox 
                                            id={`cat-${category}`} 
                                            checked={isChecked}
                                            disabled={limitReached && !isChecked}
                                            onCheckedChange={() => {}}
                                        />
                                        <Label 
                                            htmlFor={`cat-${category}`}
                                            className="font-bold text-xs cursor-pointer leading-tight flex-1"
                                        >
                                            {category}
                                        </Label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>

                {/* Footer Navigation */}
                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 p-6 border-t">
                    <Button variant="outline" onClick={handleBack} className="font-bold text-xs uppercase">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Preview
                    </Button>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft} className="font-bold text-xs uppercase">
                            {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Draft
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={!isReadyForSubmit || selectedCategories.length > MAX_CATEGORIES || isSubmitting}
                            className="font-black text-xs uppercase tracking-wider px-8 h-11 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                            Launch Campaign Now
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};

const SuspenseFallback = () => (
    <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
    </div>
);

export default function TargetingOwnerAdvertPage() {
    return (
        <React.Suspense fallback={<SuspenseFallback />}>
            <TargetingAdvertPageContent />
        </React.Suspense>
    );
}
