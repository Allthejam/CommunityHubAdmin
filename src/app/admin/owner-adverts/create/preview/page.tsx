"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    ArrowLeft, 
    Eye, 
    Send, 
    ExternalLink, 
    Mail, 
    ArrowRight, 
    Loader2, 
    Building, 
    Save, 
    Globe, 
    Handshake, 
    Sparkles, 
    CheckCircle2 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { saveAdvertAsDraft } from "@/lib/actions/advertActions";
import { useUser } from "@/firebase";
import { cn } from "@/lib/utils";

type AdData = {
    id?: string;
    type: string;
    headline: string;
    shortDescription: string;
    fullDescription: string;
    image: string | null;
    primaryLinkType: string | null;
    websiteLink: string | null;
    emailAddress: string | null;
};

const FeaturedAdPreviewCard = ({ 
    name, 
    tagline, 
    image, 
    linkType, 
    linkValue, 
    fullDescription 
}: { 
    name: string; 
    tagline: string; 
    image: string; 
    linkType: string | null; 
    linkValue: string | null; 
    fullDescription: string; 
}) => {
    return (
        <Card className="overflow-hidden border-2 shadow-xl rounded-2xl bg-card">
            <div className="grid md:grid-cols-2 items-center">
                <div className="p-6 sm:p-8 lg:p-10 order-2 md:order-1 space-y-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                            🌟 Featured Placement
                        </Badge>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-black font-headline text-foreground leading-tight">{name || 'Headline Placeholder'}</h3>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">{tagline || 'Short summary description of your campaign will appear right here.'}</p>
                    
                    <div className="flex flex-wrap gap-2.5 pt-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="font-bold text-xs uppercase bg-amber-500 hover:bg-amber-600 text-white shadow-md">
                                    Learn More
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black">{name}</DialogTitle>
                                    <DialogDescription>Interactive campaign modal view</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 text-sm leading-relaxed prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: fullDescription || '<p className="text-muted-foreground italic">No detailed description provided.</p>' }} />
                            </DialogContent>
                        </Dialog>

                        {linkType === 'website' && linkValue && (
                            <Button asChild variant="outline" className="font-bold text-xs uppercase border-2">
                                <Link href={linkValue} target="_blank">
                                    <ExternalLink className="mr-1.5 h-4 w-4 text-amber-500" /> Visit Site
                                </Link>
                            </Button>
                        )}
                        {linkType === 'email' && linkValue && (
                            <Button asChild variant="outline" className="font-bold text-xs uppercase border-2">
                                <Link href={`mailto:${linkValue}`}>
                                    <Mail className="mr-1.5 h-4 w-4 text-blue-500" /> Contact Us
                                </Link>
                            </Button>
                        )}
                        {linkType === 'profile' && (
                            <Button asChild variant="outline" className="font-bold text-xs uppercase border-2">
                                <Link href="#" onClick={(e) => e.preventDefault()}>
                                    <Building className="mr-1.5 h-4 w-4 text-emerald-500" /> View Profile
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
                <div className="h-64 md:h-full min-h-[300px] w-full order-1 md:order-2 bg-muted relative">
                    <Image
                        src={image || 'https://picsum.photos/800/600'}
                        alt={name || 'Featured advert'}
                        fill
                        className="object-cover"
                    />
                </div>
            </div>
        </Card>
    );
};

