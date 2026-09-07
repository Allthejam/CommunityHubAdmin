"use client";

import * as React from "react";
import {
    Key,
    MoreHorizontal,
    Eye,
    CheckCircle2,
    XCircle,
    Loader2,
    UserX,
    Archive,
    User,
    Settings,
    Ban,
    UserCheck,
    Trash2,
    ShieldCheck,
    ShieldAlert,
    PlusCircle,
    Mail,
    Search,
    UserPlus,
    Coffee,
    Copy,
    Check,
    ChevronsUpDown,
    AlertTriangle,
    Shield,
    Sparkles,
    Lock,
    Users2,
    Activity,
} from "lucide-react";
import { collection, onSnapshot, query, doc, updateDoc, where, orderBy, getDocs, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
} from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { updateMemberStatusAction } from "@/lib/actions/memberActions";
import { demoteStaffAction, addAuthorizedEmailAction, removeAuthorizedEmailAction, updateAuthorizedEmailStatusAction, promoteToStaffAction } from "@/lib/actions/teamActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


type TeamMemberStatus = 'active' | 'suspended' | 'gardening_leave';

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  title?: string;
  status: TeamMemberStatus;
  avatar: string;
};

type AuthorizedLogin = {
    id: string;
    email: string;
    addedByName: string;
    status: TeamMemberStatus;
    createdAt: any;
}

const StatusBadge = ({ status }: { status: TeamMemberStatus }) => {
  const statusConfig = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    suspended: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    gardening_leave: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  };
  
  if (!status) {
      return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
  }

  return (
    <Badge className={cn(statusConfig[status] || "bg-gray-100")}>
        {status.replace('_', ' ')}
    </Badge>
  );
};

const TeamMemberRow = React.memo(({ member, onAction, router }: { 
    member: TeamMember; 
    onAction: (member: TeamMember, action: 'suspend' | 'reactivate' | 'demote' | 'gardening_leave') => void;
    router: any;
}) => {
    const isSuspended = member.status === 'suspended';
    const isActive = member.status === 'active';
    const isGardening = member.status === 'gardening_leave';

    const menuItems = (
        <>
            <DropdownMenuLabel>Actions for {member.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/admin/team/${member.id}`)}>
                <Eye className="mr-2 h-4 w-4" /> View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/admin/platform-settings?userId=${member.id}`)}>
                <Settings className="mr-2 h-4 w-4" /> Edit Permissions
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Employment Status</DropdownMenuLabel>
            
            {!isActive && (
                <DropdownMenuItem onClick={() => onAction(member, 'reactivate')}>
                    <UserCheck className="mr-2 h-4 w-4 text-green-600" /> Activate User
                </DropdownMenuItem>
            )}

            {!isGardening && (
                <DropdownMenuItem onClick={() => onAction(member, 'gardening_leave')}>
                    <Coffee className="mr-2 h-4 w-4 text-amber-600" /> Place on Gardening Leave
                </DropdownMenuItem>
            )}

            {!isSuspended && (
                <DropdownMenuItem className="text-amber-600 focus:text-amber-600" onClick={() => onAction(member, 'suspend')}>
                    <Ban className="mr-2 h-4 w-4" /> Suspend User
                </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onAction(member, 'demote')}>
                <Trash2 className="mr-2 h-4 w-4" /> Remove from Staff
            </DropdownMenuItem>
        </>
    );

    const contextItems = (
        <>
            <ContextMenuLabel>Staff Control: {member.name}</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => router.push(`/admin/team/${member.id}`)}>
                <Eye className="mr-2 h-4 w-4" /> View Full Profile
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => router.push(`/admin/platform-settings?userId=${member.id}`)}>
                <Settings className="mr-2 h-4 w-4" /> Manage Permissions
            </ContextMenuItem>
            
            <ContextMenuSeparator />
            <ContextMenuLabel>Status Actions</ContextMenuLabel>
            
            {!isActive && (
                <ContextMenuItem onSelect={() => onAction(member, 'reactivate')}>
                    <UserCheck className="mr-2 h-4 w-4 text-green-600" /> Activate User
                </ContextMenuItem>
            )}

            {!isGardening && (
                <ContextMenuItem onSelect={() => onAction(member, 'gardening_leave')}>
                    <Coffee className="mr-2 h-4 w-4 text-amber-600" /> Place on Gardening Leave
                </ContextMenuItem>
            )}

            {!isSuspended && (
                <ContextMenuItem className="text-amber-600" onSelect={() => onAction(member, 'suspend')}>
                    <Ban className="mr-2 h-4 w-4" /> Suspend User
                </ContextMenuItem>
            )}

            <Separator className="my-1" />
            <ContextMenuItem className="text-destructive" onSelect={() => onAction(member, 'demote')}>
                <UserX className="mr-2 h-4 w-4" /> Remove from Staff
            </ContextMenuItem>
        </>
    );

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <TableRow className="hover:bg-muted/50 cursor-context-menu">
                    <TableCell>
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{member.name}</div>
                                <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>{member.title || member.role}</TableCell>
                    <TableCell><StatusBadge status={member.status} /></TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {menuItems}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                {contextItems}
            </ContextMenuContent>
        </ContextMenu>
    )
});
TeamMemberRow.displayName = 'TeamMemberRow';


