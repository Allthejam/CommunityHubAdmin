
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    LayoutGrid, 
    CheckCircle, 
    Construction, 
    Lightbulb, 
    User, 
    Building2, 
    Crown, 
    Globe, 
    Receipt, 
    Calendar, 
    PlusCircle, 
    Trash2, 
    Loader2, 
    Save, 
    Briefcase, 
    HeartHandshake, 
    Settings2, 
    Clock, 
    CheckCircle2, 
    FileText,
    Search,
    X,
    History,
    UserPlus,
    UserCheck,
    Target,
    Users,
    Activity,
    Check,
    Undo2,
    AlertTriangle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { collection, onSnapshot, query, orderBy, where, doc } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { addRoadmapImprovement, removeRoadmapImprovement, addRoadmapItem, seedInitialRoadmapData, deleteRoadmapItem, updateRoadmapImprovements } from "@/lib/actions/roadmapActions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Improvement = {
    id: string; 
    title: string;
    text: string;
    status: 'Planned' | 'Started' | 'Completed';
    progress: number;
    completedAt?: string | null;
    notes?: string;
    assignedTo?: {
        id: string;
        name: string;
    } | null;
    assignmentStatus?: 'Pending' | 'Accepted' | null;
};

type RoadmapItem = {
    id: string;
    accountType: string;
    icon: string;
    status: string;
    improvements: Improvement[];
    order: number;
};

const iconMap: { [key: string]: React.ElementType } = {
    Building2, User, Crown, Globe, Receipt, Calendar, Briefcase, HeartHandshake
};

