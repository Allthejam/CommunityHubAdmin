'use client';

import * as React from "react";
import { useState, useEffect, Suspense } from "react";
import { 
    Settings, 
    UserCog, 
    Save, 
    Loader2, 
    Users as UsersIcon, 
    PlusCircle, 
    Pencil, 
    Info, 
    AlertTriangle, 
    RefreshCw, 
    Activity, 
    ExternalLink, 
    CheckCircle2, 
    Globe, 
    Megaphone, 
    BarChart3, 
    ShieldCheck, 
    Lock, 
    DollarSign, 
    UserCheck,
    Stethoscope,
    Gavel,
    Briefcase,
    ShoppingCart,
    RotateCw
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams } from "next/navigation";
import { savePlatformRolesAction, runSaveCommunityTeamPermissions } from "@/lib/actions/teamActions";
import { syncUserCommunityNamesAction, syncAllUserPermissionsAction } from "@/lib/actions/userActions";
import { recalculateCommunityCounts } from "@/lib/actions/dataSyncActions";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { debugAdmin } from "@/lib/actions/chatActions";
import { cn } from "@/lib/utils";

// Ensure complex synchronization operations have enough time to complete
export const maxDuration = 120;

const initialPermissions = {
    // Core Platform Management
    viewDashboard: true,
    viewUsers: true,
    viewDeletedUsers: false,
    viewCommunities: true,
    viewCommunityMap: false,
    viewBusinesses: true,
    viewLeadershipApps: false,
    viewPoliceLiaisonApps: false,
    viewReports: false,
    viewFinancials: false,

    // Commercial & Financial
    viewNationalAdvertisers: false,
    viewPricing: false,
    viewOwnerAdverts: false,
    viewShoppingTaxonomy: false,
    viewShoppingControls: false,

    // Marketing & Content
    viewMarketingGen: false,
    viewMarketResearch: false,
    viewManuals: false,
    viewGallery: false,
    viewAudioHub: false,
    viewPlatformOverview: false,
    viewCareers: false,

    // Announcements & Broadcasts
    viewAnnouncements: true,
    viewBroadcastLog: false,
    viewSpecialAccess: false,

    // System & Security
    viewTeam: true,
    viewAppraisalsAndPay: false,
    viewAuthLogins: false,
    viewChat: true,
    viewAuditLog: true,
    viewModeration: true,
    viewSiteMap: false,
    viewRoadmap: false,
    viewLegal: false,
    viewDropdowns: false,
    viewLawEnforcement: false,
    viewSettings: false,

    // Restricted Actions
    actionSetTeamPermissions: false,
    actionViewStaffProfiles: false,
    actionViewUserProfile: false,
    actionImpersonateUser: false,
    actionImpersonateLeader: false,
    actionManageCareers: false,
    actionRunGlobalSync: false,
    actionRecalculateHubStats: false,
    actionManageAppraisalsAndPay: false,
    actionManageShoppingControls: false,
};

type TeamMember = {
    id: string;
    name: string;
    avatar: string;
    role: string;
    title?: string;
    permissions: typeof initialPermissions;
};

type PlatformRole = {
    name: string;
    description: string;
};

