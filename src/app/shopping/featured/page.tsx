'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    Store, 
    ArrowRight, 
    Loader2, 
    ShoppingCart, 
    ArrowLeft,
    Star,
    LayoutGrid,
    ShoppingBag,
    RotateCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirestore } from '@/firebase';
import { getShoppingCategories, getShoppingFeaturedConfig, checkAndRotateFeaturedCategories } from '@/lib/actions/shoppingActions';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type SubCategory = { id: string; name: string; tags: string[]; };
type Category = { id: string; name: string; subcategories: SubCategory[]; };

export default function PublicFeaturedCategoriesPage() {
    const [featuredItems, setFeaturedItems] = React.useState<{ id: string; name: string; type: string }[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isRotating, setIsRotating] = React.useState(false);
    const db = useFirestore();

    const fetchData = React.useCallback(async (skipRotation = false) => {
        setLoading(true);
        try {
            // 1. Check for Lazy Rotation if enabled
            if (!skipRotation) {
                const rotationResult = await checkAndRotateFeaturedCategories();
                if (rotationResult.rotated) {
                    console.log("[Shopping] Content was automatically rotated.");
                }
            }

            // 2. Fetch Taxonomy and Config
            const [taxRes, configRes] = await Promise.all([
                getShoppingCategories(),
                getShoppingFeaturedConfig()
            ]);

            const flattened: any[] = [];
            taxRes.forEach((c: Category) => {
                flattened.push({ id: c.id, name: c.name, type: 'Master Vertical' });
                c.subcategories.forEach((s: SubCategory) => {
                    flattened.push({ id: s.id, name: s.name, type: 'Sub-Category' });
                });
            });

            const selected = configRes.selectedIds
                .map(id => flattened.find(item => item.id === id))
                .filter(Boolean);

            setFeaturedItems(selected);
        } catch (error) {
            console.error("Error loading featured content:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted/30">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs animate-pulse">Curating your marketplace...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20 pb-20">
            <div className="bg-primary text-primary-foreground py-16 px-4">
                <div className="container mx-auto max-w-6xl text-center space-y-4">
                    <div className="flex justify-center mb-6">
                        <div className="p-3 bg-white/10 rounded-full border border-white/20">
                            <Star className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter font-headline">
                        Featured Selections
                    </h1>
                    <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg leading-relaxed">
                        Hand-picked verticals and trending categories from our Virtual Highstreet. Shop directly from local independent businesses.
                    </p>
                </div>
            </div>

            <div className="container mx-auto max-w-6xl -mt-10 px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {featuredItems.length > 0 ? (
                        featuredItems.map((item, index) => (
                            <Card key={item.id} className="border-0 shadow-2xl overflow-hidden group hover:-translate-y-2 transition-all duration-300">
                                <div className="relative aspect-[4/5] bg-slate-900">
                                    <Image 
                                        src={`https://picsum.photos/seed/featured-${item.id}/600/800`}
                                        alt={item.name}
                                        fill
                                        className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                        data-ai-hint="shopping product"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
                                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest text-white border-white/40">
                                            {item.type}
                                        </Badge>
                                        <h3 className="text-2xl font-black text-white leading-none tracking-tighter uppercase italic drop-shadow-lg">
                                            {item.name}
                                        </h3>
                                        <Separator className="bg-white/20" />
                                        <Button asChild size="sm" className="w-full bg-white text-black hover:bg-slate-200 font-bold uppercase text-[10px] tracking-widest rounded-none h-10 shadow-lg">
                                            <Link href={`/shopping/highstreet?category=${encodeURIComponent(item.name)}`}>
                                                Explore Now
                                                <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 bg-white rounded-2xl border-2 border-dashed shadow-sm">
                            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <h3 className="text-xl font-bold uppercase tracking-tight">Curation in Progress</h3>
                            <p className="text-muted-foreground mt-2 italic">Platform administrators are updating this week's featured selection.</p>
                            <Button asChild variant="outline" className="mt-8">
                                <Link href="/shopping/highstreet">Browse All Categories</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto max-w-4xl mt-20 px-4 text-center space-y-8">
                <Separator />
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold font-headline">Ready for more local finds?</h2>
                    <p className="text-muted-foreground">Visit the full Virtual Highstreet to explore thousands of products from local sellers across your community.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button asChild size="lg" className="h-14 px-10 text-lg font-black uppercase tracking-tighter gap-3 shadow-xl">
                        <Link href="/shopping/highstreet">
                            <Store className="h-6 w-6" />
                            Enter The Highstreet
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" size="lg" className="h-14 gap-2 font-bold opacity-60 hover:opacity-100">
                        <Link href="/home">
                            <ArrowLeft className="h-5 w-5" />
                            Return to Dashboard
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}