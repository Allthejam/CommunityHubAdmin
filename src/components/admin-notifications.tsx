
'use client';

import * as React from 'react';
import { Bell, Loader2, Shield, Crown, Building2 } from 'lucide-react';
import { collection, onSnapshot, query, where, or, and } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { type Notification } from '@/lib/types/notifications';
import { formatDistanceToNow, isValid, parse } from 'date-fns';
import { useRouter } from 'next/navigation';
import { updateNotificationStatusAction } from '@/lib/actions/notificationActions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export function AdminNotifications() {
  const { user } = useUser();
  const db = useFirestore();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const { toast } = useToast();
  
  // Track notifications we've already "alerted" about during this session
  const alertedIds = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    // Request notification permissions on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  const getSafeDate = (d: any): Date => {
    if (!d) return new Date(0);
    if (d instanceof Date) return d;
    if (typeof d?.toDate === 'function') return d.toDate();
    const parsed = new Date(d);
    return isValid(parsed) ? parsed : new Date(0);
  };

  React.useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    // Consolidated Status Fetch: Look for 'New', 'new', 'unread', 'Unread' notifications
    const q = query(
      collection(db, "notifications"), 
      and(
        where("status", "in", ["New", "new", "unread", "Unread"]),
        or(
          where("recipientId", "==", "platform_admin"),
          where("recipientId", "==", user.uid)
        )
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      
      allNotifs.sort((a, b) => {
        const dateA = getSafeDate(a.date);
        const dateB = getSafeDate(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      // Handle "Pings" for truly new notifications
      allNotifs.forEach(notif => {
        if (!alertedIds.current.has(notif.id)) {
          alertedIds.current.add(notif.id);
          
          // Only alert for notifications created in the last 15 seconds (to avoid pinging old unread ones on load)
          const notifDate = getSafeDate(notif.date);
          const now = new Date();
          if (isValid(notifDate) && notifDate.getTime() > 0 && (now.getTime() - notifDate.getTime() < 15000)) {
            triggerAlert(notif);
          }
        }
      });
      
      setNotifications(allNotifs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications for admin:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db, toast]);

  const triggerAlert = (notif: Notification) => {
    // 1. UI Toast
    toast({
      title: notif.subject,
      description: `New ${notif.type} from ${notif.from}`,
    });

    // 2. Native Browser Notification (The "Ping")
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notif.subject, {
        body: `From: ${notif.from}\nType: ${notif.type}`,
        icon: 'https://i.postimg.cc/HnhWpVyt/Hub-Logo192x192.png',
      });
    }
  };
  
  const handleView = async (notification: Notification) => {
    const result = await updateNotificationStatusAction({ notificationId: notification.id, status: 'Read' });
    if (!result.success) {
      toast({ title: 'Error', description: 'Could not mark notification as read.', variant: 'destructive' });
    }

    let path = '#';
    if ((notification as any).actionUrl) {
      let target = (notification as any).actionUrl;
      if (target.startsWith('/admin/team/')) {
        target = target.replace('/admin/team/', '/admin/applications/');
      }
      path = target;
    } else {
      switch (notification.type) {
        case 'New Report':
          path = '/admin/reports';
          break;
        case 'Leadership Application':
          path = `/admin/applications/${notification.relatedId}`;
          break;
        case 'Special Access Request':
          path = `/admin/special-access/${notification.relatedId}`;
          break;
        case 'Boundary Dispute':
          path = `/admin/communities?dispute=${notification.details?.reportingCommunityId}&with=${notification.details?.overlappingCommunityId}`;
          break;
        case 'Advertiser Profile':
          path = `/admin/national-advertisers/${notification.relatedId}`;
          break;
        case 'New Community':
          path = '/admin/communities';
          break;
        case 'Task Assignment':
          path = '/admin/app-development';
          break;
        default:
          path = '/admin/notifications';
          break;
      }
    }

    if (path !== '#') {
      router.push(path);
    }
  };

  const parseAndFormatDate = (rawDate: any) => {
    const date = getSafeDate(rawDate);
    if (isValid(date) && date.getTime() > 0) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return 'recently';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <Bell className="h-5 w-5" />
          {!loading && notifications.length > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">
              {notifications.length}
            </Badge>
          )}
          <span className="sr-only">View notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-88 sm:w-96" align="end">
        <div className="flex items-center justify-between p-2 pb-1.5">
          <DropdownMenuLabel className="p-0 font-black text-xs uppercase tracking-wider">
            Notifications Center
          </DropdownMenuLabel>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">{notifications.length} Unread</span>
        </div>
        <DropdownMenuSeparator />
        {loading ? (
          <DropdownMenuItem disabled>
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
          </DropdownMenuItem>
        ) : notifications.length > 0 ? (
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {notifications.map(notification => {
              const isPlatformAdmin = notification.recipientId === "platform_admin";
              return (
                <DropdownMenuItem key={notification.id} className="flex-col items-start gap-1.5 p-3 cursor-pointer hover:bg-muted/60" onSelect={() => handleView(notification)}>
                  <div className="w-full flex items-center justify-between gap-2">
                    {isPlatformAdmin ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5 text-purple-600" />
                        Platform Admin
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                        <Crown className="h-2.5 w-2.5 text-blue-600" />
                        {notification.details?.communityName ? `Leader • ${notification.details.communityName}` : "Community Leader"}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                      {parseAndFormatDate(notification.date)}
                    </span>
                  </div>
                  <p className="font-bold text-xs leading-snug line-clamp-2">{notification.subject}</p>
                  <p className="text-[11px] text-muted-foreground">From: <span className="font-semibold text-foreground/80">{notification.from}</span></p>
                </DropdownMenuItem>
              );
            })}
          </div>
        ) : (
          <DropdownMenuItem disabled className="text-center justify-center py-6 text-xs text-muted-foreground">No new unread notifications.</DropdownMenuItem>
        )}
         <DropdownMenuSeparator />
         <DropdownMenuItem asChild>
            <Link href="/admin/notifications" className="justify-center font-bold text-xs text-primary py-2">
               View Full Notifications Console &rarr;
            </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
