'use client';

import * as React from "react";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle, 
    CardFooter 
} from "@/components/ui/card";
import { 
    ShoppingCart, 
    Loader2,
    Save,
    Star,
    LayoutGrid,
    Check,
    AlertTriangle,
    Info,
    RotateCw,
    Search,
    X,
    Eye,
    Clock,
    Activity,
    ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getShoppingCategories, getShoppingFeaturedConfig, saveShoppingFeaturedConfig, getShoppingCategoryCounts } from "@/lib/actions/shoppingActions";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isValid } from "date-fns";

type SubCategory = { id: string; name: string; tags: string[]; };
type Category = { id: string; name: string; subcategories: SubCategory[]; };

export default function ShoppingControlsPage() {
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [categoryCounts, setCategoryCounts] = React.useState<Record<string, number>>({});
    const [isAutomated, setIsAutomated] = React.useState(false);
    const [intervalHours, setIntervalHours] = React.useState(24);
    const [lastRotation, setLastRotation] = React.useState<Date | null>(null);
    
    const [loading, setLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [taxRes, configRes, countsRes] = await Promise.all([
                    getShoppingCategories(),
                    getShoppingFeaturedConfig(),
                    getShoppingCategoryCounts()
                ]);
                setCategories(taxRes);
                setSelectedIds(configRes.selectedIds || []);
                setIsAutomated(configRes.isAutomated);
                setIntervalHours(configRes.intervalHours);
                setCategoryCounts(countsRes);
                
                if (configRes.lastRotationAt) {
                    const date = new Date(configRes.lastRotationAt);
                    setLastRotation(isValid(date) ? date : null);
                }
            } catch (error) {
                console.error("Error fetching control data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleSelection = (id: string) => {
        const isSelected = selectedIds.includes(id);
        if (isSelected) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            if (selectedIds.length >= 5) {
                toast({ 
                    title: "Limit Reached", 
                    description: "You can only feature 5 items at a time.", 
                    variant: "destructive" 
                });
                return;
            }
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleRandomize = () => {
        const allItems: string[] = [];
        categories.forEach(c => {
            allItems.push(c.id);
            c.subcategories.forEach(s => allItems.push(s.id));
        });

        const shuffled = [...allItems].sort(() => 0.5 - Math.random());
        const newSelection = shuffled.slice(0, 5);
        setSelectedIds(newSelection);
        toast({ title: "Selection Randomized", description: "5 items have been picked for you. Save to publish." });
    };

    const handleSave = async () => {
        if (selectedIds.length !== 5) {
            toast({ title: "Selection Incomplete", description: "Please select exactly 5 items to feature.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        const result = await saveShoppingFeaturedConfig({
            selectedIds,
            isAutomated,
            intervalHours
        });
        if (result.success) {
            toast({ title: "Configuration Published", description: "The public featured page settings have been updated." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const flattenedTaxonomy = React.useMemo(() => {
        const list: { id: string; name: string; parentName?: string; type: 'vertical' | 'sub'; count: number }[] = [];
        categories.forEach(c => {
            const subCounts = c.subcategories.reduce((acc, s) => acc + (categoryCounts[s.id] || 0), 0);
            const directCount = categoryCounts[c.id] || 0;
            
            list.push({ id: c.id, name: c.name, type: 'vertical', count: directCount + subCounts });
            c.subcategories.forEach(s => {
                list.push({ id: s.id, name: s.name, parentName: c.name, type: 'sub', count: categoryCounts[s.id] || 0 });
            });
        });
        return list;
    }, [categories, categoryCounts]);

    const filteredTaxonomy = flattenedTaxonomy.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.parentName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                        <Star className="h-3.5 w-3.5" />
                        Featured Merchandising & High-Street Showcase
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
                        <ShoppingCart className="h-7 w-7 text-amber-500" />
                        Featured Shopping Controls
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Curate exactly 5 featured verticals or sub-categories for public high-street prominence, or configure automated lazy rotation.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={handleRandomize} className="border-orange-500/30 text-orange-700 dark:text-orange-300 hover:bg-orange-500/10 font-bold text-xs uppercase tracking-wider">
                        <RotateCw className="h-4 w-4 mr-1.5" />
                        Randomize
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || selectedIds.length !== 5} className="bg-amber-600 hover:bg-amber-700 text-white shadow-md font-bold text-xs uppercase tracking-wider">
                        {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                        Publish To Public
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-t-4 border-t-orange-500 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-orange-500/5 via-transparent to-transparent rounded-t-lg">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-bold">Master Taxonomy Explorer</CardTitle>
                                    <CardDescription>Click to select or deselect items for the 5-slot showcase.</CardDescription>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Filter list..." 
                                        className="pl-8 h-9 border-orange-500/20 focus-visible:ring-orange-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <ScrollArea className="h-[500px] pr-4">
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {filteredTaxonomy.map((item) => {
                                        const isSelected = selectedIds.includes(item.id);
                                        return (
                                            <div 
                                                key={item.id}
                                                className={cn(
                                                    "p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 relative overflow-hidden",
                                                    isSelected 
                                                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500" 
                                                        : "bg-card hover:border-amber-500/50"
                                                )}
                                                onClick={() => toggleSelection(item.id)}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-bold text-sm truncate">{item.name}</span>
                                                    {isSelected && <Check className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className={cn("text-[9px] uppercase font-black px-1.5 h-4", item.type === 'vertical' ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-300')}>
                                                        {item.type === 'vertical' ? 'Master Vertical' : 'Sub-Category'}
                                                    </Badge>
                                                    {item.parentName && <span className="text-[10px] text-muted-foreground truncate">in {item.parentName}</span>}
                                                </div>
                                                <p className="text-[9px] font-mono text-muted-foreground uppercase mt-1">
                                                    ID: {item.id} &bull; <span className="font-semibold text-foreground">{item.count} items available</span>
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-t-4 border-t-amber-500 shadow-md bg-amber-500/5 sticky top-24">
                        <CardHeader className="bg-gradient-to-r from-amber-500/10 via-transparent to-transparent rounded-t-lg pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 flex items-center justify-between">
                                Active Selection
                                <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-black">{selectedIds.length} / 5</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {selectedIds.length === 0 ? (
                                <div className="py-12 text-center border-2 border-dashed rounded-xl opacity-30">
                                    <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">No Items Selected</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedIds.map(id => {
                                        const item = flattenedTaxonomy.find(i => i.id === id);
                                        return (
                                            <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-background border shadow-sm group animate-in slide-in-from-right-2">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate">{item?.name || 'Unknown'}</p>
                                                    <p className="text-[9px] text-muted-foreground uppercase font-black">{item?.type || 'item'}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-30 group-hover:opacity-100 transition-opacity" onClick={() => toggleSelection(id)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Rotation Automation
                                    </Label>
                                    <Switch checked={isAutomated} onCheckedChange={setIsAutomated} />
                                </div>
                                
                                {isAutomated && (
                                    <div className="space-y-3 animate-in fade-in duration-300">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Shuffle Interval</Label>
                                            <Select value={String(intervalHours)} onValueChange={(v) => setIntervalHours(Number(v))}>
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="12">Every 12 Hours</SelectItem>
                                                    <SelectItem value="24">Every 24 Hours</SelectItem>
                                                    <SelectItem value="168">Weekly (7 Days)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="p-2 rounded bg-background border text-[10px] space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground uppercase">Last Rotation:</span>
                                                <span className="font-bold">{lastRotation ? format(lastRotation, "dd MMM HH:mm") : "Never"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground uppercase">Protocol:</span>
                                                <span className="text-primary font-bold">Lazy Trigger Active</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <Alert className="bg-background border-dashed">
                                    <Info className="h-4 w-4 text-primary" />
                                    <AlertTitle className="text-[10px] font-black uppercase text-primary">Live Visibility</AlertTitle>
                                    <AlertDescription className="text-[10px] leading-relaxed italic">
                                        The public <strong>Featured Categories</strong> page will update based on these settings.
                                    </AlertDescription>
                                </Alert>
                                <Button asChild variant="outline" className="w-full gap-2 font-bold uppercase text-[10px]">
                                    <a href="https://www.shopping.my-community-hub.co.uk" target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-3 w-3" />
                                        Preview Public Page
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Alert variant="destructive" className={cn("transition-opacity", selectedIds.length !== 5 ? "opacity-100" : "opacity-0 pointer-events-none")}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="text-[10px] font-bold uppercase">Invalid Count</AlertTitle>
                        <AlertDescription className="text-[10px]">
                            You must select exactly 5 items to publish the featured page.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
    );
}