const PartnerAdPreviewCard = ({ 
    name, 
    tagline, 
    image, 
    linkType, 
    linkValue, 
    fullDescription 
}: { 
    name: string; 
    tagline: string; 
    image: string; 
    linkType: string | null; 
    linkValue: string | null; 
    fullDescription: string; 
}) => {
    return (
        <Card className="flex flex-col overflow-hidden border-2 shadow-xl rounded-2xl h-full max-w-sm mx-auto bg-card">
            <div className="aspect-[4/3] w-full relative bg-muted">
                <Image
                    src={image || 'https://picsum.photos/600/450'}
                    alt={name || 'Partner advert'}
                    fill
                    className="object-cover"
                />
                <Badge variant="outline" className="absolute top-3 left-3 bg-blue-600 text-white border-none text-[10px] font-black uppercase tracking-wider shadow-md">
                    🤝 Valued Partner
                </Badge>
            </div>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black">{name || 'Partner Name Placeholder'}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-xs text-muted-foreground leading-relaxed">{tagline || 'Short summary tagline will display here in the partner grid.'}</p>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2 pt-2 border-t bg-muted/20">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full font-bold text-xs uppercase bg-blue-600 hover:bg-blue-700 text-white">
                            Learn More
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">{name}</DialogTitle>
                            <DialogDescription>Partner campaign details</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: fullDescription || '<p className="text-muted-foreground italic">No detailed description provided.</p>' }}/>
                    </DialogContent>
                </Dialog>
                {linkType === 'website' && linkValue && (
                    <Button asChild variant="outline" size="sm" className="w-full font-bold text-xs uppercase border-2">
                        <Link href={linkValue} target="_blank">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-blue-500" /> Visit Website
                        </Link>
                    </Button>
                )}
                {linkType === 'email' && linkValue && (
                    <Button asChild variant="outline" size="sm" className="w-full font-bold text-xs uppercase border-2">
                        <Link href={`mailto:${linkValue}`}>
                            <Mail className="mr-1.5 h-3.5 w-3.5 text-blue-500" /> Send Email
                        </Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

const PreviewPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useUser();
    const advertType = searchParams.get('type') || 'featured';
    const isOwnerAd = searchParams.get('owner') === 'true';
    const advertId = searchParams.get('id');

    const { toast } = useToast();
    const [adData, setAdData] = React.useState<AdData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [isSavingDraft, setIsSavingDraft] = React.useState(false);

    React.useEffect(() => {
        try {
            const storedData = sessionStorage.getItem('advertPreviewData');
            if (storedData) {
                setAdData(JSON.parse(storedData));
            }
        } catch (error) {
            console.error("Failed to parse ad data from sessionStorage", error);
            toast({
                title: "Could not load preview",
                description: "There was an error reading the preview data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }
    
    if (!adData) {
        return (
             <div className="text-center py-20 space-y-4">
                <h1 className="text-2xl font-black">No Preview Data Found</h1>
                <p className="text-muted-foreground text-sm">Please return to the creative step and enter your campaign copy.</p>
                <Button asChild className="font-bold text-xs uppercase">
                    <Link href={`/admin/owner-adverts/create?type=${advertType}&owner=true`}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go to Campaign Editor
                    </Link>
                </Button>
            </div>
        );
    }
    
    const handleSaveDraft = async () => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save a draft.", variant: "destructive" });
            return;
        }
        if (!adData) return;

        setIsSavingDraft(true);
        const draftData = {
            id: adData.id,
            type: adData.type,
            scope: 'platform',
            title: adData.headline,
            headline: adData.headline,
            shortDescription: adData.shortDescription,
            fullDescription: adData.fullDescription,
            primaryLinkType: adData.primaryLinkType,
            websiteLink: adData.websiteLink,
            emailAddress: adData.emailAddress,
            image: adData.image,
        };

        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: draftData });

        if (result.success) {
            toast({ title: "Draft Saved", description: "Your campaign progress has been safely stored." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingDraft(false);
    };

    const { type, headline, shortDescription, image, primaryLinkType, websiteLink, emailAddress, fullDescription } = adData;
    const linkValue = primaryLinkType === 'website' ? websiteLink : emailAddress;
    const isFeatured = type === 'featured';
    const adTypeName = isFeatured ? 'Featured Ad' : 'Partner Ad';

    const handleProceed = () => {
        let targetingUrl = `/admin/owner-adverts/create/targeting?type=${advertType}`;
        if (isOwnerAd) targetingUrl += '&owner=true';
        if (advertId) targetingUrl += `&id=${advertId}`;
        router.push(targetingUrl);
    };
    
    const handleBack = () => {
        let backUrl = `/admin/owner-adverts/create?type=${advertType}`;
        if (isOwnerAd) backUrl += '&owner=true';
        if (advertId) backUrl += `&id=${advertId}`;
        router.push(backUrl);
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Stepper Progress Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Button variant="ghost" size="sm" onClick={handleBack} className="font-bold text-xs uppercase w-fit">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Content
                </Button>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>1. Content</span>
                    </div>
                    <span className="text-muted-foreground">➔</span>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-sm">
                        <span>2</span>
                        <span>Live Preview</span>
                    </div>
                    <span className="text-muted-foreground">➔</span>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-bold text-xs uppercase tracking-wider">
                        <span>3</span>
                        <span>Targeting</span>
                    </div>
                </div>
            </div>

            {/* Live Preview Info Banner */}
            <div className={cn("p-6 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm", isFeatured ? "bg-amber-500/10 border-amber-500/30" : "bg-blue-500/10 border-blue-500/30")}>
                <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl shadow-sm", isFeatured ? "bg-amber-500 text-white" : "bg-blue-600 text-white")}>
                        <Eye className="h-7 w-7" />
                    </div>
                    <div>
                        <Badge variant="outline" className={cn("font-black text-[10px] uppercase", isFeatured ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40" : "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40")}>
                            {adTypeName} Simulation
                        </Badge>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline text-foreground mt-1">
                            Live Interactive Preview
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Test buttons, popups, and formatting exactly as Community Hub visitors will experience them.
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Live Mockup Container */}
            <div className="flex justify-center items-center py-4">
                <div className="w-full max-w-4xl">
                    {isFeatured ? (
                        <FeaturedAdPreviewCard 
                            name={headline} 
                            tagline={shortDescription} 
                            image={image || 'https://picsum.photos/800/600'} 
                            linkType={primaryLinkType} 
                            linkValue={linkValue} 
                            fullDescription={fullDescription} 
                        />
                    ) : (
                        <PartnerAdPreviewCard 
                            name={headline} 
                            tagline={shortDescription} 
                            image={image || 'https://picsum.photos/600/450'} 
                            linkType={primaryLinkType} 
                            linkValue={linkValue} 
                            fullDescription={fullDescription} 
                        />
                    )}
                </div>
            </div>

            {/* Footer Navigation Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-muted/40 border-2">
                <Button onClick={handleBack} variant="outline" className="font-bold text-xs uppercase">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back &amp; Edit
                </Button>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft} className="font-bold text-xs uppercase">
                        {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Draft
                    </Button>
                    <Button onClick={handleProceed} className="font-black text-xs uppercase tracking-wider px-6 h-11 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md">
                        Proceed to Targeting <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

const SuspenseFallback = () => (
    <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
    </div>
);

export default function PreviewOwnerAdvertPage() {
    return (
        <React.Suspense fallback={<SuspenseFallback />}>
            <PreviewPageContent />
        </React.Suspense>
    );
}
