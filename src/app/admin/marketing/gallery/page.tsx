'use client';

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Info,
  GalleryHorizontal,
  Search,
  Globe,
  Lock,
  Activity,
} from "lucide-react";
import Image from "next/image";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, addDoc, doc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { Badge } from "@/components/ui/badge";

const MAX_FILE_SIZE_MB = 10; // Platform assets can be up to 10MB before client compression
const GALLERY_LIMIT = 500; // Platform library limit

type GalleryImage = {
  id: string;
  url: string;
  path: string;
  description?: string;
  isImported?: boolean;
  createdBy?: string;
};

/**
 * Formats a clean, readable title from an asset's storage path or existing description
 */
function getDisplayDescription(image: GalleryImage): string {
  if (image.description && image.description.trim() && image.description !== 'Auto-indexed from Storage') {
    return image.description;
  }
  if (image.path) {
    const filename = image.path.split('/').pop() || '';
    const cleaned = filename
      .replace(/^\d+[-_]/, '')
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim();
    if (cleaned) {
      return cleaned.replace(/\b\w/g, c => c.toUpperCase());
    }
  }
  return image.description || 'Marketing Asset';
}

/**
 * Resizes and compresses an image file to a lightweight data URL
 * typically 50KB-180KB, ensuring instant upload and avoiding network/CORS issues.
 */
