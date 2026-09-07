'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Loader2, ChevronDown, X, Map as MapIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

export type CommunitySelection = {
  id: string | null;
  country: string | null;
  state: string | null;
  region: string | null;
  community: string | null;
  countries?: string[];
  states?: string[];
  regions?: string[];
  communities?: string[];
  targetLevel?: 'country' | 'state' | 'region' | 'community';
};

type CommunitySelectorProps = {
  selection: CommunitySelection | null;
  onSelectionChange: (selection: CommunitySelection) => void;
  allowCreation?: boolean;
  renderAction?: (level: 'country' | 'state' | 'region' | 'community', ids: string[]) => React.ReactNode;
  multi?: boolean;
};

type Location = {
  id: string;
  name: string;
  parent?: string;
};

export function CommunitySelector({ 
    selection, 
    onSelectionChange, 
    renderAction,
    multi = true
}: CommunitySelectorProps) {
  const db = useFirestore();
  
  const [countries, setCountries] = React.useState<Location[]>([]);
  const [states, setStates] = React.useState<Location[]>([]);
  const [regions, setRegions] = React.useState<Location[]>([]);
  const [hubs, setHubs] = React.useState<Location[]>([]);
  
  const [loading, setLoading] = React.useState<{ [key: string]: boolean }>({
    countries: false, states: false, regions: false, hubs: false
  });

  // 1. Fetch all countries
  React.useEffect(() => {
    if (!db) return;
    setLoading(prev => ({ ...prev, countries: true }));
    const q = query(collection(db, "locations"), where("type", "==", "country"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)).sort((a,b) => a.name.localeCompare(b.name));
      setCountries(list);
      setLoading(prev => ({ ...prev, countries: false }));
    });
    return () => unsub();
  }, [db]);

  // 2. Fetch states for ALL selected countries
  React.useEffect(() => {
    if (!db || !selection?.countries?.length) {
      setStates([]);
      return;
    }
    setLoading(prev => ({ ...prev, states: true }));
    const q = query(collection(db, "locations"), where("type", "==", "state"), where("parent", "in", selection.countries));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)).sort((a,b) => a.name.localeCompare(b.name));
      setStates(list);
      setLoading(prev => ({ ...prev, states: false }));
    });
    return () => unsub();
  }, [db, selection?.countries]);

  // 3. Fetch regions for ALL selected states
  React.useEffect(() => {
    if (!db || !selection?.states?.length) {
      setRegions([]);
      return;
    }
    setLoading(prev => ({ ...prev, regions: true }));
    const q = query(collection(db, "locations"), where("type", "==", "region"), where("parent", "in", selection.states));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)).sort((a,b) => a.name.localeCompare(b.name));
      setRegions(list);
      setLoading(prev => ({ ...prev, regions: false }));
    });
    return () => unsub();
  }, [db, selection?.states]);
  
  // 4. Fetch communities for ALL selected regions
  React.useEffect(() => {
    if (!db || !selection?.regions?.length) {
      setHubs([]);
      return;
    }
    
    const fetchHubs = async () => {
        setLoading(prev => ({ ...prev, hubs: true }));
        try {
            const regionNames: string[] = [];
            for (const regionId of selection.regions!) {
                const regionDoc = await getDoc(doc(db, 'locations', regionId));
                if (regionDoc.exists()) {
                    regionNames.push(regionDoc.data().name);
                }
            }

            if (regionNames.length === 0) {
                setHubs([]);
                setLoading(prev => ({ ...prev, hubs: false }));
                return;
            }

            const q = query(
                collection(db, 'communities'), 
                where('region', 'in', regionNames), 
                where('visibility', '==', 'public')
            );
            
            const unsub = onSnapshot(q, (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)).sort((a,b) => a.name.localeCompare(b.name));
                setHubs(list);
                setLoading(prev => ({ ...prev, hubs: false }));
            });
            return unsub;
        } catch (error) {
            console.error("Error fetching hubs:", error);
            setLoading(prev => ({ ...prev, hubs: false }));
        }
    };

    const unsubPromise = fetchHubs();
    return () => { unsubPromise.then(unsub => unsub?.()) };
  }, [db, selection?.regions]);

  const toggleSelection = (level: 'countries' | 'states' | 'regions' | 'communities', id: string) => {
      const current = selection?.[level] || [];
      const updated = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
      
      const newSelection = { ...selection, [level]: updated } as CommunitySelection;
      
      if (level === 'countries') { newSelection.states = []; newSelection.regions = []; newSelection.communities = []; }
      if (level === 'states') { newSelection.regions = []; newSelection.communities = []; }
      if (level === 'regions') { newSelection.communities = []; }

      onSelectionChange(newSelection);
  };

  const LocationDropdown = ({ label, items, level, selectedIds, disabled }: { 
      label: string; 
      items: Location[]; 
      level: 'countries' | 'states' | 'regions' | 'communities';
      selectedIds: string[];
      disabled?: boolean;
  }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
            <Button variant="outline" className="w-full justify-between h-10 px-3 font-normal">
                <span className="truncate">
                    {loading[level] ? "Loading..." : (selectedIds.length > 0 
                        ? `${selectedIds.length} ${label} selected` 
                        : `Select ${label}...`)}
                </span>
                {loading[level] ? <Loader2 className="h-4 w-4 animate-spin opacity-50" /> : <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-select-trigger-width)] min-w-[200px]">
            <ScrollArea className="h-64">
                {items && items.length > 0 ? items.map(item => (
                    <DropdownMenuCheckboxItem
                        key={item.id}
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={() => toggleSelection(level, item.id)}
                        onSelect={(e) => e.preventDefault()}
                    >
                        {item.name}
                    </DropdownMenuCheckboxItem>
                )) : (
                    <div className="p-4 text-center text-xs text-muted-foreground italic">No items found</div>
                )}
            </ScrollArea>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  const SelectedBadges = ({ items, level, selectedIds }: { items: Location[], level: 'countries' | 'states' | 'regions' | 'communities', selectedIds: string[] }) => {
    if (!selectedIds || selectedIds.length === 0 || !items) return null;
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedIds.map(id => {
                const found = items.find(i => i.id === id);
                const name = found ? found.name : `ID: ${id.substring(0, 5)}`;
                return (
                    <Badge key={id} variant="secondary" className="text-[10px] uppercase font-bold py-0 h-5 gap-1 pr-1">
                        {name}
                        <button onClick={() => toggleSelection(level, id)} className="hover:text-destructive"><X className="h-3 w-3"/></button>
                    </Badge>
                );
            })}
        </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <MapIcon className="h-3 w-3" /> 1. Select Country/Countries
        </Label>
        <div className="flex items-center gap-2">
            <LocationDropdown 
                label="Countries" 
                items={countries} 
                level="countries" 
                selectedIds={selection?.countries || []} 
            />
            {renderAction && renderAction('country', selection?.countries || [])}
        </div>
        <SelectedBadges items={countries} level="countries" selectedIds={selection?.countries || []} />
      </div>

      <div className="grid gap-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <MapIcon className="h-3 w-3" /> 2. States / Constituents
        </Label>
        <div className="flex items-center gap-2">
            <LocationDropdown 
                label="States" 
                items={states} 
                level="states" 
                selectedIds={selection?.states || []} 
                disabled={!selection?.countries?.length}
            />
            {renderAction && renderAction('state', selection?.states || [])}
        </div>
        <SelectedBadges items={states} level="states" selectedIds={selection?.states || []} />
      </div>

      <div className="grid gap-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <MapIcon className="h-3 w-3" /> 3. Regions / Counties
        </Label>
        <div className="flex items-center gap-2">
            <LocationDropdown 
                label="Regions" 
                items={regions} 
                level="regions" 
                selectedIds={selection?.regions || []} 
                disabled={!selection?.states?.length}
            />
            {renderAction && renderAction('region', selection?.regions || [])}
        </div>
        <SelectedBadges items={regions} level="regions" selectedIds={selection?.regions || []} />
      </div>

      <div className="grid gap-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <MapIcon className="h-3 w-3" /> 4. Community Hubs
        </Label>
        <div className="flex items-center gap-2">
            <LocationDropdown 
                label="Hubs" 
                items={hubs} 
                level="communities" 
                selectedIds={selection?.communities || []} 
                disabled={!selection?.regions?.length}
            />
            {renderAction && renderAction('community', selection?.communities || [])}
        </div>
        <SelectedBadges items={hubs} level="communities" selectedIds={selection?.communities || []} />
      </div>
    </div>
  );
}
