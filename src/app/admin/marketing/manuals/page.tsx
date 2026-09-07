'use client';

import * as React from 'react';
import { 
    Video, 
    PlusCircle, 
    Youtube,
    PlayCircle,
    Info,
    Loader2,
    Trash2,
    Save,
    X,
    ExternalLink,
    Play,
    Copy,
    Check,
    Pencil
} from 'lucide-react';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle,
    CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveVideoResourceAction, deleteVideoResourceAction } from '@/lib/actions/resourceActions';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';

type VideoResource = {
    id: string;
    title: string;
    youtubeUrl: string;
    videoId: string;
    accountType: string;
};

const accountTypes = [
    { type: 'personal', title: 'Personal Users', icon: Youtube },
    { type: 'business', title: 'Business Owners', icon: Youtube },
    { type: 'leader', title: 'Community Leaders', icon: Youtube },
    { type: 'enterprise', title: 'Enterprise Partners', icon: Youtube },
    { type: 'national', title: 'National Advertisers', icon: Youtube },
];

const CopyIdButton = ({ id }: { id: string }) => {
    const [copied, setCopied] = React.useState(false);
    const { toast } = useToast();

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopied(true);
        toast({ title: "ID Copied", description: "Resource ID has been copied to clipboard." });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            onClick={handleCopy}
            title="Copy Resource ID"
        >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
    );
};

export default function VideoResourcesPage() {
    const { toast } = useToast();
    const db = useFirestore();
    const [isSaving, setIsSaving] = React.useState(false);
    const [newVideoUrl, setNewVideoUrl] = React.useState("");
    const [newVideoTitle, setNewVideoTitle] = React.useState("");
    const [activeAccountType, setActiveAccountType] = React.useState<string | null>(null);
    const [editingVideo, setEditingVideo] = React.useState<VideoResource | null>(null);
    const [previewVideo, setPreviewVideo] = React.useState<VideoResource | null>(null);
    
    // State for delete confirmation
    const [videoToDelete, setVideoToDelete] = React.useState<VideoResource | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const videoQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(collection(db, 'video_resources'), orderBy('createdAt', 'asc'));
    }, [db]);

    const { data: videos, isLoading } = useCollection<VideoResource>(videoQuery);

    const handleSaveVideo = async () => {
        if (!newVideoUrl || !newVideoTitle || !activeAccountType) {
            toast({ title: "Missing Fields", description: "Please provide both a title and a valid YouTube URL.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const result = await saveVideoResourceAction({
            id: editingVideo?.id,
            title: newVideoTitle,
            youtubeUrl: newVideoUrl,
            accountType: activeAccountType as any,
        });

        if (result.success) {
            toast({ title: editingVideo ? "Video Updated" : "Video Added", description: "The instructional guide has been saved." });
            setNewVideoUrl("");
            setNewVideoTitle("");
            setActiveAccountType(null);
            setEditingVideo(null);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleConfirmDelete = async () => {
        if (!videoToDelete) return;
        
        setIsDeleting(true);
        try {
            const result = await deleteVideoResourceAction(videoToDelete.id);
            if (result.success) {
                toast({ title: "Video Removed", description: `"${videoToDelete.title}" has been deleted.` });
                setVideoToDelete(null);
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditClick = (video: VideoResource) => {
        setEditingVideo(video);
        setNewVideoTitle(video.title);
        setNewVideoUrl(video.youtubeUrl);
        setActiveAccountType(video.accountType);
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <Video className="h-8 w-8 text-primary" />
                        Instructional Video Library
                    </h1>
                    <p className="text-muted-foreground">
                        Manage walkthroughs and guides hosted on YouTube for platform users.
                    </p>
                </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle>Developer & Linking Info</AlertTitle>
                <AlertDescription>
                    Each video has a unique <strong>Resource ID</strong>. Use these IDs to trigger specific walkthroughs from context-sensitive help buttons throughout the app.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accountTypes.map((acc) => {
                    const accountVideos = videos?.filter(v => v.accountType === acc.type) || [];
                    
                    return (
                        <Card key={acc.type} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <acc.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <CardTitle className="text-xl">{acc.title}</CardTitle>
                                </div>
                                <CardDescription>
                                    Walkthroughs for {acc.title.toLowerCase()}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                {isLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin opacity-20" /></div>
                                ) : accountVideos.length > 0 ? (
                                    <div className="space-y-3">
                                        {accountVideos.map((video) => (
                                            <div key={video.id} className="flex flex-col gap-1 p-2 rounded-md bg-muted/50 border group">
                                                <div className="flex items-center justify-between">
                                                    <div 
                                                        className="flex items-center gap-2 overflow-hidden hover:text-primary transition-colors text-left flex-1 cursor-pointer"
                                                        onClick={() => setPreviewVideo(video)}
                                                    >
                                                        <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                                                        <span className="text-xs font-bold truncate">{video.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                            onClick={(e) => { e.stopPropagation(); handleEditClick(video); }}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                                            onClick={(e) => { e.stopPropagation(); setVideoToDelete(video); }}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between px-6">
                                                    <span className="text-[10px] font-mono text-muted-foreground truncate">ID: {video.id}</span>
                                                    <CopyIdButton id={video.id} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                                        <PlayCircle className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                                        <p className="text-xs text-muted-foreground italic mt-2">No videos linked yet</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="pt-4 border-t bg-muted/10">
                                <Dialog open={activeAccountType === acc.type} onOpenChange={(open) => {
                                    if (!open) {
                                        setActiveAccountType(null);
                                        setEditingVideo(null);
                                        setNewVideoTitle("");
                                        setNewVideoUrl("");
                                    } else {
                                        setActiveAccountType(acc.type);
                                    }
                                }}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Video Link
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{editingVideo ? 'Edit' : 'Add'} Video Guide: {acc.title}</DialogTitle>
                                            <DialogDescription>
                                                Paste a YouTube URL to {editingVideo ? 'update this' : 'link a new'} instructional guide.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="video-title">Video Title</Label>
                                                <Input 
                                                    id="video-title" 
                                                    placeholder="e.g., How to set up your business profile" 
                                                    value={newVideoTitle}
                                                    onChange={(e) => setNewVideoTitle(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="video-url">YouTube URL</Label>
                                                <Input 
                                                    id="video-url" 
                                                    placeholder="https://youtu.be/..." 
                                                    value={newVideoUrl}
                                                    onChange={(e) => setNewVideoUrl(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                            <Button onClick={handleSaveVideo} disabled={isSaving || !newVideoUrl || !newVideoTitle}>
                                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {editingVideo ? 'Save Changes' : 'Save Guide'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {/* Preview Dialog */}
            <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{previewVideo?.title}</DialogTitle>
                        <DialogDescription>Previewing internal guide for {previewVideo?.accountType} accounts.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
                            {previewVideo?.videoId && (
                                <iframe
                                    src={`https://www.youtube.com/embed/${previewVideo.videoId}`}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            )}
                        </AspectRatio>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Close Preview</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Video Guide?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <strong>"{videoToDelete?.title}"</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setVideoToDelete(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Resource
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}