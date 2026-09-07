'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { 
    Loader2, 
    Megaphone, 
    Sparkles, 
    Clipboard, 
    Check, 
    Save, 
    Edit, 
    Trash2, 
    Eye, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown,
    X, 
    Info, 
    AlertTriangle 
} from "lucide-react";
import { generateMarketingCopy } from '@/ai/flows/generate-marketing-copy';
import { useToast } from '@/hooks/use-toast';
import { saveMarketingCampaignAction, deleteMarketingCampaignAction } from '@/lib/actions/marketingActions';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { RichTextEditor } from '@/components/rich-text-editor';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger, 
    DialogFooter 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { PaginationControls } from '@/components/ui/pagination';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle, 
    CardFooter as CardFooterComponent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { 
    Alert, 
    AlertDescription, 
    AlertTitle 
} from '@/components/ui/alert';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Increase timeout for AI generation significantly to handle network variations
export const maxDuration = 120;

const initialAiState = {
    headline: '',
    body: '',
    socialMediaPost: '',
    error: undefined,
    success: false,
};

type MarketingCampaign = {
  id: string;
  audience: string;
  feature: string;
  headline: string;
  body: string;
  socialMediaPost: string;
  coverImageUrl?: string;
  createdAt: { toDate: () => Date };
  updatedAt: { toDate: () => Date };
};


function AIGenerateButton() {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" disabled={pending} className="w-full h-12 text-lg font-bold">
        {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
        Generate Marketing Copy
      </Button>
    );
}

const CopyToClipboardButton = ({ textToCopy, isHtml = false }: { textToCopy: string; isHtml?: boolean }) => {
    const [copied, setCopied] = React.useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        let text = textToCopy;
        if (isHtml) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textToCopy;
            text = tempDiv.textContent || tempDiv.innerText || "";
        }

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            toast({ title: 'Copied to clipboard!' });
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            toast({ title: 'Error', description: 'Failed to copy text.', variant: 'destructive' });
        });
    };

    return (
        <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
        </Button>
    )
}

const audienceTypes = [
    "Personal User / Local Resident",
    "Business Owner / Local Merchant",
    "Community Leader / Hub Administrator",
    "Potential Community Leader / Volunteer",
    "Regional Authority / Multi-Hub Coordinator",
    "Emergency Services & Civil Protection",
    "Enterprise Partner / Corporate Sponsor",
    "National & Regional Advertiser",
    "Community Groups & Non-Profits",
];

const featureTypes = [
    "General Platform & Community Ecosystem",
    "Emergency Broadcast System (Local & Multi-Hub)",
    "Emergency Response Plans & Muster Protocols",
    "Threat Matrix & Real-Time Risk Assessment",
    "Regional Multi-Hub Network & Governance",
    "Virtual Highstreet & Local Shopping",
    "Community Leadership Opportunity",
    "Forum, Chat & Neighborhood Discussions",
    "Events, Festivals & What's On",
    "News, Editorial & Community Reporting",
    "Skills Directory & Emergency Volunteering",
    "Interactive Community Maps & Safety Hubs",
];

