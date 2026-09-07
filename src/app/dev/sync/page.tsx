
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { recalculateCommunityCounts } from '@/lib/actions/dataSyncActions';

export default function SyncPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    const result = await recalculateCommunityCounts();
    if (result.success) {
      toast({
        title: 'Sync Complete!',
        description: result.message || 'Community counts have been updated.',
      });
    } else {
      toast({
        title: 'Error Syncing Data',
        description: result.error || 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
    setIsSyncing(false);
  };

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
    <div className="flex h-screen w-full items-center justify-center bg-muted/40">
      <div className="max-w-md w-full space-y-4">
        <Card>
            <CardHeader>
            <CardTitle>Recalculate Community Counts</CardTitle>
            <CardDescription>
                This action will iterate through all communities and update their `memberCount` and `leaderCount` fields based on the current user data. Use this if you notice a data discrepancy.
            </CardDescription>
            </CardHeader>
            <CardFooter>
            <Button onClick={handleSync} disabled={isSyncing}>
                {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Sync Process
            </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
