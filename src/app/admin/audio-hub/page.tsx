'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, setDoc, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Trash2, Mic, Pause, Share2, Download, AlertTriangle, Headphones, Radio, Sparkles, Volume2, Music, CheckCircle2, FileText } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { generateAndSaveAudioAction, deleteAudioTourAction } from '@/lib/actions/ttsActions';
import { cn } from '@/lib/utils';

// Increase timeout for long-running AI generation tasks
export const maxDuration = 120;

const MAX_WORDS = 400;

type AudioTour = {
  id: string;
  title: string;
  text: string;
  updatedAt: any;
  voice?: string;
  audioUrl?: string;
};

const voiceOptions = [
    { value: 'Kore', label: 'Kore (Female)' },
    { value: 'Algenib', label: 'Algenib (Male)' },
    { value: 'Achernar', label: 'Achernar (Male)' },
    { value: 'Vindemiatrix', label: 'Vindemiatrix (Female)' },
    { value: 'Leda', label: 'Leda (Female)' },
    { value: 'Puck', label: 'Puck (Male)' },
];

export default function AudioHubPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [tours, setTours] = React.useState<AudioTour[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newTitle, setNewTitle] = React.useState('');
  const [newText, setNewText] = React.useState('');
  const [newVoice, setNewVoice] = React.useState('Kore');
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [generatingId, setGeneratingId] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const currentWordCount = getWordCount(newText);
  const isOverLimit = currentWordCount > MAX_WORDS;

  const toursQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'audioTours'), orderBy('updatedAt', 'desc'));
  }, [db]);
  
  const { data: toursData, isLoading: toursLoading } = useCollection<AudioTour>(toursQuery);

  React.useEffect(() => {
    if (toursData) {
      setTours(toursData);
    }
    setLoading(toursLoading);
  }, [toursData, toursLoading]);

  const handleVoiceChange = async (id: string, voice: string) => {
    if (!db) return;
    const tourRef = doc(db, 'audioTours', id);
    try {
        await setDoc(tourRef, { voice }, { merge: true });
        toast({ title: "Voice Updated" });
    } catch (e) {
        toast({ title: "Error", description: "Could not update voice.", variant: "destructive" });
    }
  };

  const saveTour = async (id: string | null) => {
    if (!user || !db) return;
    const titleInput = id ? (document.getElementById(`title-${id}`) as HTMLInputElement) : null;
    const textInput = id ? (document.getElementById(`text-${id}`) as HTMLTextAreaElement) : null;
    
    const title = titleInput ? titleInput.value : newTitle;
    const text = textInput ? textInput.value : newText;
    
    if (!title || !text) {
        toast({ title: "Missing fields", description: "Title and text are required.", variant: "destructive" });
        return;
    }

    if (getWordCount(text) > MAX_WORDS) {
        toast({ title: "Script Too Long", description: `Please limit scripts to ${MAX_WORDS} words for AI stability.`, variant: "destructive" });
        return;
    }

    const tourId = id || crypto.randomUUID();
    const tourRef = doc(db, 'audioTours', tourId);

    const dataToSave: any = {
        title,
        text,
        updatedAt: Date.now(),
    };
    if (!id) {
        dataToSave.voice = newVoice;
    }

    try {
      setIsSaving(true);
      await setDoc(tourRef, dataToSave, { merge: true });
      if (!id) {
        setNewTitle('');
        setNewText('');
        setNewVoice('Kore');
      }
      toast({ title: `Audio tab ${id ? 'updated' : 'saved'}` });
    } catch (e) {
      toast({ title: "Error", description: "Could not save audio tab.", variant: "destructive"});
    } finally {
        setIsSaving(false);
    }
  };

  const deleteTour = async (id: string) => {
    if (!db) return;
    if (!window.confirm("Are you sure you want to remove this audio tab and its file?")) return;
    
    setDeletingId(id);
    try {
        const result = await deleteAudioTourAction(id);
        if (result.success) {
            toast({ title: "Audio tab deleted" });
        } else {
            throw new Error(result.error);
        }
    } catch (e: any) {
        toast({ title: "Error", description: e.message || "Failed to delete tab.", variant: "destructive" });
    } finally {
        setDeletingId(null);
    }
  };
  
  const playAudio = (audioUrl: string, id: string) => {
    if (playingId === id) {
        audioRef.current?.pause();
        audioRef.current = null;
        setPlayingId(null);
        return;
    }
    
    setPlayingId(id);
    
    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => setPlayingId(null);
    } catch (err) {
      toast({ title: "Error", description: "Failed to play audio.", variant: "destructive" });
      setPlayingId(null);
    }
  };

  const generateAndSaveAudio = async (tour: AudioTour) => {
    if (!db) return;
    
    if (getWordCount(tour.text) > MAX_WORDS) {
        toast({ title: "Script Too Long", description: `Cannot generate audio for scripts over ${MAX_WORDS} words.`, variant: "destructive" });
        return;
    }

    setGeneratingId(tour.id);

    try {
        const result = await generateAndSaveAudioAction({
            tourId: tour.id,
            text: tour.text,
            voice: tour.voice || 'Kore'
        });

        if (!result.success) {
            throw new Error(result.error || "Failed to generate audio.");
        }

        toast({ title: "Audio Generated", description: "The audio file is now saved and ready to play." });

    } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
        setGeneratingId(null);
    }
};


  const audioStats = React.useMemo(() => {
    const list = tours || [];
    return {
      total: list.length,
      synthesized: list.filter(t => !!t.audioUrl).length,
      pending: list.filter(t => !t.audioUrl).length,
      voices: voiceOptions.length,
    };
  }, [tours]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
        {/* Studio Hero Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-purple-600/15 via-fuchsia-600/10 to-indigo-600/15 border-2 border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
            <div>
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-widest mb-1.5">
                    <Sparkles className="h-4 w-4 text-fuchsia-500" />
                    AI Speech Synthesis Studio • Multi-Voice Engine
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
                    <Headphones className="h-8 w-8 text-purple-600 animate-pulse" />
                    Community Audio Hub & Voice Studio
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                    Create, generate, and broadcast automated AI-narrated audio tabs, community audio tours, and profit-share audio updates.
                </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <div className="px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 font-black text-xs flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 text-fuchsia-500" />
                    {audioStats.synthesized} Ready Audio Tracks
                </div>
            </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-t-4 border-t-purple-600 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Audio Tabs</p>
                        <div className="p-1 rounded-md bg-purple-500/10 text-purple-600">
                            <Music className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black">{audioStats.total}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Active narration topics</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Synthesized Audio</p>
                        <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{audioStats.synthesized}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Audio generated & live</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Draft Scripts</p>
                        <div className="p-1 rounded-md bg-amber-500/10 text-amber-600">
                            <FileText className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-amber-600 dark:text-amber-400">{audioStats.pending}</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Awaiting voice generation</p>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3.5">
                    <div className="flex items-center justify-between pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Voice Models</p>
                        <div className="p-1 rounded-md bg-blue-500/10 text-blue-600">
                            <Volume2 className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-xl font-black text-blue-600 dark:text-blue-400">{audioStats.voices} Voices</div>
                    <p className="text-[9px] text-muted-foreground font-semibold">Male & female personas</p>
                </CardContent>
            </Card>
        </div>

        <main>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <section className="lg:col-span-5">
                    <Card className="sticky top-10 border-t-4 border-t-purple-600 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-purple-500/5 via-transparent to-transparent rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                               <Mic className="h-5 w-5 text-purple-600" /> New Audio Tab
                            </CardTitle>
                            <CardDescription>Compose a narrative and select an AI voice persona.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="new-title" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Tab Heading</Label>
                                <Input id="new-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Weekly Profit Share Update" className="mt-1" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="new-voice" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">AI Voice Persona</Label>
                                <Select value={newVoice} onValueChange={setNewVoice}>
                                    <SelectTrigger id="new-voice" className="mt-1">
                                        <SelectValue placeholder="Select a voice..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {voiceOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="new-text" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Audio Script</Label>
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase",
                                        isOverLimit ? "text-destructive" : "text-muted-foreground"
                                    )}>
                                        {currentWordCount} / {MAX_WORDS} words
                                    </span>
                                </div>
                                <Textarea 
                                    id="new-text" 
                                    value={newText} 
                                    onChange={(e) => setNewText(e.target.value)} 
                                    rows={6} 
                                    placeholder="Enter the text for the AI to read out..."
                                    className={cn(isOverLimit && "border-destructive focus-visible:ring-destructive")}
                                />
                                {isOverLimit && (
                                    <p className="text-[10px] text-destructive flex items-center gap-1 font-semibold">
                                        <AlertTriangle className="h-3 w-3" />
                                        Script exceeds stability limit. Please shorten to under {MAX_WORDS} words.
                                    </p>
                                )}
                            </div>
                             <Button onClick={() => saveTour(null)} disabled={isSaving || !newTitle || !newText || isOverLimit} className="w-full font-bold shadow-sm">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Save & Broadcast Audio
                            </Button>
                        </CardContent>
                    </Card>
                </section>
                <section className="lg:col-span-7 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Volume2 className="h-5 w-5 text-purple-600" />
                            Current Live Audio Tracks
                        </h2>
                        <span className="text-xs font-bold text-muted-foreground uppercase">{tours.length} Track(s)</span>
                    </div>
                     {loading ? (
                        <div className="flex justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
                    ) : tours.length === 0 ? (
                        <div className="p-16 text-center bg-muted/50 rounded-xl border-2 border-dashed text-muted-foreground font-medium">
                            <Headphones className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="font-bold text-foreground">No live audio tracks yet.</p>
                            <p className="text-xs text-muted-foreground mt-1">Compose and synthesize your first track on the left.</p>
                        </div>
                    ) : (
                        tours.map(tour => (
                            <Card key={tour.id} className={cn(
                                "border-t-4 transition-all shadow-sm hover:shadow-md",
                                tour.audioUrl ? "border-t-emerald-500" : "border-t-amber-500"
                            )}>
                                <CardContent className="p-5 space-y-4">
                                     <div className="flex justify-between items-start gap-4">
                                        <div className="flex-grow">
                                            <Label htmlFor={`title-${tour.id}`} className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Tab Title</Label>
                                            <Input id={`title-${tour.id}`} defaultValue={tour.title} className="text-xl font-bold border-0 shadow-none px-0 focus-visible:ring-0 bg-transparent"/>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteTour(tour.id);
                                                }}
                                                disabled={deletingId === tour.id}
                                            >
                                                {deletingId === tour.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`voice-${tour.id}`} className="text-xs font-semibold text-muted-foreground uppercase">AI Voice</Label>
                                        <Select value={tour.voice || 'Kore'} onValueChange={(v) => handleVoiceChange(tour.id, v)}>
                                            <SelectTrigger id={`voice-${tour.id}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {voiceOptions.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`text-${tour.id}`} className="text-xs font-semibold text-muted-foreground uppercase">Script</Label>
                                        <Textarea id={`text-${tour.id}`} defaultValue={tour.text} rows={3} className="w-full text-muted-foreground bg-transparent border-0 focus-visible:ring-0"/>
                                    </div>
                                     <div className="flex justify-end gap-3 mt-4 flex-wrap">
                                        <Button variant="outline" size="sm" onClick={() => saveTour(tour.id)}>Update Text</Button>
                                        <Button 
                                            onClick={() => generateAndSaveAudio(tour)} 
                                            disabled={generatingId === tour.id || getWordCount(tour.text) > MAX_WORDS} 
                                            variant="outline"
                                        >
                                            {generatingId === tour.id ? (<Loader2 className="mr-2 h-4 w-4 animate-spin"/>) : (<Mic className="mr-2 h-4 w-4" />)}
                                            {tour.audioUrl ? 'Regenerate' : 'Generate'} Audio
                                        </Button>
                                        <Button onClick={() => playAudio(tour.audioUrl!, tour.id)} disabled={!tour.audioUrl || generatingId === tour.id}>
                                            {playingId === tour.id ? <Pause className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4" />}
                                            Play
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (tour.audioUrl) {
                                                    navigator.clipboard.writeText(tour.audioUrl);
                                                    toast({ title: "Link Copied!", description: "The audio URL has been copied to your clipboard."});
                                                }
                                            }}
                                            disabled={!tour.audioUrl}
                                        >
                                            <Share2 className="mr-2 h-4 w-4" />
                                            Share
                                        </Button>
                                        <Button asChild variant="outline" size="sm" disabled={!tour.audioUrl}>
                                            <a href={tour.audioUrl!} download={`${tour.title.replace(/\s/g, '_')}.wav`}>
                                                <Download className="mr-2 h-4 w-4" />
                                                Download
                                            </a>
                                        </Button>
                                    </div>
                                    <div className="mt-4 p-2 bg-slate-50 dark:bg-slate-900 rounded-md">
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Reference ID</Label>
                                        <Input
                                            readOnly
                                            value={tour.id}
                                            className="w-full h-8 text-[10px] font-mono bg-transparent border-0 focus-visible:ring-0"
                                            onClick={(e) => {
                                                (e.target as HTMLInputElement).select();
                                                navigator.clipboard.writeText(tour.id);
                                                toast({ title: "Copied!", description: "Audio Tour ID copied to clipboard." });
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </section>
            </div>
        </main>
    </div>
  );
}
