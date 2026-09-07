'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { seedDatabase, seedBusinesses, seedDropdowns, seedShoppingTaxonomy, getSeedDataAction } from '@/lib/actions/seed';
import { Loader2, Database, List, ShoppingCart, ArrowLeft, LayoutDashboard, Eye, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SeedPage() {
  const [isSeeding, setIsSeeding] = useState<string | null>(null);
  const [seedData, setSeedData] = useState<any>(null);
  
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  useEffect(() => {
    const fetchPreview = async () => {
        const data = await getSeedDataAction();
        setSeedData(data);
    }
    fetchPreview();
  }, []);

  const handleAction = async (actionName: string, actionFn: () => Promise<any>) => {
    setIsSeeding(actionName);
    try {
        const result = await actionFn();
        if (result.success) {
            toast({ title: 'Seed Successful', description: `Platform ${actionName} has been initialized.` });
        } else {
            toast({ title: 'Seed Failed', description: result.error, variant: 'destructive' });
        }
    } catch (e: any) {
        toast({ title: 'System Error', description: e.message, variant: 'destructive' });
    } finally {
        setIsSeeding(null);
    }
  };

  const SeedActionCard = ({ 
    title, 
    description, 
    icon: Icon, 
    actionName, 
    actionFn, 
    payload 
  }: { 
    title: string; 
    description: string; 
    icon: any; 
    actionName: string; 
    actionFn: () => Promise<any>; 
    payload: any;
  }) => (
    <Card className="shadow-sm border-primary/10 flex flex-col h-full">
        <CardHeader>
            <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    {title}
                </CardTitle>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="View Seed Bank Content">
                            <Eye className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Seed Bank: {title}</DialogTitle>
                            <DialogDescription>The following data will be written to Firestore.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-96 rounded-md border bg-muted/50 p-4">
                            <pre className="text-[10px] font-mono">{JSON.stringify(payload, null, 2)}</pre>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardFooter className="mt-auto">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button disabled={!!isSeeding} className="w-full">
                        {isSeeding === actionName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        Run {actionName}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Running the <strong>{actionName}</strong> will overwrite or append to existing data in the platform settings. This cannot be easily undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction(actionName, actionFn)}>
                            Continue Seeding
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
    </Card>
  );

  if (process.env.NODE_ENV === 'production') {
      return (
          <div className="flex h-screen w-full items-center justify-center">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        This page is for development purposes only and cannot be accessed in a production environment.
                    </AlertDescription>
                </Alert>
          </div>
      )
  }

  return (
    <div className="min-h-screen w-full bg-muted/40 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Database className="h-8 w-8 text-primary" />
                    Platform Seeding Engine
                </h1>
                <p className="text-muted-foreground mt-2">Safety-first database initialization. View the seed bank before committing changes.</p>
            </div>
            <Button asChild variant="outline">
                <Link href="/admin/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Return to Dashboard
                </Link>
            </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SeedActionCard 
                title="Pricing & Tiers"
                description="Initialize subscription rates for Businesses and Enterprise."
                icon={Database}
                actionName="Pricing"
                actionFn={seedDatabase}
                payload={seedData?.pricing}
            />

            <SeedActionCard 
                title="Global Dropdowns"
                description="Master lists for News, Events, and more with persistent IDs."
                icon={List}
                actionName="Dropdowns"
                actionFn={seedDropdowns}
                payload={seedData?.dropdowns}
            />

            <SeedActionCard 
                title="Marketplace Taxonomy"
                description="The complete 26-Vertical hierarchy for the Highstreet."
                icon={ShoppingCart}
                actionName="Taxonomy"
                actionFn={seedShoppingTaxonomy}
                payload={seedData?.taxonomy}
            />

            <SeedActionCard 
                title="Mock Businesses"
                description="Populate your current community with 50 test listings."
                icon={Database}
                actionName="Businesses"
                actionFn={() => seedBusinesses({ communityId: userProfile?.communityId || '' })}
                payload={seedData?.businesses}
            />
        </div>

        <Alert className="border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Operational Integrity</AlertTitle>
            <AlertDescription className="text-amber-700">
                Seeding is intended for initial project setup or disaster recovery. To modify existing categories, use the <strong>Dropdown Management</strong> or <strong>Taxonomy Explorer</strong> tools in the Admin Panel.
            </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