export default function MarketingPage() {
    const [aiState, formAction] = useActionState(generateMarketingCopy, initialAiState);
    const formRef = React.useRef<HTMLFormElement>(null);
    const { toast } = useToast();
    
    const [campaignId, setCampaignId] = React.useState<string | null>(null);
    const [headline, setHeadline] = React.useState('');
    const [body, setBody] = React.useState('');
    const [socialMediaPost, setSocialMediaPost] = React.useState('');
    const [coverImageUrl, setCoverImageUrl] = React.useState<string | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [viewingCampaign, setViewingCampaign] = React.useState<MarketingCampaign | null>(null);
    
    const [audience, setAudience] = React.useState('Personal User / Local Resident');
    const [feature, setFeature] = React.useState('General Platform & Community Ecosystem');

    const db = useFirestore();
    const campaignsQuery = useMemoFirebase(() => db ? collection(db, 'marketing_campaigns') : null, [db]);
    const { data: savedCampaigns, isLoading: campaignsLoading } = useCollection<MarketingCampaign>(campaignsQuery);
    
    const [sorting, setSorting] = React.useState<{ key: keyof MarketingCampaign; order: 'asc' | 'desc' }>({ key: 'updatedAt', order: 'desc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

    React.useEffect(() => {
        if(aiState.success) {
            toast({ title: "Marketing Copy Generated!", description: "Review and edit the content below." });
            setHeadline(aiState.headline || '');
            setBody(aiState.body || '');
            setSocialMediaPost(aiState.socialMediaPost || '');
            setCampaignId(null);
        }
        if (aiState.error) {
            toast({ title: "Generation Error", description: aiState.error, variant: 'destructive'});
        }
    }, [aiState, toast]);
    
    const handleSave = async () => {
        setIsSaving(true);

        const result = await saveMarketingCampaignAction({
            id: campaignId || undefined,
            audience,
            feature,
            headline,
            body,
            socialMediaPost,
            coverImageUrl: coverImageUrl || '',
        });

        if (result.success && result.campaignId) {
            setCampaignId(result.campaignId);
            toast({ title: "Campaign Saved!", description: "Your marketing campaign has been saved to the database." });
        } else {
            toast({ title: "Save Failed", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleEditCampaign = (campaign: MarketingCampaign) => {
        setCampaignId(campaign.id);
        setHeadline(campaign.headline);
        setBody(campaign.body);
        setSocialMediaPost(campaign.socialMediaPost);
        setCoverImageUrl(campaign.coverImageUrl || null);
        setAudience(campaign.audience);
        setFeature(campaign.feature);
        setViewingCampaign(null);
        
        toast({ title: 'Editing Campaign', description: `Loaded "${campaign.headline}" into the editor.` });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteCampaign = async (campaign: MarketingCampaign) => {
        if (!window.confirm(`Are you sure you want to delete the "${campaign.headline}" campaign?`)) return;
        
        const result = await deleteMarketingCampaignAction(campaign.id);
        if (result.success) {
            toast({ title: 'Campaign Deleted' });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };
    
    const handleClearEditor = () => {
        setCampaignId(null);
        setHeadline('');
        setBody('');
        setSocialMediaPost('');
        setCoverImageUrl(null);
        setAudience('Personal User / Local Resident');
        setFeature('General Platform & Community Ecosystem');
        formRef.current?.reset();
    };

    const sortedCampaigns = React.useMemo(() => {
        if (!savedCampaigns) return [];
        return [...savedCampaigns].sort((a, b) => {
            const key = sorting.key;
            const order = sorting.order === 'asc' ? 1 : -1;
            let valA = a[key] as any;
            let valB = b[key] as any;

            if (key === 'updatedAt' || key === 'createdAt') {
                valA = a[key]?.toDate ? a[key].toDate().getTime() : 0;
                valB = b[key]?.toDate ? b[key].toDate().getTime() : 0;
                return (valA - valB) * order;
            }
            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB) * order;
            }
            return (valA > valB ? 1 : -1) * order;
        });
    }, [savedCampaigns, sorting]);

    const paginatedCampaigns = React.useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return sortedCampaigns.slice(start, start + pagination.pageSize);
    }, [sortedCampaigns, pagination]);

    const pageCount = Math.ceil(sortedCampaigns.length / pagination.pageSize);

    const handleSort = (key: keyof MarketingCampaign) => {
        setSorting(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ columnKey }: { columnKey: keyof MarketingCampaign }) => {
        if (sorting.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        return sorting.order === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-primary" /> : <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
    };

    return (
        <div className="space-y-8">
            {/* Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-rose-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Generation & Brand Strategy
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
                        <Megaphone className="h-7 w-7 text-amber-500" />
                        Marketing Copy & AI Generator
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Generate targeted, high-converting promotional copy and social media campaigns powered by Gemini AI.
                    </p>
                </div>
            </div>

            <Card className="border-t-4 border-t-amber-500 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber-500/5 via-transparent to-transparent rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        AI Content Generator
                    </CardTitle>
                    <CardDescription>
                        Select your target demographic and platform feature to instantly draft copy.
                    </CardDescription>
                </CardHeader>
                <form ref={formRef} action={formAction}>
                    <CardContent className="space-y-4 pt-2">
                         <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="audience">Target Audience</Label>
                                <Select value={audience} onValueChange={setAudience}>
                                    <SelectTrigger id="audience" className="h-11">
                                        <SelectValue placeholder="Select an audience..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {audienceTypes.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <input type="hidden" name="audience" value={audience} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="feature">Feature focus</Label>
                                <Select value={feature} onValueChange={setFeature}>
                                    <SelectTrigger id="feature" className="h-11">
                                        <SelectValue placeholder="Select a feature..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {featureTypes.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <input type="hidden" name="feature" value={feature} />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooterComponent>
                        <AIGenerateButton />
                    </CardFooterComponent>
                </form>
            </Card>

            {aiState.error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Connection Issue Detected</AlertTitle>
                    <AlertDescription>
                        {aiState.error}
                        <div className="mt-4">
                            <Button variant="outline" size="sm" asChild className="bg-white border-red-200">
                                <Link href="/admin/platform-settings">Run System Diagnostics</Link>
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {(headline || body || socialMediaPost) && (
                <Card className="bg-primary/5 border-primary/30 animate-in fade-in slide-in-from-top-4 duration-500">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-primary">{campaignId ? 'Edit Draft' : 'AI Draft Generated'}</CardTitle>
                             <Button variant="ghost" size="sm" onClick={handleClearEditor} className="text-muted-foreground hover:text-destructive">
                                <X className="h-4 w-4 mr-2" />
                                Discard
                             </Button>
                        </div>
                        <CardDescription>Review and refine your content before saving to the library.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         {coverImageUrl && (
                            <div className="space-y-2">
                                 <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contextual Image</Label>
                                 <div className="relative aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden border shadow-lg">
                                    <Image src={coverImageUrl} alt="Generated cover image" fill className="object-cover" unoptimized />
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="edit-headline" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Campaign Headline</Label>
                                <CopyToClipboardButton textToCopy={headline} />
                            </div>
                            <Input id="edit-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} className="text-xl font-bold font-headline" />
                        </div>
                         <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <Label htmlFor="edit-body" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Article / Email Body</Label>
                                <CopyToClipboardButton textToCopy={body} isHtml={true} />
                            </div>
                            <RichTextEditor
                                value={body}
                                onChange={setBody}
                                placeholder="AI-generated body text will appear here..."
                            />
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <Label htmlFor="edit-social" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Social Snippet</Label>
                                <CopyToClipboardButton textToCopy={socialMediaPost} />
                            </div>
                           <Input id="edit-social" value={socialMediaPost} onChange={(e) => setSocialMediaPost(e.target.value)} />
                        </div>
                    </CardContent>
                    <CardFooterComponent className="bg-primary/5 border-t border-primary/10">
                        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {campaignId ? 'Update Campaign' : 'Save to Library'}
                        </Button>
                    </CardFooterComponent>
                </Card>
            )}

            <Dialog open={!!viewingCampaign} onOpenChange={(open) => !open && setViewingCampaign(null)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Campaign Library</CardTitle>
                        <CardDescription>A centralized repository of all generated and saved marketing materials.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => handleSort('headline')} className={cn("p-0 hover:bg-transparent font-bold", sorting.key === 'headline' && "text-primary")}>
                                                Headline <SortIcon columnKey="headline" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => handleSort('audience')} className={cn("p-0 hover:bg-transparent font-bold", sorting.key === 'audience' && "text-primary")}>
                                                Audience <SortIcon columnKey="audience" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => handleSort('feature')} className={cn("p-0 hover:bg-transparent font-bold", sorting.key === 'feature' && "text-primary")}>
                                                Feature <SortIcon columnKey="feature" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => handleSort('updatedAt')} className={cn("p-0 hover:bg-transparent font-bold", sorting.key === 'updatedAt' && "text-primary")}>
                                                Last Modified <SortIcon columnKey="updatedAt" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {campaignsLoading ? (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                                    ) : sortedCampaigns && sortedCampaigns.length > 0 ? (
                                        paginatedCampaigns.map((campaign: MarketingCampaign) => (
                                            <TableRow key={campaign.id} className="group">
                                                <TableCell className="font-medium max-w-xs truncate">{campaign.headline}</TableCell>
                                                <TableCell><Badge variant="secondary">{campaign.audience}</Badge></TableCell>
                                                <TableCell><Badge variant="outline">{campaign.feature}</Badge></TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{campaign.updatedAt ? formatDistanceToNow(campaign.updatedAt.toDate(), { addSuffix: true }) : 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                     <div className="flex justify-end gap-1">
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" onClick={() => setViewingCampaign(campaign)} title="Quick View"><Eye className="h-4 w-4"/></Button>
                                                        </DialogTrigger>
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditCampaign(campaign)} title="Load in Editor"><Edit className="h-4 w-4"/></Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCampaign(campaign)} title="Delete"><Trash2 className="h-4 w-4"/></Button>
                                                     </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="text-center h-32 text-muted-foreground italic">No campaigns found in the library.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <PaginationControls 
                            pagination={pagination}
                            setPagination={setPagination}
                            pageCount={pageCount}
                            totalRows={sortedCampaigns.length}
                        />
                    </CardContent>
                </Card>
                 <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">{viewingCampaign?.audience}</Badge>
                            <Badge variant="outline">{viewingCampaign?.feature}</Badge>
                        </div>
                        <DialogTitle className="text-2xl font-bold font-headline">{viewingCampaign?.headline}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-8 py-6">
                            {viewingCampaign?.coverImageUrl && (
                                <div className="relative aspect-video w-full rounded-xl overflow-hidden border shadow-inner">
                                    <Image src={viewingCampaign.coverImageUrl} alt="Campaign cover" fill className="object-cover" unoptimized />
                                </div>
                            )}
                            
                            <section className="space-y-3">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-primary">Content Body</h3>
                                    <CopyToClipboardButton textToCopy={viewingCampaign?.body || ''} isHtml={true} />
                                </div>
                                <div className="prose dark:prose-invert max-w-none bg-muted/20 p-6 rounded-lg border border-dashed" dangerouslySetInnerHTML={{ __html: viewingCampaign?.body || '' }} />
                            </section>

                            <section className="space-y-3">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-primary">Social Snippet</h3>
                                    <CopyToClipboardButton textToCopy={viewingCampaign?.socialMediaPost || ''} />
                                </div>
                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 italic text-lg leading-relaxed">
                                    "{viewingCampaign?.socialMediaPost}"
                                </div>
                            </section>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => viewingCampaign && handleEditCampaign(viewingCampaign)} className="w-full sm:w-auto">
                            <Edit className="h-4 w-4 mr-2" />
                            Load into Editor
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
