'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { LogOut, User as UserIcon, Home, Loader2 } from 'lucide-react';
import { useAuth, useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc } from 'firebase/firestore';

export default function BroadcastHeader() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    window.location.href = 'https://www.my-community-hub.co.uk';
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('');
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6">
      <Link href="/broadcast" className="flex items-center gap-2 font-semibold">
        <Logo className="h-6 w-6" />
        <span className="text-primary">Broadcast System</span>
      </Link>
      <div className="ml-auto flex items-center gap-4">
        {user && (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                    <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
                </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    {isUserLoading || profileLoading ? (
                        <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">Loading...</p>
                            <p className="text-xs leading-none text-muted-foreground">Please wait</p>
                        </div>
                    ) : (
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <a href={`https://www.my-community-hub.co.uk/profile/${user.uid}`}>
                        <UserIcon className="mr-2 h-4 w-4" />
                        My Profile
                    </a>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <a href="https://www.my-community-hub.co.uk/home">
                        <Home className="mr-2 h-4 w-4" />
                        Return to Main App
                    </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenu>
            </DropdownMenu>
        )}
      </div>
    </header>
  );
}
