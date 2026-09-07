'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Developer Login Redirect
 * Resolves the 404 when accessing /dev/login by redirecting to the authorized dev bypass.
 */
export default function DevLoginRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the root with the developer bypass parameter
        router.replace('/?dev=true');
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/30">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-center">
                    <h2 className="text-xl font-bold tracking-tight">Authenticating Developer Session</h2>
                    <p className="text-muted-foreground">Redirecting to the secure entry point...</p>
                </div>
            </div>
        </div>
    );
}