const permissionGroups = [
    { 
        title: "Core Platform", 
        icon: Globe,
        permissions: [
            { key: 'viewDashboard', label: 'Dashboard' },
            { key: 'viewUsers', label: 'Active User Directory' },
            { key: 'viewDeletedUsers', label: 'Deleted Account Logs' },
            { key: 'viewCommunities', label: 'Community Hub List' },
            { key: 'viewCommunityMap', label: 'Jurisdictional Map' },
            { key: 'viewBusinesses', label: 'Business Directory' },
            { key: 'viewLeadershipApps', label: 'Leadership Applications' },
            { key: 'viewPoliceLiaisonApps', label: 'Police Liaison Vetting' },
            { key: 'viewReports', label: 'Platform Incident Reports' },
        ]
    },
    {
        title: "Commercial & Financial",
        icon: DollarSign,
        permissions: [
            { key: 'viewFinancials', label: 'Financial Overview' },
            { key: 'viewNationalAdvertisers', label: 'National Advertisers' },
            { key: 'viewPricing', label: 'Pricing Tiers' },
            { key: 'viewOwnerAdverts', label: 'Owner Adverts' },
            { key: 'viewShoppingTaxonomy', label: 'Marketplace Taxonomy' },
            { key: 'viewShoppingControls', label: 'Shopping Featured Config' },
        ]
    },
    {
        title: "Announcements & Broadcasts",
        icon: Megaphone,
        permissions: [
            { key: 'viewAnnouncements', label: 'Platform Announcements' },
            { key: 'viewBroadcastLog', label: 'Emergency Broadcast Log' },
            { key: 'viewSpecialAccess', label: 'Special Access (TGBS)' },
        ]
    },
    {
        title: "Marketing & Resources",
        icon: BarChart3,
        permissions: [
            { key: 'viewMarketingGen', label: 'AI Content Generation' },
            { key: 'viewMarketResearch', label: 'Market Research' },
            { key: 'viewManuals', label: 'Instruction Manuals' },
            { key: 'viewGallery', label: 'Image Gallery' },
            { key: 'viewAudioHub', label: 'Audio Briefing Hub' },
            { key: 'viewPlatformOverview', label: 'Platform Overview' },
            { key: 'viewCareers', label: 'Careers Board' },
        ]
    },
    {
        title: "System & Security",
        icon: ShieldCheck,
        permissions: [
            { key: 'viewTeam', label: 'Team Management' },
            { key: 'viewAppraisalsAndPay', label: 'Appraisals & Pay Console' },
            { key: 'viewAuthLogins', label: 'Authorized Login Whitelist' },
            { key: 'viewChat', label: 'Staff Communication' },
            { key: 'viewAuditLog', label: 'Immutable Audit Log' },
            { key: 'viewModeration', label: 'AI Content Moderation' },
            { key: 'viewSiteMap', label: 'Platform Site Map' },
            { key: 'viewRoadmap', label: 'Development Roadmap' },
            { key: 'viewLegal', label: 'Legal Documentation (T&Cs)' },
            { key: 'viewDropdowns', label: 'Master Dropdown Lists' },
            { key: 'viewLawEnforcement', label: 'Law Enforcement Guidelines' },
            { key: 'viewSettings', label: 'System Settings' },
        ]
    },
    {
        title: "Restricted Actions",
        icon: Lock,
        permissions: [
            { key: 'actionSetTeamPermissions', label: 'Edit Staff Permissions' },
            { key: 'actionViewStaffProfiles', label: 'View All Staff Profiles' },
            { key: 'actionManageAppraisalsAndPay', label: 'Manage Salaries & Performance' },
            { key: 'actionManageCareers', label: 'Post/Edit Job Vacancies' },
            { key: 'actionRunGlobalSync', label: 'Run Global Database Sync' },
            { key: 'actionRecalculateHubStats', label: 'Recalculate Hub Statistics' },
            { key: 'actionImpersonateUser', label: 'Impersonate Personal User' },
            { key: 'actionImpersonateLeader', label: 'Impersonate Community Leader' },
            { key: 'actionManageShoppingControls', label: 'Manage Featured Categories' },
        ]
    }
];

const initialPlatformRoles: PlatformRole[] = [
    { name: "Owner", description: "Full platform control and administrative rights." },
    { name: "Administrator", description: "General platform management and support." },
    { name: "Support Specialist", description: "Handles user inquiries and community leader vetting." },
    { name: "Moderator", description: "Monitors global content and handles reported issues." },
];

