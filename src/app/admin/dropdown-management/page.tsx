'use client';

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { List, Loader2, Plus, Trash2, Save, Tags, Hash, Code, PlusCircle, FolderPlus, Info } from "lucide-react";
import { getDropdownOptions, updateDropdownOptions, type DropdownOption } from "@/lib/actions/dropdownActions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const CategoryManager = ({ title, categoryKey, categories, setCategories, onDeleteGroup }: {
    title: string;
    categoryKey: string;
    categories: DropdownOption[];
    setCategories: React.Dispatch<React.SetStateAction<Record<string, DropdownOption[]>>>;
    onDeleteGroup: (key: string) => void;
}) => {
    const [inputValue, setInputValue] = React.useState("");

    const handleAdd = () => {
        if (inputValue && !categories.some(c => c.name === inputValue)) {
            const newOption: DropdownOption = {
                id: slugify(inputValue),
                name: inputValue
            };
            setCategories(prev => ({
                ...prev,
                [categoryKey]: [...(prev[categoryKey] || []), newOption]
            }));
            setInputValue("");
        }
    };

    const handleRemove = (idToRemove: string) => {
        setCategories(prev => ({
            ...prev,
            [categoryKey]: prev[categoryKey].filter(c => c.id !== idToRemove)
        }));
    };

    return (
        <Card className="h-full flex flex-col group/card relative">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Tags className="h-5 w-5 text-primary" />
                        {title}
                    </CardTitle>
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase gap-1.5">
                            <Code className="h-3 w-3" />
                            {categoryKey}
                        </Badge>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-destructive opacity-0 group-hover/card:opacity-100 transition-opacity"
                            onClick={() => onDeleteGroup(categoryKey)}
                            title="Delete this entire list"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
                <CardDescription>Master list for {title.toLowerCase()}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Add new option..."
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button onClick={handleAdd} size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="grid grid-cols-1 gap-2 p-3 border rounded-md bg-muted/30 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {categories.length > 0 ? categories.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between p-2 rounded bg-background border group">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold">{cat.name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">ID: {cat.id}</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={() => handleRemove(cat.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )) : <p className="text-xs text-muted-foreground italic p-2 text-center">No options defined.</p>}
                </div>
            </CardContent>
        </Card>
    );
};