async function compressImageToDataUrl(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    // Safety timeout in case browser canvas or decode stalls
    const timeout = setTimeout(() => {
      const fallbackReader = new FileReader();
      fallbackReader.onload = () => resolve((fallbackReader.result as string) || '');
      fallbackReader.onerror = () => resolve('');
      fallbackReader.readAsDataURL(file);
    }, 4000);

    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        clearTimeout(timeout);
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch {
          resolve((e.target?.result as string) || '');
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve((e.target?.result as string) || '');
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      clearTimeout(timeout);
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}

export default function MarketingGalleryPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [imageToDelete, setImageToDelete] = React.useState<GalleryImage | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // SHARED PLATFORM GALLERY: Point to the global shared collection instead of private user path
  const galleryQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
        collection(db, 'platform_marketing_gallery'),
        orderBy('createdAt', 'desc')
    );
  }, [db]);

  const { data: images, isLoading: imagesLoading } = useCollection<GalleryImage>(galleryQuery);

  const loading = authLoading || imagesLoading;
  const currentImageCount = images?.length ?? 0;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !db) return;

    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    toast({ title: "Deploying assets..." });
    let errors: string[] = [];
    let uploadCount = 0;

    const fileArray = Array.from(files);

    try {
      for (const file of fileArray) {
          if (currentImageCount + uploadCount >= GALLERY_LIMIT) {
              errors.push(`Platform Library limit of ${GALLERY_LIMIT} reached.`);
              break; 
          }

          if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
              errors.push(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
              continue;
          }

          uploadCount++;
          
          try {
              const cleanFileName = file.name.replace(/\s+/g, '_');
              const storagePath = `gallery/${Date.now()}-${cleanFileName}`;
              
              // Compress directly in client browser to a lightweight JPEG (~80-150KB)
              const downloadUrl = await compressImageToDataUrl(file);
              if (!downloadUrl) {
                throw new Error("Could not process image file.");
              }

              const cleanTitle = file.name
                .replace(/\.[^/.]+$/, "")
                .replace(/[-_]/g, " ")
                .trim()
                .replace(/\b\w/g, c => c.toUpperCase());

              // Save directly to the platform_marketing_gallery collection via client Firestore SDK
              await addDoc(collection(db, 'platform_marketing_gallery'), {
                  url: downloadUrl,
                  path: storagePath,
                  createdBy: user.uid,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  description: cleanTitle,
                  isImported: false,
              });

          } catch (error: any) {
              console.error("Upload error:", error);
              errors.push(`Failed to deploy ${file.name}: ${error.message || 'Unknown error'}`);
          }
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
    }

    if (errors.length > 0) {
        toast({
            title: "Upload Issues",
            description: errors.join("\n"),
            variant: "destructive"
        });
    }

    if (uploadCount > errors.length) {
        toast({
            title: "Deployment Successful",
            description: `${uploadCount - errors.length} asset(s) added to the Shared Platform Gallery.`
        });
    }
  };
  
  const handleDeleteImage = async () => {
    if (!user || !imageToDelete || !db) return;
    setIsDeleting(true);

    try {
        // Delete record directly from Firestore
        await deleteDoc(doc(db, 'platform_marketing_gallery', imageToDelete.id));

        toast({ title: "Asset Removed", description: "The image has been removed from the shared platform repository." });
    } catch (error: any) {
        console.error("Removal error:", error);
        toast({ title: "Removal Failed", description: error.message || "Failed to remove image.", variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setImageToDelete(null);
    }
  };

  const debouncedDescriptionUpdate = useDebouncedCallback(async (imageId: string, description: string) => {
    if (!user || !db) return;
    try {
        await updateDoc(doc(db, 'platform_marketing_gallery', imageId), {
            description,
            updatedAt: serverTimestamp(),
        });
        toast({ title: "Metadata Updated", description: "Shared asset description has been saved." });
    } catch (error: any) {
        console.error("Description update error:", error);
        toast({ title: "Error", description: "Could not save metadata.", variant: "destructive" });
    }
  }, 1000);

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
                <GalleryHorizontal className="h-10 w-10 text-primary" />
                Shared Platform Gallery
            </h1>
            <p className="text-muted-foreground">
                Manage the master library of marketing assets. Images here are visible to <strong>all Community Leaders</strong>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2 font-bold shadow-sm"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload New Assets
            </Button>
          </div>
        </div>

        <AlertDialog onOpenChange={(open) => !open && setImageToDelete(null)}>
        <Card className="border-2 shadow-sm">
            <CardHeader className="bg-muted/10 border-b">
              <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        Platform Asset Repository
                    </CardTitle>
                    <CardDescription>
                        Items in this library are available for community leaders to use in their local marketing campaigns.
                    </CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Global Capacity</p>
                    <Badge variant="outline" className="font-mono">{currentImageCount} / {GALLERY_LIMIT}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
                {loading ? (
                    <div className="flex flex-col justify-center items-center h-64 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                        <p className="text-xs font-bold uppercase text-muted-foreground animate-pulse">Syncing platform library...</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Activity className="h-3 w-3" />
                                    Repository Utilization
                                </p>
                                <span className="text-[10px] font-bold">{Math.round((currentImageCount / GALLERY_LIMIT) * 100)}%</span>
                            </div>
                            <Progress value={(currentImageCount / GALLERY_LIMIT) * 100} className="h-1.5" />
                        </div>
                        
                        <Alert className="bg-primary/5 border-primary/20">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertTitle className="text-xs font-black uppercase tracking-widest">Global Distribution Protocol</AlertTitle>
                            <AlertDescription className="text-xs leading-relaxed italic">
                                Any image uploaded or synced here is immediately available in the <strong>Leader Marketing Hub</strong>. Use high-quality, professional photography to represent the platform brand.
                            </AlertDescription>
                        </Alert>
            
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                            {/* Upload card at the TOP / First slot of the grid */}
                            {currentImageCount < GALLERY_LIMIT && (
                                <div 
                                    className="aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer transition-all duration-300 group bg-muted/20"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Uploading...</p>
                                        </div>
                                    ) : (
                                    <>
                                        <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 mb-2 transition-colors">
                                            <Upload className="h-6 w-6" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-center">Upload Asset</p>
                                        <p className="text-[9px] text-muted-foreground mt-0.5">PNG, JPG, WebP</p>
                                    </>
                                    )}
                                </div>
                            )}

                            {images?.map((image, index) => (
                                <div key={image.id} className="space-y-3 group/item">
                                    <div className="relative aspect-square rounded-xl overflow-hidden border shadow-sm bg-muted ring-offset-background group-hover/item:ring-2 group-hover/item:ring-primary/20 transition-all">
                                        {image.url && (
                                            <Image
                                                src={image.url}
                                                alt={image.description || `Gallery image ${index + 1}`}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover/item:scale-110"
                                                unoptimized
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center gap-3">
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" onClick={() => setImageToDelete(image)} className="h-10 w-10 rounded-full shadow-xl">
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <p className="text-[9px] text-white font-bold uppercase tracking-wider">{image.isImported ? "Synced" : "Manual Upload"}</p>
                                        </div>
                                        {image.isImported && <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-tighter border border-white/20">Synced</div>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="relative">
                                            <Input
                                                key={image.id + '-' + (image.description || '')}
                                                defaultValue={getDisplayDescription(image)}
                                                onChange={(e) => debouncedDescriptionUpdate(image.id, e.target.value)}
                                                placeholder="Asset description..."
                                                className="h-8 text-[10px] font-bold border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between px-1">
                                            <p className="text-[8px] font-mono text-muted-foreground uppercase opacity-40 truncate flex-1 mr-2">Path: {image.path}</p>
                                            <Lock className="h-2.5 w-2.5 text-muted-foreground opacity-20" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                            multiple
                            accept="image/png, image/jpeg, image/gif, image/webp"
                            disabled={isUploading}
                        />
                    </>
                )}
            </CardContent>
        </Card>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Permanent Removal
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this asset from the <strong>Shared Platform Gallery</strong>? It will instantly disappear from all community leader dashboards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold uppercase text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImage} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90 font-black uppercase text-xs">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
}
