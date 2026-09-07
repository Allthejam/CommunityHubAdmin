"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowUpDown,
    MoreHorizontal,
    Globe,
    PlusCircle,
    UserCheck,
    ChevronDown,
    FilterX,
    CheckCircle,
    Construction,
    ShieldAlert,
    XCircle,
    Loader2,
    Lock,
    Crown,
    FileEdit,
    Replace,
    Percent,
    Save,
    Check,
    ChevronsUpDown,
    Clock,
    ShieldCheck,
    Upload,
    Eye,
    Printer,
    MapPin,
    Calendar,
    Users,
    TrendingUp,
    AlertTriangle,
    RotateCw,
    Info,
} from "lucide-react"
import { collection, query, onSnapshot, serverTimestamp, doc, getDocs, where, limit, writeBatch, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { cn } from "@/lib/utils";
import { updateCommunityStatusAction, renameCommunityAction, updateCommunityTypeAction, updateCommunityVisibilityAction, runSetCommunityRevenueShare, runBulkUpdateCommunityStatus } from "@/lib/actions/communityActions";
import { recalculateCommunityCounts } from "@/lib/actions/dataSyncActions";
import { runImpersonateUser } from "@/lib/actions/userActions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { CommunitySelector, type CommunitySelection } from "@/components/community-selector";
import { appointCommunityLeaderAction } from "@/lib/actions/teamActions";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PaginationControls } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent } from "@/components/ui/context-menu";
import { format } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Ensure complex server actions have enough time to complete
export const maxDuration = 120;

export type Leader = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

export type Community = {
  id: string;
  name: string;
  type: "geographic" | "topic";
  category?: string;
  visibility: "public" | "private";
  country: string;
  state: string;
  region: string;
  leaders: number;
  status: "active" | "suspended" | "pending" | "under construction" | "under investigation" | "inactive";
  users: number;
  businesses: number;
  createdAt: any; 
  createdBy: string;
  monthlyIncome: number;
  revenueShare?: number;
};

export type UserOption = {
  id: string;
  name: string;
  email: string;
  offenseCount?: number;
  memberOf?: string[];
  homeCommunityId?: string;
  role?: string;
  communityRoles?: Record<string, any>;
}

const communityStatuses: Community['status'][] = ["active", "pending", "suspended", "under construction", "under investigation", "inactive"];
const communityTypes: Community['type'][] = ["geographic", "topic"];
const communityVisibilities: Community['visibility'][] = ["public", "private"];


