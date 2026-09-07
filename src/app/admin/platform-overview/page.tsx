
'use client';

import * as React from "react";
import {
    LayoutGrid,
    Users,
    Briefcase,
    Crown,
    HeartHandshake,
    Globe,
    FileText,
    Megaphone,
    ShoppingCart,
    Calendar,
    Newspaper,
    MessageSquare,
    ShieldCheck,
    DollarSign,
    Siren,
    Loader2,
    Pencil,
    Trash2,
    PlusCircle,
    Save,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getPlatformOverviewContent, updatePlatformOverviewContent } from "@/lib/actions/platformOverviewActions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type OverviewItem = {
    icon: string;
    title: string;
    description: string;
};

type OverviewContent = {
    features: OverviewItem[];
    accountTypes: OverviewItem[];
};

const iconMap: { [key: string]: React.ElementType } = {
    Users, Briefcase, Crown, HeartHandshake, Globe, FileText, Megaphone,
    ShoppingCart, Calendar, Newspaper, MessageSquare, ShieldCheck, DollarSign, Siren,
};

const EditableCard = ({ item, onEdit, onDelete }: { item: OverviewItem; onEdit: () => void; onDelete: () => void; }) => {
    const Icon = iconMap[item.icon] || LayoutGrid;
    return (
        <Card className="flex flex-col group">
            <CardHeader className="flex flex-row items-center gap-4">
                <Icon className="h-6 w-6 text-primary" />
                <CardTitle className="text-lg">{item.title}</CardTitle>
                 <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
        </Card>
    );
};

const EditableAccountTypeCard = ({ item, onEdit, onDelete }: { item: OverviewItem; onEdit: () => void; onDelete: () => void; }) => {
    const Icon = iconMap[item.icon] || Users;
     return (
        <Card className="bg-secondary/50 group">
            <CardContent className="p-6 grid md:grid-cols-[auto_1fr_auto] gap-6 items-center">
                <div className="hidden md:flex items-center justify-center p-4 bg-background rounded-lg border">
                    <Icon className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-2 flex items-center gap-3">
                        <span className="md:hidden"><Icon className="h-8 w-8 text-primary" /></span>
                        {item.title}
                    </h3>
                    <p className="text-muted-foreground">{item.description}</p>
                </div>
                 <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function PlatformOverviewPage() {
    const { toast } = useToast();
    const [content, setContent] = React.useState<OverviewContent | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingSection, setEditingSection] = React.useState<'features' | 'accountTypes' | null>(null);
    const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
    const [currentItem, setCurrentItem] = React.useState<Partial<OverviewItem>>({});

    React.useEffect(() => {
        const loadContent = async () => {
            const result = await getPlatformOverviewContent();
            if (result.success && result.data) {
                setContent(result.data);
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
            setLoading(false);
        };
        loadContent();
    }, [toast]);

    const handleEdit = (section: 'features' | 'accountTypes', index: number) => {
        if (!content) return;
        setEditingSection(section);
        setEditingIndex(index);
        setCurrentItem(content[section][index]);
        setIsDialogOpen(true);
    };
    
    const handleAdd = (section: 'features' | 'accountTypes') => {
        setEditingSection(section);
        setEditingIndex(null);
        setCurrentItem({ icon: 'LayoutGrid', title: '', description: '' });
        setIsDialogOpen(true);
    }
    
    const handleDelete = (section: 'features' | 'accountTypes', index: number) => {
        if (!content) return;
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        
        const newSectionItems = [...content[section]];
        newSectionItems.splice(index, 1);
        setContent({
            ...content,
            [section]: newSectionItems,
        });
    };
    
    const handleSaveItem = () => {
        if (!content || !editingSection) return;
        
        const newSectionItems = [...content[editingSection]];
        if (editingIndex !== null) {
            // Update existing
            newSectionItems[editingIndex] = currentItem as OverviewItem;
        } else {
            // Add new
            newSectionItems.push(currentItem as OverviewItem);
        }
        setContent({ ...content, [editingSection]: newSectionItems });
        setIsDialogOpen(false);
    };

    const handleSaveAll = async () => {
        if (!content) return;
        setIsSaving(true);
        const result = await updatePlatformOverviewContent(content);
        if (result.success) {
            toast({ title: "Success", description: "Platform overview has been saved." });
        } else {
             toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    }
    
    const availableIcons = Object.keys(iconMap);

    return (
        <>
            <div className="space-y-12 py-8">
                <section className="text-center">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline">
                        Community Hub: Platform Overview
                    </h1>
                    <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                        An all-in-one digital infrastructure designed to reconnect, empower, and enrich local communities by bringing residents, businesses, and leaders together in a single, cohesive ecosystem.
                    </p>
                </section>

                {loading ? (
                    <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <>
                        <section>
                             <div className="text-center mb-8 flex justify-center items-center gap-4">
                                <h2 className="text-3xl font-bold font-headline">Core Platform Features</h2>
                                <Button size="sm" variant="outline" onClick={() => handleAdd('features')}><PlusCircle className="mr-2 h-4 w-4"/> Add Feature</Button>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {content?.features.map((feature, index) => (
                                    <EditableCard key={index} item={feature} onEdit={() => handleEdit('features', index)} onDelete={() => handleDelete('features', index)} />
                                ))}
                            </div>
                        </section>

                        <section>
                            <div className="text-center mb-8 flex justify-center items-center gap-4">
                                <h2 className="text-3xl font-bold font-headline">Account Types & Roles</h2>
                                <Button size="sm" variant="outline" onClick={() => handleAdd('accountTypes')}><PlusCircle className="mr-2 h-4 w-4" /> Add Account Type</Button>
                            </div>
                            <div className="space-y-6">
                                {content?.accountTypes.map((account, index) => (
                                    <EditableAccountTypeCard key={index} item={account} onEdit={() => handleEdit('accountTypes', index)} onDelete={() => handleDelete('accountTypes', index)} />
                                ))}
                            </div>
                        </section>
                        
                        <div className="flex justify-end mt-12">
                            <Button size="lg" onClick={handleSaveAll} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Save className="mr-2 h-4 w-4" />
                                Save All Changes
                            </Button>
                        </div>
                    </>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingIndex !== null ? 'Edit' : 'Add'} Item</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="item-title">Title</Label>
                            <Input id="item-title" value={currentItem.title || ''} onChange={(e) => setCurrentItem(p => ({...p, title: e.target.value}))} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="item-icon">Icon</Label>
                            <Select value={currentItem.icon || ''} onValueChange={(val) => setCurrentItem(p => ({...p, icon: val}))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an icon..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableIcons.map(iconName => (
                                        <SelectItem key={iconName} value={iconName}>
                                            <div className="flex items-center gap-2">
                                                {React.createElement(iconMap[iconName] || 'div', { className: 'h-4 w-4' })}
                                                <span>{iconName}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="item-description">Description</Label>
                            <Textarea id="item-description" value={currentItem.description || ''} onChange={(e) => setCurrentItem(p => ({...p, description: e.target.value}))} className="min-h-24"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSaveItem}>Save Item</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