export default function DropdownManagementPage() {
    const [categories, setCategories] = React.useState<Record<string, DropdownOption[]>>({});
    const [categoryLabels, setCategoryLabels] = React.useState<Record<string, string>>({
        eventCategories: "Event Categories",
        whatsonCategories: "What's On Categories",
        charityCategories: "Charity Categories",
        newsCategories: "News Categories",
        businessCategories: "Business Categories",
        productCategories: "Product Categories",
        jobCategories: "Job Categories",
        reportCategories: "Report Categories"
    });
    
    const [loading, setLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();

    // New Group Dialog State
    const [isNewGroupOpen, setIsNewGroupOpen] = React.useState(false);
    const [newGroupLabel, setNewGroupLabel] = React.useState("");
    const [newGroupKey, setNewGroupKey] = React.useState("");

    React.useEffect(() => {
        const fetchOptions = async () => {
            setLoading(true);
            const options = await getDropdownOptions();
            setCategories(options);
            
            // Map keys to labels (if we had a labels doc we would use it, but for now we derive from keys)
            const labels: Record<string, string> = { ...categoryLabels };
            Object.keys(options).forEach(key => {
                if (!labels[key]) {
                    labels[key] = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                }
            });
            setCategoryLabels(labels);
            setLoading(false);
        }
        fetchOptions();
    }, []);

    const handleSaveAll = async () => {
        setIsSaving(true);
        const result = await updateDropdownOptions(categories);
        if (result.success) {
            toast({ title: "Configuration Saved", description: "All global dropdown options have been updated." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleAddGroup = () => {
        if (!newGroupLabel.trim() || !newGroupKey.trim()) return;
        
        const key = newGroupKey.trim();
        if (categories[key]) {
            toast({ title: "Key already exists", description: "This field key is already in use.", variant: "destructive" });
            return;
        }

        setCategories(prev => ({ ...prev, [key]: [] }));
        setCategoryLabels(prev => ({ ...prev, [key]: newGroupLabel.trim() }));
        setIsNewGroupOpen(false);
        setNewGroupLabel("");
        setNewGroupKey("");
        toast({ title: "New Group Created", description: `You can now add items to ${newGroupLabel}.` });
    };

    const handleDeleteGroup = (key: string) => {
        if (!confirm(`Are you sure you want to delete the entire "${categoryLabels[key]}" list? This will remove all items and the reference key.`)) return;
        
        setCategories(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        toast({ title: "Group Removed", description: "The category list has been removed from local state. Save to publish changes." });
    };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <List className="h-8 w-8 text-primary" />
                Global Dropdown Management
            </h1>
            <p className="text-muted-foreground">
                Manage master lists for platform-wide filters. Stored in <code className="text-xs font-mono bg-muted p-1">platform_settings/dropdowns</code>.
            </p>
        </div>
        <div className="flex gap-2">
            <Dialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="lg">
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Create New List
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Category List</DialogTitle>
                        <DialogDescription>Add a new master dropdown category to the platform.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="group-label">Display Label</Label>
                            <Input 
                                id="group-label" 
                                placeholder="e.g., Volunteer Roles" 
                                value={newGroupLabel}
                                onChange={(e) => {
                                    setNewGroupLabel(e.target.value);
                                    if (!newGroupKey) setNewGroupKey(slugify(e.target.value) + 'Categories');
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="group-key">Field Key (Technical)</Label>
                            <Input 
                                id="group-key" 
                                placeholder="e.g., volunteerCategories" 
                                value={newGroupKey}
                                onChange={(e) => setNewGroupKey(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">This is the key used in the database document.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleAddGroup} disabled={!newGroupLabel || !newGroupKey}>Create List</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Button size="lg" onClick={handleSaveAll} disabled={isSaving} className="shadow-lg">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Publish Changes
            </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-medium">Loading platform taxonomies...</p>
            </div>
        </div>
      ) : (
        <Tabs defaultValue="community" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="community">Community Content</TabsTrigger>
                <TabsTrigger value="business">Business & Marketplace</TabsTrigger>
                <TabsTrigger value="custom">Custom Lists ({Object.keys(categories).filter(k => !['eventCategories', 'newsCategories', 'whatsonCategories', 'charityCategories', 'businessCategories', 'productCategories'].includes(k)).length})</TabsTrigger>
            </TabsList>

            <TabsContent value="community" className="space-y-6 animate-in fade-in duration-500">
                <div className="grid md:grid-cols-2 gap-6">
                    {['eventCategories', 'newsCategories', 'whatsonCategories', 'charityCategories'].map(key => (
                        <CategoryManager 
                            key={key}
                            title={categoryLabels[key] || key} 
                            categoryKey={key} 
                            categories={categories[key] || []} 
                            setCategories={setCategories}
                            onDeleteGroup={handleDeleteGroup}
                        />
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="business" className="space-y-6 animate-in fade-in duration-500">
                <div className="grid md:grid-cols-2 gap-6">
                    {['businessCategories', 'productCategories', 'jobCategories'].map(key => (
                        <CategoryManager 
                            key={key}
                            title={categoryLabels[key] || key} 
                            categoryKey={key} 
                            categories={categories[key] || []} 
                            setCategories={setCategories}
                            onDeleteGroup={handleDeleteGroup}
                        />
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="custom" className="animate-in fade-in duration-500">
                <div className="grid md:grid-cols-2 gap-6">
                    {Object.keys(categories)
                        .filter(k => !['eventCategories', 'newsCategories', 'whatsonCategories', 'charityCategories', 'businessCategories', 'productCategories', 'jobCategories'].includes(k))
                        .map(key => (
                            <CategoryManager 
                                key={key}
                                title={categoryLabels[key] || key} 
                                categoryKey={key} 
                                categories={categories[key] || []} 
                                setCategories={setCategories}
                                onDeleteGroup={handleDeleteGroup}
                            />
                        ))
                    }
                    {Object.keys(categories).filter(k => !['eventCategories', 'newsCategories', 'whatsonCategories', 'charityCategories', 'businessCategories', 'productCategories', 'jobCategories'].includes(k)).length === 0 && (
                        <Card className="col-span-full border-dashed py-12 text-center bg-muted/20">
                            <CardContent>
                                <PlusCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                                <p className="text-sm text-muted-foreground">No custom lists created yet. Click "Create New List" above.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