export default function AppDevelopmentPage() {
    const { toast } = useToast();
    const [roadmapItems, setRoadmapItems] = React.useState<RoadmapItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const db = useFirestore();
    const { user } = useUser();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const [isSeeding, setIsSeeding] = React.useState(false);
    const [currentDate, setCurrentDate] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [activeTab, setActiveTab] = React.useState("active");
    const [viewScope, setViewScope] = React.useState<'all' | 'mine'>('all');

    // State for Add Improvement Dialog
    const [isImprovementDialogOpen, setIsImprovementDialogOpen] = React.useState(false);
    const [newItemTitle, setNewItemTitle] = React.useState("");
    const [newItemText, setNewItemText] = React.useState("");
    const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
    const [isSavingImprovement, setIsSavingImprovement] = React.useState(false);

    // State for Edit Progress Dialog
    const [editingImprovement, setEditingImprovement] = React.useState<{ itemId: string, improvement: Improvement } | null>(null);
    const [editStatus, setEditStatus] = React.useState<'Planned' | 'Started' | 'Completed'>('Planned');
    const [editProgress, setEditProgress] = React.useState(0);
    const [editTitle, setEditTitle] = React.useState("");
    const [editText, setEditText] = React.useState("");
    const [editNotes, setEditNotes] = React.useState("");
    const [editAssignedToId, setEditAssignedToId] = React.useState<string>("unassigned");

    // State for Add Item Dialog
    const [isAddItemDialogOpen, setIsAddItemDialogOpen] = React.useState(false);
    const [newItemAccountType, setNewItemAccountType] = React.useState("");
    const [newItemStatus, setNewItemStatus] = React.useState("Live");
    const [isSavingItem, setIsSavingItem] = React.useState(false);

    // Fetch Staff for Assignment
    const staffQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(collection(db, "users"), where("role", "in", ["owner", "admin", "administrator", "moderator", "support", "finance", "investigator", "accountant", "support-specialist"]));
    }, [db]);
    const { data: staffMembers } = useCollection(staffQuery);

    /**
     * Normalizes a task to the current object structure.
     * CRITICAL: Generates a DETERMINISTIC ID based on text content if missing,
     * ensuring stability across renders and avoiding duplicates.
     */
    const normalizeImprovement = (imp: any): Improvement => {
        const textContent = typeof imp === 'string' ? imp : (imp.text || '');
        const titleContent = typeof imp === 'string' ? 'Untitled Idea' : (imp.title || 'Untitled Idea');
        
        // Create a unique but stable key based on the text if no ID is present
        const stableHash = textContent.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 32);
        const stableId = imp.id || `task-${stableHash}`;

        if (typeof imp === 'string') {
            return { id: stableId, title: titleContent, text: textContent, status: 'Planned', progress: 0, assignedTo: null, assignmentStatus: null };
        }
        
        let status = imp.status || 'Planned';
        const lower = status.toLowerCase();
        if (lower === 'planned') status = 'Planned';
        else if (lower === 'started') status = 'Started';
        else if (lower === 'completed') status = 'Completed';

        return {
            ...imp,
            id: stableId,
            status,
            title: titleContent,
            text: textContent,
            assignedTo: imp.assignedTo || null,
            assignmentStatus: imp.assignmentStatus || null,
            progress: imp.progress || 0
        };
    };

    React.useEffect(() => {
        setCurrentDate(format(new Date(), 'dd MMMM yyyy'));

        if (!db) return;

        setLoading(true);
        const roadmapCollectionRef = collection(db, "roadmap");
        const q = query(roadmapCollectionRef, orderBy("order", "asc"));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty && !isSeeding) {
                setIsSeeding(true);
                const result = await seedInitialRoadmapData();
                if (!result.success) {
                    toast({ title: "Error", description: result.error, variant: "destructive" });
                    setLoading(false);
                }
                setIsSeeding(false);
            } else {
                const items = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return { 
                        id: doc.id, 
                        ...data,
                        improvements: (data.improvements || []).map(normalizeImprovement)
                    } as RoadmapItem;
                });
                setRoadmapItems(items);
                setLoading(false);
            }
        }, (error) => {
            console.error("Error fetching roadmap:", error);
            toast({ title: "Error", description: "Could not load roadmap data.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, toast, isSeeding]);


    const handleAddImprovementClick = (itemId: string) => {
        setSelectedItemId(itemId);
        setNewItemTitle("");
        setNewItemText("");
        setIsImprovementDialogOpen(true);
    }
    
    const handleSaveImprovement = async () => {
        if (!newItemTitle.trim() || !selectedItemId) return;
        setIsSavingImprovement(true);
        const result = await addRoadmapImprovement({ 
            roadmapItemId: selectedItemId, 
            improvement: {
                id: crypto.randomUUID(),
                title: newItemTitle.trim(),
                text: newItemText.trim(),
                status: 'Planned',
                progress: 0,
                assignedTo: null,
                assignmentStatus: null
            }
        });
        if (result.success) {
            toast({ title: "Improvement Added" });
            setNewItemTitle("");
            setNewItemText("");
            setIsImprovementDialogOpen(false);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingImprovement(false);
    };

    const handleEditImprovementClick = (itemId: string, improvement: Improvement) => {
        setEditingImprovement({ itemId, improvement });
        setEditStatus(improvement.status);
        setEditProgress(improvement.progress || 0);
        setEditTitle(improvement.title);
        setEditText(improvement.text);
        setEditNotes(improvement.notes || "");
        setEditAssignedToId(improvement.assignedTo?.id || "unassigned");
    };

    const handleUpdateImprovement = async () => {
        if (!editingImprovement || !editTitle.trim()) return;
        
        const item = roadmapItems.find(i => i.id === editingImprovement.itemId);
        if (!item) return;

        setIsSavingImprovement(true);
        
        // HARDENED LOGIC: Prune duplicates by ID or identical text before saving
        const seenIds = new Set<string>();
        const seenTexts = new Set<string>();
        
        const updatedImprovements = item.improvements.filter(imp => {
            if (imp.id === editingImprovement.improvement.id) return false; // Exclude original to replace it
            if (seenIds.has(imp.id) || seenTexts.has(imp.text.toLowerCase().trim())) return false;
            seenIds.add(imp.id);
            seenTexts.add(imp.text.toLowerCase().trim());
            return true;
        });

        const selectedStaff = staffMembers?.find(s => s.id === editAssignedToId);
        
        const finalStatus = editStatus;
        const finalProgress = finalStatus === 'Completed' ? 100 : finalStatus === 'Planned' ? 0 : editProgress;

        const newImp: Improvement = {
            ...editingImprovement.improvement,
            title: editTitle.trim(),
            text: editText.trim(),
            status: finalStatus,
            notes: editNotes,
            progress: finalProgress,
            completedAt: finalStatus === 'Completed' ? (editingImprovement.improvement.completedAt || format(new Date(), 'dd MMM yyyy')) : null,
            assignedTo: selectedStaff ? { id: selectedStaff.id, name: selectedStaff.name } : null,
            assignmentStatus: selectedStaff 
                ? (selectedStaff.id === user?.uid ? 'Accepted' : (editingImprovement.improvement.assignedTo?.id === selectedStaff.id ? editingImprovement.improvement.assignmentStatus : 'Pending')) 
                : null
        };
        
        updatedImprovements.push(newImp);

        const oldAssigneeId = editingImprovement.improvement.assignedTo?.id;
        const newAssigneeId = selectedStaff ? selectedStaff.id : null;
        
        let notifier = undefined;
        if (newAssigneeId && newAssigneeId !== oldAssigneeId && newAssigneeId !== user?.uid) {
            notifier = {
                recipientId: newAssigneeId,
                taskTitle: editTitle.trim(),
                assignerName: userProfile?.name || "Platform Administration"
            };
        }

        const result = await updateRoadmapImprovements({
            roadmapItemId: editingImprovement.itemId,
            improvements: updatedImprovements,
            notifier
        });

        if (result.success) {
            toast({ title: "Improvement Updated" });
            setEditingImprovement(null);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingImprovement(false);
    };

    const handleTakeOwnership = async (itemId: string, improvement: Improvement) => {
        if (!userProfile || !user) return;
        
        const item = roadmapItems.find(i => i.id === itemId);
        if (!item) return;

        // HARDENED LOGIC: Identify existing task by ID or text to prevent duplicates
        const updatedImprovements = item.improvements.map(imp => {
            const isMatch = imp.id === improvement.id || imp.text.toLowerCase().trim() === improvement.text.toLowerCase().trim();
            if (isMatch) {
                return {
                    ...imp,
                    assignedTo: { id: user.uid, name: userProfile.name },
                    assignmentStatus: 'Accepted'
                } as Improvement;
            }
            return imp;
        });

        const result = await updateRoadmapImprovements({
            roadmapItemId: itemId,
            improvements: updatedImprovements
        });

        if (result.success) {
            toast({ title: "Task Claimed", description: "You are now assigned to this item." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleAcceptTask = async (itemId: string, improvement: Improvement) => {
        if (!user) return;
        const item = roadmapItems.find(i => i.id === itemId);
        if (!item) return;

        const updatedImprovements = item.improvements.map(imp => {
            if (imp.id === improvement.id) {
                return { ...imp, assignmentStatus: 'Accepted' } as Improvement;
            }
            return imp;
        });

        const result = await updateRoadmapImprovements({
            roadmapItemId: itemId,
            improvements: updatedImprovements
        });

        if (result.success) {
            toast({ title: "Task Accepted", description: "You have successfully taken ownership of this task." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleReleaseOwnership = async (itemId: string, improvement: Improvement) => {
        const item = roadmapItems.find(i => i.id === itemId);
        if (!item) return;

        const updatedImprovements = item.improvements.map(imp => {
            if (imp.id === improvement.id) {
                return { ...imp, assignedTo: null, assignmentStatus: null } as Improvement;
            }
            return imp;
        });

        const result = await updateRoadmapImprovements({
            roadmapItemId: itemId,
            improvements: updatedImprovements
        });

        if (result.success) {
            toast({ title: "Task Released", description: "This item is now back in the unassigned pool." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleRemoveImprovement = async (itemId: string, improvement: Improvement) => {
        if (!window.confirm("Remove this improvement idea?")) return;
        const result = await removeRoadmapImprovement({ roadmapItemId: itemId, improvement });
        if (result.success) {
            toast({ title: "Improvement Removed" });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleAddItem = async () => {
        if (!newItemAccountType.trim()) return;
        setIsSavingItem(true);
        const result = await addRoadmapItem({
            accountType: newItemAccountType,
            status: newItemStatus,
            order: roadmapItems.length + 1,
        });
        if (result.success) {
            toast({ title: "Roadmap Item Added" });
            setNewItemAccountType("");
            setNewItemStatus("Live");
            setIsAddItemDialogOpen(false);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingItem(false);
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!window.confirm("Are you sure you want to delete this entire roadmap item?")) return;
        const result = await deleteRoadmapItem(itemId);
        if (result.success) {
            toast({ title: "Roadmap Item Deleted" });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const myActiveTasksCount = React.useMemo(() => {
        let count = 0;
        roadmapItems.forEach(item => {
            item.improvements.forEach(imp => {
                if (imp.status.toLowerCase() !== 'completed' && imp.assignedTo?.id === user?.uid) {
                    count++;
                }
            });
        });
        return count;
    }, [roadmapItems, user?.uid]);

    const filteredRoadmapItems = React.useMemo(() => {
        const lowQuery = searchQuery.toLowerCase().trim();
        
        return roadmapItems.map(item => {
            let filteredImprovements = item.improvements.filter(imp => {
                const matchesTab = activeTab === "active" 
                    ? imp.status.toLowerCase() !== 'completed' 
                    : imp.status.toLowerCase() === 'completed';
                
                const matchesScope = viewScope === 'all' || imp.assignedTo?.id === user?.uid;
                return matchesTab && matchesScope;
            });

            if (lowQuery) {
                const matchesCategory = item.accountType.toLowerCase().includes(lowQuery);
                const matchingSearchImprovements = filteredImprovements.filter(imp => 
                    imp.title.toLowerCase().includes(lowQuery) || 
                    imp.text.toLowerCase().includes(lowQuery) ||
                    imp.notes?.toLowerCase().includes(lowQuery) ||
                    imp.assignedTo?.name.toLowerCase().includes(lowQuery)
                );

                if (!matchesCategory) {
                    filteredImprovements = matchingSearchImprovements;
                }
            }

            const isNewSection = item.improvements.length === 0;
            const isDefaultActiveView = !lowQuery && viewScope === 'all' && activeTab === 'active';

            if (filteredImprovements.length > 0 || (isNewSection && isDefaultActiveView)) {
                return { ...item, improvements: filteredImprovements };
            }
            return null;
        }).filter((item): item is RoadmapItem => item !== null);
    }, [roadmapItems, searchQuery, activeTab, viewScope, user?.uid]);

    const normalizedUserEmail = user?.email?.toLowerCase().trim() || "";
    const isOwner = normalizedUserEmail === 'allan_jamieson@outlook.com' || userProfile?.role?.toLowerCase() === 'owner';
    const canAssignToOthers = isOwner || ['admin', 'administrator'].includes(userProfile?.role?.toLowerCase() || '');

    return (
        <div className="space-y-8 pb-20 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <LayoutGrid className="h-8 w-8 text-primary" />
                        App Development Roadmap
                    </h1>
                    <p className="text-muted-foreground">
                        Consolidated tracking for platform features, bugs, and administrative requests.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right hidden sm:block">
                        <p className="font-semibold text-sm">Last Review Date:</p>
                        <p className="text-xs text-muted-foreground">{currentDate || 'Loading...'}</p>
                    </div>
                    <Button onClick={() => setIsAddItemDialogOpen(true)} className="w-full md:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Add Section
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search features, bugs, assignees..." 
                        className="pl-10 h-11"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearchQuery("")}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Tabs value={viewScope} onValueChange={(val: any) => setViewScope(val)} className="w-auto">
                        <TabsList className="h-11 bg-muted/50 border">
                            <TabsTrigger value="all" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-4">
                                <Users className="h-3 w-3" />
                                Team View
                            </TabsTrigger>
                            <TabsTrigger value="mine" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-4 relative">
                                <Target className="h-3 w-3" />
                                My View
                                {myActiveTasksCount > 0 && (
                                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[8px] animate-in zoom-in">
                                        {myActiveTasksCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                        <TabsList className="h-11 bg-muted/50 border">
                            <TabsTrigger value="active" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-4">
                                <Construction className="h-3 w-3" />
                                Active
                            </TabsTrigger>
                            <TabsTrigger value="completed" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-4">
                                <History className="h-3 w-3" />
                                History
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>
            
            <Card>
                <CardHeader className="border-b bg-muted/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                {activeTab === 'active' ? <Construction className="h-5 w-5 text-amber-500" /> : <History className="h-5 w-5 text-green-500" />}
                                {activeTab === 'active' ? 'Active Platform Hierarchy' : 'Development Archive'}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                {viewScope === 'mine' ? (
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 h-5 text-[9px] uppercase font-bold tracking-tight">
                                        Viewing personal assignments only
                                    </Badge>
                                ) : (
                                    <span>Reviewing team-wide platform updates.</span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    • {filteredRoadmapItems.reduce((acc, item) => acc + item.improvements.length, 0)} items displayed
                                </span>
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {loading ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Accordion type="multiple" className="space-y-4">
                            {filteredRoadmapItems.map(item => {
                                const Icon = iconMap[item.icon] || Building2;
                                return (
                                    <AccordionItem key={item.id} value={item.id} className="border rounded-xl px-2 overflow-hidden shadow-sm">
                                        <div className="flex items-center gap-4 group">
                                            <AccordionTrigger className="hover:no-underline flex-1 py-4 px-2">
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                                                        <Icon className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                                        <h3 className="text-lg font-bold">{item.accountType}</h3>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={item.status === 'Live' ? 'default' : 'outline'} className="gap-1.5 h-6 text-[10px] uppercase font-black">
                                                                {item.status === 'Live' ? <CheckCircle className="h-3 w-3" /> : <Construction className="h-3 w-3" />}
                                                                {item.status}
                                                            </Badge>
                                                            <Badge variant="secondary" className="text-[10px] font-bold h-6">{item.improvements.length} items</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity mr-4" onClick={() => handleDeleteItem(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        
                                        <AccordionContent className="pb-6">
                                            <div className="sm:pl-14 space-y-4 sm:pr-4 px-2 pt-2">
                                                <div className="flex justify-between items-center border-b pb-2">
                                                    <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                        <Lightbulb className="h-3 w-3 text-amber-500" />
                                                        {activeTab === 'active' ? 'Planned Improvements' : 'Archived Accomplishments'}
                                                    </h4>
                                                    {activeTab === 'active' && (
                                                        <Button variant="outline" size="sm" onClick={() => handleAddImprovementClick(item.id)} className="h-8 text-xs font-bold">
                                                            <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                                            Add New Idea
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="grid gap-4 mt-4">
                                                    {item.improvements.map((imp) => (
                                                        <Card key={imp.id} className={cn(
                                                            "border-none shadow-none group/imp transition-colors",
                                                            !imp.assignedTo ? "bg-muted/30 border-dashed border-2" : 
                                                            imp.assignmentStatus === 'Pending' ? "bg-amber-50/50 ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" :
                                                            imp.assignedTo?.id === user?.uid ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/30"
                                                        )}>
                                                            <CardContent className="p-4">
                                                                <div className="flex justify-between items-start gap-4">
                                                                    <div className="flex-1 space-y-3">
                                                                        <div className="flex items-center gap-3 flex-wrap">
                                                                            <span className="font-bold text-sm text-foreground">{imp.title}</span>
                                                                            {imp.status.toLowerCase() === 'completed' ? (
                                                                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1 h-5 text-[9px] uppercase font-black">
                                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                                    Done
                                                                                </Badge>
                                                                            ) : imp.status.toLowerCase() === 'started' ? (
                                                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 gap-1.5 h-5 animate-pulse text-[9px] uppercase font-black">
                                                                                    <Clock className="h-3 w-3" />
                                                                                    In Progress
                                                                                </Badge>
                                                                            ) : null}
                                                                            {imp.title.toLowerCase().includes('bug') && <Badge variant="destructive" className="h-5 text-[9px] font-black uppercase gap-1"><Bug className="h-3 w-3"/> Bug</Badge>}
                                                                            
                                                                            {imp.assignedTo ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <Badge variant="outline" className={cn(
                                                                                        "gap-1.5 h-5 text-[9px] font-bold uppercase border-primary/20",
                                                                                        imp.assignmentStatus === 'Accepted' 
                                                                                            ? (imp.assignedTo.id === user?.uid ? "bg-primary text-primary-foreground border-transparent" : "bg-green-50 text-green-700 border-green-200")
                                                                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                                                                    )}>
                                                                                        <UserCheck className="h-2.5 w-2.5" />
                                                                                        {imp.assignedTo.id === user?.uid ? "Assigned to Me" : `Assigned: ${imp.assignedTo.name}`}
                                                                                        {imp.assignmentStatus === 'Pending' && " (Pending)"}
                                                                                    </Badge>
                                                                                    
                                                                                    {imp.assignedTo.id === user?.uid && imp.assignmentStatus === 'Pending' && (
                                                                                        <Button 
                                                                                            variant="default" 
                                                                                            size="sm" 
                                                                                            className="h-5 px-2 text-[9px] font-black uppercase gap-1"
                                                                                            onClick={() => handleAcceptTask(item.id, imp)}
                                                                                        >
                                                                                            <Check className="h-2.5 w-2.5" />
                                                                                            Accept Task
                                                                                        </Button>
                                                                                    )}

                                                                                    {imp.assignedTo.id !== user?.uid && activeTab === 'active' && (
                                                                                        <Button 
                                                                                            variant="ghost" 
                                                                                            size="sm" 
                                                                                            className="h-5 px-2 text-[9px] font-black uppercase text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed gap-1"
                                                                                            onClick={() => handleTakeOwnership(item.id, imp)}
                                                                                            title="Take over this task from the current assignee"
                                                                                        >
                                                                                            <UserPlus className="h-2.5 w-2.5" />
                                                                                            Take Over
                                                                                        </Button>
                                                                                    )}

                                                                                    {imp.assignedTo.id === user?.uid && activeTab === 'active' && (
                                                                                         <Button 
                                                                                            variant="ghost" 
                                                                                            size="sm" 
                                                                                            className="h-5 px-2 text-[9px] font-black uppercase text-muted-foreground hover:text-destructive hover:bg-destructive/5 border border-dashed gap-1"
                                                                                            onClick={() => handleReleaseOwnership(item.id, imp)}
                                                                                            title="Unassign yourself from this task"
                                                                                        >
                                                                                            <Undo2 className="h-2.5 w-2.5" />
                                                                                            Release Task
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            ) : activeTab === 'active' && (
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="sm" 
                                                                                    className="h-5 px-2 text-[9px] font-black uppercase text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed gap-1"
                                                                                    onClick={() => handleTakeOwnership(item.id, imp)}
                                                                                >
                                                                                    <UserPlus className="h-2.5 w-2.5" />
                                                                                    Take Ownership
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                                            {imp.text}
                                                                        </p>

                                                                        {imp.status.toLowerCase() === 'started' && (
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground tracking-tighter">
                                                                                    <span>Implementation Velocity</span>
                                                                                    <span>{imp.progress}%</span>
                                                                                </div>
                                                                                <Progress value={imp.progress} className="h-1" />
                                                                            </div>
                                                                        )}

                                                                        {imp.notes && (
                                                                            <div className="space-y-1 mt-1 bg-background/60 p-3 rounded-lg border border-dashed shadow-inner">
                                                                                <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1.5 mb-1 opacity-70">
                                                                                    <FileText className="h-3 w-3" />
                                                                                    {activeTab === 'active' ? 'Developer Progress Notes' : 'Final Completion Notes'}
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground leading-relaxed italic">
                                                                                    "{imp.notes}"
                                                                                </p>
                                                                            </div>
                                                                        )}

                                                                        {imp.status.toLowerCase() === 'completed' && imp.completedAt && (
                                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase italic tracking-tighter flex items-center gap-1.5">
                                                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                                                Deployed on: {imp.completedAt}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="flex gap-1 opacity-0 group-hover/imp:opacity-100 transition-opacity">
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditImprovementClick(item.id, imp)}>
                                                                            <Settings2 className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveImprovement(item.id, imp)}>
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                    {item.improvements.length === 0 && (
                                                        <div className="py-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
                                                            <p className="text-xs text-muted-foreground italic uppercase font-bold tracking-widest opacity-50">
                                                                No {activeTab === 'active' ? 'active' : 'completed'} items listed for this sector.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                            {filteredRoadmapItems.length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed rounded-xl bg-muted/10">
                                    <LayoutGrid className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="text-muted-foreground font-medium">No results found for the current view and filters.</p>
                                    <Button variant="link" onClick={() => { setSearchQuery(""); setViewScope('all'); setActiveTab('active'); }}>Clear all filters</Button>
                                </div>
                            )}
                        </Accordion>
                    )}
                </CardContent>
            </Card>

            {/* Add Improvement Dialog */}
            <Dialog open={isImprovementDialogOpen} onOpenChange={isImprovementDialogOpen ? setIsImprovementDialogOpen : undefined}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden border-2 shadow-2xl">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Propose New Feature or Bug</DialogTitle>
                        <DialogDescription>Add a new roadmap item to the planned queue.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 px-6">
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-item-title">Item Title *</Label>
                                <Input
                                    id="new-item-title"
                                    value={newItemTitle}
                                    onChange={(e) => setNewItemTitle(e.target.value)}
                                    placeholder="e.g., [BUG] Fix login redirect"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-item-text">Description</Label>
                                <Textarea
                                    id="new-item-text"
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    placeholder="Detail the feature requirements or bug reproduction steps..."
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-6 pt-2 border-t bg-muted/5">
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSaveImprovement} disabled={isSavingImprovement || !newItemTitle.trim()}>
                             {isSavingImprovement && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Add to Roadmap
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Progress Dialog */}
            <Dialog open={!!editingImprovement} onOpenChange={(open) => !open && setEditingImprovement(null)}>
                <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden border-2 shadow-2xl">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Manage Feature Progress</DialogTitle>
                        <DialogDescription>Update the status, metrics, and internal notes for this item.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 px-6 min-h-[450px]">
                        <div className="py-4 space-y-6">
                            <div className="p-4 bg-muted/30 rounded-lg border-2 border-primary/10 space-y-4 shadow-inner">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                        <Activity className="h-3 w-3" />
                                        Current Lifecycle Status
                                    </Label>
                                    <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)}>
                                        <SelectTrigger className="h-11 border-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Planned">Planned</SelectItem>
                                            <SelectItem value="Started">Started (In Progress)</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {editStatus.toLowerCase() === 'started' && (
                                    <div className="space-y-4 pt-4 border-t-2 border-dashed border-primary/20 animate-in slide-in-from-top-2">
                                        <div className="flex justify-between items-end">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Implementation Velocity</Label>
                                            <span className="font-mono text-xl font-black text-primary">{editProgress}%</span>
                                        </div>
                                        <div className="px-1 py-4">
                                            <Slider 
                                                value={[editProgress]} 
                                                onValueChange={(val) => setEditProgress(val[0])} 
                                                max={100} 
                                                min={0}
                                                step={1} 
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-notes" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Progress Findings & Notes</Label>
                                <Textarea 
                                    id="edit-notes" 
                                    placeholder="What has been achieved? What blockers remain?" 
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="min-h-[120px] border-2 shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Staff Assignment</Label>
                                <Select value={editAssignedToId} onValueChange={editAssignedToId => setEditAssignedToId(editAssignedToId)} disabled={!canAssignToOthers}>
                                    <SelectTrigger className="h-11 border-2">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {staffMembers?.map(staff => (
                                            <SelectItem key={staff.id} value={staff.id}>
                                                {staff.name} ({staff.title || staff.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {canAssignToOthers && (
                                    <p className="text-[9px] text-muted-foreground uppercase italic px-1">Authority Override: Assignment permitted.</p>
                                )}
                            </div>
                            
                            <Separator className="opacity-50" />

                            <div className="space-y-4 opacity-70 border-t pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-title" className="text-[10px] font-black uppercase tracking-widest">Item Heading</Label>
                                    <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-10" />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="edit-text" className="text-[10px] font-black uppercase tracking-widest">Full Requirement Description</Label>
                                    <Textarea id="edit-text" value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[80px]" />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-6 pt-2 border-t bg-muted/5">
                        <Button variant="outline" onClick={() => setEditingImprovement(null)} className="font-bold uppercase text-xs">Cancel</Button>
                        <Button onClick={handleUpdateImprovement} disabled={isSavingImprovement} className="font-black uppercase text-xs px-8">
                             {isSavingImprovement && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Commit Progress
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Roadmap Section Dialog */}
            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Roadmap Category</DialogTitle>
                        <DialogDescription>Create a new section for the development roadmap.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                             <Label htmlFor="new-item-name">Section Title</Label>
                            <Input
                                id="new-item-name"
                                value={newItemAccountType}
                                onChange={(e) => setNewItemAccountType(e.target.value)}
                                placeholder="e.g., Mobile App Features"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-item-status">Launch Status</Label>
                            <Select onValueChange={setNewItemStatus} value={newItemStatus}>
                                <SelectTrigger id="new-item-status">
                                    <SelectValue placeholder="Select launch status..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {['Live', 'In Development', 'Planned'].map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleAddItem} disabled={isSavingItem}>
                             {isSavingItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Add Category
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
