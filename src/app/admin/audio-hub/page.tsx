'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, setDoc, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Play, 
  Trash2, 
  Mic, 
  Pause, 
  Share2, 
  Download, 
  AlertTriangle, 
  Headphones, 
  Radio, 
  Sparkles, 
  Volume2, 
  Music, 
  CheckCircle2, 
  FileText, 
  Search, 
  X, 
  Edit3, 
  Copy, 
  RotateCcw,
  VolumeX,
  Clock
} from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { PaginationControls } from '@/components/ui/pagination';
import { generateAndSaveAudioAction, deleteAudioTourAction } from '@/lib/actions/ttsActions';
import { formatDistanceToNow } from 'date-fns';
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
  
  // Create New Track state
  const [newTitle, setNewTitle] = React.useState('');
  const [newText, setNewText] = React.useState('');
  const [newVoice, setNewVoice] = React.useState('Kore');
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Operational state
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [generatingId, setGeneratingId] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedTitleFilter, setSelectedTitleFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [voiceFilter, setVoiceFilter] = React.useState<string>('all');

  // Pagination state
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  // Edit modal state
  const [editingTour, setEditingTour] = React.useState<AudioTour | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editText, setEditText] = React.useState('');
  const [editVoice, setEditVoice] = React.useState('Kore');
  const [isUpdating, setIsUpdating] = React.useState(false);

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const currentWordCount = getWordCount(newText);
  const isOverLimit = currentWordCount > MAX_WORDS;

  const editWordCount = getWordCount(editText);
  const isEditOverLimit = editWordCount > MAX_WORDS;

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

  // Clean up audio on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

  const saveNewTour = async () => {
    if (!user || !db) return;
    
    if (!newTitle.trim() || !newText.trim()) {
      toast({ title: "Missing fields", description: "Title and script text are required.", variant: "destructive" });
      return;
    }

    if (getWordCount(newText) > MAX_WORDS) {
      toast({ title: "Script Too Long", description: `Please limit scripts to ${MAX_WORDS} words for AI stability.`, variant: "destructive" });
      return;
    }

    const tourId = crypto.randomUUID();
    const tourRef = doc(db, 'audioTours', tourId);

    const dataToSave = {
      title: newTitle.trim(),
      text: newText.trim(),
      voice: newVoice,
      updatedAt: Date.now(),
    };

    try {
      setIsSaving(true);
      await setDoc(tourRef, dataToSave, { merge: true });
      setNewTitle('');
      setNewText('');
      setNewVoice('Kore');
      toast({ title: "Audio Tab Created", description: `"${dataToSave.title}" has been added to your library.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not save audio tab.", variant: "destructive"});
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (tour: AudioTour) => {
    setEditingTour(tour);
    setEditTitle(tour.title);
    setEditText(tour.text);
    setEditVoice(tour.voice || 'Kore');
  };

  const saveEditTour = async (andRegenerate: boolean = false) => {
    if (!db || !editingTour) return;

    if (!editTitle.trim() || !editText.trim()) {
      toast({ title: "Missing fields", description: "Title and script text are required.", variant: "destructive" });
      return;
    }

    if (getWordCount(editText) > MAX_WORDS) {
      toast({ title: "Script Too Long", description: `Please limit scripts to ${MAX_WORDS} words.`, variant: "destructive" });
      return;
    }

    const tourRef = doc(db, 'audioTours', editingTour.id);
    const updatedData = {
      title: editTitle.trim(),
      text: editText.trim(),
      voice: editVoice,
      updatedAt: Date.now(),
    };

    setIsUpdating(true);
    try {
      await setDoc(tourRef, updatedData, { merge: true });
      toast({ title: "Audio Tab Updated", description: "Changes saved to the repository." });
      
      const updatedTourObj = { ...editingTour, ...updatedData };
      setEditingTour(null);

      if (andRegenerate) {
        generateAndSaveAudio(updatedTourObj);
      }
    } catch (e: any) {
      toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTour = async (id: string, title?: string) => {
    if (!db) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${title || 'this track'}"?`)) return;
    
    setDeletingId(id);
    try {
      const result = await deleteAudioTourAction(id);
      if (result.success) {
        if (playingId === id) {
          audioRef.current?.pause();
          audioRef.current = null;
          setPlayingId(null);
        }
        toast({ title: "Audio Tab Deleted", description: "Track and audio assets removed." });
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
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlayingId(id);
    
    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        toast({ title: "Playback Error", description: "Unable to play audio stream.", variant: "destructive" });
        setPlayingId(null);
      };
    } catch (err) {
      toast({ title: "Error", description: "Failed to initialize audio player.", variant: "destructive" });
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

      toast({ title: "Audio Synthesized!", description: `"${tour.title}" is generated and ready to stream.` });

    } catch (err: any) {
      toast({ title: "Generation Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingId(null);
    }
  };

  // Filter and search logic
  const filteredTours = React.useMemo(() => {
    return tours.filter(tour => {
      // 1. Text Search (title or script text)
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const matchesTitle = tour.title?.toLowerCase().includes(queryLower);
        const matchesText = tour.text?.toLowerCase().includes(queryLower);
        if (!matchesTitle && !matchesText) return false;
      }

      // 2. Title Dropdown filter
      if (selectedTitleFilter !== 'all' && tour.id !== selectedTitleFilter) {
        return false;
      }

      // 3. Status filter
      if (statusFilter === 'ready' && !tour.audioUrl) return false;
      if (statusFilter === 'pending' && !!tour.audioUrl) return false;

      // 4. Voice filter
      if (voiceFilter !== 'all' && (tour.voice || 'Kore') !== voiceFilter) {
        return false;
      }

      return true;
    });
  }, [tours, searchQuery, selectedTitleFilter, statusFilter, voiceFilter]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, selectedTitleFilter, statusFilter, voiceFilter]);

  // Paginated slice
  const paginatedTours = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredTours.slice(start, start + pagination.pageSize);
  }, [filteredTours, pagination]);

  const pageCount = Math.ceil(filteredTours.length / pagination.pageSize);

  const isFiltered = searchQuery !== '' || selectedTitleFilter !== 'all' || statusFilter !== 'all' || voiceFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedTitleFilter('all');
    setStatusFilter('all');
    setVoiceFilter('all');
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

  const formatLastUpdated = (updatedAt: any) => {
    if (!updatedAt) return 'Unknown';
    try {
      const date = typeof updatedAt === 'number' ? new Date(updatedAt) : updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Studio Hero Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-purple-600/15 via-fuchsia-600/10 to-indigo-600/15 border-2 border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-widest mb-1.5">
            <Sparkles className="h-4 w-4 text-fuchsia-500" />
            AI Speech Synthesis Studio • Multi-Voice Engine
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight font-headline flex items-center gap-3 text-foreground">
            <Headphones className="h-8 w-8 text-purple-600 animate-pulse" />
            Community Audio Hub & Voice Studio
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
            Create, synthesize, and manage automated AI-narrated audio tabs, community broadcasts, and profit-share narration tracks.
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Create New Audio Tab */}
          <section className="lg:col-span-4">
            <Card className="sticky top-6 border-t-4 border-t-purple-600 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-purple-500/5 via-transparent to-transparent rounded-t-lg pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Mic className="h-5 w-5 text-purple-600" /> New Audio Tab
                </CardTitle>
                <CardDescription>Compose a narrative and select an AI voice persona.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new-title" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Tab Heading</Label>
                  <Input 
                    id="new-title" 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)} 
                    placeholder="e.g. Weekly Profit Share Update" 
                    className="mt-1" 
                  />
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
                    placeholder="Enter the text script for the AI model to narrate..."
                    className={cn(isOverLimit && "border-destructive focus-visible:ring-destructive")}
                  />
                  {isOverLimit && (
                    <p className="text-[10px] text-destructive flex items-center gap-1 font-semibold">
                      <AlertTriangle className="h-3 w-3" />
                      Script exceeds limit. Shorten to under {MAX_WORDS} words.
                    </p>
                  )}
                </div>
                <Button 
                  onClick={saveNewTour} 
                  disabled={isSaving || !newTitle.trim() || !newText.trim() || isOverLimit} 
                  className="w-full font-bold shadow-sm h-11"
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                  Save to Audio Library
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Right Column: Audio Tracks Repository & Table */}
          <section className="lg:col-span-8 space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="bg-muted/10 border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-purple-600" />
                      Current Live Audio Tracks
                    </CardTitle>
                    <CardDescription>
                      Master registry of all generated voice narrations and community audio tabs.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="self-start sm:self-auto font-mono text-xs">
                    {filteredTours.length} of {tours.length} Track(s)
                  </Badge>
                </div>

                {/* Filter Toolbar */}
                <div className="pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Search Input */}
                    <div className="sm:col-span-6 relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title or script text..."
                        className="pl-9 pr-8 h-9 text-xs"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          title="Clear search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Title Jump Filter Dropdown */}
                    <div className="sm:col-span-6">
                      <Select value={selectedTitleFilter} onValueChange={setSelectedTitleFilter}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Quick-jump to a tab title..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value="all" className="font-bold text-xs">
                            🔍 All Audio Tab Titles ({tours.length})
                          </SelectItem>
                          {tours.map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.audioUrl ? '🟢' : '🟡'} {t.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Secondary Filters: Status, Voice & Reset */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Filter */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">Status:</span>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                            <SelectItem value="ready" className="text-xs">🟢 Live Audio</SelectItem>
                            <SelectItem value="pending" className="text-xs">🟡 Draft Scripts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Voice Filter */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">Voice:</span>
                        <Select value={voiceFilter} onValueChange={setVoiceFilter}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">All Voices</SelectItem>
                            {voiceOptions.map(v => (
                              <SelectItem key={v.value} value={v.value} className="text-xs">{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {isFiltered && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={resetFilters} 
                        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col justify-center items-center h-64 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-xs font-bold text-muted-foreground">Loading audio tracks...</p>
                  </div>
                ) : filteredTours.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Headphones className="h-10 w-10 mx-auto opacity-30 mb-2" />
                    <p className="font-bold text-foreground text-sm">
                      {isFiltered ? "No audio tracks match your filter criteria." : "No audio tracks found in library."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isFiltered ? "Try searching for a different keyword or resetting your filters." : "Create your first narration tab using the form on the left."}
                    </p>
                    {isFiltered && (
                      <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 text-xs">
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-12 text-center">Audio</TableHead>
                          <TableHead className="min-w-[180px]">Tab Title & Voice</TableHead>
                          <TableHead className="min-w-[220px]">Script Preview</TableHead>
                          <TableHead className="w-28">Updated</TableHead>
                          <TableHead className="w-36 text-right pr-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTours.map((tour) => {
                          const isPlaying = playingId === tour.id;
                          const isGenerating = generatingId === tour.id;
                          const wordCount = getWordCount(tour.text);

                          return (
                            <TableRow key={tour.id} className={cn("group transition-colors", isPlaying && "bg-purple-500/5")}>
                              {/* Audio Playback / Status Column */}
                              <TableCell className="text-center align-middle pl-4">
                                {tour.audioUrl ? (
                                  <Button
                                    variant={isPlaying ? "default" : "outline"}
                                    size="icon"
                                    className={cn(
                                      "h-9 w-9 rounded-full shrink-0 shadow-sm transition-all",
                                      isPlaying 
                                        ? "bg-purple-600 hover:bg-purple-700 text-white animate-pulse" 
                                        : "hover:border-purple-500 hover:text-purple-600"
                                    )}
                                    onClick={() => playAudio(tour.audioUrl!, tour.id)}
                                    title={isPlaying ? "Pause audio" : "Play audio narration"}
                                  >
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                                  </Button>
                                ) : (
                                  <div 
                                    className="h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 mx-auto" 
                                    title="Draft: Needs voice synthesis"
                                  >
                                    <VolumeX className="h-4 w-4 opacity-70" />
                                  </div>
                                )}
                              </TableCell>

                              {/* Title & Metadata */}
                              <TableCell className="align-middle">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                      {tour.title}
                                    </span>
                                    {tour.audioUrl ? (
                                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold py-0 h-4">
                                        Live
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold py-0 h-4">
                                        Draft
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="font-medium bg-muted px-1.5 py-0.5 rounded text-foreground/80">
                                      Voice: {tour.voice || 'Kore'}
                                    </span>
                                    <span 
                                      className="font-mono opacity-50 hover:opacity-100 cursor-pointer flex items-center gap-0.5 transition-opacity"
                                      onClick={() => {
                                        navigator.clipboard.writeText(tour.id);
                                        toast({ title: "ID Copied", description: "Reference ID copied to clipboard." });
                                      }}
                                      title="Click to copy Reference ID"
                                    >
                                      <Copy className="h-2.5 w-2.5" />
                                      {tour.id.substring(0, 8)}...
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Script Preview */}
                              <TableCell className="align-middle">
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {tour.text}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                    <span>{wordCount} words</span>
                                    {wordCount > MAX_WORDS && (
                                      <span className="text-destructive font-bold flex items-center gap-0.5">
                                        <AlertTriangle className="h-3 w-3" /> Exceeds {MAX_WORDS} limit
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              {/* Last Updated */}
                              <TableCell className="align-middle text-xs text-muted-foreground whitespace-nowrap">
                                <div className="flex items-center gap-1 text-[11px]">
                                  <Clock className="h-3 w-3 opacity-60" />
                                  {formatLastUpdated(tour.updatedAt)}
                                </div>
                              </TableCell>

                              {/* Action Buttons */}
                              <TableCell className="align-middle text-right pr-4">
                                <div className="flex items-center justify-end gap-1">
                                  {/* Generate / Regenerate button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-500/10"
                                    onClick={() => generateAndSaveAudio(tour)}
                                    disabled={isGenerating || wordCount > MAX_WORDS}
                                    title={tour.audioUrl ? "Regenerate AI voice narration" : "Synthesize AI voice narration"}
                                  >
                                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                                  </Button>

                                  {/* Edit Modal button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    onClick={() => openEditModal(tour)}
                                    title="Edit script & voice"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>

                                  {/* Copy Link button */}
                                  {tour.audioUrl && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                      onClick={() => {
                                        navigator.clipboard.writeText(tour.audioUrl!);
                                        toast({ title: "Link Copied!", description: "Direct audio stream URL copied." });
                                      }}
                                      title="Share audio URL"
                                    >
                                      <Share2 className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {/* Download button */}
                                  {tour.audioUrl && (
                                    <Button
                                      asChild
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                      title="Download WAV audio"
                                    >
                                      <a href={tour.audioUrl} download={`${tour.title.replace(/\s+/g, '_')}.wav`}>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}

                                  {/* Delete button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => deleteTour(tour.id, tour.title)}
                                    disabled={deletingId === tour.id}
                                    title="Delete audio tab"
                                  >
                                    {deletingId === tour.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>

              {/* Pagination Footer */}
              {filteredTours.length > 0 && (
                <CardFooter className="border-t px-4 py-2 bg-muted/5">
                  <PaginationControls
                    pagination={pagination}
                    setPagination={setPagination}
                    pageCount={pageCount}
                    totalRows={filteredTours.length}
                  />
                </CardFooter>
              )}
            </Card>
          </section>
        </div>
      </main>

      {/* Edit Audio Track Modal Dialog */}
      <Dialog open={!!editingTour} onOpenChange={(open) => !open && setEditingTour(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Edit3 className="h-5 w-5 text-purple-600" />
              Edit Audio Tab Script & Voice
            </DialogTitle>
            <DialogDescription>
              Modify narration text, adjust AI voice model, or regenerate synthesis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Tab Heading</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Tab title..."
                className="font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-voice" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">AI Voice Persona</Label>
              <Select value={editVoice} onValueChange={setEditVoice}>
                <SelectTrigger id="edit-voice">
                  <SelectValue />
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
                <Label htmlFor="edit-text" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Audio Script</Label>
                <span className={cn(
                  "text-[10px] font-bold uppercase",
                  isEditOverLimit ? "text-destructive" : "text-muted-foreground"
                )}>
                  {editWordCount} / {MAX_WORDS} words
                </span>
              </div>
              <Textarea
                id="edit-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={7}
                placeholder="Enter updated narration script..."
                className={cn(isEditOverLimit && "border-destructive focus-visible:ring-destructive")}
              />
              {isEditOverLimit && (
                <p className="text-[10px] text-destructive flex items-center gap-1 font-semibold">
                  <AlertTriangle className="h-3 w-3" />
                  Script exceeds stability limit of ${MAX_WORDS} words.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setEditingTour(null)}
              className="sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => saveEditTour(false)}
              disabled={isUpdating || !editTitle.trim() || !editText.trim() || isEditOverLimit}
              className="sm:w-auto"
            >
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Text Only
            </Button>
            <Button
              onClick={() => saveEditTour(true)}
              disabled={isUpdating || !editTitle.trim() || !editText.trim() || isEditOverLimit}
              className="sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
              Save & Synthesize Audio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
