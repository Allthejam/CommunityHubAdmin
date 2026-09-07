'use client';

import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Siren, X, Bell, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Announcement } from '@/lib/announcement-data';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function EmergencyAlert({ allBroadcasts }: { allBroadcasts: Announcement[] }) {
  const [dismissedIds, setDismissedIds] = React.useState<string[]>([]);
  
  const activeAlerts = allBroadcasts.filter(b => !dismissedIds.includes(b.id));

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {activeAlerts.map((alert) => (
        <Alert key={alert.id} variant="destructive" className="relative border-2 bg-destructive/5 dark:bg-destructive/10 animate-in fade-in slide-in-from-top-4">
          <Siren className="h-5 w-5 animate-pulse" />
          <div className="pr-8">
            <AlertTitle className="font-black uppercase tracking-tighter text-lg">EMERGENCY BROADCAST</AlertTitle>
            <AlertDescription className="mt-1 font-bold">
              {alert.subject}
            </AlertDescription>
            <div className="mt-4 flex flex-wrap gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-destructive text-white hover:bg-destructive/90 font-bold uppercase text-[10px] tracking-widest shadow-md">
                            Read Full Alert
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader className="border-b pb-4">
                             <div className="flex items-center gap-2 text-destructive mb-2">
                                <Siren className="h-6 w-6 animate-pulse" />
                                <span className="font-black uppercase tracking-tighter text-xl">Official Emergency Alert</span>
                            </div>
                            <DialogTitle className="text-2xl font-bold font-headline">{alert.subject}</DialogTitle>
                            <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                Dispatched by {alert.sentBy}
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh] py-6">
                            <div className="prose dark:prose-invert max-w-none text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: alert.message }} />
                        </ScrollArea>
                        <Alert className="bg-primary/5 border-primary/20">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Targeted Jurisdiction</AlertTitle>
                            <AlertDescription className="text-xs italic">This alert was restricted to verified residents of the targeted geographical area.</AlertDescription>
                        </Alert>
                    </DialogContent>
                </Dialog>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-destructive/30 hover:bg-destructive/10 font-bold uppercase text-[10px] tracking-widest"
                    onClick={() => setDismissedIds(prev => [...prev, alert.id])}
                >
                    Dismiss
                </Button>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}
