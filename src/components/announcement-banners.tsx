
'use client';
import { useRef, useState } from 'react';
import { type Announcement } from '@/lib/announcement-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Building, Globe } from 'lucide-react';
import { Badge } from './ui/badge';
import { Carousel, CarouselContent, CarouselItem } from './ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const AnnouncementItem = ({ announcement }: { announcement: Announcement }) => (
  <div className="p-1">
    <div className="flex justify-between items-start mb-2">
      <h4 className="font-semibold leading-tight">{announcement.subject}</h4>
      {announcement.severity === 'urgent' && <Badge variant="destructive">Urgent</Badge>}
    </div>
    <p className="text-sm text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: announcement.message }} />
    <p className="text-xs text-muted-foreground pt-2">{announcement.sentBy} - {announcement.scheduledDates}</p>
  </div>
);


const AnnouncementCarousel = ({ announcements, title, description, icon: Icon }: { announcements: Announcement[], title: string, description: string, icon: React.ElementType }) => {
    const plugin = useRef(
      Autoplay({ delay: 3000, stopOnInteraction: true })
    )
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="h-full flex flex-col border-0 md:border rounded-none md:rounded-lg cursor-pointer">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" /> {title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                        <Carousel
                            opts={{
                                align: "start",
                                loop: announcements.length > 1,
                            }}
                            plugins={[plugin.current]}
                            onMouseEnter={plugin.current.stop}
                            onMouseLeave={plugin.current.reset}
                            className="w-full"
                            >
                            <CarouselContent>
                                {announcements.map((announcement) => (
                                <CarouselItem key={announcement.id}>
                                    <AnnouncementItem announcement={announcement} />
                                </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Icon className="h-6 w-6" />
                    {title}
                  </DialogTitle>
                  <DialogDescription>
                    All active announcements for this category.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-6">
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="p-4 rounded-lg border bg-secondary">
                        <h3 className="font-bold text-lg mb-2">{announcement.subject}</h3>
                        <div
                          className="text-sm text-secondary-foreground prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: announcement.message }}
                        />
                         <p className="text-xs text-muted-foreground pt-3 mt-3 border-t">{announcement.sentBy} - {announcement.scheduledDates}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button onClick={() => setIsOpen(false)} className="mt-4">
                  Close
                </Button>
              </DialogContent>
        </Dialog>
    )
}

export function AnnouncementBanners({ allAnnouncements }: { allAnnouncements: Announcement[] }) {
  const platformAnnouncements = allAnnouncements.filter(a => a.scope === 'platform');
  const communityAnnouncements = allAnnouncements.filter(a => a.scope === 'community');

  const hasPlatform = platformAnnouncements.length > 0;
  const hasCommunity = communityAnnouncements.length > 0;

  if (!hasPlatform && !hasCommunity) return null;

  return (
    <div className={cn(
        "grid grid-cols-1 gap-y-6 md:gap-6",
        hasPlatform && hasCommunity && "md:grid-cols-2"
    )}>
       {hasPlatform && (
        <AnnouncementCarousel 
            announcements={platformAnnouncements}
            title="Platform Announcements"
            description="Updates from the team."
            icon={Globe}
        />
       )}
        {hasCommunity && (
        <AnnouncementCarousel 
            announcements={communityAnnouncements}
            title="Community Announcements"
            description="Updates from local leaders."
            icon={Building}
        />
       )}
    </div>
  );
}
