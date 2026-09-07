
'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { mockPartners } from '@/lib/mock-data';
import Image from 'next/image';
import { Button } from './ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';

type PartnerAd = {
  id: string;
  headline: string;
  image?: string;
  link?: string;
  fullDescription?: string;
  description?: string; // for mock data
  logo?: { imageUrl: string; imageHint: string; }; // for mock data
  name?: string; // for mock data
  targetCountries?: string[];
  targetAgeRanges?: string[];
  targetGender?: 'all' | 'male' | 'female';
  type: 'featured' | 'partner';
  targetCategories?: string[];
};

export function ValuedPartners() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const partnersQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(
            collection(db, 'adverts'),
            where('status', '==', 'Active')
        );
    }, [db]);

    const { data: activeAdverts, isLoading: partnersLoading } = useCollection<PartnerAd>(partnersQuery);
    
    const partners = React.useMemo(() => {
        if (!activeAdverts) return [];
        return activeAdverts.filter(ad => ad.type === 'partner');
    }, [activeAdverts]);

    const [randomPartners, setRandomPartners] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (partnersLoading || profileLoading) return;

        const sourceAds = (partners && partners.length > 0) ? partners : mockPartners.map(p => ({
            id: p.id,
            headline: p.name,
            image: p.logo?.imageUrl,
            link: '#',
            fullDescription: p.description,
        }));

        let eligibleAds: PartnerAd[] = [];
        
        if (user && userProfile && userProfile.settings?.adPersonalization) {
            const userCategories = userProfile.settings.selectedCategories || [];
            
            if (userCategories.length === 0) {
                 eligibleAds = sourceAds;
            } else {
                 eligibleAds = sourceAds.filter(ad => {
                    const categoryMatch = !ad.targetCategories || ad.targetCategories.length === 0 || ad.targetCategories.some(cat => userCategories.includes(cat));
                    return categoryMatch;
                });
            }
        } else {
             eligibleAds = sourceAds;
        }
        
        // Fallback if filtering results in an empty list
        if (eligibleAds.length === 0 && sourceAds.length > 0) {
            eligibleAds = sourceAds;
        }

        const shuffled = [...eligibleAds].sort(() => 0.5 - Math.random());
        setRandomPartners(shuffled);

    }, [partners, user, userProfile, partnersLoading, profileLoading]);
    
    const isLoading = isUserLoading || profileLoading || partnersLoading;
    const extendedPartners = [...randomPartners, ...randomPartners]; // For seamless scroll

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Our Valued Partners</CardTitle>
                    <CardDescription>Organizations we work with to improve our communities.</CardDescription>
                </CardHeader>
                <CardContent className="h-24 flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }
    
    if (randomPartners.length === 0) return null;

    return (
        <Card className="overflow-hidden">
        <CardHeader>
            <CardTitle>Our Valued Partners</CardTitle>
            <CardDescription>Organizations we work with to improve our communities.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-200px),transparent_100%)]">
                <div className="flex items-center justify-center md:justify-start [&_>_*]:mx-4 animate-marquee-fast">
                    {extendedPartners.map((partner, index) => (
                        <Dialog key={`${partner.id}-${index}`}>
                            <DialogTrigger asChild>
                                <div className="block group w-32 flex-shrink-0 cursor-pointer">
                                    <div className="flex flex-col items-center text-center gap-2">
                                        {partner.image &&
                                        <div className="relative h-20 w-40">
                                        <Image
                                            src={partner.image}
                                            alt={partner.headline}
                                            fill
                                            className="object-contain"
                                        />
                                        </div>
                                        }
                                    <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">{partner.headline}</p>
                                    </div>
                                </div>
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-xl">
                                <DialogHeader>
                                    <DialogTitle>{partner.headline}</DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="max-h-[60vh] pr-6">
                                <div className="py-4 space-y-4">
                                     <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                                        <Image src={partner.image} alt={partner.headline} fill className="object-contain p-4" />
                                    </div>
                                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: partner.fullDescription || partner.description }} />
                                </div>
                                </ScrollArea>
                                <DialogFooter>
                                    <Button asChild variant="outline">
                                        <Link href={partner.link || '#'} target="_blank">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Visit Site
                                        </Link>
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    ))}
                </div>
            </div>
        </CardContent>
        </Card>
    );
}
    