
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import React from "react";
import { Loader2, PlusCircle } from "lucide-react";

type ContentItem = {
    id: string;
    title: string;
    image?: string;
};

export const ContentCard = ({ item, type, baseUrl }: { item: ContentItem, type: 'advert' | 'event', baseUrl: 'business' | 'enterprise' }) => (
    <Card className="overflow-hidden">
        <Image src={item.image || 'https://picsum.photos/400/200'} alt={item.title} width={400} height={200} className="w-full h-32 object-cover bg-muted" />
        <CardHeader>
            <CardTitle className="text-base truncate">{item.title}</CardTitle>
        </CardHeader>
        <CardFooter>
            <Button variant="secondary" size="sm" asChild>
                <Link href={`/${baseUrl}/${type}s/edit/${item.id}`}>Manage</Link>
            </Button>
        </CardFooter>
    </Card>
);

export const ContentSection = ({ title, description, items, type, loading, baseUrl }: { title: string, description: string, items: ContentItem[], type: 'advert' | 'event', loading: boolean, baseUrl: 'business' | 'enterprise' }) => (
    <Card className="col-span-1 md:col-span-3">
        <CardHeader className="flex-row justify-between items-center">
            <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </div>
            <Button asChild>
                <Link href={`/${baseUrl}/${type}s/create`}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
            {loading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {items.map(item => <ContentCard key={item.id} item={item} type={type} baseUrl={baseUrl} />)}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-8">
                    <p>No active {title.toLowerCase()} found.</p>
                </div>
            )}
        </CardContent>
    </Card>
);
