"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
    ArrowLeft, 
    Upload, 
    Camera, 
    X, 
    Loader2, 
    Save, 
    Eye, 
    Globe, 
    Handshake, 
    Sparkles, 
    CheckCircle, 
    ArrowRight, 
    FileText, 
    Link as LinkIcon, 
    ImageIcon 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { saveAdvertAsDraft } from "@/lib/actions/advertActions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { doc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const CreateAdvertPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const advertType = searchParams.get("type") || 'featured';
    const advertId = searchParams.get("id");
    const isOwnerAd = searchParams.get("owner") === 'true';
    
    const { user } = useUser();
    const db = useFirestore();

    const [isSavingDraft, setIsSavingDraft] = React.useState(false);

    const [headline, setHeadline] = React.useState("");
    const [shortDescription, setShortDescription] = React.useState("");
    const [fullDescription, setFullDescription] = React.useState("");
    const [primaryLinkType, setPrimaryLinkType] = React.useState("website");
    const [websiteLink, setWebsiteLink] = React.useState("https://");
    const [emailAddress, setEmailAddress] = React.useState("");
    const [adImage, setAdImage] = React.useState<string | null>(null);

    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);

    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    const isFeatured = advertType === "featured";
    const adTypeName = isFeatured ? "Featured Ad" : "Partner Ad";
    const backLink = isOwnerAd ? '/admin/owner-adverts' : '/national/adverts';

    const advertRef = useMemoFirebase(() => {
        if (!advertId || !db) return null;
        return doc(db, 'adverts', advertId as string);
    }, [advertId, db]);

    const { data: advertData, isLoading: advertLoading } = useDoc(advertRef);
    
    React.useEffect(() => {
        if (advertData) {
            setHeadline(advertData.headline || advertData.title || "");
            setShortDescription(advertData.shortDescription || "");
            setFullDescription(advertData.fullDescription || "");
            setPrimaryLinkType(advertData.primaryLinkType || "website");
            setWebsiteLink(advertData.websiteLink || "https://");
            setEmailAddress(advertData.emailAddress || "");
            setAdImage(advertData.image || null);
        }
    }, [advertData]);

    React.useEffect(() => {
        if (isCameraOpen) {
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (error) {
                    console.error("Error accessing camera:", error);
                    setHasCameraPermission(false);
                    setIsCameraOpen(false);
                    toast({
                        variant: "destructive",
                        title: "Camera Access Denied",
                        description: "Please enable camera permissions in your browser settings to use this feature.",
                    });
                }
            };
            getCameraPermission();
        } else {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }
    }, [isCameraOpen, toast]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setAdImage(dataUrl);
            setIsCameraOpen(false);
        }
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast({
                    title: "Image too large",
                    description: "Please upload an image smaller than 2MB.",
                    variant: "destructive"
                });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setAdImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handlePreview = () => {
        if (!headline.trim()) {
            toast({ title: "Headline Required", description: "Please enter a headline for your advert.", variant: "destructive" });
            return;
        }

        const adData = {
            id: advertId,
            owner: isOwnerAd,
            type: advertType,
            title: headline,
            headline: headline,
            shortDescription: shortDescription,
            fullDescription: fullDescription,
            primaryLinkType: primaryLinkType,
            websiteLink: websiteLink,
            emailAddress: emailAddress,
            image: adImage,
        };
        try {
            sessionStorage.setItem('advertPreviewData', JSON.stringify(adData));
             let previewUrl = `/admin/owner-adverts/create/preview?type=${advertType}`;
             if (isOwnerAd) previewUrl += `&owner=true`;
             if (advertId) previewUrl += `&id=${advertId}`;
            router.push(previewUrl);
        } catch (error) {
            toast({
                title: "Could not prepare preview",
                description: "There was an error saving the data for preview. The data might be too large.",
                variant: "destructive"
            });
            console.error("Error saving to sessionStorage:", error);
        }
    };

    const handleSaveDraft = async () => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save a draft.", variant: "destructive" });
            return;
        }
        setIsSavingDraft(true);
        const adData = {
            id: advertId,
            type: advertType,
            scope: 'platform',
            title: headline || 'Untitled Draft',
            headline: headline,
            shortDescription: shortDescription,
            fullDescription: fullDescription,
            primaryLinkType: primaryLinkType,
            websiteLink: websiteLink,
            emailAddress: emailAddress,
            image: adImage,
        };

        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: adData });

        if (result.success) {
            toast({ title: advertId ? "Changes Saved" : "Draft Saved", description: "Your advert draft has been safely stored." });
            sessionStorage.removeItem('advertPreviewData');
            router.push(backLink);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingDraft(false);
    };

    if (advertLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Stepper Progress Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Button asChild variant="ghost" size="sm" className="font-bold text-xs uppercase w-fit">
                    <Link href={backLink}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Inventory
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-sm">
                        <span>1</span>
                        <span>Content &amp; Creative</span>
                    </div>
                    <span className="text-muted-foreground">➔</span>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-bold text-xs uppercase tracking-wider">
                        <span>2</span>
                        <span>Preview</span>
                    </div>
                    <span className="text-muted-foreground">➔</span>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-bold text-xs uppercase tracking-wider">
                        <span>3</span>
                        <span>Targeting</span>
                    </div>
                </div>
            </div>

            {/* Header Banner */}
            <div className={cn("p-6 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm", isFeatured ? "bg-amber-500/10 border-amber-500/30" : "bg-blue-500/10 border-blue-500/30")}>
                <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl shadow-sm", isFeatured ? "bg-amber-500 text-white" : "bg-blue-600 text-white")}>
                        {isFeatured ? <Globe className="h-7 w-7" /> : <Handshake className="h-7 w-7" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("font-black text-[10px] uppercase", isFeatured ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40" : "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40")}>
                                {isFeatured ? "Featured Carousel Billboard" : "Valued Partner Grid Card"}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-bold">• Step 1 of 3</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline text-foreground mt-1">
                            {advertId ? 'Edit Campaign Creative' : 'Design Campaign Creative'}
                        </h1>
                    </div>
                </div>
            </div>
            
            {/* Form Container */}
            <Card className={cn("border-t-4 shadow-md", isFeatured ? "border-t-amber-500" : "border-t-blue-500")}>
                <CardContent className="pt-6 space-y-8">
                    {/* Section 1: Headline & Copy */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <FileText className="h-5 w-5 text-amber-500" />
                            <h2 className="font-bold text-base text-foreground">1. Headline &amp; Marketing Copy</h2>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="headline" className="font-bold text-xs uppercase tracking-wider">Campaign Headline / Title *</Label>
                            <Input 
                                id="headline" 
                                value={headline} 
                                onChange={(e) => setHeadline(e.target.value)} 
                                placeholder="e.g., Discover Community Marketplace 2026" 
                                className="h-11 border-2 font-bold text-sm bg-background"
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="short-description" className="font-bold text-xs uppercase tracking-wider">Card Summary / Tagline</Label>
                                <span className={cn("text-[11px] font-bold", shortDescription.length > 120 ? 'text-destructive' : 'text-muted-foreground')}>
                                    {shortDescription.length} / 120
                                </span>
                            </div>
                            <Textarea 
                                id="short-description" 
                                value={shortDescription} 
                                onChange={(e) => setShortDescription(e.target.value)} 
                                placeholder="A punchy one-sentence summary that appears on the advert card..." 
                                maxLength={120} 
                                className="border-2 font-medium text-xs bg-background resize-none h-20"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="full-description" className="font-bold text-xs uppercase tracking-wider">Detailed Description (Popup Modal)</Label>
                            <div className="rounded-xl border-2 overflow-hidden">
                                <RichTextEditor
                                    value={fullDescription}
                                    onChange={setFullDescription}
                                    placeholder="The full story, offerings, or promotion details displayed when users click 'Learn More'..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Call to Action Destination */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <LinkIcon className="h-5 w-5 text-blue-500" />
                            <h2 className="font-bold text-base text-foreground">2. Destination &amp; Call To Action</h2>
                        </div>

                        <div className="grid gap-3">
                            <Label className="font-bold text-xs uppercase tracking-wider">Action Button Type</Label>
                            <RadioGroup value={primaryLinkType} onValueChange={setPrimaryLinkType} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className={cn("flex items-center space-x-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all", primaryLinkType === 'website' ? "border-primary bg-primary/5" : "border-border bg-background")}>
                                    <RadioGroupItem value="website" id="website" />
                                    <Label htmlFor="website" className="font-bold text-xs cursor-pointer">External Website</Label>
                                </div>
                                <div className={cn("flex items-center space-x-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all", primaryLinkType === 'email' ? "border-primary bg-primary/5" : "border-border bg-background")}>
                                    <RadioGroupItem value="email" id="email" />
                                    <Label htmlFor="email" className="font-bold text-xs cursor-pointer">Email Inquiry</Label>
                                </div>
                                <div className={cn("flex items-center space-x-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all", primaryLinkType === 'profile' ? "border-primary bg-primary/5" : "border-border bg-background")}>
                                    <RadioGroupItem value="profile" id="profile" />
                                    <Label htmlFor="profile" className="font-bold text-xs cursor-pointer">Platform Profile</Label>
                                </div>
                            </RadioGroup>

                            {primaryLinkType === 'website' && (
                                <div className="grid gap-2 pt-2">
                                    <Label htmlFor="website-link" className="font-bold text-xs uppercase tracking-wider">Destination Website URL</Label>
                                    <Input 
                                        id="website-link" 
                                        type="url" 
                                        value={websiteLink} 
                                        onChange={(e) => setWebsiteLink(e.target.value)} 
                                        placeholder="https://your-platform-link.com" 
                                        className="h-10 border-2 font-medium text-xs bg-background font-mono"
                                    />
                                </div>
                            )}

                            {primaryLinkType === 'email' && (
                                <div className="grid gap-2 pt-2">
                                    <Label htmlFor="email-address" className="font-bold text-xs uppercase tracking-wider">Inquiry Email Address</Label>
                                    <Input 
                                        id="email-address" 
                                        type="email" 
                                        value={emailAddress} 
                                        onChange={(e) => setEmailAddress(e.target.value)} 
                                        placeholder="promotions@my-community-hub.co.uk" 
                                        className="h-10 border-2 font-medium text-xs bg-background font-mono"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Section 3: Campaign Artwork / Media */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <ImageIcon className="h-5 w-5 text-emerald-500" />
                            <h2 className="font-bold text-base text-foreground">3. Campaign Visual Artwork</h2>
                        </div>

                        <div className="grid gap-2">
                            <p className="text-xs text-muted-foreground">
                                Upload a high-resolution banner image. Recommended aspect ratio: <strong>{isFeatured ? '16:9 (800x450px)' : '4:3 (600x450px)'}</strong>. Max size: 2MB.
                            </p>

                            {isCameraOpen ? (
                                <div className="space-y-3 p-4 rounded-xl border-2 bg-background">
                                    <video ref={videoRef} className="w-full max-w-lg aspect-video rounded-lg bg-black mx-auto" autoPlay muted playsInline />
                                    <div className="flex justify-center gap-2">
                                        <Button type="button" onClick={handleCapture} disabled={hasCameraPermission !== true} className="font-bold text-xs uppercase bg-amber-500 hover:bg-amber-600 text-white">
                                            <Camera className="mr-2 h-4 w-4" /> Capture Photo
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => setIsCameraOpen(false)} className="font-bold text-xs uppercase">
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : adImage ? (
                                <div className="flex items-center gap-4 p-4 rounded-xl border-2 bg-muted/30">
                                    <div className="relative w-48 h-32 rounded-lg overflow-hidden border-2 shadow-md shrink-0 bg-muted">
                                        <Image src={adImage} alt="Ad artwork preview" fill className="object-cover" />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 rounded-full shadow-md"
                                            onClick={() => setAdImage(null)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-sm text-foreground">Artwork Uploaded</p>
                                        <p className="text-xs text-muted-foreground">Ready for high-definition live preview.</p>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => fileInputRef.current?.click()} 
                                            className="mt-2 text-xs font-bold"
                                        >
                                            Change Artwork
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                                    <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                                        <Upload className="h-6 w-6" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-sm">No artwork selected yet</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Upload a PNG/JPG or capture a live image</p>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="font-bold text-xs uppercase">
                                            <Upload className="mr-2 h-4 w-4" /> Upload File
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)} className="font-bold text-xs uppercase">
                                            <Camera className="mr-2 h-4 w-4" /> Take Picture
                                        </Button>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                                </div>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                    </div>
                </CardContent>

                {/* Footer Navigation */}
                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 p-6 border-t">
                    <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft} className="font-bold text-xs uppercase">
                        {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {advertId ? 'Save Changes as Draft' : 'Save as Draft'}
                    </Button>
                    <Button onClick={handlePreview} className="font-black text-xs uppercase tracking-wider px-6 h-11 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md">
                        Proceed to Live Preview <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

const SuspenseFallback = () => (
    <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
    </div>
);

export default function CreateOwnerAdvertPage() {
    return (
        <React.Suspense fallback={<SuspenseFallback />}>
            <CreateAdvertPageContent />
        </React.Suspense>
    );
}