const AuthorizedLoginRow = React.memo(({ login, onUpdateStatus, onDelete }: { 
    login: AuthorizedLogin; 
    onUpdateStatus: (id: string, status: TeamMemberStatus) => void;
    onDelete: (id: string, email: string) => void;
}) => {
    const { toast } = useToast();
    const isSuspended = login.status === 'suspended';
    const isActive = login.status === 'active';
    const isGardening = login.status === 'gardening_leave';

    const copyEmail = () => {
        navigator.clipboard.writeText(login.email);
        toast({ title: "Copied", description: "Email address copied to clipboard." });
    };

    const contextItems = (
        <>
            <ContextMenuLabel>Manage Access: {login.email}</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={copyEmail}><Copy className="mr-2 h-4 w-4" /> Copy Email</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuLabel>Status Control</ContextMenuLabel>
            
            {!isActive && (
                <ContextMenuItem onSelect={() => onUpdateStatus(login.id, 'active')}>
                    <UserCheck className="mr-2 h-4 w-4 text-green-600" /> Activate Access
                </ContextMenuItem>
            )}

            {!isGardening && (
                <ContextMenuItem onSelect={() => onUpdateStatus(login.id, 'gardening_leave')}>
                    <Coffee className="mr-2 h-4 w-4 text-amber-600" /> Place on Gardening Leave
                </ContextMenuItem>
            )}

            {!isSuspended && (
                <ContextMenuItem className="text-amber-600" onSelect={() => onUpdateStatus(login.id, 'suspended')}>
                    <Ban className="mr-2 h-4 w-4" /> Suspend Access
                </ContextMenuItem>
            )}

            <Separator className="my-1" />
            <ContextMenuItem className="text-destructive" onSelect={() => onDelete(login.id, login.email)}>
                <UserX className="mr-2 h-4 w-4" /> Revoke & Delete Record
            </ContextMenuItem>
        </>
    );

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <TableRow className="hover:bg-muted/50 cursor-context-menu">
                    <TableCell className="font-bold">{login.email}</TableCell>
                    <TableCell className="text-xs">{login.addedByName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                        {login.createdAt ? format(login.createdAt.toDate(), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell><StatusBadge status={login.status} /></TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={copyEmail}><Copy className="mr-2 h-4 w-4" /> Copy Email</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onUpdateStatus(login.id, 'active')} disabled={isActive}><UserCheck className="mr-2 h-4 w-4 text-green-600" /> Activate</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onUpdateStatus(login.id, 'suspended')} disabled={isSuspended}><Ban className="mr-2 h-4 w-4 text-amber-600" /> Suspend</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onUpdateStatus(login.id, 'gardening_leave')} disabled={isGardening}><Coffee className="mr-2 h-4 w-4 text-amber-600" /> Gardening Leave</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(login.id, login.email)}><Trash2 className="mr-2 h-4 w-4" /> Revoke Access</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                {contextItems}
            </ContextMenuContent>
        </ContextMenu>
    )
});
AuthorizedLoginRow.displayName = 'AuthorizedLoginRow';


