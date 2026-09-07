'use client';

import * as React from "react";
import {
    MoreHorizontal,
    Users,
    Loader2,
    ShieldAlert,
    Crown,
    UserX,
    UserCheck,
    Archive,
    FilterX,
    ChevronDown,
    Eye,
    EyeOff,
    User as UserIcon,
    Calendar,
    FileEdit,
    Clock,
    ArrowUpDown,
    UserCog,
    Trash2,
    ChevronsUpDown,
    Check,
    AlertTriangle,
    Ban,
    ShieldCheck,
    Building,
    HeartHandshake,
    Globe,
    RefreshCw,
    UserCircle,
    History,
    Gavel,
    Activity,
    Wifi,
    WifiOff,
    MapPin,
    UserMinus,
} from "lucide-react"
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where, getDocs, doc, setDoc, orderBy } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, isBefore, isValid } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { findUserByNameAndEmail, addExistingMemberToCommunity, removeMemberFromCommunityAction, updateMemberRoleAction, promoteToStaffAction, demoteStaffAction } from "@/lib/actions/teamActions";
import { updateMemberStatusAction } from "@/lib/actions/memberActions";
import { changeAccountTypeAction, runImpersonateUser } from "@/lib/actions/userActions";
import { PaginationControls } from "@/components/ui/pagination";
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { appointCommunityLeaderAction } from "@/lib/actions/teamActions";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, CommandItem } from "cmdk";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


type MemberStatus = 'active' | 'suspended' | 'pending approval' | 'under investigation' | 'hidden';

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  accountType: 'personal' | 'business' | 'enterprise' | 'advertiser';
  status: MemberStatus;
  joined: any;
  lastActive?: any;
  communityId: string; 
  homeCommunityId: string; 
  avatar: string;
  offenseCount?: number;
  communityRoles?: Record<string, any>;
  permissions?: Record<string, boolean>;
  community?: string;
  liveCommunityName?: string;
  gender?: string;
  ageRange?: string;
  isOnline?: boolean;
  country?: string;
  state?: string;
  region?: string;
  communityName?: string;
};

type UserOffense = {
    id: string;
    userId: string;
    action: 'warned' | 'suspended';
    moderatorId: string;
    moderatorName: string;
    reason: string;
    contentId: string;
    contentType: string;
    createdAt: any;
};

type CommunityOption = {
    id: string;
    name: string;
}

type DropdownRole = {
    id: string;
    name: string;
}

const accountTypes = ['personal', 'business', 'enterprise', 'advertiser'];
const memberStatuses: MemberStatus[] = ['active', 'suspended', 'pending approval', 'under investigation', 'hidden'];

const getRoleBadgeClass = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('owner') || r.includes('founder')) return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold';
    if (r.includes('admin')) return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700 font-bold';
    if (r.includes('president') || r.includes('leader')) return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold';
    if (r.includes('staff')) return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-semibold';
    if (r.includes('broadcaster') || r.includes('reporter')) return 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700 font-semibold';
    if (r.includes('courier')) return 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700 font-semibold';
    if (r.includes('business') || r.includes('enterprise') || r.includes('advertiser')) return 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-700 font-semibold';
    return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
};

