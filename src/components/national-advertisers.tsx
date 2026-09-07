'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { mockNationalAdverts } from '@/lib/mock-data';
import Image from 'next/image';
import { Button } from './ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';

type Advert = {
  id: string;
  headline: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  link: string;
  type: 'featured' | 'partner';
  status: 'Active';
  targetCategories?: string[];
};

export function NationalAdvertisers() {
    const { user } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const advertsQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(collection(db, 'adverts'), where('status', '==', 'Active'), where('type', '==', 'featured'));
    }, [db]);

    const { data: adverts, isLoading } = useCollection<Advert>(advertsQuery);
    
    const [randomAdvert, setRandomAdvert] = React.useState<Advert | null>(null);

    React.useEffect(() => {
        if (isLoading) return;

        const sourceAds = (adverts && adverts.length > 0) ? adverts : mockNationalAdverts.map(ad => ({
            ...ad, 
            headline: ad.brand,
            shortDescription: ad.tagline,
            fullDescription: ad.description,
            image: ad.image?.imageUrl || '',
            type: 'featured',
            status: 'Active'
        })) as any[];

        let eligibleAds: Advert[] = [];
        
        if (user && userProfile?.settings?.adPersonalization) {
            const userCategories = userProfile.settings.selectedCategories || [];
            if (userCategories.length === 0) {
                eligibleAds = sourceAds;
            } else {
                eligibleAds = sourceAds.filter(ad => {
                    if (!ad.targetCategories || ad.targetCategories.length === 0) return true;
                    return ad.targetCategories.some(cat => userCategories.includes(cat));
                });
            }
        } else {
            eligibleAds = sourceAds;
        }

        if (eligibleAds.length > 0) {
            const randomIndex = Math.floor(Math.random() * eligibleAds.length);
            setRandomAdvert(eligibleAds[randomIndex]);
        }
    }, [adverts, user, userProfile, isLoading]);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="h-48 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (!randomAdvert) return null;

    return (
        <Card className="overflow-hidden">
            <div className="relative aspect-video w-full">
                <Image
                    src={randomAdvert.image}
                    alt={randomAdvert.headline}
                    fill
                    className="object-cover"
                />
            </div>
            <CardHeader className="p-4">
                <CardTitle className="text-lg font-bold">{randomAdvert.headline}</CardTitle>
                <CardDescription className="line-clamp-2">{randomAdvert.shortDescription}</CardDescription>
            </CardHeader>
            <CardFooter className="p-4 pt-0 gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">Learn More</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>{randomAdvert.headline}</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh]">
                            <div className="py-4 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: randomAdvert.fullDescription }} />
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
                <Button asChild size="sm" className="flex-1">
                    <Link href={randomAdvert.link || '#'} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" /> Visit Site
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}