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
    Plus, 
    Trash2, 
    Layers, 
    Loader2,
    Save,
    X,
    GripVertical,
    Search,
    Info,
    LayoutGrid,
    Tag,
    Hash,
    Copy,
    Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getShoppingCategories, saveShoppingCategories } from "@/lib/actions/shoppingActions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

type SubCategory = {
    id: string;
    name: string;
    tags: string[];
};

type Category = {
    id: string;
    name: string;
    subcategories: SubCategory[];
};

const CopyIdButton = ({ id }: { id: string }) => {
    const { toast } = useToast();
    const copy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        toast({ title: "ID Copied", description: "Reference ID is ready to use in code." });
    };
    return (
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={copy}>
            <Copy className="h-3 w-3" />
        </Button>
    );
};

export default function ShoppingCategoriesPage() {
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            const data = await getShoppingCategories();
            setCategories(data);
            setLoading(false);
        }
        fetchCategories();
    }, []);

    const addCategory = () => {
        const newCat: Category = {
            id: crypto.randomUUID().substring(0, 8),
            name: "New Master Vertical",
            subcategories: []
        };
        setCategories([newCat, ...categories]);
        toast({ title: "Category added", description: "New master vertical created at the top of the list." });
    };

    const updateCategoryName = (id: string, name: string) => {
        setCategories(categories.map(c => c.id === id ? { ...c, name } : c));
    };

    const deleteCategory = (id: string) => {
        if (!confirm("Are you sure you want to delete this entire category and its subcategories?")) return;
        setCategories(categories.filter(c => c.id !== id));
    };

    const addSubCategory = (categoryId: string) => {
        setCategories(categories.map(c => {
            if (c.id === categoryId) {
                const newSub: SubCategory = {
                    id: `${categoryId}-${crypto.randomUUID().substring(0, 4)}`,
                    name: "New Sub-Category",
                    tags: []
                };
                return { ...c, subcategories: [...c.subcategories, newSub] };
            }
            return c;
        }));
    };

    const updateSubCategoryName = (categoryId: string, subId: string, name: string) => {
        setCategories(categories.map(c => {
            if (c.id === categoryId) {
                return {
                    ...c,
                    subcategories: c.subcategories.map(s => s.id === subId ? { ...s, name } : s)
                };
            }
            return c;
        }));
    };

    const deleteSubCategory = (categoryId: string, subId: string) => {
        setCategories(categories.map(c => {
            if (c.id === categoryId) {
                return {
                    ...c,
                    subcategories: c.subcategories.filter(s => s.id !== subId)
                };
            }
            return c;
        }));
    };

    const addTag = (categoryId: string, subId: string, tagName: string) => {
        if (!tagName.trim()) return;
        setCategories(categories.map(c => {
            if (c.id === categoryId) {
                return {
                    ...c,
                    subcategories: c.subcategories.map(s => {
                        if (s.id === subId && !s.tags.includes(tagName.trim())) {
                            return { ...s, tags: [...s.tags, tagName.trim()] };
                        }
                        return s;
                    })
                };
            }
            return c;
        }));
    };

    const removeTag = (categoryId: string, subId: string, tagName: string) => {
        setCategories(categories.map(c => {
            if (c.id === categoryId) {
                return {
                    ...c,
                    subcategories: c.subcategories.map(s => {
                        if (s.id === subId) {
                            return { ...s, tags: s.tags.filter(t => t !== tagName) };
                        }
                        return s;
                    })
                };
            }
            return c;
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await saveShoppingCategories(categories);
        if (result.success) {
            toast({ title: "Success", description: "Marketplace taxonomy has been saved." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const filteredCategories = categories.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subcategories.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground font-medium animate-pulse">Loading taxonomy data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-600/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
                        <Layers className="h-3.5 w-3.5" />
                        Marketplace Architecture & Taxonomy
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
                        <LayoutGrid className="h-7 w-7 text-indigo-600" />
                        Master Verticals & Subcategories
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Map product hierarchies and keyword tags across the 26 Master Verticals. Stored in <code className="text-xs font-mono bg-muted/60 px-1 py-0.5 rounded border border-border">platform_settings/shopping</code>.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={addCategory} className="border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 shadow-sm font-bold text-xs uppercase tracking-wider">
                        <Plus className="h-4 w-4 mr-1.5" /> Add Vertical
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-bold text-xs uppercase tracking-wider">
                        {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                        Save All Changes
                    </Button>
                </div>
            </div>

            {/* Metric Overview Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Master Verticals</p>
                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
                                <LayoutGrid className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{categories.length}</div>
                        <p className="text-[10px] text-muted-foreground font-semibold">Top-level marketplace sectors</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-purple-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sub-Categories</p>
                            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                                <Layers className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                            {categories.reduce((acc, c) => acc + c.subcategories.length, 0)}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold">Specialized nested niches</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-pink-500 shadow-sm col-span-2 sm:col-span-1">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Mapping Tags</p>
                            <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-600">
                                <Tag className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-pink-600 dark:text-pink-400">
                            {categories.reduce((acc, c) => acc + c.subcategories.reduce((sAcc, s) => sAcc + s.tags.length, 0), 0)}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold">Search index match triggers</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search verticals, sub-categories, or tags..." 
                        className="pl-10 h-10 border-indigo-500/20 focus-visible:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm("")}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <Alert className="bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 py-2 max-w-lg">
                    <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <AlertDescription className="text-xs">
                        IDs are persistent reference anchors. Click <Hash className="inline h-3 w-3 mx-0.5 text-indigo-500" /> to copy IDs for database indexing.
                    </AlertDescription>
                </Alert>
            </div>

            <div className="grid gap-6">
                {filteredCategories.length === 0 ? (
                    <Card className="border-dashed py-20 text-center">
                        <CardContent>
                            <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground text-lg">No verticals found matching your search.</p>
                            <Button variant="link" onClick={() => setSearchTerm("")}>Clear search results</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Accordion type="multiple" className="space-y-4">
                        {filteredCategories.map((category, index) => (
                            <AccordionItem key={category.id} value={category.id} className="border rounded-xl bg-card shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center px-6 py-4 gap-4">
                                    <div className="flex-grow flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-muted-foreground opacity-50 font-mono">
                                                {(index + 1).toString().padStart(2, '0')}
                                            </span>
                                            <Input 
                                                value={category.name} 
                                                onChange={(e) => updateCategoryName(category.id, e.target.value)}
                                                className="h-9 font-bold bg-transparent border-0 focus-visible:ring-0 px-0 text-lg tracking-tight w-full max-w-sm"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Code className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">ID: {category.id}</span>
                                            <CopyIdButton id={category.id} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 ml-auto">
                                        <Badge variant="secondary" className="hidden sm:flex bg-indigo-50 text-indigo-700 border-indigo-100">
                                            {category.subcategories.length} Sub-categories
                                        </Badge>
                                        <AccordionTrigger className="hover:no-underline py-0" />
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteCategory(category.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <AccordionContent className="px-10 pb-8 pt-4 border-t bg-muted/10 rounded-b-xl">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                <Layers className="h-4 w-4 text-primary" />
                                                Sub-Category Configuration
                                            </h3>
                                            <Button size="sm" variant="outline" onClick={() => addSubCategory(category.id)} className="h-8 text-xs">
                                                <Plus className="h-3 w-3 mr-1" /> Add Sub-Category
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {category.subcategories.map((sub) => (
                                                <Card key={sub.id} className="bg-background shadow-none border-muted-foreground/10 group/sub">
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <Input 
                                                                    value={sub.name} 
                                                                    onChange={(e) => updateSubCategoryName(category.id, sub.id, e.target.value)}
                                                                    className="h-8 font-semibold bg-transparent border-0 focus-visible:ring-0 px-0"
                                                                />
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-7 w-7 text-destructive ml-auto opacity-0 group-hover/sub:opacity-100 transition-opacity" 
                                                                    onClick={() => deleteSubCategory(category.id, sub.id)}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Code className="h-3 w-3 text-muted-foreground" />
                                                                <span className="text-[10px] font-mono text-muted-foreground uppercase">ID: {sub.id}</span>
                                                                <CopyIdButton id={sub.id} />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                                                                <Tag className="h-3 w-3" /> Mapping Tags
                                                            </Label>
                                                            <div className="flex flex-wrap gap-2 min-h-[32px] p-2 rounded-md bg-muted/30 border border-dashed">
                                                                {sub.tags.map((tag) => (
                                                                    <Badge key={tag} variant="outline" className="bg-background gap-1 pl-2 pr-1 h-6 text-xs">
                                                                        {tag}
                                                                        <button onClick={() => removeTag(category.id, sub.id, tag)} className="hover:text-destructive transition-colors">
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </Badge>
                                                                ))}
                                                                <TagInput onAdd={(tag) => addTag(category.id, sub.id, tag)} />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                            {category.subcategories.length === 0 && (
                                                <div className="col-span-full py-8 text-center border border-dashed rounded-lg">
                                                    <p className="text-xs text-muted-foreground italic">No sub-categories defined.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
        </div>
    );
}

function TagInput({ onAdd }: { onAdd: (tag: string) => void }) {
    const [val, setVal] = React.useState("");
    const handleAdd = () => {
        if (val.trim()) {
            onAdd(val);
            setVal("");
        }
    };
    return (
        <div className="flex items-center gap-1">
            <Input 
                value={val} 
                onChange={(e) => setVal(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="New tag..." 
                className="h-6 w-24 text-[10px] px-2 py-0 focus-visible:ring-primary border-0 bg-transparent"
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleAdd}>
                <Plus className="h-3 w-3" />
            </Button>
        </div>
    );
}