const StatusBadge = ({ status }: { status: MemberStatus }) => {
    const statusConfig = {
        'active': { className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold' },
        'suspended': { className: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 font-semibold' },
        'pending approval': { className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 font-semibold' },
        'under investigation': { className: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 font-semibold' },
        'hidden': { className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 font-semibold' },
    };
    return <Badge variant="outline" className={cn("capitalize px-2 py-0.5 text-xs shadow-xs", statusConfig[status]?.className || '')}>{status}</Badge>;
}

const OnlineStatus = ({ isOnline }: { isOnline?: boolean }) => (
    <div className={cn(
        "h-3 w-3 rounded-full border-2 border-background ring-offset-background",
        isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" : "bg-slate-300"
    )} title={isOnline ? "Online" : "Offline"} />
);

const getRolesList = (user: User) => {
    const roles = new Set<string>();
    
    if (user.accountType) {
        roles.add(user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1));
    }

    if (user.title && user.title.toLowerCase() !== user.accountType?.toLowerCase()) {
        roles.add(user.title);
    }

    if (user.permissions?.hasBroadcastAccess) roles.add("Broadcaster");
    if (user.permissions?.isReporter) roles.add("Reporter");
    if (user.permissions?.isCourier) roles.add("Local Courier");
    if (user.permissions?.isStaff) roles.add("Platform Staff");
    
    if (user.communityRoles) {
        Object.values(user.communityRoles).forEach((r: any) => {
            if (r.title) roles.add(r.title);
            else if (r.role) roles.add(r.role.charAt(0).toUpperCase() + r.role.slice(1));
        });
    }

    return Array.from(roles);
};

const UserRow = React.memo(({ user, unassignedCommunities, onAppoint, onUpdateStatus, onViewDetails, onEditRole, onRemove, onPromote, onDemote, onViewOffenses, adminPermissions, onImpersonate }: { 
    user: User; 
    unassignedCommunities: CommunityOption[], 
    onAppoint: (userId: string, communityId: string, communityName: string) => void;
    onUpdateStatus: (userId: string, status: MemberStatus) => void;
    onViewDetails: (user: User) => void;
    onEditRole: (user: User) => void;
    onRemove: (user: User) => void;
    onPromote: (user: User) => void;
    onDemote: (user: User) => void;
    onViewOffenses: (user: User) => void;
    adminPermissions: any;
    onImpersonate: (user: User) => void;
}) => {
    const [isAppointDialogOpen, setIsAppointDialogOpen] = React.useState(false);
    const [selectedCommunity, setSelectedCommunity] = React.useState("");

    const isStaff = user.permissions?.isStaff || user.role === 'owner' || (user.title && user.title.includes('Platform'));
    const leaderRoleCount = user.communityRoles ? Object.keys(user.communityRoles).length : (user.role === 'president' || user.role === 'leader' ? 1 : 0);
    const userRoles = getRolesList(user);

    const handleConfirmAppointment = () => {
        const community = unassignedCommunities.find(c => c.id === selectedCommunity);
        if(community) {
            onAppoint(user.id, community.id, community.name);
            setIsAppointDialogOpen(false);
            setSelectedCommunity("");
        }
    };
    
    const dropdownMenuContent = (
        <DropdownMenuContent align="end" className="max-h-[400px] overflow-y-auto">
            <DropdownMenuLabel>Actions for {user.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewDetails(user)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
            {adminPermissions?.actionImpersonateUser && (
                <DropdownMenuItem onClick={() => onImpersonate(user)} className="text-primary font-bold">
                    <UserCheck className="mr-2 h-4 w-4" /> Impersonate Member
                </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onViewOffenses(user)} disabled={!user.offenseCount || user.offenseCount === 0}>
                <History className="mr-2 h-4 w-4" /> View Offense History
            </DropdownMenuItem>
            <DropdownMenuItem asChild><a href={`https://www.my-community-hub.co.uk/profile/${user.id}`} target="_blank" rel="noopener noreferrer"><UserIcon className="mr-2 h-4 w-4" /> View Profile</a></DropdownMenuItem>
            {user.role !== 'president' && (
                <DropdownMenuItem onClick={() => onEditRole(user)}><UserCog className="mr-2 h-4 w-4" />Change Role</DropdownMenuItem>
            )}

            {isStaff ? (
                <DropdownMenuItem onClick={() => onDemote(user)} className="text-destructive focus:text-destructive">
                    <UserMinus className="mr-2 h-4 w-4" /> Remove from Staff
                </DropdownMenuItem>
            ) : (
                <DropdownMenuItem onClick={() => onPromote(user)}>
                    <UserCog className="mr-2 h-4 w-4 text-primary" /> Promote to Staff
                </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => setIsAppointDialogOpen(true)}>
                <Crown className="mr-2 h-4 w-4" /> Appoint as Leader
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status</DropdownMenuLabel>
             {user.status !== 'active' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(user.id, 'active')}>
                <UserCheck className="mr-2 h-4 w-4" /> Reactivate Member
                </DropdownMenuItem>
            )}
            {user.status !== 'suspended' && (
                <DropdownMenuItem className="text-amber-600 focus:text-amber-600" onClick={() => onUpdateStatus(user.id, 'suspended')}>
                <Ban className="mr-2 h-4 w-4" /> Suspend Member
                </DropdownMenuItem>
            )}
             <DropdownMenuItem onClick={() => onUpdateStatus(user.id, 'pending approval')}>
                <Clock className="mr-2 h-4 w-4" /> Set to Pending
            </DropdownMenuItem>
            <DropdownMenuItem className="text-amber-600 focus:text-amber-600" onClick={() => onUpdateStatus(user.id, 'hidden')}>
                <EyeOff className="mr-2 h-4 w-4" /> Hide User
            </DropdownMenuItem>
            {user.status === 'hidden' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(user.id, 'active')}>
                    <Eye className="mr-2 h-4 w-4" /> Un-hide User
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onRemove(user)}>
                <Trash2 className="mr-2 h-4 w-4"/> Remove from Community
            </DropdownMenuItem>
        </DropdownMenuContent>
    );

    const contextMenuItems = (
        <>
            <ContextMenuLabel>Actions for {user.name}</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => onViewDetails(user)}><Eye className="mr-2 h-4 w-4" /> View Details</ContextMenuItem>
            {adminPermissions?.actionImpersonateUser && (
                <ContextMenuItem onSelect={() => onImpersonate(user)} className="text-primary font-bold">
                    <UserCheck className="mr-2 h-4 w-4" /> Impersonate Member
                </ContextMenuItem>
            )}
            <ContextMenuItem onSelect={() => onViewOffenses(user)} disabled={!user.offenseCount || user.offenseCount === 0}>
                <History className="mr-2 h-4 w-4" /> View Offense History
            </ContextMenuItem>
            <ContextMenuItem asChild><a href={`https://www.my-community-hub.co.uk/profile/${user.id}`} target="_blank" rel="noopener noreferrer"><UserIcon className="mr-2 h-4 w-4" /> View Profile</a></ContextMenuItem>
            {user.role !== 'president' && (
                <ContextMenuItem onSelect={() => onEditRole(user)}><UserCog className="mr-2 h-4 w-4" />Change Role</ContextMenuItem>
            )}
            {isStaff ? (
                <ContextMenuItem onSelect={() => onDemote(user)} className="text-destructive">
                    <UserMinus className="mr-2 h-4 w-4" /> Remove from Staff
                </ContextMenuItem>
            ) : (
                <ContextMenuItem onSelect={() => onPromote(user)}>
                    <UserCog className="mr-2 h-4 w-4 text-primary" /> Promote to Staff
                </ContextMenuItem>
            )}
            <ContextMenuItem onSelect={() => setIsAppointDialogOpen(true)}>
                <Crown className="mr-2 h-4 w-4" /> Appoint as Leader
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuLabel>Status</ContextMenuLabel>
            {user.status !== 'active' && (
                <ContextMenuItem onSelect={() => onUpdateStatus(user.id, 'active')}>
                <UserCheck className="mr-2 h-4 w-4" /> Reactivate Member
                </ContextMenuItem>
            )}
            {user.status !== 'suspended' && (
                <ContextMenuItem className="text-amber-600 focus:text-amber-600" onSelect={() => onUpdateStatus(user.id, 'suspended')}>
                <Ban className="mr-2 h-4 w-4 text-amber-600"/> Suspend Member
                </ContextMenuItem>
            )}
             <ContextMenuItem onSelect={() => onUpdateStatus(user.id, 'pending approval')}>
                <Clock className="mr-2 h-4 w-4" /> Set to Pending
            </ContextMenuItem>
            <ContextMenuItem className="text-amber-600 focus:text-amber-600" onSelect={() => onUpdateStatus(user.id, 'hidden')}>
                <EyeOff className="mr-2 h-4 w-4" /> Hide User
            </ContextMenuItem>
            {user.status === 'hidden' && (
                <ContextMenuItem onSelect={() => onUpdateStatus(user.id, 'active')}>
                    <Eye className="mr-2 h-4 w-4" /> Un-hide User
                </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => onRemove(user)}>
                <UserX className="mr-2 h-4 w-4"/> Remove from Community
            </ContextMenuItem>
        </>
    );

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <TableRow className="block md:table-row cursor-context-menu">
                        <td colSpan={8} className="p-0 md:hidden">
                            <div className="flex items-center justify-between gap-2 p-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={(user as any).avatar} alt={user.name} />
                                            <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-0.5 -right-0.5">
                                            <OnlineStatus isOnline={user.isOnline} />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold truncate">{user.name}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            <StatusBadge status={user.status} />
                                            {userRoles.map((role, idx) => (
                                                <Badge key={idx} variant="outline" className={cn("text-[9px] h-4 px-1.5 whitespace-nowrap shadow-2xs font-semibold", getRoleBadgeClass(role))}>
                                                    {role}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {user.offenseCount && user.offenseCount > 0 && (
                                        <Badge variant="destructive" className="h-6 w-6 p-0 flex items-center justify-center rounded-full text-[10px] cursor-pointer hover:bg-destructive/80 font-bold" onClick={() => onViewOffenses(user)}>
                                            {user.offenseCount}
                                        </Badge>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        {dropdownMenuContent}
                                    </DropdownMenu>
                                </div>
                            </div>
                        </td>
                        
                        <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Avatar className="ring-2 ring-primary/10">
                                        <AvatarImage src={(user as any).avatar} alt={user.name} />
                                        <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="absolute bottom-0 right-0">
                                        <OnlineStatus isOnline={user.isOnline} />
                                    </div>
                                </div>
                                <div>
                                    <div className="font-semibold text-foreground">{user.name || 'No Name Provided'}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{user.email}</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap gap-1 max-w-[170px]">
                                {userRoles.map((role, idx) => (
                                    <Badge key={idx} variant="outline" className={cn("text-[10px] h-5 px-1.5 whitespace-nowrap shadow-2xs font-semibold", getRoleBadgeClass(role))}>
                                        {role}
                                    </Badge>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col">
                                <span className={cn(user.liveCommunityName && user.community !== user.liveCommunityName && "text-muted-foreground line-through text-xs")}>
                                    {user.community || 'N/A'}
                                </span>
                                {user.liveCommunityName && user.community !== user.liveCommunityName && (
                                    <span className="text-[10px] text-amber-600 font-black uppercase flex items-center gap-1 mt-0.5">
                                        <RefreshCw className="h-2 w-2" />
                                        Now: {user.liveCommunityName}
                                    </span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                <Calendar className="h-3 w-3" />
                                {user.joined ? format(user.joined, 'MMM d, yyyy') : 'N/A'}
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                            <span className="font-medium">{leaderRoleCount}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                            {user.offenseCount && user.offenseCount > 0 ? (
                                <button onClick={() => onViewOffenses(user)}>
                                    <Badge variant="destructive" className="flex items-center gap-1.5 justify-center w-fit mx-auto px-2 h-6 hover:bg-destructive/80 transition-colors">
                                        <ShieldAlert className="h-3 w-3" />
                                        {user.offenseCount}
                                    </Badge>
                                </button>
                            ) : (
                                <span className="text-xs text-muted-foreground">0</span>
                            )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <StatusBadge status={user.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                {dropdownMenuContent}
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {contextMenuItems}
                </ContextMenuContent>
            </ContextMenu>
            <Dialog open={isAppointDialogOpen} onOpenChange={setIsAppointDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Appoint Community Leader</DialogTitle>
                        <DialogDescription>
                            Appoint <span className="font-bold">{user.name}</span> as the leader of a private, unassigned community.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="community-appointment">Select a Community</Label>
                            <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                                <SelectTrigger id="community-appointment">
                                    <SelectValue placeholder="Select a private community..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {unassignedCommunities.length > 0 ? (
                                        unassignedCommunities.map(comm => (
                                            <SelectItem key={comm.id} value={comm.id}>
                                                {comm.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <p className="p-4 text-sm text-muted-foreground">No unassigned private communities found.</p>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAppointDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmAppointment} disabled={!selectedCommunity}>
                            Confirm Appointment & Send Invite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
});
UserRow.displayName = 'UserRow';


const MemberDetailsDialog = ({ user, onUpdateStatus, onRemove, onEditRole, onPromote, onDemote, onViewOffenses, locationsMap, adminPermissions, onImpersonate }: {
    user: User | null;
    onUpdateStatus: (userId: string, status: MemberStatus) => void;
    onRemove: (user: User) => void;
    onEditRole: (user: User) => void;
    onPromote: (user: User) => void;
    onDemote: (user: User) => void;
    onViewOffenses: (user: User) => void;
    locationsMap: Map<string, string>;
    adminPermissions: any;
    onImpersonate: (user: User) => void;
}) => {
    if (!user) return null;

    const isStaff = user.permissions?.isStaff || user.role === 'owner' || (user.title && user.title.includes('Platform'));

    // Resolve IDs to names if they are stored as IDs
    const resolveName = (idOrName?: string) => {
        if (!idOrName) return null;
        return locationsMap.get(idOrName) || idOrName;
    };

    const country = resolveName(user.country);
    const state = resolveName(user.state);
    const region = resolveName(user.region);
    const communityName = user.communityName;

    const homeHierarchy = [country, state, region, communityName]
        .filter(Boolean)
        .join(' | ');

    return (
    <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Avatar className="h-14 w-14">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0">
                        <OnlineStatus isOnline={user.isOnline} />
                    </div>
                </div>
                <div className="min-w-0">
                    <DialogTitle className="flex items-center gap-2 truncate">
                        {user.name || 'No Name Provided'}
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold shrink-0", user.isOnline ? "text-green-600 border-green-200 bg-green-50" : "text-muted-foreground")}>
                            {user.isOnline ? "Online" : "Offline"}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription className="truncate">{user.email}</DialogDescription>
                </div>
            </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
                <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Gender</p>
                        <p className="font-semibold capitalize">{user.gender || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Age Range</p>
                        <p className="font-semibold">{user.ageRange || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Primary Role</p>
                        <p className="font-semibold capitalize">{user.title || user.role}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Joined Platform</p>
                        <p className="font-semibold flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {user.joined ? format(user.joined, 'PPP') : 'N/A'}
                        </p>
                    </div>
                </div>
                
                <Separator />

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-primary tracking-widest flex items-center gap-1.5">
                            <Globe className="h-3 w-3" /> Registered Home Hub
                        </p>
                        <div className="font-bold text-xs bg-primary/5 p-3 rounded-lg border border-primary/10 leading-relaxed">
                            {homeHierarchy || 'No Home Community Registered'}
                        </div>
                    </div>

                    {user.liveCommunityName && user.communityName !== user.liveCommunityName && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase text-amber-600 tracking-widest flex items-center gap-1.5">
                                <RefreshCw className="h-3 w-3" /> Currently Visiting Hub
                            </p>
                            <div className="font-semibold text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                {user.liveCommunityName}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Active Permissions & Roles</p>
                    <div className="flex flex-wrap gap-1.5">
                        {getRolesList(user).map((r, i) => <Badge key={i} variant="secondary" className="text-[10px] uppercase font-bold">{r}</Badge>)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-2">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Account Status</p>
                        <StatusBadge status={user.status} />
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase text-destructive tracking-widest">Moderation Record</p>
                        <div className="flex items-center gap-2">
                            <Badge variant={user.offenseCount && user.offenseCount > 0 ? "destructive" : "outline"} className="font-bold">
                                {user.offenseCount || 0} Offenses
                            </Badge>
                            {user.offenseCount && user.offenseCount > 0 && (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] uppercase font-bold bg-destructive/5 hover:bg-destructive/10 text-destructive" onClick={() => onViewOffenses(user)}>
                                    Audit Logs
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
        
        <DialogFooter className="p-6 pt-4 border-t shrink-0 flex flex-col sm:flex-row gap-2">
            <div className="grid grid-cols-2 gap-2 w-full">
                <Button asChild variant="outline" size="sm" className="w-full">
                    <a href={`https://www.my-community-hub.co.uk/profile/${user.id}`} target="_blank" rel="noopener noreferrer">
                        <UserCircle className="mr-2 h-4 w-4" /> Profile
                    </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEditRole(user)} className="w-full">
                    <UserCog className="mr-2 h-4 w-4" /> Role
                </Button>
                {adminPermissions?.actionImpersonateUser && (
                    <Button variant="secondary" size="sm" className="w-full text-primary font-bold" onClick={() => onImpersonate(user)}>
                        <UserCheck className="mr-2 h-4 w-4" /> Impersonate
                    </Button>
                )}
                {isStaff ? (
                    <Button variant="secondary" size="sm" onClick={() => onDemote(user)} className="w-full text-destructive">Fire Staff</Button>
                ) : (
                    <Button variant="secondary" size="sm" onClick={() => onPromote(user)} className="w-full text-primary">Hire Staff</Button>
                )}
                {user.status !== 'active' && <Button variant="secondary" size="sm" onClick={() => onUpdateStatus(user.id, 'active')} className="w-full">Reactivate</Button>}
                {user.status !== 'suspended' && <Button variant="secondary" size="sm" className="text-amber-600 hover:text-amber-600 w-full" onClick={() => onUpdateStatus(user.id, 'suspended')}>Suspend</Button>}
            </div>
            <Button variant="destructive" size="sm" onClick={() => onRemove(user)} className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Remove User
            </Button>
        </DialogFooter>
    </DialogContent>
    );
};

const OffenseHistoryDialog = ({ user, onClose }: { user: User | null; onClose: () => void }) => {
    const db = useFirestore();
    const [offenses, setOffenses] = React.useState<UserOffense[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (!user || !db) return;
        setLoading(true);
        const q = query(
            collection(db, "user_offenses"),
            where("userId", "==", user.id)
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserOffense));
            data.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
            setOffenses(data);
            setLoading(false);
        });
        return () => unsub();
    }, [user, db]);

    if (!user) return null;

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b shrink-0">
                <DialogTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Offense History: {user.name}
                </DialogTitle>
                <DialogDescription>Audit trail of moderation actions and violations.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1">
                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
                    ) : offenses.length > 0 ? (
                        <div className="space-y-4">
                            {offenses.map((offense) => (
                                <Card key={offense.id} className="border-l-4 border-l-destructive bg-muted/30">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={offense.action === 'suspended' ? 'destructive' : 'secondary'} className="uppercase text-[10px] font-black">
                                                        {offense.action}
                                                    </Badge>
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                        {offense.contentType}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium leading-relaxed">{offense.reason}</p>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                {offense.createdAt ? format(offense.createdAt.toDate(), 'PPP p') : 'N/A'}
                                            </span>
                                        </div>
                                        <Separator className="opacity-50" />
                                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                            <div className="flex items-center gap-1.5">
                                                <UserCog className="h-3 w-3" />
                                                Moderator: {offense.moderatorName}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Gavel className="h-3 w-3" />
                                                Content ID: {offense.contentId.substring(0, 8)}...
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center italic text-muted-foreground">No offense records found.</div>
                    )}
                </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-4 border-t shrink-0">
                <Button onClick={onClose} className="w-full sm:w-auto">Close History</Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function ManageUsersPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const [userData, setUserData] = React.useState<User[]>([]);
  const [communitiesMap, setCommunitiesMap] = React.useState<Map<string, string>>(new Map());
  const [locationsMap, setLocationsMap] = React.useState<Map<string, string>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedUserForDialog, setSelectedUserForDialog] = React.useState<User | null>(null);
  const [viewingOffensesUser, setViewingOffensesUser] = React.useState<User | null>(null);

  // Table state
  const [filters, setFilters] = React.useState<{ name: string; role: string[]; status: string[] }>({ name: "", role: [], status: [] });
  const [sorting, setSorting] = React.useState<{ key: keyof User; order: 'asc' | 'desc' }>({ key: 'name', order: 'asc' });
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [unassignedCommunities, setUnassignedCommunities] = React.useState<CommunityOption[]>([]);
  
  // Dynamic Roles
  const [availableRoles, setAvailableRoles] = React.useState<DropdownRole[]>([]);

  // Edit Member Dialog State
  const [memberToEdit, setMemberToEdit] = React.useState<User | null>(null);
  const [newAccountType, setNewAccountType] = React.useState<User['accountType']>('personal');
  const [newCommunityRole, setNewCommunityRole] = React.useState('');
  const [isUpdatingRole, setIsUpdatingRole] = React.useState(false);
  
  // Promotion Dialog State
  const [promotingUser, setPromotingUser] = React.useState<User | null>(null);
  const [selectedStaffRole, setSelectedStaffRole] = React.useState("");
  const [isPromoting, setIsPromoting] = React.useState(false);

  // Demotion Dialog State
  const [demotingUser, setDemotingUser] = React.useState<User | null>(null);
  const [isDemoting, setIsDemoting] = React.useState(false);

    React.useEffect(() => {
        if (!db) return;
        const dropdownsDocRef = doc(db, 'platform_settings', 'dropdowns');
        const unsubDropdowns = onSnapshot(dropdownsDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().Users_Roles) {
                setAvailableRoles(docSnap.data().Users_Roles);
            }
        });
        return () => unsubDropdowns();
    }, [db]);
  

  React.useEffect(() => {
    if (!db) return;
    setLoading(true);

    // Fetch communities for mapping
    const commsQuery = collection(db, "communities");
    const unsubComms = onSnapshot(commsQuery, (snapshot) => {
        const map = new Map<string, string>();
        snapshot.forEach(doc => map.set(doc.id, doc.data().name));
        setCommunitiesMap(map);
    });

    // Fetch locations for mapping IDs back to names
    const locationsQuery = collection(db, "locations");
    const unsubLocs = onSnapshot(locationsQuery, (snapshot) => {
        const map = new Map<string, string>();
        snapshot.forEach(doc => map.set(doc.id, doc.data().name));
        setLocationsMap(map);
    });

    const q = query(collection(db, "users"));
    const unsubscribeUsers = onSnapshot(q, (querySnapshot) => {
        const usersData: User[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // DATA HYGIENE: Skip records that lack essential identifiers (ghost documents or failed deletions)
            if (!data.name && !data.email) return;

            usersData.push({ 
                id: doc.id,
                name: data.name || 'Anonymous User',
                email: data.email || 'No Email Registered',
                role: data.role || 'personal',
                title: data.title || '',
                accountType: data.accountType || 'personal',
                communityId: data.communityId, 
                homeCommunityId: data.homeCommunityId || data.memberOf?.[0] || '', 
                status: data.status || 'pending approval',
                avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.id}`,
                offenseCount: data.offenseCount || 0,
                communityRoles: data.communityRoles || {},
                permissions: data.permissions || {},
                joined: data.joined?.toDate ? data.joined.toDate() : null, // Default to null to avoid Jan 1 1970
                lastActive: data.lastActive?.toDate ? data.lastActive.toDate() : (data.joined?.toDate ? data.joined.toDate() : null),
                gender: data.gender,
                ageRange: data.ageRange,
                isOnline: data.isOnline || false,
                country: data.country,
                state: data.state,
                region: data.region,
                communityName: data.communityName,
             } as User);
        });
        setUserData(usersData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching users:", error);
        toast({
            title: "Error fetching data",
            description: "Could not retrieve users from the database.",
            variant: "destructive"
        })
        setLoading(false);
    });

    const communitiesAppointQuery = query(
        collection(db, "communities"),
        where("type", "==", "topic"), 
        where("visibility", "==", "private")
    );
    const unsubscribeAppointCommunities = onSnapshot(communitiesAppointQuery, (snapshot) => {
        const comms = snapshot.docs
            .filter(doc => !doc.data().leaderCount || doc.data().leaderCount === 0)
            .map(doc => ({ id: doc.id, name: doc.data().name }));
        setUnassignedCommunities(comms);
    });

    return () => {
        unsubscribeUsers();
        unsubComms();
        unsubLocs();
        unsubscribeAppointCommunities();
    };
  }, [toast, db]);
  
  const handleSort = (key: keyof User) => {
      setSorting(prev => ({
          key,
          order: prev.key === key && sorting.order === 'asc' ? 'desc' : 'asc'
      }));
  }
  
  const handleAppoint = async (userId: string, communityId: string, communityName: string) => {
        const result = await appointCommunityLeaderAction({ userId, communityId, communityName });
        if (result.success) {
            toast({
                title: "Invitation Sent",
                description: `User has been invited to lead the ${communityName} community.`,
            });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
   const handleUpdateStatus = async (memberId: string, newStatus: MemberStatus) => {
        const result = await updateMemberStatusAction({ memberId, newStatus });
        if(result.success) {
            toast({ title: "Status Updated", description: `Member status has been set to ${newStatus}.` });
        } else {
            toast({ title: "Error", description: result.error, variant: 'destructive' });
        }
    };

  const handleRemoveMember = async (member: User) => {
    const communityIdToRemove = member.communityId;
    if (!communityIdToRemove) {
      toast({ title: "Error", description: "Could not determine the community of this member.", variant: "destructive" });
      return;
    }
    if (window.confirm(`Are you sure you want to remove ${member.name} from the community: ${member.community}?`)) {
      const result = await removeMemberFromCommunityAction({ memberId: member.id, communityId: communityIdToRemove });
      if (result.success) {
        toast({ title: "Member Removed", description: `${member.name} has been removed from ${member.community}.` });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    }
  };

    const handleUpdateRole = async () => {
        if(!memberToEdit || !user || !userProfile?.communityId) return;
        setIsUpdatingRole(true);
        
        const finalRole = newCommunityRole === 'none' ? '' : newCommunityRole;
        const roleLabel = availableRoles.find(r => r.id === finalRole)?.name || '';
        const finalTitle = roleLabel || (finalRole ? finalRole.charAt(0).toUpperCase() + finalRole.slice(1) : '');

        if (newAccountType !== memberToEdit.accountType) {
            await changeAccountTypeAction({ userId: memberToEdit.id, newType: newAccountType, communityId: userProfile.communityId });
        }

        const result = await updateMemberRoleAction({ 
            memberId: memberToEdit.id, 
            communityId: userProfile.communityId,
            newRole: finalRole, 
            newTitle: finalTitle,
        });

        if (result.success) {
            toast({ title: 'Role Updated', description: `${memberToEdit.name}'s roles have been updated.` });
            setMemberToEdit(null);
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsUpdatingRole(false);
    }
    
    const openEditDialog = (member: User) => {
        setMemberToEdit(member);
        setNewAccountType(member.accountType || 'personal');
        setNewCommunityRole(member.role);
    };
    
    const handlePromoteClick = (user: User) => {
        setPromotingUser(user);
        setSelectedStaffRole("");
    };

    const handleConfirmPromotion = async () => {
        if (!promotingUser || !selectedStaffRole) return;
        setIsPromoting(true);
        const result = await promoteToStaffAction({ 
            userId: promotingUser.id, 
            role: selectedStaffRole 
        });
        if (result.success) {
            toast({ title: "User Promoted", description: `${promotingUser.name} is now a Platform ${selectedStaffRole}. Whitelist updated.` });
            setPromotingUser(null);
            if (selectedUserForDialog?.id === promotingUser.id) setSelectedUserForDialog(null);
        } else {
            toast({ title: "Error", description: result.error, variant: 'destructive' });
        }
        setIsPromoting(false);
    };

    const handleDemoteClick = (user: User) => {
        setDemotingUser(user);
    };

    const handleConfirmDemotion = async () => {
        if (!demotingUser) return;
        setIsDemoting(true);
        const result = await demoteStaffAction({ userId: demotingUser.id });
        if (result.success) {
            toast({ title: "Staff Member Removed", description: `${demotingUser.name} has been reverted to a Personal account.` });
            setDemotingUser(null);
            if (selectedUserForDialog?.id === demotingUser.id) setSelectedUserForDialog(null);
        } else {
            toast({ title: "Error", description: result.error, variant: 'destructive' });
        }
        setIsDemoting(false);
    };

    const handleImpersonateUser = async (user: User) => {
        if (!userProfile?.permissions?.actionImpersonateUser) {
            toast({ title: "Permission Denied", description: "You do not have rights to impersonate users.", variant: "destructive" });
            return;
        }

        const result = await runImpersonateUser({
            targetUserId: user.id,
            adminId: userProfile.id
        });

        if (result.success) {
            toast({ title: "Impersonation Active", description: `You are now browsing as ${user.name}. Redirecting...` });
            window.location.href = `https://www.my-community-hub.co.uk/?impersonate=${user.id}`;
        } else {
            toast({ title: "Impersonation Failed", description: result.error, variant: "destructive" });
        }
    };

  const sortedAndFilteredUsers = React.useMemo(() => {
    let filtered = userData.map(u => ({
        ...u,
        community: communitiesMap.get(u.homeCommunityId) || 'Global',
        liveCommunityName: communitiesMap.get(u.communityId)
    }));

    if (filters.name) {
        filtered = filtered.filter(user => 
            (user.name && user.name.toLowerCase().includes(filters.name.toLowerCase())) || 
            (user.email && user.email.toLowerCase().includes(filters.name.toLowerCase()))
        );
    }
    if (filters.role.length > 0) {
        filtered = filtered.filter(user => {
            if (filters.role.includes(user.role)) return true;
            if (user.communityRoles) {
                return Object.values(user.communityRoles).some((r: any) => filters.role.includes(r.role));
            }
            return false;
        });
    }
    if (filters.status.length > 0) {
        filtered = filtered.filter(user => {
            if (memberStatuses.includes(user.status as MemberStatus) && filters.status.includes(user.status)) return true;
            if (filters.status.includes('online') && user.isOnline) return true;
            if (filters.status.includes('offline') && !user.isOnline) return true;
            
            if (filters.status.includes('inactive')) {
                const now = new Date();
                const sixtyDaysAgo = subDays(now, 60);
                const lastSeen = user.lastActive || user.joined;
                if (lastSeen && isBefore(lastSeen, sixtyDaysAgo)) return true;
            }
            
            return false;
        });
    } else {
        filtered = filtered.filter(user => user.status !== 'hidden');
    }
    
    return [...filtered].sort((a, b) => {
        const key = sorting.key;
        if (!key) return 0;
        const valA = (a as any)[key] ?? '';
        const valB = (b as any)[key] ?? '';
        const order = sorting.order === 'asc' ? 1 : -1;

        if (key === 'joined') {
            const timeA = valA instanceof Date ? valA.getTime() : 0;
            const timeB = valB instanceof Date ? valB.getTime() : 0;
            return (timeA - timeB) * order;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * order;
        }
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
    });
  }, [userData, communitiesMap, filters, sorting]);
  
  const stats = React.useMemo(() => {
    const now = new Date();
    const sixtyDaysAgo = subDays(now, 60);

    return userData.reduce((acc, u) => {
        if (u.isOnline) acc.online++;
        else acc.offline++;

        const lastSeen = u.lastActive || u.joined;
        if (lastSeen && isBefore(lastSeen, sixtyDaysAgo)) {
            acc.inactive++;
        }

        return acc;
    }, { total: userData.length, online: 0, offline: 0, inactive: 0 });
  }, [userData]);

  const pageCount = Math.ceil(sortedAndFilteredUsers.length / pagination.pageSize);
  const paginatedUsers = sortedAndFilteredUsers.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
  );

  return (
    <>
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 via-primary/5 to-cyan-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Users className="h-3.5 w-3.5" />
                Active Directory & Governance
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
                <Users className="h-7 w-7 text-primary" />
                Manage Platform Users
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
                Directory lookup, permission adjustments, leader appointments, and moderation oversight.
            </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Registered</p>
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                          <Users className="h-4 w-4" />
                      </div>
                  </div>
                  <div className="text-2xl font-black">{stats.total}</div>
              </CardContent>
          </Card>
          <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Online Now</p>
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                          <Wifi className="h-4 w-4 animate-pulse" />
                      </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.online}</div>
              </CardContent>
          </Card>
          <Card className="border-t-4 border-t-slate-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Offline</p>
                      <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-600">
                          <WifiOff className="h-4 w-4" />
                      </div>
                  </div>
                  <div className="text-2xl font-black text-slate-600 dark:text-slate-400">{stats.offline}</div>
              </CardContent>
          </Card>
          <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                  <div className="flex items-center justify-between space-y-0 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inactive (&gt; 60d)</p>
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                          <Clock className="h-4 w-4" />
                      </div>
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.inactive}</div>
              </CardContent>
          </Card>
      </div>

       <Card className="border-t-4 border-t-primary shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-transparent rounded-t-lg">
            <CardTitle className="text-lg font-bold">User Directory</CardTitle>
            <CardDescription>A comprehensive list of every registered user on the platform.</CardDescription>
             <div className="flex flex-wrap items-center gap-2 pt-4">
                <Input
                    placeholder="Filter by name or email..."
                    value={filters.name}
                    onChange={(event) => setFilters(f => ({ ...f, name: event.target.value }))}
                    className="max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">Role <ChevronDown className="ml-2 h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-[400px] overflow-y-auto">
                        {availableRoles.map(role => (
                            <DropdownMenuCheckboxItem
                                key={role.id}
                                checked={filters.role.includes(role.id)}
                                onCheckedChange={() => setFilters(f => ({ ...f, role: f.role.includes(role.id) ? f.role.filter(r => r !== role.id) : [...f.role, role.id] }))}
                            >{role.name}</DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">Status & Activity <ChevronDown className="ml-2 h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-[400px] overflow-y-auto">
                        <DropdownMenuLabel>Account Status</DropdownMenuLabel>
                        {memberStatuses.map(status => (
                            <DropdownMenuCheckboxItem
                                key={status}
                                checked={filters.status.includes(status)}
                                onCheckedChange={() => setFilters(f => ({ ...f, status: f.status.includes(status) ? f.status.filter(s => s !== status) : [...f.status, status] }))}
                            >{status.charAt(0).toUpperCase() + status.slice(1)}</DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Live Activity</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem
                            checked={filters.status.includes('online')}
                            onCheckedChange={() => setFilters(f => ({ ...f, status: f.status.includes('online') ? f.status.filter(s => s !== 'online') : [...f.status, 'online'] }))}
                        >Online Now</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={filters.status.includes('offline')}
                            onCheckedChange={() => setFilters(f => ({ ...f, status: f.status.includes('offline') ? f.status.filter(s => s !== 'offline') : [...f.status, 'offline'] }))}
                        >Offline</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={filters.status.includes('inactive')}
                            onCheckedChange={() => setFilters(f => ({ ...f, status: f.status.includes('inactive') ? f.status.filter(s => s !== 'inactive') : [...f.status, 'inactive'] }))}
                        >Inactive (&gt; 60 days)</DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                {(filters.name || filters.role.length > 0 || filters.status.length > 0) && (
                    <Button variant="ghost" onClick={() => setFilters({ name: "", role: [], status: [] })}>Reset <FilterX className="ml-2 h-4 w-4" /></Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border md:border-t-0">
            <Table className="responsive-table">
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('name')}>User <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                     <TableHead>Holding Roles</TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('community')}>Home Hub <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('joined')}>Joined <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-center">Leaderships</TableHead>
                    <TableHead className="text-center"><Button variant="ghost" onClick={() => handleSort('offenseCount')}>Offenses <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('status')}>Status</Button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                    </TableRow>
                ) : paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <UserRow 
                        key={user.id} 
                        user={user} 
                        unassignedCommunities={unassignedCommunities} 
                        onAppoint={handleAppoint} 
                        onUpdateStatus={handleUpdateStatus}
                        onViewDetails={setSelectedUserForDialog}
                        onEditRole={openEditDialog}
                        onRemove={handleRemoveMember}
                        onPromote={handlePromoteClick}
                        onDemote={handleDemoteClick}
                        onViewOffenses={setViewingOffensesUser}
                        adminPermissions={userProfile?.permissions}
                        onImpersonate={handleImpersonateUser}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center"
                    >
                      No users found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
            <PaginationControls
                pagination={pagination}
                setPagination={setPagination}
                pageCount={pageCount}
                totalRows={sortedAndFilteredUsers.length}
            />
        </CardContent>
      </Card>
    </div>

     <Dialog open={!!selectedUserForDialog} onOpenChange={() => setSelectedUserForDialog(null)}>
        <MemberDetailsDialog 
            user={selectedUserForDialog} 
            onUpdateStatus={handleUpdateStatus} 
            onRemove={handleRemoveMember} 
            onEditRole={openEditDialog} 
            onPromote={handlePromoteClick} 
            onDemote={handleDemoteClick} 
            onViewOffenses={setViewingOffensesUser} 
            locationsMap={locationsMap} 
            adminPermissions={userProfile?.permissions}
            onImpersonate={handleImpersonateUser}
        />
    </Dialog>

    <Dialog open={!!viewingOffensesUser} onOpenChange={() => setViewingOffensesUser(null)}>
        <OffenseHistoryDialog user={viewingOffensesUser} onClose={() => setViewingOffensesUser(null)} />
    </Dialog>

    <Dialog open={!!memberToEdit} onOpenChange={() => setMemberToEdit(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Change Roles for {memberToEdit?.name}</DialogTitle>
                <DialogDescription>Update account type and community-specific roles.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="account-type-select">Account Type</Label>
                    <Select value={newAccountType} onValueChange={(val) => setNewAccountType(val as User['accountType'])}>
                        <SelectTrigger id="account-type-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                            {accountTypes.map(type => (
                                <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="role-select">Community Team Role</Label>
                    <Select value={newCommunityRole} onValueChange={setNewCommunityRole}>
                        <SelectTrigger id="role-select">
                            <SelectValue placeholder="No specific role" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                            <SelectItem value="none">None</SelectItem>
                            {availableRoles.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Changing roles may grant or revoke significant permissions.
                    </AlertDescription>
                </Alert>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setMemberToEdit(null)}>Cancel</Button>
                <Button onClick={handleUpdateRole} disabled={isUpdatingRole}>
                    {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirm & Update Role
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={!!promotingUser} onOpenChange={setPromotingUser}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Promote to Platform Staff</DialogTitle>
                <DialogDescription>
                    Grant administrative access to <strong>{promotingUser?.name}</strong>.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>Select Staff Role</Label>
                    <Select value={selectedStaffRole} onValueChange={setSelectedStaffRole}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a role..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Administrator">Administrator</SelectItem>
                            <SelectItem value="Moderator">Moderator</SelectItem>
                            <SelectItem value="Support Specialist">Support Specialist</SelectItem>
                            <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                            <SelectItem value="Investigator">Investigator</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Alert className="bg-primary/5 border-primary/20">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-xs font-bold uppercase">Security Confirmation</AlertTitle>
                    <AlertDescription className="text-xs">
                        This user will be granted access to global administrative tools and automatically added to the secure login whitelist.
                    </AlertDescription>
                </Alert>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPromotingUser(null)}>Cancel</Button>
                <Button onClick={handleConfirmPromotion} disabled={isPromoting || !selectedStaffRole}>
                    {isPromoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Promotion
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={!!demotingUser} onOpenChange={setDemotingUser}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <UserX className="h-5 w-5 text-destructive" />
                    Remove from Platform Staff?
                </DialogTitle>
                <DialogDescription>
                    Revoke all administrative access for <strong>{demotingUser?.name}</strong>.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Critical Security Action</AlertTitle>
                    <AlertDescription>
                        This will instantly revoke their administrative security tokens. The user will be demoted and lose access to all back-office tools.
                    </AlertDescription>
                </Alert>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setDemotingUser(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleConfirmDemotion} disabled={isDemoting}>
                    {isDemoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Revocation
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
