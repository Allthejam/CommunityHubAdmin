
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Map as MapIcon, Loader2, Info, Search, Check, ChevronsUpDown, Pencil, Lock, Unlock, Save, X } from 'lucide-react';
import { runGetAllBoundaries, runSaveCommunityBoundary, runToggleCommunityLock } from '@/lib/actions/communityActions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// Load the map component dynamically with SSR disabled to prevent hydration/mounting issues
const CommunityMapView = dynamic(() => import('@/components/community-map-view'), { 
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Initializing map engine...</p>
        </div>
    )
});

import Link from 'next/link';
import { ArrowLeft, Globe } from 'lucide-react';

export default function CommunityMapPage() {
  const { toast } = useToast();
  const [boundaries, setBoundaries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  
  // Edit Mode state
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [tempBoundary, setTempBoundary] = React.useState<any>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const fetchBoundaries = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await runGetAllBoundaries();
      if (result.success) {
        setBoundaries(result.data);
      } else {
        toast({ title: 'Error', description: 'Could not load community boundaries.', variant: 'destructive' });
      }
    } catch (err) {
      console.error("Failed to fetch boundaries:", err);
      toast({ title: 'Error', description: 'Failed to fetch boundary data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchBoundaries();
  }, [fetchBoundaries]);

  const selectedCommunity = React.useMemo(() => {
    return boundaries.find(b => b.id === selectedId);
  }, [selectedId, boundaries]);

  const handleSaveOverride = async () => {
    if (!selectedId || !tempBoundary) return;
    setIsSaving(true);
    try {
        const geoJsonString = JSON.stringify(tempBoundary.geometry);
        const result = await runSaveCommunityBoundary({ communityId: selectedId, geoJsonString });
        if (result.success) {
            toast({ title: "Boundary Overwritten", description: "The community jurisdiction has been updated." });
            setIsEditMode(false);
            setTempBoundary(null);
            fetchBoundaries();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "Could not save boundary changes.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleToggleLock = async () => {
    if (!selectedId || !selectedCommunity) return;
    const newLockState = !selectedCommunity.isLocked;
    setIsSaving(true);
    try {
        const result = await runToggleCommunityLock({ communityId: selectedId, isLocked: newLockState });
        if (result.success) {
            toast({ 
                title: newLockState ? "Jurisdiction Locked" : "Jurisdiction Unlocked", 
                description: newLockState ? "Leaders cannot modify this boundary." : "Leaders may edit this boundary." 
            });
            fetchBoundaries();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "Could not update lock status.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-teal-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <MapIcon className="h-3.5 w-3.5" />
            GIS & Cartographic Jurisdiction
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
            <MapIcon className="h-7 w-7 text-emerald-600" />
            Jurisdictional Map Override
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor territorial boundaries and redraw or lock custom community jurisdictions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button asChild variant="outline" size="sm" className="font-bold border-emerald-500/30 hover:bg-emerald-500/10">
            <Link href="/admin/communities">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Directory List
            </Link>
          </Button>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full md:w-[260px] justify-between shadow-sm bg-card font-semibold"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Search className="h-4 w-4 shrink-0 opacity-50" />
                  <span className="truncate">{selectedCommunity?.name || "Jump to hub..."}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full md:w-[260px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search communities..." />
                <CommandList>
                  <CommandEmpty>No community found.</CommandEmpty>
                  <CommandGroup>
                    {boundaries.map((comm) => (
                      <CommandItem
                        key={comm.id}
                        value={comm.name}
                        onSelect={() => {
                          setSelectedId(comm.id === selectedId ? null : comm.id);
                          setOpen(false);
                          setIsEditMode(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedId === comm.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {comm.name}
                        {comm.isLocked && <Lock className="ml-auto h-3 w-3 opacity-50" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
            {loading ? (
                <Card className="h-[650px] flex items-center justify-center border-t-4 border-t-emerald-500 shadow-sm">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
                        <p className="text-muted-foreground font-medium">Loading geospatial data...</p>
                    </div>
                </Card>
            ) : (
                <Card className="overflow-hidden shadow-md border-t-4 border-t-emerald-500">
                    <CardHeader className="border-b bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent py-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Globe className="h-4 w-4 text-emerald-600" />
                            {isEditMode ? "REDRAWING BOUNDARY..." : "Jurisdictional Map View"}
                        </CardTitle>
                        {isEditMode && <Badge variant="destructive" className="animate-pulse">Active Edit Mode</Badge>}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="h-[650px] w-full relative z-0 bg-slate-50">
                            <CommunityMapView 
                                boundaries={boundaries} 
                                selectedId={selectedId} 
                                isEditMode={isEditMode}
                                onUpdateBoundary={setTempBoundary}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>

        <div className="space-y-6">
            <Card className="border-t-4 border-t-primary shadow-sm">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-transparent rounded-t-lg">
                    <CardTitle className="text-lg font-bold">Management Tools</CardTitle>
                    <CardDescription>Select a community to access override controls.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!selectedId ? (
                        <p className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-md border border-dashed italic">
                            No community selected
                        </p>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="p-3 bg-muted/30 rounded-md border">
                                <p className="text-sm font-bold truncate">{selectedCommunity?.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">ID: {selectedId}</p>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 gap-2">
                                {!isEditMode ? (
                                    <Button 
                                        className="w-full" 
                                        variant="outline" 
                                        onClick={() => setIsEditMode(true)}
                                        disabled={selectedCommunity?.isLocked}
                                    >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Redraw Boundary
                                    </Button>
                                ) : (
                                    <>
                                        <Button 
                                            className="w-full" 
                                            onClick={handleSaveOverride}
                                            disabled={!tempBoundary || isSaving}
                                        >
                                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            Save Boundary
                                        </Button>
                                        <Button 
                                            className="w-full text-destructive" 
                                            variant="ghost" 
                                            onClick={() => { setIsEditMode(false); setTempBoundary(null); }}
                                            disabled={isSaving}
                                        >
                                            <X className="mr-2 h-4 w-4" />
                                            Cancel
                                        </Button>
                                    </>
                                )}

                                <Button 
                                    className="w-full" 
                                    variant={selectedCommunity?.isLocked ? "secondary" : "outline"}
                                    onClick={handleToggleLock}
                                    disabled={isSaving || isEditMode}
                                >
                                    {selectedCommunity?.isLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                                    {selectedCommunity?.isLocked ? "Unlock Boundary" : "Lock Boundary"}
                                </Button>
                            </div>

                            {selectedCommunity?.isLocked && (
                                <Alert className="bg-green-50 border-green-200">
                                    <Lock className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-green-800 text-xs">Boundary Locked</AlertTitle>
                                    <AlertDescription className="text-[10px] text-green-700">
                                        This jurisdiction is verified. Unlock to make manual corrections.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Admin Instructions</AlertTitle>
                <AlertDescription className="text-xs">
                    To resolve overlaps, redraw the jurisdiction of one or both conflicting communities. Ensure boundaries are accurate to prevent service disputes.
                </AlertDescription>
            </Alert>
        </div>
      </div>
    </div>
  );
}

// Inline badge component for simple usage
function Badge({ children, className, variant = "default" }: { children: React.ReactNode; className?: string; variant?: "default" | "destructive" | "secondary" }) {
    const variants = {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        secondary: "bg-secondary text-secondary-foreground"
    };
    return (
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}>
            {children}
        </span>
    );
}