export default function AdminTeamManagementPage() {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [team, setTeam] = React.useState<TeamMember[]>([]);
    const [allUsers, setAllUsers] = React.useState<{id: string, name: string, email: string}[]>([]);
    const [loading, setLoading] = React.useState(true);
    
    const [userToAction, setUserToAction] = React.useState<TeamMember | null>(null);
    const [actionType, setActionType] = React.useState<'suspend' | 'reactivate' | 'demote' | 'gardening_leave' | null>(null);
    const [isActioning, setIsActioning] = React.useState(false);

    const [authEmail, setAuthEmail] = React.useState("");
    const [isAuthorizing, setIsAuthorizing] = React.useState(false);

    // Add Staff States
    const [isAddStaffOpen, setIsAddStaffOpen] = React.useState(false);
    const [isUserSearchOpen, setIsUserSearchOpen] = React.useState(false);
    const [userSearchQuery, setUserSearchQuery] = React.useState("");
    const [selectedUserId, setSelectedUserId] = React.useState("");
    const [selectedStaffRole, setSelectedStaffRole] = React.useState("");
    const [isPromoting, setIsPromoting] = React.useState(false);

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const authLoginsQuery = useMemoFirebase(() => db ? query(collection(db, 'authorized_logins'), orderBy('createdAt', 'desc')) : null, [db]);
    const { data: authorizedLogins, isLoading: loadingAuth } = useCollection<AuthorizedLogin>(authLoginsQuery);

    React.useEffect(() => {
        if (!user || !db) {
            setLoading(false);
            return;
        }

        const adminRoles = ['owner', 'admin', 'administrator', 'moderator', 'support', 'finance', 'investigator', 'accountant', 'support-specialist'];
        const q = query(collection(db, "users"), where("role", "in", adminRoles));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(u => u.role === 'owner' || (u.title && (u.title.startsWith('Platform') || u.title.includes('Staff'))))
                .map(data => ({
                    id: data.id,
                    ...data,
                    role: (data.role || 'staff').charAt(0).toUpperCase() + (data.role || 'staff').slice(1),
                    status: data.status || 'active',
                    avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.id}`,
                } as TeamMember));

            setTeam(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching team members:", error);
            toast({ title: "Error", description: "Failed to fetch team members.", variant: "destructive" });
            setLoading(false);
        });

        const usersUnsub = onSnapshot(collection(db, "users"), (snap) => {
            setAllUsers(snap.docs.map(d => ({ id: d.id, name: d.data().name, email: d.data().email })));
        });

        return () => {
            unsubscribe();
            usersUnsub();
        }
    }, [user, toast, db]);
    
    const openActionDialog = (member: TeamMember, action: 'suspend' | 'reactivate' | 'demote' | 'gardening_leave') => {
        setUserToAction(member);
        setActionType(action);
    };

    const handleConfirmAction = async () => {
        if (!userToAction || !actionType) return;
        
        setIsActioning(true);
        try {
            if (actionType === 'demote') {
                const result = await demoteStaffAction({ userId: userToAction.id });
                if (result.success) {
                    toast({ title: "User Demoted", description: 'The user has been demoted to a personal account.' });
                } else {
                    throw new Error(result.error);
                }
            } else {
                let newStatus: any = 'active';
                if (actionType === 'suspend') newStatus = 'suspended';
                if (actionType === 'gardening_leave') newStatus = 'gardening_leave';

                const result = await updateMemberStatusAction({ memberId: userToAction.id, newStatus });
                if (result.success) {
                    toast({ title: 'Status Updated', description: `User is now ${actionType.replace('_', ' ')}.` });
                } else {
                    throw new Error(result.error);
                }
            }
        } catch (e: any) {
            toast({ title: "Action Failed", description: e.message, variant: 'destructive' });
        } finally {
            setIsActioning(false);
            setUserToAction(null);
            setActionType(null);
        }
    };

    const handleAddAuthorizedEmail = async () => {
        if (!authEmail || !user || !userProfile) return;
        setIsAuthorizing(true);
        const result = await addAuthorizedEmailAction({
            email: authEmail.trim().toLowerCase(),
            addedBy: user.uid,
            addedByName: userProfile.name
        });
        if (result.success) {
            toast({ title: "Access Granted", description: `${authEmail} is now authorized for backend login.` });
            setAuthEmail("");
        } else {
            toast({ title: "Authorization Failed", description: result.error, variant: "destructive" });
        }
        setIsAuthorizing(false);
    };

    const handleRemoveAuthorizedEmail = async (id: string, email: string) => {
        if (!confirm(`Revoke backend access for ${email}?`)) return;
        const result = await removeAuthorizedEmailAction(id);
        if (result.success) {
            toast({ title: "Access Revoked" });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleUpdateWhitelistStatus = async (id: string, status: TeamMemberStatus) => {
        const result = await updateAuthorizedEmailStatusAction({ id, status: status as any });
        if (result.success) {
            toast({ title: "Whitelist Updated", description: `Access status set to ${status.replace('_', ' ')}.` });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleAddStaffMember = async () => {
        if (!selectedUserId || !selectedStaffRole) return;
        setIsPromoting(true);
        const result = await promoteToStaffAction({
            userId: selectedUserId,
            role: selectedStaffRole
        });
        if (result.success) {
            toast({ title: "Staff Member Added", description: "User promoted and synchronized to whitelist." });
            setIsAddStaffOpen(false);
            setSelectedUserId("");
            setSelectedStaffRole("");
        } else {
            toast({ title: "Promotion Failed", description: result.error, variant: "destructive" });
        }
        setIsPromoting(false);
    };

    const filteredSearchUsers = allUsers.filter(u => 
        (u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())) &&
        !team.some(tm => tm.id === u.id)
    );

    const stats = React.useMemo(() => {
        const staffList = team || [];
        const authList = authorizedLogins || [];
        return {
            totalStaff: staffList.length,
            activeStaff: staffList.filter(s => s.status === 'active').length,
            whitelisted: authList.filter(a => a.status === 'active').length,
            suspended: authList.filter(a => a.status === 'suspended').length + staffList.filter(s => s.status === 'suspended').length,
            restricted: authList.filter(a => a.status === 'gardening_leave').length + staffList.filter(s => s.status === 'gardening_leave').length,
        };
    }, [team, authorizedLogins]);

    return (
        <>
        <div className="space-y-8">
            {/* Team & Security Hero Banner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-emerald-600/15 border-2 border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest mb-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        Multi-Tier Access Control • Automated Whitelist Synchronization
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        Team &amp; Security Clearance Management
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                        Manage platform administrative staff, enforce security whitelists, and oversee identity authorizations.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black gap-2 shadow-lg h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white uppercase text-xs tracking-wider">
                                <UserPlus className="h-5 w-5" /> Recruit Staff Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <UserPlus className="h-6 w-6 text-primary" />
                                    Recruit Staff Member
                                </DialogTitle>
                                <DialogDescription>Find a registered user and grant administrative authority.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">1. Find Existing Member</Label>
                                    <Popover open={isUserSearchOpen} onOpenChange={setIsUserSearchOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={isUserSearchOpen}
                                                className="w-full justify-between h-12 border-2"
                                            >
                                                {selectedUserId
                                                    ? allUsers.find(u => u.id === selectedUserId)?.name
                                                    : "Search by name or email..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[100]">
                                            <Command>
                                                <CommandInput placeholder="Type member name..." className="h-11" onValueChange={setUserSearchQuery} />
                                                <CommandList className="max-h-[300px]">
                                                    <CommandEmpty className="p-4 text-center text-xs text-muted-foreground">No matching users found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {filteredSearchUsers.slice(0, 15).map(u => (
                                                            <CommandItem
                                                                key={u.id}
                                                                value={u.id}
                                                                onSelect={(currentValue) => {
                                                                    setSelectedUserId(currentValue === selectedUserId ? "" : currentValue)
                                                                    setIsUserSearchOpen(false)
                                                                }}
                                                                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-primary/5"
                                                            >
                                                                <Check className={cn("h-4 w-4 text-primary", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex flex-col">
                                                                    <p className="font-bold text-sm">{u.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground uppercase">{u.email}</p>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">2. Assign Administrative Role</Label>
                                    <Select value={selectedStaffRole} onValueChange={setSelectedStaffRole}>
                                        <SelectTrigger className="h-12 border-2">
                                            <SelectValue placeholder="Select platform title..." />
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
                                    <ShieldAlert className="h-4 w-4 text-primary" />
                                    <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Platform Sync Notice</AlertTitle>
                                    <AlertDescription className="text-[10px] leading-relaxed">
                                        Confirming this promotion will automatically add this user to the <strong>Security Whitelist</strong> and grant immediate access to the Administrative Back-Office.
                                    </AlertDescription>
                                </Alert>
                            </div>
                            <DialogFooter className="bg-muted/30 p-6 -mx-6 -mb-6 border-t">
                                <DialogClose asChild><Button variant="outline" className="font-bold uppercase text-xs">Cancel</Button></DialogClose>
                                <Button onClick={handleAddStaffMember} disabled={!selectedUserId || !selectedStaffRole || isPromoting} className="font-black uppercase tracking-tighter text-xs px-8">
                                    {isPromoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                    Finalize Recruitment
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* 4 Top KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Platform Staff</p>
                            <div className="p-1 rounded-md bg-primary/10 text-primary">
                                <Users2 className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black">{stats.totalStaff}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">{stats.activeStaff} active operators</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Whitelist</p>
                            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600">
                                <ShieldCheck className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.whitelisted}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Enforced login credentials</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Suspended Logins</p>
                            <div className="p-1 rounded-md bg-rose-500/10 text-rose-600">
                                <Ban className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.suspended}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Access blocked / revoked</p>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3.5">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gardening Leave</p>
                            <div className="p-1 rounded-md bg-amber-500/10 text-amber-600">
                                <Coffee className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.restricted}</div>
                        <p className="text-[9px] text-muted-foreground font-semibold">Temporarily quarantined</p>
                    </CardContent>
                </Card>
            </div>
            
            <Tabs defaultValue="staff" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/60 p-1 border shadow-sm rounded-lg">
                    <TabsTrigger value="staff" className="font-black uppercase text-[10px] tracking-widest">Active Staff ({stats.totalStaff})</TabsTrigger>
                    <TabsTrigger value="auth" className="font-black uppercase text-[10px] tracking-widest">Login Whitelist ({stats.whitelisted})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="staff" className="space-y-4 pt-4 animate-in fade-in duration-500">
                    <Card className="border-t-4 border-t-primary shadow-md">
                        <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                            <CardTitle>Platform Staff Directory</CardTitle>
                            <CardDescription>Verified administrators with system-wide access tokens.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="font-bold text-xs uppercase tracking-widest">Team Member</TableHead>
                                            <TableHead className="font-bold text-xs uppercase tracking-widest">Official Title</TableHead>
                                            <TableHead className="font-bold text-xs uppercase tracking-widest">Status</TableHead>
                                            <TableHead className="text-right font-bold text-xs uppercase tracking-widest">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" />
                                                </TableCell>
                                            </TableRow>
                                        ) : team.length > 0 ? (
                                            team.map(member => (
                                                <TeamMemberRow 
                                                    key={member.id} 
                                                    member={member} 
                                                    onAction={openActionDialog}
                                                    router={router}
                                                />
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic">
                                                    No platform staff members found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="auth" className="space-y-4 pt-4 animate-in fade-in duration-500">
                    <Card className="border-t-4 border-t-emerald-600 shadow-md">
                        <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent">
                            <CardTitle className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-emerald-600" />
                                Security Whitelist
                            </CardTitle>
                            <CardDescription>
                                Only users with emails listed here can successfully log into the Administrative Backend. 
                                Promoting a user to Staff automatically adds them to this list.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4 items-end max-w-xl">
                                <div className="space-y-2 flex-1">
                                    <Label htmlFor="auth-email" className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Manual Identity Authorization</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            id="auth-email" 
                                            placeholder="authorized-email@agency.gov" 
                                            className="pl-9 h-11 border-2 bg-background"
                                            value={authEmail}
                                            onChange={(e) => setAuthEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleAddAuthorizedEmail} disabled={!authEmail || isAuthorizing} className="h-11 font-black uppercase text-xs">
                                    {isAuthorizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                    Grant Access
                                </Button>
                            </div>

                            <Separator className="opacity-50" />

                            <div className="rounded-md border bg-background overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="font-bold text-xs uppercase tracking-widest">Authorized Identity</TableHead>
                                            <TableHead className="font-bold text-xs uppercase tracking-widest">Authorized By</TableHead>
                                            <TableHead className="font-bold text-xs uppercase tracking-widest">Grant Date</TableHead>
                                            <TableHead className="font-bold text-xs uppercase tracking-widest">Access Status</TableHead>
                                            <TableHead className="text-right font-bold text-xs uppercase tracking-widest">Control</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingAuth ? (
                                            <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin mx-auto h-6 w-6 text-primary" /></TableCell></TableRow>
                                        ) : authorizedLogins && authorizedLogins.length > 0 ? (
                                            authorizedLogins.map((login) => (
                                                <AuthorizedLoginRow 
                                                    key={login.id} 
                                                    login={login} 
                                                    onUpdateStatus={handleUpdateWhitelistStatus}
                                                    onDelete={handleRemoveAuthorizedEmail}
                                                />
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                                                    Whitelist is empty. Manual recruitment or promotion is required to populate access records.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>

        <Dialog open={!!userToAction} onOpenChange={() => setUserToAction(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className={cn("h-6 w-6", actionType === 'reactivate' ? 'text-green-600' : 'text-amber-600')} />
                        Confirm Status Action
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to <strong>{actionType?.replace('_', ' ')}</strong> {userToAction?.name}?
                        {actionType === 'demote' && " This will permanently revoke their administrative permissions and remove them from the whitelist."}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="bg-muted/30 p-6 -mx-6 -mb-6 border-t mt-4">
                    <DialogClose asChild>
                        <Button variant="outline" className="font-bold uppercase text-xs">Cancel</Button>
                    </DialogClose>
                     <Button onClick={handleConfirmAction} disabled={isActioning} variant={actionType === 'demote' || actionType === 'suspend' ? 'destructive' : 'default'} className="font-black uppercase text-xs">
                        {isActioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Execute Action
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