function CreateCommunityDialog() {
    const { user } = useUser();
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    const [communityType, setCommunityType] = React.useState<Community["type"]>("geographic");
    const [communityCategory, setCommunityCategory] = React.useState("");
    const [communityVisibility, setCommunityVisibility] = React.useState<Community["visibility"]>("public");
    
    const [communitySelection, setCommunitySelection] = React.useState<CommunitySelection | null>(null);
    const [isLocationVerified, setIsLocationVerified] = React.useState(false);

    const firestore = useFirestore();
    
    const onCreateCommunity = async () => {
    setLoading(true);
    try {
        if (!firestore) throw new Error("Database not available.");
        if (!communitySelection) throw new Error("Community selection is required.");

        const { country: countryId, state: stateId, region: regionId, community: communityId } = communitySelection;
        if (!countryId) throw new Error("A country must be selected.");

        const batch = firestore.batch();

        const getDocName = async (collection: string, docId: string) => {
            if (!docId) return null;
            const docRef = doc(firestore, collection, docId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().name : null;
        };

        const finalCountryName = await getDocName('locations', countryId);
        if (!finalCountryName) throw new Error("Selected country data could not be found.");

        let finalStateId = stateId;
        let finalStateName: string | null = null;
        let finalRegionId = regionId;
        let finalRegionName: string | null = null;
        let finalCommunityId = communityId;
        let finalCommunityName: string | null = null;

        const isCreatingNewState = stateId === 'new';
        const isCreatingNewRegion = regionId === 'new';
        const isCreatingNewCommunity = communityId === 'other' || !communityId;
        
        const otherStateInput = document.getElementById(`other-state-${communitySelection.id}`) as HTMLInputElement | null;
        const otherRegionInput = document.getElementById(`other-region-${communitySelection.id}`) as HTMLInputElement | null;
        const otherCommunityInput = document.getElementById(`other-community-${communitySelection.id}`) as HTMLInputElement | null;

        if (isCreatingNewState) {
            if (!otherStateInput?.value || !otherRegionInput?.value || !otherCommunityInput?.value) {
                throw new Error("New state, region, and community names are required.");
            }
            finalStateName = otherStateInput.value;
            finalRegionName = otherRegionInput.value;
            finalCommunityName = otherCommunityInput.value;

            const newStateRef = doc(collection(firestore, 'locations'));
            batch.set(newStateRef, { name: finalStateName, type: 'state', parent: countryId });
            finalStateId = newStateRef.id;
        } else {
             if (!finalStateId) throw new Error("A state must be selected.");
            finalStateName = await getDocName('locations', finalStateId);
        }

        if (isCreatingNewRegion) {
            const regionNameValue = otherRegionInput?.value;
            if (!regionNameValue) throw new Error("New region name is required.");
            finalRegionName = regionNameValue;
            
            const newRegionRef = doc(collection(firestore, 'locations'));
            batch.set(newRegionRef, { name: finalRegionName, type: 'region', parent: finalStateId });
            finalRegionId = newRegionRef.id;
        } else if (!isCreatingNewState) {
             if (!finalRegionId) throw new Error("A region must be selected.");
            finalRegionName = await getDocName('locations', finalRegionId);
        }

        if (isCreatingNewCommunity) {
            const communityNameValue = otherCommunityInput?.value;
            if (!communityNameValue) throw new Error("New community name is required.");
            finalCommunityName = communityNameValue;
            
            const newCommunityRef = doc(collection(firestore, "communities"));
            batch.set(newCommunityRef, { 
                name: finalCommunityName, country: finalCountryName, state: finalStateName, region: finalRegionName, 
                createdAt: serverTimestamp(), status: 'inactive', type: communityType, visibility: communityVisibility, 
                category: communityType === 'topic' ? communityCategory : '', profileId: newCommunityRef.id, 
                leaderCount: 0, memberCount: 0, createdBy: user?.uid 
            });
            finalCommunityId = newCommunityRef.id;
        } else if (!isCreatingNewState && !isCreatingNewRegion) {
            if (!finalCommunityId) throw new Error("A community must be selected.");
            finalCommunityName = await getDocName('communities', finalCommunityId);
        }
        
        await batch.commit();
        toast({ title: "Success", description: "Community created successfully." });
        setOpen(false);

    } catch (error: any) {
        toast({ title: "Error creating community", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
};


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Create Community
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create Community</DialogTitle>
                    <DialogDescription>
                        Create a new community and its associated locations if they don't exist.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] -mr-6">
                    <div className="grid gap-4 py-4 pr-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type *</Label>
                                <Select onValueChange={(val: Community["type"]) => setCommunityType(val)} defaultValue={communityType}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {communityTypes.map((type) => (
                                            <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Visibility *</Label>
                                <Select onValueChange={(val: Community["visibility"]) => setCommunityVisibility(val)} defaultValue={communityVisibility}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {communityVisibilities.map((visibility) => (
                                            <SelectItem key={visibility} value={visibility} className="capitalize">{visibility}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category (for Topic communities)</Label>
                            <Input id="category" value={communityCategory} onChange={(e) => setCommunityCategory(e.target.value)} />
                        </div>

                        <Separator className="my-4" />
                        
                        <CommunitySelector 
                            selection={communitySelection}
                            onSelectionChange={setCommunitySelection}
                            isLocationVerified={isLocationVerified}
                            onVerificationChange={setIsLocationVerified}
                        />
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" onClick={onCreateCommunity} disabled={loading || !isLocationVerified}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ManageCommunitiesTable() {
  const searchParams = useSearchParams();
  const disputeId = searchParams.get('dispute');
  const withId = searchParams.get('with');

  const [allCommunities, setAllCommunities] = React.useState<Community[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);
  
  // Table State
  const [filters, setFilters] = React.useState<{name: string; country: string; state: string; region: string; status: string[]; type: string[]; visibility: string[]}>({
      name: "",
      country: "",
      state: "",
      region: "",
      status: [],
      type: [],
      visibility: [],
  });
  const [sorting, setSorting] = React.useState<{key: keyof Community; order: 'asc' | 'desc'}>({ key: 'createdAt', order: 'desc' });
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  
  // Dialog states
  const [isAppointDialogOpen, setIsAppointDialogOpen] = React.useState(false);
  const [selectedCommunity, setSelectedCommunity] = React.useState<Community | null>(null);
  const [allUsers, setAllUsers] = React.useState<UserOption[]>([]);
  const [selectedUserForAppointment, setSelectedUserForAppointment] = React.useState("");
  const [isAppointing, setIsAppointing] = React.useState(false);
  
  // Community Details Dialog
  const [viewingCommunityDetails, setViewingCommunityDetails] = React.useState<Community | null>(null);

  // Combobox states
  const [isUserSearchOpen, setIsUserSearchOpen] = React.useState(false);
  const [userSearchQuery, setUserSearchQuery] = React.useState("");
  
  const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false);
  const [communityToRename, setCommunityToRename] = React.useState<Community | null>(null);
  const [newCommunityName, setNewCommunityName] = React.useState("");
  const [isRenaming, setIsRenaming] = React.useState(false);

  const [isChangeTypeOpen, setIsChangeTypeOpen] = React.useState(false);
  const [communityToChangeType, setCommunityToChangeType] = React.useState<Community | null>(null);
  const [newCommunityType, setNewCommunityType] = React.useState<Community['type']>('geographic');
  const [isChangingType, setIsChangingType] = React.useState(false);
  
  const [isChangeVisibilityOpen, setIsChangeVisibilityOpen] = React.useState(false);
  const [communityToChangeVisibility, setCommunityToChangeVisibility] = React.useState<Community | null>(null);
  const [isChangingVisibility, setIsChangingVisibility] = React.useState(false);

  const [isRevenueDialogOpen, setIsRevenueDialogOpen] = React.useState(false);
  const [communityForRevenue, setCommunityForRevenue] = React.useState<Community | null>(null);
  const [revenueShare, setRevenueShare] = React.useState(0);
  const [revenueShareReason, setRevenueShareReason] = React.useState("");
  const [isSavingRevenue, setIsSavingRevenue] = React.useState(false);

  React.useEffect(() => {
    if (!db) {
        setLoading(false);
        return;
    }
    setLoading(true);

    const communitiesQuery = query(collection(db, "communities"));
    const unsubCommunities = onSnapshot(communitiesQuery, (snapshot) => {
        const communitiesData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                users: data.memberCount || 0,
                businesses: 0, 
                leaders: data.leaderCount || 0,
                monthlyIncome: data.monthlyIncome || 0,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
            } as Community;
        });

        setAllCommunities(communitiesData);
        setLoading(false);
    });

    const usersQuery = query(collection(db, "users"));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        const allUsersData: UserOption[] = [];
        snapshot.forEach(docSnap => {
            const userData = docSnap.data();
            allUsersData.push({ 
                id: docSnap.id, 
                name: userData.name, 
                email: userData.email, 
                offenseCount: userData.offenseCount || 0,
                memberOf: userData.memberOf || [],
                homeCommunityId: userData.homeCommunityId || '',
                role: userData.role,
                communityRoles: userData.communityRoles || {}
            });
        });
        setAllUsers(allUsersData);
    });

    return () => {
        unsubCommunities();
        unsubUsers();
    };
  }, [db]);
  
  // Stats calculation
  const stats = React.useMemo(() => {
      return {
          total: allCommunities.length,
          active: allCommunities.filter(c => c.status === 'active').length,
          pending: allCommunities.filter(c => c.status === 'pending').length,
          suspended: allCommunities.filter(c => c.status === 'suspended').length,
          inactive: allCommunities.filter(c => c.status === 'inactive').length,
          private: allCommunities.filter(c => c.visibility === 'private').length,
          public: allCommunities.filter(c => c.visibility === 'public').length,
      }
  }, [allCommunities]);

  const filteredAndSortedCommunities = React.useMemo(() => {
      let communities = [...allCommunities];

      if (filters.name) {
          communities = communities.filter(c => c.name.toLowerCase().includes(filters.name.toLowerCase()));
      }
      if(filters.country) {
          communities = communities.filter(c => c.country.toLowerCase().includes(filters.country.toLowerCase()));
      }
      if(filters.state) {
           communities = communities.filter(c => c.state.toLowerCase().includes(filters.state.toLowerCase()));
      }
       if(filters.region) {
           communities = communities.filter(c => c.region.toLowerCase().includes(filters.region.toLowerCase()));
      }
      if(filters.status.length > 0) {
           communities = communities.filter(c => filters.status.includes(c.status));
      }
      if (filters.type.length > 0) {
        communities = communities.filter(c => filters.type.includes(c.type));
      }
      if (filters.visibility.length > 0) {
        communities = communities.filter(c => filters.visibility.includes(c.visibility));
      }

      communities.sort((a, b) => {
          const key = sorting.key;
          const order = sorting.order === 'asc' ? 1 : -1;
          const valA = a[key as keyof Community] ?? '';
          const valB = b[key as keyof Community] ?? '';

          if (valA < valB) return -1 * order;
          if (valA > valB) return 1 * order;
          return 0;
      });

      return communities;
  }, [allCommunities, filters, sorting]);
  
  const filteredUsers = React.useMemo(() => {
    if (!userSearchQuery) return allUsers;
    return allUsers.filter(user => 
        user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
        user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [allUsers, userSearchQuery]);

  const paginatedCommunities = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredAndSortedCommunities.slice(start, end);
  }, [filteredAndSortedCommunities, pagination]);

  const pageCount = Math.ceil(filteredAndSortedCommunities.length / pagination.pageSize);

  const handleSort = (key: keyof Community) => {
    setSorting(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };
  
    const handleUpdateStatus = async (communityId: string, status: Community['status']) => {
        const result = await updateCommunityStatusAction({ communityId, newStatus: status });
        if (result.success) {
            toast({ title: 'Status Updated', description: `Community status changed to ${status}.` });
        } else {
            toast({ title: 'Error', description: result.error, variant: "destructive" });
        }
    };
    
    const handleAppointClick = (community: Community) => {
        setSelectedCommunity(community);
        setIsAppointDialogOpen(true);
    };

    const handleConfirmAppointment = async () => {
        if (!selectedCommunity || !selectedUserForAppointment) return;

        setIsAppointing(true);
        const result = await appointCommunityLeaderAction({
            userId: selectedUserForAppointment,
            communityId: selectedCommunity.id,
            communityName: selectedCommunity.name,
        });
        setIsAppointing(false);
        
        if (result.success) {
            toast({ title: "Leader Appointed", description: `User has been appointed as leader.` });
            setIsAppointDialogOpen(false);
            setSelectedUserForAppointment("");
            setSelectedCommunity(null);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
    const handleRenameClick = (community: Community) => {
        setCommunityToRename(community);
        setNewCommunityName(community.name);
        setIsRenameDialogOpen(true);
    };

    const handleConfirmRename = async () => {
        if (!communityToRename || !newCommunityName.trim()) {
            toast({ variant: 'destructive', title: "Invalid Name", description: "Please provide a new name." });
            return;
        }
        setIsRenaming(true);
        const result = await renameCommunityAction({ communityId: communityToRename.id, newName: newCommunityName.trim() });
        setIsRenaming(false);
        
        if (result.success) {
            toast({ title: "Community Renamed", description: `"${communityToRename.name}" has been renamed to "${newCommunityName.trim()}".` });
            setIsRenameDialogOpen(false);
            setCommunityToRename(null);
            setNewCommunityName("");
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
    const handleChangeTypeClick = (community: Community) => {
        setCommunityToChangeType(community);
        setNewCommunityType(community.type);
        setIsChangeTypeOpen(true);
    };

    const handleConfirmChangeType = async () => {
        if (!communityToChangeType) return;
        setIsChangingType(true);
        const result = await updateCommunityTypeAction({ communityId: communityToChangeType.id, newType: newCommunityType });
        setIsChangingType(false);
        if (result.success) {
            toast({ title: "Community Type Changed", description: `Type changed to ${newCommunityType}.` });
            setIsChangeTypeOpen(false);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
    const handleChangeVisibilityClick = (community: Community) => {
        setCommunityToChangeVisibility(community);
        setIsChangeVisibilityOpen(true);
    };

    const handleConfirmChangeVisibility = async () => {
        if (!communityToChangeVisibility) return;
        const newVisibility = communityToChangeVisibility.visibility === 'public' ? 'private' : 'public';
        setIsChangingVisibility(true);
        const result = await updateCommunityVisibilityAction({ communityId: communityToChangeVisibility.id, newVisibility });
        setIsChangingVisibility(false);
        if (result.success) {
            toast({ title: "Community Visibility Changed", description: `Visibility changed to ${newVisibility}.` });
            setIsChangeVisibilityOpen(false);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
    const handleRevenueShareClick = (community: Community) => {
        setCommunityForRevenue(community);
        setRevenueShare(community.revenueShare ?? (community.type === 'topic' ? 0 : 40));
        setRevenueShareReason("");
        setIsRevenueDialogOpen(true);
    };

    const handleConfirmRevenueShare = async () => {
        if (!communityForRevenue || !db) return;
        setIsSavingRevenue(true);
        const leader = await getDocs(query(collection(db, "users"), where("communityId", "==", communityForRevenue.id), where("role", "==", "president"), limit(1)));
        const leaderId = leader.empty ? null : leader.docs[0].id;
        
        const result = await runSetCommunityRevenueShare({ communityId: communityForRevenue.id, share: revenueShare, reason: revenueShareReason, leaderId });
        setIsSavingRevenue(false);
        if (result.success) {
            toast({ title: "Success", description: "Revenue share has been updated."});
            setIsRevenueDialogOpen(false);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive"});
        }
    };

    const handleImpersonateLeader = async (community: Community) => {
        if (!userProfile?.permissions?.actionImpersonateLeader) {
            toast({ title: "Permission Denied", description: "You do not have rights to impersonate community leaders.", variant: "destructive" });
            return;
        }

        // Find the president of this community
        const leader = allUsers.find(u => {
            if (u.role === 'president' && u.homeCommunityId === community.id) return true;
            if (u.communityRoles?.[community.id]?.role === 'president') return true;
            return false;
        });

        if (!leader) {
            toast({ title: "No Leader Found", description: "This community currently has no designated president to impersonate.", variant: "destructive" });
            return;
        }

        const result = await runImpersonateUser({
            targetUserId: leader.id,
            adminId: userProfile.id
        });

        if (result.success) {
            toast({ title: "Leader Impersonation Active", description: `You are now browsing as ${leader.name} for ${community.name}. Redirecting...` });
            window.location.href = `https://www.my-community-hub.co.uk/?impersonate=${leader.id}&scope=${community.id}`;
        } else {
            toast({ title: "Override Failed", description: result.error, variant: "destructive" });
        }
    };

    // Calculate details for the Audit Snapshot
    const communityLeader = viewingCommunityDetails ? allUsers.find(u => {
        if (u.role === 'president' && u.homeCommunityId === viewingCommunityDetails.id) return true;
        if (u.communityRoles?.[viewingCommunityDetails.id]?.role === 'president') return true;
        return false;
    }) : null;

    const membersWithOffenses = viewingCommunityDetails ? allUsers.filter(u => 
        u.homeCommunityId === viewingCommunityDetails.id && u.offenseCount && u.offenseCount > 0
    ) : [];

  return (
    <>
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-teal-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-6">
        <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Globe className="h-3.5 w-3.5" />
                Territories & Community Governance
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
                <Globe className="h-7 w-7 text-emerald-600" />
                Community Hubs Directory
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
                Platform jurisdiction management, leader appointments, visibility controls, and revenue share.
            </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <CreateCommunityDialog />
          <Button asChild variant="outline" size="sm" className="font-bold border-emerald-500/30 hover:bg-emerald-500/10">
            <Link href="/admin/communities/map">
              <MapPin className="mr-2 h-4 w-4 text-emerald-600" />
              View Map
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3.5">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Hubs</p>
                      <div className="p-1 rounded bg-primary/10 text-primary">
                        <Globe className="h-3.5 w-3.5" />
                      </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black">{stats.total}</div>
              </CardContent>
          </Card>
          <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3.5">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active</p>
                      <div className="p-1 rounded bg-emerald-500/10 text-emerald-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</div>
              </CardContent>
          </Card>
          <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3.5">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending</p>
                      <div className="p-1 rounded bg-amber-500/10 text-amber-600">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pending}</div>
              </CardContent>
          </Card>
          <Card className="border-t-4 border-t-slate-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3.5">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inactive</p>
                      <div className="p-1 rounded bg-slate-500/10 text-slate-600">
                        <XCircle className="h-3.5 w-3.5" />
                      </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-600 dark:text-slate-400">{stats.inactive}</div>
              </CardContent>
          </Card>
          <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3.5">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Suspended</p>
                      <div className="p-1 rounded bg-rose-500/10 text-rose-600">
                        <ShieldAlert className="h-3.5 w-3.5" />
                      </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">{stats.suspended}</div>
              </CardContent>
          </Card>
          <Card className="border-t-4 border-t-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3.5">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Private</p>
                      <div className="p-1 rounded bg-purple-500/10 text-purple-600">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">{stats.private}</div>
              </CardContent>
          </Card>
          <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3.5">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Public</p>
                      <div className="p-1 rounded bg-blue-500/10 text-blue-600">
                        <Globe className="h-3.5 w-3.5" />
                      </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">{stats.public}</div>
              </CardContent>
          </Card>
      </div>

      <Card className="border-t-4 border-t-emerald-500 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent rounded-t-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold">Community Directory</CardTitle>
              <CardDescription>
                Detailed list of all hubs with administrative controls. Member counts represent registered residents only.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <Input
              placeholder="Search hubs by name..."
              value={filters.name}
              onChange={(event) =>
                setFilters((f) => ({ ...f, name: event.target.value }))
              }
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Status <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {communityStatuses.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filters.status.includes(status)}
                    onCheckedChange={() => {
                      setFilters((f) => ({
                        ...f,
                        status: f.status.includes(status)
                          ? f.status.filter((s) => s !== status)
                          : [...f.status, status],
                      }));
                    }}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Type <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {communityTypes.map((type) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={filters.type.includes(type)}
                    onCheckedChange={() => {
                      setFilters((f) => ({
                        ...f,
                        type: f.type.includes(type)
                          ? f.type.filter((s) => s !== type)
                          : [...f.type, type],
                      }));
                    }}
                    className="capitalize"
                  >
                    {type}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Visibility <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {communityVisibilities.map((visibility) => (
                  <DropdownMenuCheckboxItem
                    key={visibility}
                    checked={filters.visibility.includes(visibility)}
                    onCheckedChange={() => {
                      setFilters((f) => ({
                        ...f,
                        visibility: f.visibility.includes(visibility)
                          ? f.visibility.filter((s) => s !== visibility)
                          : [...f.visibility, visibility],
                      }));
                    }}
                    className="capitalize"
                  >
                    {visibility}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {Object.values(filters).some((v) =>
              Array.isArray(v) ? v.length > 0 : !!v
            ) && (
              <Button
                variant="ghost"
                onClick={() =>
                  setFilters({
                    name: "",
                    country: "",
                    state: "",
                    region: "",
                    status: [],
                    type: [],
                    visibility: [],
                  })
                }
              >
                Reset
                <FilterX className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("name")}
                    >
                      Community Name <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("type")}
                    >
                      Type <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("visibility")}
                    >
                      Visibility <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("users")}
                    >
                      Members <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Leaders</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("revenueShare")}
                    >
                      Revenue Share <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("status")}
                    >
                      Status <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("monthlyIncome")}
                    >
                      Monthly Income <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <Loader2 className="animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : paginatedCommunities.length > 0 ? (
                  paginatedCommunities.map((community) => {
                    const isDisputed =
                      community.id === disputeId || community.id === withId;
                    const leaderCount = community.leaders ?? 0;
                    const canAppoint =
                      community.type === "topic" &&
                      community.visibility === "private" &&
                      leaderCount === 0;

                    return (
                        <ContextMenu key={community.id}>
                            <ContextMenuTrigger asChild>
                                <TableRow className={cn(isDisputed && "bg-destructive/10", "hover:bg-muted/50 cursor-context-menu")}>
                                    <TableCell>
                                      <div className="font-medium">
                                        {community.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {community.type === "geographic"
                                          ? [
                                              community.region,
                                              community.state,
                                              community.country,
                                            ]
                                              .filter(Boolean)
                                              .join(", ")
                                          : community.category}
                                      </div>
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      {community.type || "geographic"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          community.visibility === "public"
                                            ? "outline"
                                            : "secondary"
                                        }
                                        className="capitalize"
                                      >
                                        {community.visibility === "private" && (
                                          <Lock className="mr-1.5 h-3 w-3" />
                                        )}
                                        {community.visibility || "public"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{community.users}</TableCell>
                                    <TableCell className="text-center">
                                      {leaderCount}
                                    </TableCell>
                                    <TableCell className="text-center font-medium">
                                      {community.revenueShare ??
                                        (community.type === "topic" ? 0 : 40)}
                                      %
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={{
                                            active: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                                            suspended: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                                            pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                                            inactive: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
                                            "under construction": "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
                                            "under investigation": "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
                                          }[community.status]}>{community.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold">{new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(community.monthlyIncome || 0)}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setViewingCommunityDetails(community)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View Details
                                                </DropdownMenuItem>
                                                {userProfile?.permissions?.actionImpersonateLeader && (
                                                    <DropdownMenuItem onClick={() => handleImpersonateLeader(community)} className="text-primary font-bold">
                                                        <UserCheck className="mr-2 h-4 w-4" />
                                                        Impersonate Leader
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onSelect={() => handleRenameClick(community)}>
                                                    <FileEdit className="mr-2 h-4 w-4" /> Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleChangeTypeClick(community)}>
                                                    <Replace className="mr-2 h-4 w-4" /> Change Type
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleRevenueShareClick(community)}>
                                                    <Percent className="mr-2 h-4 w-4" /> Set Revenue Share
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleChangeVisibilityClick(community)}>
                                                    {community.visibility === 'public' ? <Lock className="mr-2 h-4 w-4" /> : <Globe className="mr-2 h-4 w-4" />}
                                                    Make {community.visibility === 'public' ? 'Private' : 'Public'}
                                                </DropdownMenuItem>
                                                
                                                <DropdownMenuSeparator />
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                                        <span>Change Status</span>
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(community.id, 'active')}>
                                                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Active
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(community.id, 'pending')}>
                                                            <Clock className="mr-2 h-4 w-4 text-yellow-600" /> Pending
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(community.id, 'inactive')}>
                                                            <XCircle className="mr-2 h-4 w-4 text-slate-600" /> Inactive
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(community.id, 'suspended')} className="text-destructive">
                                                            <ShieldAlert className="mr-2 h-4 w-4" /> Suspended
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(community.id, 'under construction')}>
                                                            <Construction className="mr-2 h-4 w-4" /> Under Construction
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(community.id, 'under investigation')}>
                                                            <ShieldAlert className="mr-2 h-4 w-4" /> Under Investigation
                                                        </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>

                                                <DropdownMenuSeparator />
                                                {canAppoint && (
                                                    <DropdownMenuItem onSelect={() => handleAppointClick(community)}>
                                                        <Crown className="mr-2 h-4 w-4" /> Appoint a Leader
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuLabel>Actions for {community.name}</ContextMenuLabel>
                                <ContextMenuSeparator />
                                <ContextMenuItem onSelect={() => setViewingCommunityDetails(community)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Audit Snapshot
                                </ContextMenuItem>
                                {userProfile?.permissions?.actionImpersonateLeader && (
                                    <ContextMenuItem onClick={() => handleImpersonateLeader(community)} className="text-primary font-bold">
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Impersonate Leader
                                    </ContextMenuItem>
                                )}
                                <ContextMenuItem onSelect={() => handleRenameClick(community)}>
                                    <FileEdit className="mr-2 h-4 w-4" /> Rename
                                </ContextMenuItem>
                                <ContextMenuItem onSelect={() => handleChangeTypeClick(community)}>
                                    <Replace className="mr-2 h-4 w-4" /> Change Type
                                </ContextMenuItem>
                                 <ContextMenuItem onSelect={() => handleRevenueShareClick(community)}>
                                    <Percent className="mr-2 h-4 w-4" /> Set Revenue Share
                                 </ContextMenuItem>
                                <ContextMenuItem onSelect={() => handleChangeVisibilityClick(community)}>
                                    {community.visibility === 'public' ? <Lock className="mr-2 h-4 w-4" /> : <Globe className="mr-2 h-4 w-4" />}
                                    Make {community.visibility === 'public' ? 'Private' : 'Public'}
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuSub>
                                    <ContextMenuSubTrigger className="flex items-center px-2 py-1.5 text-sm">
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        <span>Change Status</span>
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent>
                                        <ContextMenuItem onClick={() => handleUpdateStatus(community.id, 'active')}>
                                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Active
                                        </ContextMenuItem>
                                        <ContextMenuItem onClick={() => handleUpdateStatus(community.id, 'pending')}>
                                            <Clock className="mr-2 h-4 w-4 text-yellow-600" /> Pending
                                        </ContextMenuItem>
                                        <ContextMenuItem onClick={() => handleUpdateStatus(community.id, 'inactive')}>
                                            <XCircle className="mr-2 h-4 w-4 text-slate-600" /> Inactive
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem onClick={() => handleUpdateStatus(community.id, 'suspended')} className="text-destructive">
                                            <ShieldAlert className="mr-2 h-4 w-4" /> Suspended
                                        </ContextMenuItem>
                                        <ContextMenuItem onClick={() => handleUpdateStatus(community.id, 'under construction')}>
                                            <Construction className="mr-2 h-4 w-4" /> Under Construction
                                        </ContextMenuItem>
                                        <ContextMenuItem onClick={() => handleUpdateStatus(community.id, 'under investigation')}>
                                            <ShieldAlert className="mr-2 h-4 w-4" /> Under Investigation
                                        </ContextMenuItem>
                                    </ContextMenuSubContent>
                                </ContextMenuSub>
                                <ContextMenuSeparator />
                                {canAppoint && (
                                    <ContextMenuItem onSelect={() => handleAppointClick(community)}>
                                        <Crown className="mr-2 h-4 w-4" /> Appoint a Leader
                                    </ContextMenuItem>
                                )}
                            </ContextMenuContent>
                        </ContextMenu>
                        )
                    })
                    ) : (
                    <TableRow><TableCell colSpan={12} className="h-24 text-center">No results.</TableCell></TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
            <PaginationControls pagination={pagination} setPagination={setPagination} pageCount={pageCount} totalRows={filteredAndSortedCommunities.length} />
            </CardContent>
            </Card>

            {/* AUDIT SNAPSHOT DIALOG */}
            <Dialog open={!!viewingCommunityDetails} onOpenChange={() => setViewingCommunityDetails(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader className="border-b pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Globe className="h-6 w-6 text-primary" />
                                </div>
                                {viewingCommunityDetails && (
                                    <div>
                                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter">Community Audit Snapshot</DialogTitle>
                                        <DialogDescription className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Administrative Record</DialogDescription>
                                    </div>
                                )}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 text-xs font-bold uppercase tracking-tighter">
                                <Printer className="h-3.5 w-3.5" /> Print Report
                            </Button>
                        </div>
                    </DialogHeader>
                    
                    <ScrollArea className="flex-1 pr-4 mt-4">
                        {viewingCommunityDetails && (
                            <div className="space-y-8 py-2">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <section className="space-y-3">
                                        <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Jurisdiction</h3>
                                        <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border">
                                            <p className="text-xl font-bold leading-none mb-2">{viewingCommunityDetails.name}</p>
                                            <div className="text-xs font-medium space-y-1">
                                                <p className="text-muted-foreground uppercase text-[10px]">Location Path</p>
                                                <p>{viewingCommunityDetails.country} &rsaquo; {viewingCommunityDetails.state} &rsaquo; {viewingCommunityDetails.region}</p>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Status & Growth</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 border rounded-md bg-muted/20">
                                                <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Status</p>
                                                <Badge variant="outline" className="capitalize text-[10px] font-bold">{viewingCommunityDetails.status}</Badge>
                                            </div>
                                            <div className="p-2 border rounded-md bg-muted/20">
                                                <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Created</p>
                                                <p className="text-xs font-bold">{viewingCommunityDetails.createdAt ? format(new Date(viewingCommunityDetails.createdAt), 'dd MMM yyyy') : 'Pending'}</p>
                                            </div>
                                            <div className="p-2 border rounded-md bg-muted/20">
                                                <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Members</p>
                                                <p className="text-lg font-black leading-none">{viewingCommunityDetails.users}</p>
                                            </div>
                                            <div className="p-2 border rounded-md bg-muted/20">
                                                <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Type</p>
                                                <p className="text-xs font-bold capitalize">{viewingCommunityDetails.type}</p>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <Separator />

                                <section className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-1.5"><Crown className="h-3 w-3" /> Leadership</h3>
                                        {communityLeader && <Badge className="bg-green-100 text-green-800 text-[10px] uppercase font-bold">President Active</Badge>}
                                    </div>
                                    <Card className="bg-muted/10 border-dashed">
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-primary/5 border-2 border-primary/20 flex items-center justify-center">
                                                <Crown className={cn("h-6 w-6", communityLeader ? "text-primary" : "text-muted-foreground/30")} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold">{communityLeader ? communityLeader.name : 'Leaderless Community'}</p>
                                                <p className="text-xs text-muted-foreground">{communityLeader ? communityLeader.email : 'This community is currently managed by platform administrators.'}</p>
                                            </div>
                                            {!communityLeader && (
                                                <Button size="sm" variant="outline" onClick={() => handleAppointClick(viewingCommunityDetails)}>Appoint Now</Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Commercial Performance</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-3 border rounded-lg bg-blue-50/50">
                                            <p className="text-[9px] font-bold uppercase text-blue-600 mb-1">Revenue Share</p>
                                            <p className="text-xl font-black">{viewingCommunityDetails.revenueShare || (viewingCommunityDetails.type === 'topic' ? 0 : 40)}%</p>
                                        </div>
                                        <div className="p-3 border rounded-lg bg-green-50/50">
                                            <p className="text-[9px] font-bold uppercase text-green-600 mb-1">Monthly Net Yield</p>
                                            <p className="text-xl font-black text-green-700">{new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(viewingCommunityDetails.monthlyIncome || 0)}</p>
                                        </div>
                                        <div className="p-3 border rounded-lg bg-slate-50">
                                            <p className="text-[9px] font-bold uppercase text-slate-600 mb-1">Businesses</p>
                                            <p className="text-xl font-black">{viewingCommunityDetails.businesses}</p>
                                        </div>
                                         <div className="p-3 border rounded-lg bg-slate-50">
                                            <p className="text-[9px] font-bold uppercase text-slate-600 mb-1">Local Growth</p>
                                            <p className="text-xs font-bold text-slate-500 italic">Tracking Active</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">* Monthly Net Yield is calculated after 2.5% Stripe fees. Includes Listing Share ({viewingCommunityDetails.revenueShare || 40}%) and Storefront Share (10%).</p>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-1.5"><ShieldAlert className="h-3 w-3" /> Community Health & Safety</h3>
                                        <Badge variant={membersWithOffenses.length > 0 ? "destructive" : "outline"} className="text-[10px] font-bold uppercase">
                                            {membersWithOffenses.length} Active Violations
                                        </Badge>
                                    </div>
                                    {membersWithOffenses.length > 0 ? (
                                        <div className="space-y-2">
                                            {membersWithOffenses.map(member => (
                                                <div key={member.id} className="flex items-center justify-between p-2 rounded-md border bg-red-50/30 border-red-100">
                                                    <div className="flex items-center gap-3">
                                                        <ShieldAlert className="h-4 w-4 text-destructive" />
                                                        <div>
                                                            <p className="text-xs font-bold leading-none">{member.name}</p>
                                                            <p className="text-[10px] text-muted-foreground">{member.email}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="destructive" className="h-5 text-[9px] uppercase font-black">{member.offenseCount} Offenses</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center border border-dashed rounded-lg bg-muted/20">
                                            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm text-muted-foreground font-medium">No members currently on report in this community.</p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </ScrollArea>

                    <DialogFooter className="border-t pt-4">
                        <DialogClose asChild>
                            <Button variant="outline" className="font-bold uppercase tracking-tighter text-xs">Close Audit</Button>
                        </DialogClose>
                        <Button asChild className="font-bold uppercase tracking-tighter text-xs">
                             <Link href={`/admin/manage-users?communityId=${viewingCommunityDetails?.id}`}>
                                <Users className="h-3 w-3 mr-2" /> Manage All Members
                             </Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAppointDialogOpen} onOpenChange={setIsAppointDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Appoint Community Leader</DialogTitle>
                        <DialogDescription>
                            Appoint a leader for the private community: <span className="font-bold">{selectedCommunity?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                         <div className="space-y-2">
                            <Label>Select a User</Label>
                            <Popover open={isUserSearchOpen} onOpenChange={setIsUserSearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isUserSearchOpen}
                                        className="w-full justify-between"
                                    >
                                        {selectedUserForAppointment
                                            ? allUsers.find(user => user.id === selectedUserForAppointment)?.name
                                            : "Select a user..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput 
                                            placeholder="Search by name or email..."
                                            value={userSearchQuery}
                                            onValueChange={setUserSearchQuery}
                                        />
                                        <CommandEmpty>No user found.</CommandEmpty>
                                        <ScrollArea className="max-h-60">
                                            <CommandGroup>
                                                {filteredUsers.map(user => (
                                                    <CommandItem
                                                        key={user.id}
                                                        value={user.id}
                                                        onSelect={(currentValue) => {
                                                            setSelectedUserForAppointment(currentValue === selectedUserForAppointment ? "" : currentValue)
                                                            setIsUserSearchOpen(false)
                                                            setUserSearchQuery("")
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedUserForAppointment === user.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {user.name} ({user.email})
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAppointDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmAppointment} disabled={!selectedUserForAppointment || isAppointing}>
                            {isAppointing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Appointment & Send Invite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Community</DialogTitle>
                        <DialogDescription>
                            Enter a new name for the community: <span className="font-bold">{communityToRename?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="new-community-name">New Community Name</Label>
                        <Input 
                            id="new-community-name" 
                            value={newCommunityName}
                            onChange={(e) => setNewCommunityName(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmRename} disabled={!newCommunityName.trim() || isRenaming}>
                            {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isChangeTypeOpen} onOpenChange={setIsChangeTypeOpen}>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Community Type</DialogTitle>
                         <DialogDescription>
                           Select a new type for the community: <span className="font-bold">{communityToChangeType?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="new-community-type">New Type</Label>
                        <Select value={newCommunityType} onValueChange={(val: Community['type']) => setNewCommunityType(val)}>
                            <SelectTrigger id="new-community-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="geographic">Geographic</SelectItem>
                                <SelectItem value="topic">Topic</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsChangeTypeOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmChangeType} disabled={isChangingType}>
                            {isChangingType && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             <Dialog open={isChangeVisibilityOpen} onOpenChange={setIsChangeVisibilityOpen}>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Community Visibility</DialogTitle>
                         <DialogDescription>
                           Are you sure you want to make the community <span className="font-bold">{communityToChangeVisibility?.name}</span> {communityToChangeVisibility?.visibility === 'public' ? 'Private' : 'Public'}?
                        </DialogDescription>
                    </DialogHeader>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setIsChangeVisibilityOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmChangeVisibility} disabled={isChangingVisibility}>
                            {isChangingVisibility && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Change
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isRevenueDialogOpen} onOpenChange={setIsRevenueDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Revenue Share for {communityForRevenue?.name}</DialogTitle>
                        <DialogDescription>
                           Set the percentage of business subscription revenue this community will receive.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="revenue-share">Revenue Share (%)</Label>
                            <Input
                                id="revenue-share"
                                type="number"
                                value={revenueShare}
                                onChange={(e) => setRevenueShare(Math.max(0, Math.min(100, Number(e.target.value))))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="revenue-reason">Reason for change</Label>
                            <Textarea 
                                id="revenue-reason"
                                placeholder="e.g., Standard 40% share for new geographic communities."
                                value={revenueShareReason}
                                onChange={(e) => setRevenueShareReason(e.target.value)}
                             />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRevenueDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmRevenueShare} disabled={isSavingRevenue || !revenueShareReason}>
                             {isSavingRevenue && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             <Save className="mr-2 h-4 w-4" /> Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
  );
}

export default function ManageCommunitiesPage() {
  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Globe className="h-8 w-8" />
                Manage Communities
            </h1>
            <p className="text-muted-foreground">
                View, approve, and manage all communities on the platform.
            </p>
        </div>
        <Tabs defaultValue="manage" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manage">Manage Communities</TabsTrigger>
                <TabsTrigger value="bulk-upload">Bulk Upload & Maintenance</TabsTrigger>
            </TabsList>
            <TabsContent value="manage">
                 <React.Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <ManageCommunitiesTable />
                </React.Suspense>
            </TabsContent>
            <TabsContent value="bulk-upload">
                <BulkUpload />
            </TabsContent>
        </Tabs>
    </div>
  );
}

function BulkUpload() {
    const [dataType, setDataType] = React.useState<"country" | "state" | "region" | "community">("country");
    const [locationInput, setLocationInput] = React.useState("");
    const [parentCountry, setParentCountry] = React.useState("");
    const [parentState, setParentState] = React.useState("");
    const [parentRegion, setParentRegion] = React.useState("");
    const [isUploading, setIsUploading] = React.useState(false);
    const [isMigrating, setIsMigrating] = React.useState(false);
    const [isSyncingStats, setIsSyncingStats] = React.useState(false);
    const { toast } = useToast();
    const db = useFirestore();

    const [countries, setCountries] = React.useState<{label: string, value: string}[]>([]);
    const [states, setCountriesStates] = React.useState<{label: string, value: string}[]>([]);
    const [regions, setCountriesRegions] = React.useState<{label: string, value: string}[]>([]);

    React.useEffect(() => {
        if (!db) return;
        const q = query(collection(db, "locations"), where("type", "==", "country"));
        const unsub = onSnapshot(q, (snapshot) => {
            const countryList = snapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name }));
            countryList.sort((a, b) => a.label.localeCompare(b.label));
            setCountries(countryList);
        });
        return () => unsub();
    }, [db]);

    React.useEffect(() => {
        if (!db || !parentCountry) {
            setCountriesStates([]);
            setParentState("");
            return;
        };
        const q = query(collection(db, "locations"), where("type", "==", "state"), where("parent", "==", parentCountry));
        const unsub = onSnapshot(q, (snapshot) => {
            const stateList = snapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name }));
            stateList.sort((a,b) => a.label.localeCompare(b.label));
            setCountriesStates(stateList);
        });
        return () => unsub();
    }, [db, parentCountry]);

     React.useEffect(() => {
        if (!db || !parentState) {
            setCountriesRegions([]);
            setParentRegion("");
            return;
        };
        const q = query(collection(db, "locations"), where("type", "==", "region"), where("parent", "==", parentState));
        const unsub = onSnapshot(q, (snapshot) => {
            const regionList = snapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name }));
            regionList.sort((a,b) => a.label.localeCompare(b.label));
            setCountriesRegions(regionList);
        });
        return () => unsub();
    }, [db, parentState]);


    const handleUpload = async () => {
        if (!locationInput.trim()) {
            toast({ title: "No input", description: "Please enter a comma-separated list of locations.", variant: "destructive" });
            return;
        }
        if (!db) {
            toast({ title: "Error", description: "Database connection not available.", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        try {
            const names = locationInput.split(',').map(name => name.trim()).filter(name => name.length > 0);
            const batch = writeBatch(db);

            if (dataType === 'community') {
                const countryName = countries.find(c => c.value === parentCountry)?.label;
                const stateName = states.find(s => s.value === parentState)?.label;
                const regionName = regions.find(r => r.value === parentRegion)?.label;

                if (!countryName || !stateName || !regionName) {
                    throw new Error("Parent country, state, and region must be selected for communities.");
                }

                names.forEach(name => {
                    const docRef = doc(collection(db, 'communities'));
                    batch.set(docRef, {
                        name,
                        country: countryName,
                        state: stateName,
                        region: regionName,
                        type: 'geographic',
                        visibility: 'public',
                        status: 'inactive', // DEFAULT TO INACTIVE
                        createdAt: serverTimestamp(),
                        leaderCount: 0,
                        memberCount: 0,
                        profileId: docRef.id
                    });
                });
            } else {
                 let parentId: string | undefined = undefined;
                if (dataType === 'state') {
                    if (!parentCountry) throw new Error('Parent Country Required');
                    parentId = parentCountry;
                }
                if (dataType === 'region') {
                    if (!parentState) throw new Error('Parent State Required');
                    parentId = parentState;
                }
                
                names.forEach(name => {
                    const docRef = doc(collection(db, 'locations'));
                    const locationData: { name: string; type: string; parent?: string } = { name, type: dataType };
                    if (parentId) {
                        locationData.parent = parentId;
                    }
                    batch.set(docRef, locationData);
                });
            }
            
            await batch.commit();

            toast({ title: "Upload Successful", description: `${names.length} locations were added.` });
            setLocationInput("");
        } catch (error: any) {
            toast({ title: "Upload Failed", description: error.message || 'An unknown error occurred.', variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleMigration = async () => {
        if (!confirm("Are you sure you want to convert all 'pending' communities to 'inactive'? This will affect the public visibility of those hubs.")) return;
        
        setIsMigrating(true);
        try {
            const result = await runBulkUpdateCommunityStatus({ fromStatus: 'pending', toStatus: 'inactive' });
            if (result.success) {
                toast({ title: "Migration Successful", description: `Successfully converted ${result.count} communities to Inactive.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Migration Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsMigrating(false);
        }
    };

    const handleRecalculateStats = async () => {
        setIsSyncingStats(true);
        try {
            const result = await recalculateCommunityCounts();
            if (result.success) {
                toast({ title: "Statistics Synchronized", description: result.message });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSyncingStats(false);
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Bulk Upload Locations</CardTitle>
                    <CardDescription>
                        Add multiple countries, states, regions or communities to the database by entering a comma-separated list.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>1. Select Data Type</Label>
                        <Select onValueChange={(val) => setDataType(val as any)} defaultValue={dataType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="country">Countries</SelectItem>
                                <SelectItem value="state">States / Constituents</SelectItem>
                                <SelectItem value="region">Regions / Counties</SelectItem>
                                <SelectItem value="community">Communities</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {(dataType === 'state' || dataType === 'region' || dataType === 'community') && (
                        <div className="space-y-2">
                            <Label>2. Select Parent Location(s)</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="parent-country" className="text-xs text-muted-foreground">Parent Country</Label>
                                    <Select onValueChange={setParentCountry} value={parentCountry}>
                                        <SelectTrigger id="parent-country">
                                            <SelectValue placeholder="Select a Country" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countries.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(dataType === 'region' || dataType === 'community') && (
                                    <div className="space-y-2">
                                        <Label htmlFor="parent-state" className="text-xs text-muted-foreground">Parent State</Label>
                                        <Select onValueChange={setParentState} value={parentState} disabled={!parentCountry || states.length === 0}>
                                            <SelectTrigger id="parent-state">
                                                <SelectValue placeholder="Select a State" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {states.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {dataType === 'community' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="parent-region" className="text-xs text-muted-foreground">Parent Region</Label>
                                        <Select onValueChange={setParentRegion} value={parentRegion} disabled={!parentState || regions.length === 0}>
                                            <SelectTrigger id="parent-region">
                                                <SelectValue placeholder="Select a Region" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {regions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <Label htmlFor="location-input">3. Enter {dataType.charAt(0).toUpperCase() + dataType.slice(1)} Names</Label>
                        <Textarea 
                            id="location-input"
                            placeholder={
                                dataType === 'country' ? "e.g., France, Germany, Spain" :
                                dataType === 'state' ? "e.g., California, Texas, Florida" :
                                dataType === 'region' ? "e.g., Los Angeles County, Cook County" :
                                "e.g., Sunnyvale, Riverdale, Maple Creek"
                            }
                            value={locationInput}
                            onChange={e => setLocationInput(e.target.value)}
                            className="min-h-[120px]"
                        />
                        <p className="text-xs text-muted-foreground">Separate each name with a comma. <strong>New hubs will be set to 'Inactive' by default.</strong></p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleUpload} disabled={!locationInput.trim() || isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Upload List
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-amber-800 dark:text-amber-400">Database Maintenance</CardTitle>
                    </div>
                    <CardDescription className="text-amber-700/80 dark:text-amber-500/80">
                        Perform large-scale status migrations or statistics recalculations.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="default" className="bg-white border-amber-200">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Hub Statistics Re-sync</AlertTitle>
                        <AlertDescription className="text-amber-700 text-xs">
                            Forces a platform-wide audit of all user records to update community member and leader counts. Run this if counts on the dashboard appear incorrect.
                        </AlertDescription>
                    </Alert>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-4">
                    <Button 
                        variant="outline" 
                        className="border-amber-300 text-amber-800 hover:bg-amber-100" 
                        onClick={handleRecalculateStats}
                        disabled={isSyncingStats}
                    >
                        {isSyncingStats ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
                        Recalculate Member/Leader Counts
                    </Button>
                    <Button 
                        variant="outline" 
                        className="border-amber-300 text-amber-800 hover:bg-amber-100" 
                        onClick={handleMigration}
                        disabled={isMigrating}
                    >
                        {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
                        Run Status Migration (Pending to Inactive)
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
