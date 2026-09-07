
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Map as MapIcon, 
  Loader2, 
  Info, 
  Search, 
  Check, 
  ChevronsUpDown, 
  Pencil, 
  Lock, 
  Unlock, 
  Save, 
  X,
  Shield, 
  Building2, 
  Layers, 
  Compass, 
  ArrowLeft, 
  Globe, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  runGetAllBoundaries, 
  runGetAllRegionalNetworks, 
  runSaveCommunityBoundary, 
  runToggleCommunityLock,
  runSaveRegionalBoundary,
  runToggleRegionalLock,
  PublicRegionalNetworkData
} from '@/lib/actions/communityActions';
import { isCommunityInRegionalNetwork, getCentroidFromGeoJson } from '@/lib/utils/geoUtils';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
            <p className="text-muted-foreground font-medium">Initializing geospatial map engine...</p>
        </div>
    )
});

type FilterType = 'all' | 'community' | 'regional';

export default function CommunityMapPage() {
  const { toast } = useToast();
  const [boundaries, setBoundaries] = React.useState<any[]>([]);
  const [regionalNetworks, setRegionalNetworks] = React.useState<PublicRegionalNetworkData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  
  // Selection state
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedType, setSelectedType] = React.useState<'community' | 'regional'>('community');
  const [activeFilter, setActiveFilter] = React.useState<FilterType>('all');
  const [communitySearchInsideRegion, setCommunitySearchInsideRegion] = React.useState('');
  
  // Edit Mode state
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [tempBoundary, setTempBoundary] = React.useState<any>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const fetchAllData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [commResult, regResult] = await Promise.all([
        runGetAllBoundaries(),
        runGetAllRegionalNetworks()
      ]);

      if (commResult.success) {
        setBoundaries(commResult.data || []);
      } else {
        toast({ title: 'Notice', description: commResult.error || 'Could not load community boundaries.', variant: 'destructive' });
      }

      if (regResult.success && regResult.data) {
        setRegionalNetworks(regResult.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch map data:", err);
      toast({ title: 'Error', description: err?.message || 'Failed to fetch map data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Selected item reference
  const selectedItem = React.useMemo(() => {
    if (!selectedId) return null;
    if (selectedType === 'regional') {
      return regionalNetworks.find(r => r.id === selectedId) || null;
    }
    return boundaries.find(b => b.id === selectedId) || null;
  }, [selectedId, selectedType, boundaries, regionalNetworks]);

  // If a Regional Network is selected, calculate which local communities fall inside its boundary
  const memberCommunitiesInRegion = React.useMemo(() => {
    if (!selectedId || selectedType !== 'regional' || !selectedItem?.boundary) {
      return [];
    }
    return boundaries.filter(comm => 
      isCommunityInRegionalNetwork(
        comm.boundary, 
        selectedItem.boundary, 
        comm.region, 
        selectedItem.region
      )
    );
  }, [selectedId, selectedType, selectedItem, boundaries]);

  // If a local Community is selected, calculate which regional networks enclose it
  const parentRegionalNetworks = React.useMemo(() => {
    if (!selectedId || selectedType !== 'community' || !selectedItem?.boundary) {
      return [];
    }
    return regionalNetworks.filter(reg => 
      isCommunityInRegionalNetwork(
        selectedItem.boundary, 
        reg.boundary, 
        selectedItem.region, 
        reg.region
      )
    );
  }, [selectedId, selectedType, selectedItem, regionalNetworks]);

  // Highlighted IDs for the map (communities inside the currently selected regional network)
  const highlightedCommunityIds = React.useMemo(() => {
    if (selectedType === 'regional' && memberCommunitiesInRegion.length > 0) {
      return memberCommunitiesInRegion.map(c => c.id);
    }
    return [];
  }, [selectedType, memberCommunitiesInRegion]);

  // Filtered member list within the regional sidecard search
  const filteredMemberCommunities = React.useMemo(() => {
    if (!communitySearchInsideRegion.trim()) return memberCommunitiesInRegion;
    const query = communitySearchInsideRegion.toLowerCase().trim();
    return memberCommunitiesInRegion.filter(c => 
      c.name.toLowerCase().includes(query) || (c.region && c.region.toLowerCase().includes(query))
    );
  }, [memberCommunitiesInRegion, communitySearchInsideRegion]);

  const handleSelectJurisdiction = (id: string, type: 'community' | 'regional') => {
    if (selectedId === id && selectedType === type) {
      setSelectedId(null);
    } else {
      setSelectedId(id);
      setSelectedType(type);
    }
    setIsEditMode(false);
    setTempBoundary(null);
    setCommunitySearchInsideRegion('');
  };

  const handleSaveOverride = async () => {
    if (!selectedId || !tempBoundary) return;
    setIsSaving(true);
    try {
      const geoJsonString = JSON.stringify(tempBoundary.geometry);
      let result;
      if (selectedType === 'regional') {
        result = await runSaveRegionalBoundary({ networkId: selectedId, geoJsonString });
      } else {
        result = await runSaveCommunityBoundary({ communityId: selectedId, geoJsonString });
      }

      if (result.success) {
        toast({ 
          title: "Boundary Overwritten", 
          description: `${selectedType === 'regional' ? 'Regional Network' : 'Community'} jurisdiction has been updated.` 
        });
        setIsEditMode(false);
        setTempBoundary(null);
        fetchAllData();
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
    if (!selectedId || !selectedItem) return;
    const newLockState = !selectedItem.isLocked;
    setIsSaving(true);
    try {
      let result;
      if (selectedType === 'regional') {
        result = await runToggleRegionalLock({ networkId: selectedId, isLocked: newLockState });
      } else {
        result = await runToggleCommunityLock({ communityId: selectedId, isLocked: newLockState });
      }

      if (result.success) {
        toast({ 
          title: newLockState ? "Jurisdiction Locked" : "Jurisdiction Unlocked", 
          description: newLockState ? "Admins/Leaders cannot modify this boundary." : "Jurisdiction boundary is now editable." 
        });
        fetchAllData();
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/5 to-teal-500/10 border border-emerald-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <MapIcon className="h-3.5 w-3.5" />
            GIS & Cartographic Jurisdiction Overview
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
            <MapIcon className="h-7 w-7 text-emerald-600" />
            Jurisdictional Map & Regional Networks
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Monitor territorial boundaries, inspect regional authority network coverage, and redraw or lock custom jurisdictions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <Button asChild variant="outline" size="sm" className="font-bold border-emerald-500/30 hover:bg-emerald-500/10">
            <Link href="/admin/communities">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Directory List
            </Link>
          </Button>

          {/* Jump to Hub Combobox */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full sm:w-[260px] justify-between shadow-xs bg-card font-semibold"
              >
                <div className="flex items-center gap-2 overflow-hidden truncate">
                  <Search className="h-4 w-4 shrink-0 opacity-50" />
                  <span className="truncate">
                    {selectedItem ? (
                      selectedType === 'regional' ? `🛡️ ${selectedItem.name}` : `🏡 ${selectedItem.name}`
                    ) : "Jump to jurisdiction..."}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-[320px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search communities or regional authorities..." />
                <CommandList>
                  <CommandEmpty>No jurisdiction found.</CommandEmpty>
                  
                  {/* Regional Authorities Group */}
                  {regionalNetworks.length > 0 && (
                    <CommandGroup heading={`🛡️ Regional Networks (${regionalNetworks.length})`}>
                      {regionalNetworks.map((reg) => (
                        <CommandItem
                          key={`reg-${reg.id}`}
                          value={`Regional ${reg.name} ${reg.region || ''}`}
                          onSelect={() => {
                            handleSelectJurisdiction(reg.id, 'regional');
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 text-indigo-600",
                              selectedId === reg.id && selectedType === 'regional' ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="font-semibold truncate">{reg.name}</span>
                          {reg.isLocked && <Lock className="ml-auto h-3 w-3 text-indigo-500 opacity-60" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Local Communities Group */}
                  <CommandGroup heading={`🏡 Local Communities (${boundaries.length})`}>
                    {boundaries.map((comm) => (
                      <CommandItem
                        key={`comm-${comm.id}`}
                        value={`Community ${comm.name} ${comm.region || ''}`}
                        onSelect={() => {
                          handleSelectJurisdiction(comm.id, 'community');
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-emerald-600",
                            selectedId === comm.id && selectedType === 'community' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{comm.name}</span>
                        {comm.isLocked && <Lock className="ml-auto h-3 w-3 text-emerald-500 opacity-60" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Layer Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            size="sm"
            variant={activeFilter === 'all' ? "default" : "outline"}
            className={cn(
              "h-8 text-xs font-bold gap-1.5 transition-all",
              activeFilter === 'all' && "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
            )}
            onClick={() => setActiveFilter('all')}
          >
            <Layers className="h-3.5 w-3.5" />
            All Jurisdictions ({boundaries.length + regionalNetworks.length})
          </Button>

          <Button
            size="sm"
            variant={activeFilter === 'community' ? "default" : "outline"}
            className={cn(
              "h-8 text-xs font-bold gap-1.5 transition-all border-emerald-500/30",
              activeFilter === 'community' 
                ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                : "hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300"
            )}
            onClick={() => setActiveFilter('community')}
          >
            <Building2 className="h-3.5 w-3.5 text-emerald-500" />
            Local Communities ({boundaries.length})
          </Button>

          <Button
            size="sm"
            variant={activeFilter === 'regional' ? "default" : "outline"}
            className={cn(
              "h-8 text-xs font-bold gap-1.5 transition-all border-indigo-500/30",
              activeFilter === 'regional' 
                ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                : "hover:bg-indigo-50 text-indigo-800 dark:text-indigo-300"
            )}
            onClick={() => setActiveFilter('regional')}
          >
            <Shield className="h-3.5 w-3.5 text-indigo-500" />
            Regional Networks ({regionalNetworks.length})
          </Button>
        </div>

        {/* Legend pills */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Community</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs border-2 border-indigo-600 bg-indigo-500/20"></span>
            <span>Regional Network</span>
          </div>
          {selectedId && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Selected</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Map & Side Management Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Container (3 cols) */}
        <div className="lg:col-span-3">
          {loading ? (
            <Card className="h-[680px] flex items-center justify-center border-t-4 border-t-emerald-500 shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
                <p className="text-muted-foreground font-medium">Loading cartographic & regional network data...</p>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden shadow-md border-t-4 border-t-emerald-500">
              <CardHeader className="border-b bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  {isEditMode ? (
                    <span className="text-amber-600 flex items-center gap-2">
                      <Pencil className="h-4 w-4 animate-bounce" />
                      REDRAWING {selectedType === 'regional' ? 'REGIONAL AUTHORITY BOUNDARY' : 'COMMUNITY BOUNDARY'}...
                    </span>
                  ) : (
                    <span>
                      Jurisdictional Map View &bull; <strong className="text-foreground">{activeFilter.toUpperCase()}</strong>
                    </span>
                  )}
                </CardTitle>
                {isEditMode && <Badge variant="destructive" className="animate-pulse">Active Edit Mode</Badge>}
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[680px] w-full relative z-0 bg-slate-50">
                  <CommunityMapView 
                    boundaries={boundaries} 
                    regionalNetworks={regionalNetworks}
                    selectedId={selectedId} 
                    selectedType={selectedType}
                    activeFilter={activeFilter}
                    highlightedCommunityIds={highlightedCommunityIds}
                    isEditMode={isEditMode}
                    onSelectJurisdiction={handleSelectJurisdiction}
                    onUpdateBoundary={setTempBoundary}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Management & Inspector Sidebar (1 col) */}
        <div className="space-y-6">
          {/* Active Selection Details Card */}
          <Card className={cn(
            "shadow-sm border-t-4 transition-colors",
            selectedType === 'regional' ? "border-t-indigo-600" : "border-t-primary"
          )}>
            <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-transparent rounded-t-lg pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  {selectedType === 'regional' ? (
                    <>
                      <Shield className="h-4 w-4 text-indigo-600" />
                      Regional Authority
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4 text-emerald-600" />
                      Community Controls
                    </>
                  )}
                </CardTitle>
                {selectedItem && (
                  <Badge variant={selectedType === 'regional' ? "default" : "secondary"} className={cn(
                    "text-[10px]",
                    selectedType === 'regional' && "bg-indigo-600"
                  )}>
                    {selectedType === 'regional' ? 'Regional Network' : 'Local Hub'}
                  </Badge>
                )}
              </div>
              <CardDescription>
                {selectedItem ? "Jurisdiction override & boundary lock tools." : "Select a territory on the map to inspect."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {!selectedItem ? (
                <div className="text-center py-8 px-4 bg-muted/20 rounded-xl border border-dashed space-y-3">
                  <Compass className="h-8 w-8 mx-auto text-muted-foreground/50 animate-pulse" />
                  <p className="text-xs text-muted-foreground font-medium">
                    Click any polygon or use the search bar above to select a community or regional authority network.
                  </p>
                  <div className="pt-2 flex flex-col gap-1 text-[11px] text-muted-foreground border-t border-dashed">
                    <span className="font-semibold text-foreground">Overview Stats:</span>
                    <span>🏡 Mapped Communities: <strong>{boundaries.length}</strong></span>
                    <span>🛡️ Regional Networks: <strong>{regionalNetworks.length}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                  {/* Selected Overview Box */}
                  <div className={cn(
                    "p-3 rounded-xl border space-y-1.5",
                    selectedType === 'regional' ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800" : "bg-muted/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black truncate text-foreground">{selectedItem.name}</p>
                      {selectedItem.isLocked && <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      ID: {selectedItem.id}
                    </p>
                    {selectedItem.region && (
                      <p className="text-xs text-muted-foreground">
                        Region: <strong className="text-foreground">{selectedItem.region}</strong>
                      </p>
                    )}
                  </div>

                  {/* Parent Regional Network Notice (When Local Community is Selected) */}
                  {selectedType === 'community' && parentRegionalNetworks.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                        <Shield className="h-3.5 w-3.5" />
                        Within Regional Network:
                      </div>
                      {parentRegionalNetworks.map(reg => (
                        <div key={reg.id} className="flex items-center justify-between pt-1">
                          <span className="truncate font-medium">{reg.name}</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 text-[10px] px-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
                            onClick={() => handleSelectJurisdiction(reg.id, 'regional')}
                          >
                            Inspect
                            <ChevronRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 gap-2">
                    {!isEditMode ? (
                      <Button 
                        className="w-full font-bold" 
                        variant="outline" 
                        onClick={() => setIsEditMode(true)}
                        disabled={selectedItem.isLocked}
                      >
                        <Pencil className="mr-2 h-4 w-4 text-amber-500" />
                        Redraw {selectedType === 'regional' ? 'Regional Boundary' : 'Boundary'}
                      </Button>
                    ) : (
                      <>
                        <Button 
                          className="w-full font-bold bg-amber-600 hover:bg-amber-700 text-white" 
                          onClick={handleSaveOverride}
                          disabled={!tempBoundary || isSaving}
                        >
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Save Boundary Changes
                        </Button>
                        <Button 
                          className="w-full text-destructive" 
                          variant="ghost" 
                          onClick={() => { setIsEditMode(false); setTempBoundary(null); }}
                          disabled={isSaving}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel Redraw
                        </Button>
                      </>
                    )}

                    <Button 
                      className="w-full font-semibold" 
                      variant={selectedItem.isLocked ? "secondary" : "outline"}
                      onClick={handleToggleLock}
                      disabled={isSaving || isEditMode}
                    >
                      {selectedItem.isLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                      {selectedItem.isLocked ? "Unlock Jurisdiction" : "Lock Jurisdiction"}
                    </Button>
                  </div>

                  {/* Lock Notice Alert */}
                  {selectedItem.isLocked && (
                    <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 py-2">
                      <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertTitle className="text-green-800 dark:text-green-300 text-xs font-bold">Jurisdiction Verified & Locked</AlertTitle>
                      <AlertDescription className="text-[10px] text-green-700 dark:text-green-400">
                        This boundary is locked. Unlock to make manual geometry adjustments.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Member Communities Inside Regional Network Card (Shown when a Regional Network is selected) */}
          {selectedType === 'regional' && selectedItem && (
            <Card className="border-t-4 border-t-indigo-600 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="py-3 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                    <Building2 className="h-3.5 w-3.5" />
                    Member Communities ({memberCommunitiesInRegion.length})
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-bold border-indigo-300 text-indigo-700">
                    Inside Boundary
                  </Badge>
                </div>
                <CardDescription className="text-[11px]">
                  Communities located within this regional authority's broadcast boundary.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* Search in region */}
                {memberCommunitiesInRegion.length > 5 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Filter member communities..." 
                      value={communitySearchInsideRegion}
                      onChange={(e) => setCommunitySearchInsideRegion(e.target.value)}
                      className="h-7 text-xs pl-8 bg-background"
                    />
                  </div>
                )}

                {filteredMemberCommunities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-md italic">
                    {memberCommunitiesInRegion.length === 0 
                      ? "No mapped community centroids found inside this regional boundary." 
                      : "No matching communities found."}
                  </p>
                ) : (
                  <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/50">
                    {filteredMemberCommunities.map((comm) => (
                      <div 
                        key={comm.id} 
                        className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs group"
                      >
                        <div className="truncate flex-1">
                          <p className="font-bold truncate text-foreground group-hover:text-indigo-600 transition-colors">
                            {comm.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{comm.region || 'Local Hub'}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 text-[10px] px-2 font-semibold hover:bg-indigo-50 hover:text-indigo-700"
                          onClick={() => handleSelectJurisdiction(comm.id, 'community')}
                          title="Focus on this community"
                        >
                          Focus
                          <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Admin Instructions Alert */}
          <Alert className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
            <Info className="h-4 w-4 text-slate-600" />
            <AlertTitle className="text-xs font-bold">Admin Cartographic Guidelines</AlertTitle>
            <AlertDescription className="text-[11px] leading-relaxed text-muted-foreground mt-1">
              Regional networks encompass multiple towns and villages. When redrawing, ensure regional polygons fully enclose all target member communities to enable broadcast announcements and crisis management.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

// Inline badge component for simple usage
function Badge({ children, className, variant = "default" }: { children: React.ReactNode; className?: string; variant?: "default" | "destructive" | "secondary" | "outline" }) {
    const variants = {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border text-foreground"
    };
    return (
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}>
            {children}
        </span>
    );
}