function PlatformSettingsForm() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [permissions, setPermissions] = useState(initialPermissions);
  
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isSavingDashboardAccess, setIsSavingDashboardAccess] = useState(false);
  const [platformRoles, setPlatformRoles] = React.useState<PlatformRole[]>([]);
  const [loadingRoles, setLoadingRoles] = React.useState(true);
  
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<{ name: string; description: string; index?: number } | null>(null);
  const [newRoleName, setNewRoleName] = React.useState("");
  const [newRoleDescription, setNewRoleDescription] = React.useState("");
  const [isSavingRole, setIsSavingRole] = React.useState(false);

  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [isSyncingNames, setIsSyncingNames] = useState(false);
  const [isSyncingPermissions, setIsSyncingPermissions] = useState(false);
  const [isSyncingStats, setIsSyncingStats] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);

  const { user } = useUser();
  const { toast } = useToast();
  const db = useFirestore();
  const searchParams = useSearchParams();
  const userIdFromQuery = searchParams.get('userId');

  useEffect(() => {
    if (!db) return;
    const rolesRef = doc(db, 'platform_settings', 'roles');
    const unsub = onSnapshot(rolesRef, (docSnap) => {
        if (docSnap.exists()) {
            setPlatformRoles(docSnap.data().roleList || initialPlatformRoles);
        } else {
            setPlatformRoles(initialPlatformRoles);
        }
        setLoadingRoles(false);
    });
    return () => unsub();
  }, [db]);

  useEffect(() => {
    if (!db || !user) return;
    setLoading(true);

    const q = collection(db, "users");
    const unsub = onSnapshot(q, (snapshot) => {
        const staffData: TeamMember[] = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const title = data.title || "";
            const role = data.role || "";
            const isPlatformStaff = role === 'owner' || (title && title.includes("Platform")) || ['admin', 'administrator', 'moderator', 'support', 'finance', 'investigator', 'accountant', 'support-specialist'].includes(role.toLowerCase());

            if (isPlatformStaff) {
                staffData.push({
                    id: docSnap.id,
                    name: data.name,
                    avatar: data.avatar,
                    role: data.role,
                    title: data.title,
                    permissions: data.permissions || initialPermissions,
                } as TeamMember);
            }
        });
        setTeamMembers(staffData);
        if (userIdFromQuery && staffData.find(m => m.id === userIdFromQuery)) {
            setSelectedStaffId(userIdFromQuery);
        } else if (staffData.length > 0 && !selectedStaffId) {
            setSelectedStaffId(staffData[0].id);
        }
        setLoading(false);
    });
    return () => unsub();
  }, [db, user, userIdFromQuery, selectedStaffId]);

  useEffect(() => {
    const member = teamMembers.find(m => m.id === selectedStaffId);
    if (member) {
      setPermissions(member.permissions || initialPermissions);
    }
  }, [selectedStaffId, teamMembers]);

  const handlePermissionChange = (key: keyof typeof initialPermissions, value: boolean) => {
    setPermissions(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleDashboardAccess = async (checked: boolean) => {
    if (!selectedStaffId || !user) return;
    setIsSavingDashboardAccess(true);
    const newPermissions = { ...permissions, viewDashboard: checked };
    setPermissions(newPermissions);
    const result = await runSaveCommunityTeamPermissions({
        memberId: selectedStaffId,
        permissions: newPermissions,
        communityId: 'platform',
        updaterId: user.uid,
        profileType: 'primary'
    });
    setIsSavingDashboardAccess(false);
    if (result.success) toast({ title: "Dashboard Access Updated" });
    else toast({ title: "Error", description: result.error, variant: "destructive" });
  };

  const handleSavePermissions = async () => {
    if (!selectedStaffId || !user) return;
    setIsSavingPermissions(true);
    const result = await runSaveCommunityTeamPermissions({ memberId: selectedStaffId, permissions, communityId: 'platform', updaterId: user.uid, profileType: 'primary' });
    if (result.success) toast({ title: "Permissions Saved" });
    else toast({ title: "Error", description: result.error, variant: "destructive" });
    setIsSavingPermissions(false);
  };

  const handleSaveRole = async () => {
      if (!newRoleName.trim() || !newRoleDescription.trim()) return;
      setIsSavingRole(true);
      let newRoles: PlatformRole[];
      if (editingRole && editingRole.index !== undefined) {
          newRoles = [...platformRoles];
          newRoles[editingRole.index] = { name: newRoleName, description: newRoleDescription };
      } else {
          newRoles = [...platformRoles, { name: newRoleName, description: newRoleDescription }];
      }
      const result = await savePlatformRolesAction(newRoles);
      if (result.success) {
          toast({ title: "Role Saved" });
          setIsRoleDialogOpen(false);
      } else toast({ title: "Error", description: result.error, variant: 'destructive' });
      setIsSavingRole(false);
  };

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticResult(null);
    const result = await debugAdmin();
    setDiagnosticResult(result);
    if (result.success) toast({ title: "Diagnostics Passed" });
    else toast({ title: "Diagnostics Failed", variant: "destructive" });
    setIsRunningDiagnostics(false);
  };

  const handleSyncUserNames = async () => {
    setIsSyncingNames(true);
    const result = await syncUserCommunityNamesAction();
    if (result.success) {
        toast({ title: "Synchronization Complete", description: result.message });
    } else {
        toast({ title: "Synchronization Failed", description: result.error, variant: "destructive" });
    }
    setIsSyncingNames(false);
  };

  const handleSyncPermissions = async () => {
    if (!user) return;
    setShowSyncConfirm(false);
    setIsSyncingPermissions(true);
    
    try {
        const result = await syncAllUserPermissionsAction(user.uid);
        if (result.success) {
            toast({ title: "Synchronization Successful", description: result.message });
        } else {
            toast({ title: "Synchronization Failure", description: result.error, variant: "destructive" });
        }
    } catch (e: any) {
        toast({ title: "System Violation", description: e.message || "An unexpected error occurred during the sweep.", variant: "destructive" });
    } finally {
        setIsSyncingPermissions(false);
    }
  };

  const handleRecalculateStats = async () => {
    setIsSyncingStats(true);
    try {
        const result = await recalculateCommunityCounts();
        if (result.success) {
            toast({ title: "Counts Updated", description: result.message });
        } else {
            throw new Error(result.error);
        }
    } catch (e: any) {
        toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSyncingStats(false);
    }
  };

  const selectedMember = teamMembers.find(m => m.id === selectedStaffId);
  const isOwnerSelected = selectedMember?.role?.toLowerCase() === 'owner';

  return (
    <div className="space-y-8">
      <Card>
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                      <CardTitle className="flex items-center gap-2"><UsersIcon /> Platform Role Hierarchy</CardTitle>
                      <CardDescription>Define the official roles for your administrative team.</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingRole(null); setNewRoleName(""); setNewRoleDescription(""); setIsRoleDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Role
                  </Button>
              </div>
          </CardHeader>
          <CardContent className="space-y-4">
              {loadingRoles ? (
                  <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                  <div className="space-y-2">
                      {platformRoles.map((role, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-md group">
                              <div>
                                  <div className="font-medium">{role.name}</div>
                                  <div className="text-sm text-muted-foreground">{role.description}</div>
                              </div>
                              {role.name.toLowerCase() !== 'owner' && (
                                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingRole({...role, index}); setNewRoleName(role.name); setNewRoleDescription(role.description); setIsRoleDialogOpen(true); }}>
                                      <Pencil className="h-4 w-4" />
                                  </Button>
                              )}
                          </div>
                      ))}
                  </div>
              )}
          </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> Staff Permissions</CardTitle>
              <CardDescription>Configure access rights for platform administrators.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="max-w-xs">
                  <Label htmlFor="staff-member-select">Select Staff Member</Label>
                  <Select onValueChange={(val) => setSelectedStaffId(val)} value={selectedStaffId}>
                      <SelectTrigger id="staff-member-select" disabled={teamMembers.length === 0}>
                          <SelectValue placeholder="Select a member..." />
                      </SelectTrigger>
                      <SelectContent>
                          {teamMembers.map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                  {member.name} ({member.title || member.role})
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              {selectedMember && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
                      <Separator />
                      
                      <div className="flex items-center space-x-2 bg-muted/30 p-4 rounded-xl border">
                          <Switch id="dashboard-access" checked={isOwnerSelected || permissions.viewDashboard} onCheckedChange={handleToggleDashboardAccess} disabled={isOwnerSelected || isSavingDashboardAccess} />
                          <div className="space-y-0.5 ml-2">
                             <Label htmlFor="dashboard-access" className="text-base font-bold">Primary Dashboard Access</Label>
                             <p className="text-xs text-muted-foreground">Allows the user to view the main administrative overview.</p>
                          </div>
                      </div>

                      <div className="grid gap-8">
                        {permissionGroups.map(group => (
                            <div key={group.title} className="space-y-4">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <group.icon className="h-5 w-5 text-primary" />
                                    <h4 className="font-black uppercase text-xs tracking-widest text-primary">{group.title}</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.permissions.map(perm => (
                                        <div key={perm.key} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-secondary/50 transition-colors">
                                            <Label htmlFor={perm.key} className="text-sm font-normal flex-1 pr-2 cursor-pointer">{perm.label}</Label>
                                            <Switch id={perm.key} checked={isOwnerSelected || !!(permissions as any)[perm.key]} onCheckedChange={(checked) => handlePermissionChange(perm.key as any, checked)} disabled={isOwnerSelected} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                      </div>
                  </div>
              )}
          </CardContent>
          <CardFooter>
              <Button onClick={handleSavePermissions} disabled={!selectedStaffId || isOwnerSelected || isSavingPermissions} size="lg" className="w-full sm:w-auto font-bold px-8">
                  {isSavingPermissions ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                  Save Staff Permissions
              </Button>
          </CardFooter>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600"><RefreshCw className="h-5 w-5" /> System Synchronization</CardTitle>
              <CardDescription>Tools to verify and repair platform data across all user records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                      <Label>Run System Diagnostics</Label>
                      <p className="text-xs text-muted-foreground mb-2">Checks raw network connectivity and API status.</p>
                      <Button variant="outline" className="w-full" onClick={handleRunDiagnostics} disabled={isRunningDiagnostics}>
                          {isRunningDiagnostics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                          Start Diagnostics
                      </Button>
                  </div>
                  <div className="space-y-2">
                      <Label>Sync User Community Names</Label>
                      <p className="text-xs text-muted-foreground mb-2">Forces all user profiles to match current community names.</p>
                      <Button variant="outline" className="w-full" onClick={handleSyncUserNames} disabled={isSyncingNames}>
                          {isSyncingNames ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                          Run User Data Sync
                      </Button>
                  </div>
                  <div className="space-y-2">
                      <Label>Sync All User Permissions</Label>
                      <p className="text-xs text-muted-foreground mb-2">Platform-wide sweep to ensure permission flags match roles.</p>
                      <Button variant="outline" className="w-full" onClick={() => setShowSyncConfirm(true)} disabled={isSyncingPermissions}>
                          {isSyncingPermissions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                          {isSyncingPermissions ? "Syncing..." : "Run Permission Sync"}
                      </Button>
                  </div>
                   <div className="space-y-2">
                      <Label>Recalculate Hub Statistics</Label>
                      <p className="text-xs text-muted-foreground mb-2">Audit all user records and update community member counts.</p>
                      <Button variant="outline" className="w-full" onClick={handleRecalculateStats} disabled={isSyncingStats}>
                          {isSyncingStats ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
                          Recalculate Hub Stats
                      </Button>
                  </div>
              </div>
              
              {diagnosticResult && (
                  <div className={cn(
                      "mt-4 p-4 rounded-md border text-sm whitespace-pre-wrap font-mono",
                      diagnosticResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
                  )}>
                      <div className="flex items-center gap-2 font-bold mb-2">
                          {diagnosticResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          {diagnosticResult.success ? "DIAGNOSTICS PASSED" : "DIAGNOSTICS FAILED"}
                      </div>
                      {diagnosticResult.message}
                  </div>
              )}
          </CardContent>
      </Card>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingRole ? "Edit" : "Add"} Role</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2"><Label>Role Name</Label><Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={newRoleDescription} onChange={(e) => setNewRoleDescription(e.target.value)} /></div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveRole} disabled={isSavingRole}>{isSavingRole ? <Loader2 className="animate-spin mr-2" /> : "Save"}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-600">
                    <ShieldCheck className="h-5 w-5" />
                    Initiate Global Permission Sync?
                </DialogTitle>
                <DialogDescription className="pt-2">
                    This will perform a total database audit and reset all user permission flags to match current platform standards.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Critical Maintenance Warning</AlertTitle>
                    <AlertDescription>
                        This action affects every registered user. It will overwrite custom permission overrides with standardized staff and owner tiers.
                    </AlertDescription>
                </Alert>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSyncPermissions} disabled={isSyncingPermissions}>
                    {isSyncingPermissions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Proceed with Global Sweep
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          Platform Settings
        </h1>
        <p className="text-muted-foreground mt-2">Manage platform configurations and staff.</p>
      </div>
      <Suspense fallback={<div className="flex justify-center h-64"><Loader2 className="h-8 w-8" /></div>}>
        <PlatformSettingsForm />
      </Suspense>
    </div>
  );
}
