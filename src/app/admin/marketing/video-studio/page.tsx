'use client';

import * as React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Mic, 
  Sparkles, 
  Video, 
  Smartphone, 
  Monitor, 
  Upload, 
  Copy, 
  Check, 
  Music, 
  FileText, 
  Radio, 
  Loader2, 
  ShieldAlert, 
  Sun, 
  Truck, 
  MapPin, 
  Bell, 
  ShoppingBag, 
  Calendar, 
  Clock, 
  ArrowRight,
  Download,
  AlertTriangle,
  Users,
  CheckCircle2,
  Subtitles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { generateAndSaveAudioAction } from '@/lib/actions/ttsActions';
import { cn } from '@/lib/utils';

// Voice options aligned directly with Audio Hub
const AUDIO_HUB_VOICES = [
  { value: 'Kore', label: 'Kore (Female - Warm British & Clear)' },
  { value: 'Algenib', label: 'Algenib (Male - Authoritative & Calm)' },
  { value: 'Achernar', label: 'Achernar (Male - Deep & Trustworthy)' },
  { value: 'Vindemiatrix', label: 'Vindemiatrix (Female - Friendly & Engaging)' },
  { value: 'Leda', label: 'Leda (Female - Dynamic & Bright)' },
  { value: 'Puck', label: 'Puck (Male - Modern & Energetic)' },
];

type SceneConfig = {
  id: number;
  title: string;
  badge: string;
  start: number;
  end: number;
  voiceOver: string;
  onScreenText: string;
  subtitle: string;
  description: string;
};

// 90s Landscape Explainer Scenes (16:9)
const SCENES_16X9: SceneConfig[] = [
  {
    id: 1,
    title: "The Hook",
    badge: "0:00 – 0:12",
    start: 0,
    end: 12,
    voiceOver: "Trying to keep up with your town shouldn't mean scrolling through five noisy social media groups—only to miss a road closure, a school alert, or a local event.",
    onScreenText: "Tired of noisy feeds & missed local updates?",
    subtitle: "Tired of noisy feeds & missed local updates? One trusted place for your town.",
    description: "Cluttered notification chaos fading into clean Community Hub dashboard."
  },
  {
    id: 2,
    title: "8:00 AM Daily Briefing",
    badge: "0:12 – 0:28",
    start: 12,
    end: 28,
    voiceOver: "Meet Community Hub—your town's digital front door. Every morning at 8:00 AM, your Daily Briefing brings everything that matters into one clean bulletin: today's weather, roadworks within 30 miles, school closures, upcoming holidays, and quick notices from your community leaders.",
    onScreenText: "8:00 AM Daily Morning Briefing • Weather • 30-Mile Roadworks • School Alerts",
    subtitle: "8:00 AM Daily Morning Briefing • Local Weather, 30-Mile Roadworks & Council Notices.",
    description: "Morning Briefing popup showing weather, travel, school alerts, and holiday countdowns."
  },
  {
    id: 3,
    title: "Interactive Map & Locate Me",
    badge: "0:28 – 0:42",
    start: 28,
    end: 42,
    voiceOver: "Whether you're at home or travelling nearby, our interactive boundary map lets you tap 'Locate Me' with live mobile GPS or search any postcode—automatically welcoming you into mapped local hubs.",
    onScreenText: "Live GPS 'Locate Me' • Geofenced Boundaries • High Street Pins",
    subtitle: "Live GPS 'Locate Me' • Geofenced Community Boundaries & Town Centre Pins.",
    description: "Leaflet boundary map with animated GeoJSON polygon draw and GPS pulse."
  },
  {
    id: 4,
    title: "Virtual High Street",
    badge: "0:42 – 0:58",
    start: 42,
    end: 58,
    voiceOver: "Beyond daily essentials, explore your Virtual High Street to shop independent local stores with community courier delivery, discover What's On guides and events, find local jobs, or use neighbour-to-neighbour Buy, Swap & Sell boards—without the spam.",
    onScreenText: "Virtual High Street • Doorstep Courier • Local Jobs • Events",
    subtitle: "Shop Local Stores with Doorstep Delivery • What's On & Buy, Swap & Sell.",
    description: "Showcasing independent shopfronts, events calendar, and jobs board."
  },
  {
    id: 5,
    title: "Civic Voice & Resilience",
    badge: "0:58 – 1:16",
    start: 58,
    end: 76,
    voiceOver: "Have your say in local polls and petitions, stay informed with verified council and National Park regional broadcasts, and rely on a built-in Emergency & Civil Resilience Engine when severe weather, floods, or power outages strike—backed by local volunteers and 40%+ revenue share reinvested into your community.",
    onScreenText: "Polls & Petitions • Regional Broadcasts • Civil Resilience (CEAP) • 40%+ Split",
    subtitle: "Community Polls • Verified Emergency Warnings • Volunteer Asset Roster.",
    description: "CEAP threat matrix, situation board, and leader sustainable revenue share."
  },
  {
    id: 6,
    title: "Call to Action",
    badge: "1:16 – 1:30",
    start: 76,
    end: 90,
    voiceOver: "Everything your town needs, in one trusted place. Join your local hub—or step up as a Community Leader—today at my-community-hub.co.uk.",
    onScreenText: "Community Hub — Your Town, Connected.\nmy-community-hub.co.uk",
    subtitle: "Community Hub — Your Town, Connected. Visit my-community-hub.co.uk today.",
    description: "Polished brand end-card with domain and app badges."
  }
];

// 30s Vertical Social Reel Scenes (9:16)
const SCENES_9X16: SceneConfig[] = [
  {
    id: 1,
    title: "Hook",
    badge: "0:00 – 0:06",
    start: 0,
    end: 6,
    voiceOver: "One app for everything happening in your town—without the noisy social media feeds.",
    onScreenText: "Your Town. One Trusted Hub.",
    subtitle: "Your Town. One Trusted Hub — No Noise, No Spam.",
    description: "Fast hook contrasting social media chaos with clean Community Hub UI."
  },
  {
    id: 2,
    title: "Morning Briefing + GPS Map",
    badge: "0:06 – 0:15",
    start: 6,
    end: 15,
    voiceOver: "Get your 8:00 AM Daily Briefing with weather, 30-mile roadworks, and school alerts, plus a live GPS community map.",
    onScreenText: "8 AM Daily Briefing • Live GPS Map",
    subtitle: "8 AM Daily Briefing • Weather, 30-Mile Roadworks & Live GPS Map.",
    description: "Morning Briefing and geofenced boundaries."
  },
  {
    id: 3,
    title: "High Street & Resilience",
    badge: "0:15 – 0:23",
    start: 15,
    end: 23,
    voiceOver: "Shop your Virtual High Street, vote in local polls, and stay protected with real-time civil emergency alerts.",
    onScreenText: "Local Shops • Polls • Emergency Alerts",
    subtitle: "Shop Local Stores • Have Your Say • Verified Emergency Alerts.",
    description: "Storefronts and emergency resilience engine."
  },
  {
    id: 4,
    title: "Call to Action",
    badge: "0:23 – 0:30",
    start: 23,
    end: 30,
    voiceOver: "Join your community today at my-community-hub.co.uk.",
    onScreenText: "Join Your Town Today\nmy-community-hub.co.uk",
    subtitle: "Join your community today at my-community-hub.co.uk.",
    description: "Final call to action."
  }
];

export default function MarketingVideoStudioPage() {
  const { toast } = useToast();
  const db = useFirestore();

  // Mode: 16:9 (90s) vs 9:16 (30s)
  const [aspectMode, setAspectMode] = React.useState<'16x9' | '9x16'>('16x9');
  const activeScenes = aspectMode === '16x9' ? SCENES_16X9 : SCENES_9X16;
  const totalDuration = aspectMode === '16x9' ? 90 : 30;

  // Playback state
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1.0);
  const [volume, setVolume] = React.useState(1.0);
  const [isMuted, setIsMuted] = React.useState(false);
  const [showSubtitles, setShowSubtitles] = React.useState(true);
  const [isCleanRecordMode, setIsCleanRecordMode] = React.useState(false);

  // Audio Hub voice & generation state
  const [selectedVoice, setSelectedVoice] = React.useState('Kore');
  const [isGeneratingVoice, setIsGeneratingVoice] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [availableAudioTours, setAvailableAudioTours] = React.useState<{ id: string; title: string; audioUrl?: string }[]>([]);
  const [selectedTourId, setSelectedTourId] = React.useState<string>('none');

  // Custom screenshots mapping (scene id -> data url)
  const [customScreenshots, setCustomScreenshots] = React.useState<Record<number, string>>({});

  // Audio element reference
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  // Load existing audio tours from Audio Hub (Firestore)
  React.useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'audioTours'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tours = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || 'Untitled Tour',
        audioUrl: doc.data().audioUrl
      })).filter(t => !!t.audioUrl);
      setAvailableAudioTours(tours);

      // Auto-attach the first available audio tour if none is loaded yet
      if (tours.length > 0) {
        setSelectedTourId(prevId => {
          if (prevId === 'none' || !prevId) {
            const firstTour = tours[0];
            setAudioUrl(prevUrl => prevUrl || firstTour.audioUrl || null);
            return firstTour.id;
          }
          return prevId;
        });
      }
    }, (error) => {
      console.warn('[Video Studio] Could not load audio tours from Firestore:', error);
    });
    return () => unsubscribe();
  }, [db]);

  // Current active scene computation
  const currentScene = React.useMemo(() => {
    return activeScenes.find(s => currentTime >= s.start && currentTime < s.end) || activeScenes[activeScenes.length - 1];
  }, [activeScenes, currentTime]);

  // Synchronize timeline with real audio if loaded
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audioUrl) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // Playback animation timer
  React.useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    if (audioUrl && audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().catch(e => console.warn('Audio play failed:', e));
      return;
    }

    let lastStamp = performance.now();
    const tick = (now: number) => {
      const deltaSec = ((now - lastStamp) / 1000) * playbackSpeed;
      lastStamp = now;
      setCurrentTime(prev => {
        const next = prev + deltaSec;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, audioUrl, playbackSpeed, totalDuration]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    } else {
      if (currentTime >= totalDuration) setCurrentTime(0);
      setIsPlaying(true);
      if (audioRef.current && audioUrl) {
        audioRef.current.currentTime = currentTime;
        audioRef.current.play().catch(e => console.warn('Audio playback error:', e));
      }
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = seconds;
    }
  };

  // Generate Voice-Over directly via Audio Hub ttsFlow
  const handleGenerateVoiceover = async () => {
    setIsGeneratingVoice(true);
    const fullScript = activeScenes.map(s => s.voiceOver).join(' ');
    const tourId = `video_studio_${aspectMode}_${Date.now()}`;

    try {
      toast({
        title: "Generating Audio Hub Voice-Over...",
        description: `Synthesizing ${aspectMode === '16x9' ? '90s' : '30s'} narration with "${selectedVoice}".`,
      });

      const res = await generateAndSaveAudioAction({
        tourId,
        text: fullScript,
        voice: selectedVoice
      });

      if (res.success && res.url) {
        setAudioUrl(res.url);
        if (audioRef.current) {
          audioRef.current.src = res.url;
          audioRef.current.load();
        }
        toast({
          title: "Audio Generation Complete!",
          description: `Voice-over successfully generated and synced to the studio with ${selectedVoice}.`,
        });
      } else {
        throw new Error(res.error || "Failed to generate audio.");
      }
    } catch (err: any) {
      console.error("[Video Studio] Audio generation error:", err);
      toast({
        title: "Voice-Over Generation Failed",
        description: err.message || "Could not generate speech. Try picking an existing Audio Hub track.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  // Handle manual audio file upload (MP3/WAV)
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      if (audioRef.current) audioRef.current.src = url;
      toast({
        title: "Custom Audio Loaded",
        description: `Attached ${file.name} to the Video Studio timeline.`,
      });
    }
  };

  // Handle Screenshot Upload for a specific scene
  const handleScreenshotUpload = (sceneId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomScreenshots(prev => ({
            ...prev,
            [sceneId]: event.target!.result as string
          }));
          toast({
            title: `Scene ${sceneId} Screenshot Updated`,
            description: "Custom screenshot loaded into device mockup.",
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Format time (MM:SS)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={cn("space-y-6 max-w-7xl mx-auto transition-all duration-300", isCleanRecordMode && "p-0 max-w-none")}>
      
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        src={audioUrl || undefined} 
        preload="auto" 
        muted={isMuted} 
        onVolumeChange={() => {
          if (audioRef.current) setVolume(audioRef.current.volume);
        }}
      />

      {/* Hero Header Banner (Styled to match Community Hub Admin theme) */}
      {!isCleanRecordMode && (
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/15 border-2 border-blue-500/25 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest">
              <Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Marketing & Visual Communications
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2.5 text-foreground">
              <span className="px-2.5 py-1 rounded-xl bg-primary text-primary-foreground font-black text-base shadow">CH</span>
              Marketing Video Studio
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              Create animated explainer videos and social reels for Community Hub, synchronized directly with your verified <strong>Audio Hub</strong> voice-over engine.
            </p>
          </div>

          {/* Format Switcher & Clean Screen-Record Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="bg-background/90 p-1 rounded-xl border border-border shadow-sm flex items-center">
              <Button
                variant={aspectMode === '16x9' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "text-xs font-bold gap-1.5 h-8",
                  aspectMode === '16x9' ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => { setAspectMode('16x9'); setCurrentTime(0); }}
              >
                <Monitor className="h-3.5 w-3.5" />
                90s Explainer (16:9)
              </Button>
              <Button
                variant={aspectMode === '9x16' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "text-xs font-bold gap-1.5 h-8",
                  aspectMode === '9x16' ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => { setAspectMode('9x16'); setCurrentTime(0); }}
              >
                <Smartphone className="h-3.5 w-3.5" />
                30s Social Reel (9:16)
              </Button>
            </div>

            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs gap-1.5 h-9 shadow-sm"
              onClick={() => setIsCleanRecordMode(true)}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Clean Screen-Record
            </Button>
          </div>
        </div>
      )}

      {/* Floating Exit Button for Clean Record Mode */}
      {isCleanRecordMode && (
        <button
          onClick={() => setIsCleanRecordMode(false)}
          className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-slate-900/95 hover:bg-black text-white text-xs font-bold border border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-2 cursor-pointer transition hover:scale-105"
        >
          <Minimize2 className="h-4 w-4 text-amber-400" />
          <span>Exit Screen-Record Mode (Esc)</span>
        </button>
      )}

      {/* Main Studio Workspace Grid */}
      <div className={cn("grid gap-6", isCleanRecordMode ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12")}>
        
        {/* Left / Center: Interactive Video Stage Canvas */}
        <div className={cn(isCleanRecordMode ? "col-span-1" : "lg:col-span-8 flex flex-col gap-4")}>
          
          <Card className={cn("overflow-hidden border border-border bg-card shadow-md relative", isCleanRecordMode && "border-none rounded-none shadow-none")}>
            
            {/* The Cinema Video Stage Area */}
            <div className="flex items-center justify-center p-3 sm:p-6 bg-slate-900/90 dark:bg-black/95">
              
              <div 
                className={cn(
                  "relative w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-950 text-white flex flex-col justify-between transition-all duration-300",
                  aspectMode === '16x9' ? "aspect-video max-w-4xl" : "aspect-[9/16] max-w-sm max-h-[82vh]"
                )}
              >
                {/* Subtle Ambient Glows */}
                <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
                <div className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl"></div>

                {/* Top Watermark & Scene Badge */}
                <div className="relative z-20 flex items-center justify-between px-4 pt-3.5">
                  <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    <span className="text-xs font-black tracking-wide text-white">Community Hub</span>
                    <span className="text-[10px] text-slate-300 hidden sm:inline">• my-community-hub.co.uk</span>
                  </div>

                  <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700 text-[10px] font-bold text-amber-400 shadow-sm">
                    Scene {currentScene.id} of {activeScenes.length} • {currentScene.title}
                  </div>
                </div>

                {/* Main Dynamic Scene Stage Rendering */}
                <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                  
                  {/* Custom Uploaded Screenshot Display */}
                  {customScreenshots[currentScene.id] ? (
                    <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                      <div className="relative max-h-full rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={customScreenshots[currentScene.id]} 
                          alt={currentScene.title} 
                          className="object-contain max-h-[50vh] rounded-lg"
                        />
                      </div>
                    </div>
                  ) : (
                    /* High-Contrast Authentic Vector Cards */
                    <div className="w-full h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                      
                      {/* Scene 1: The Hook */}
                      {currentScene.id === 1 && (
                        <div className="space-y-4 max-w-md">
                          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm">
                            <Bell className="h-8 w-8 animate-bounce" />
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight font-headline">
                            Tired of noisy feeds & missed local updates?
                          </h2>
                          <div className="grid grid-cols-2 gap-2.5 text-left text-xs">
                            <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/40 text-slate-100 shadow-sm">
                              <p className="font-black text-[10px] uppercase text-rose-400">Social Media Noise</p>
                              <p className="text-xs text-slate-300 mt-0.5">Scattered groups & spam</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-slate-100 shadow-sm">
                              <p className="font-black text-[10px] uppercase text-emerald-400">Community Hub</p>
                              <p className="text-xs text-slate-300 mt-0.5">One verified digital hub</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Scene 2: 8:00 AM Daily Morning Briefing */}
                      {currentScene.id === 2 && (
                        <div className="w-full max-w-md space-y-3 text-left">
                          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-amber-400" /> 8:00 AM Daily Morning Briefing
                              </span>
                              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">Live Bulletin</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2.5 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center gap-2.5">
                                <Sun className="h-5 w-5 text-amber-400 shrink-0" />
                                <div>
                                  <p className="font-bold text-xs text-white">16°C Sunny</p>
                                  <p className="text-[10px] text-slate-300">Met Office Verified</p>
                                </div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center gap-2.5">
                                <Truck className="h-5 w-5 text-blue-400 shrink-0" />
                                <div>
                                  <p className="font-bold text-xs text-white">A95 Roadworks</p>
                                  <p className="text-[10px] text-slate-300">30-Mile Radar Active</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 leading-snug">
                              <strong>Leader Notice:</strong> Community Council public meeting tonight at 7:00 PM.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Scene 3: Interactive Boundary Map & GPS Locate Me */}
                      {currentScene.id === 3 && (
                        <div className="w-full max-w-md space-y-3">
                          <div className="relative h-44 w-full rounded-xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shadow-lg">
                            {/* Animated SVG GeoJSON Boundary Line */}
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120">
                              <polygon 
                                points="30,20 170,25 185,95 120,110 25,85" 
                                fill="rgba(16, 185, 129, 0.15)" 
                                stroke="#10b981" 
                                strokeWidth="2.5" 
                                strokeDasharray="400" 
                                strokeDashoffset="0"
                              />
                            </svg>
                            {/* Center GPS Pin */}
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="relative">
                                <div className="absolute -inset-2 rounded-full bg-emerald-400/40 animate-ping"></div>
                                <div className="p-2 rounded-full bg-emerald-500 text-white shadow-lg">
                                  <MapPin className="h-5 w-5" />
                                </div>
                              </div>
                              <span className="mt-1.5 text-xs font-bold text-white bg-slate-950/95 px-3 py-0.5 rounded-full border border-slate-700 shadow-md">
                                Welcome to Inverness East
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-emerald-400 font-bold">One-Tap Live Mobile GPS Locate Me & Postcode Search</p>
                        </div>
                      )}

                      {/* Scene 4: Virtual High Street & Local Economy */}
                      {currentScene.id === 4 && (
                        <div className="w-full max-w-md space-y-2.5 text-left">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-md space-y-1">
                              <ShoppingBag className="h-5 w-5 text-amber-400" />
                              <p className="font-bold text-white text-xs">Highland Bakery</p>
                              <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/40">Doorstep Courier</Badge>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-md space-y-1">
                              <Calendar className="h-5 w-5 text-blue-400" />
                              <p className="font-bold text-white text-xs">Farmers Market</p>
                              <Badge className="bg-blue-500/20 text-blue-300 text-[10px] border border-blue-500/40">This Saturday</Badge>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center text-xs text-slate-200">
                            Local Jobs • Community Charities • Neighbour Buy, Swap & Sell
                          </div>
                        </div>
                      )}

                      {/* Scene 5: Civic Voice & Emergency Resilience */}
                      {currentScene.id === 5 && (
                        <div className="w-full max-w-md space-y-2.5 text-left">
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/50 shadow-xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                                <ShieldAlert className="h-4 w-4" /> CEAP Civil Resilience Engine
                              </span>
                              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-bold">Amber Ready</Badge>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200 leading-snug">
                              Volunteer Asset Roster: <strong>4x4 Drivers, Generators & Radio Operators</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between font-medium">
                              <span>Leader Revenue Share</span>
                              <strong className="text-white font-bold">40%+ Reinvested</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Scene 6: Call to Action */}
                      {currentScene.id === 6 && (
                        <div className="space-y-4 max-w-md">
                          <div className="inline-flex p-3 rounded-2xl bg-primary text-primary-foreground font-black text-2xl shadow-xl">
                            CH
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight font-headline">
                            Community Hub
                          </h2>
                          <p className="text-sm text-emerald-400 font-bold uppercase tracking-wider">
                            Your Town, Connected.
                          </p>
                          <div className="inline-block px-5 py-2.5 rounded-xl bg-slate-900 text-amber-300 font-mono text-sm font-bold border border-slate-700 shadow-xl">
                            my-community-hub.co.uk
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* High-Contrast Subtitles Overlay */}
                {showSubtitles && (
                  <div className="relative z-20 px-4 pb-3 flex justify-center">
                    <div className="max-w-2xl bg-black/90 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl shadow-2xl text-center">
                      <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {currentScene.subtitle}
                      </p>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Bottom Timeline & Player Controls Bar */}
            <div className="p-4 bg-card border-t border-border text-foreground flex flex-col gap-3.5">
              
              {/* Timeline Slider with Timestamps */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-foreground w-12 text-right">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={totalDuration}
                  step={0.1}
                  onValueChange={([val]) => handleSeek(val)}
                  className="flex-1 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-foreground w-12">
                  {formatTime(totalDuration)}
                </span>
              </div>

              {/* Main Control Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Play / Pause / Reset */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={togglePlay}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 h-8 px-4 shadow"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    <span>{isPlaying ? 'Pause' : 'Play Preview'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleReset}
                    className="h-8 w-8 text-foreground"
                    title="Restart from beginning"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>

                  {/* Playback Speed */}
                  <Select value={String(playbackSpeed)} onValueChange={(val) => setPlaybackSpeed(Number(val))}>
                    <SelectTrigger className="h-8 w-18 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1.0x</SelectItem>
                      <SelectItem value="1.25">1.25x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scene Jump Pills */}
                <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-md py-1">
                  {activeScenes.map((scene) => (
                    <Button
                      key={scene.id}
                      variant={currentScene.id === scene.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSeek(scene.start)}
                      className={cn(
                        "h-7 px-2.5 text-xs font-bold rounded-lg transition",
                        currentScene.id === scene.id 
                          ? "bg-primary text-primary-foreground shadow" 
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      Scene {scene.id}
                    </Button>
                  ))}
                </div>

                {/* Subtitles & Volume */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={showSubtitles ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowSubtitles(!showSubtitles)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <Subtitles className="h-3.5 w-3.5" />
                    Subtitles: {showSubtitles ? 'ON' : 'OFF'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMuted(!isMuted)}
                    className="h-8 w-8 text-foreground"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>

              </div>

            </div>

          </Card>

        </div>

        {/* Right Column: Audio Hub Integration & Scene Controls */}
        {!isCleanRecordMode && (
          <div className="lg:col-span-4 flex flex-col gap-5">
            
            {/* Audio Hub Voice Engine Card */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <Mic className="h-4 w-4 text-primary" />
                    Audio Hub Voice Engine
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary">Live TTS</Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Generate narrative speech using the high-quality voices from your Audio Hub.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Voice Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Select Voice Character</label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="w-full text-xs text-foreground bg-background">
                      <SelectValue placeholder="Select Audio Hub voice..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIO_HUB_VOICES.map(voice => (
                        <SelectItem key={voice.value} value={voice.value} className="text-xs text-foreground">
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Generate AI Voice Button */}
                <Button
                  onClick={handleGenerateVoiceover}
                  disabled={isGeneratingVoice}
                  className="w-full font-bold text-xs gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow"
                >
                  {isGeneratingVoice ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Voice-Over...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate Voice-Over with {selectedVoice}</span>
                    </>
                  )}
                </Button>

                {/* Choose Pre-existing Audio Tour from Audio Hub */}
                {availableAudioTours.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Music className="h-3.5 w-3.5 text-primary" />
                      Or Pick Existing Audio Hub Track
                    </label>
                    <Select 
                      value={selectedTourId} 
                      onValueChange={(id) => {
                        setSelectedTourId(id);
                        const tour = availableAudioTours.find(t => t.id === id);
                        if (tour?.audioUrl) {
                          setAudioUrl(tour.audioUrl);
                          if (audioRef.current) audioRef.current.src = tour.audioUrl;
                          toast({ title: "Track Loaded", description: `Attached "${tour.title}" to Video Studio.` });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full text-xs text-foreground bg-background">
                        <SelectValue placeholder="Choose an audio tour..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None (Use timeline) --</SelectItem>
                        {availableAudioTours.map(t => (
                          <SelectItem key={t.id} value={t.id} className="text-xs text-foreground truncate">
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Manual Audio File Upload */}
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Load Local MP3 / WAV
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>

              </CardContent>
            </Card>

            {/* Scene Script & Screenshot Customizer */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <FileText className="h-4 w-4 text-amber-500" />
                  Scene {currentScene.id} Inspector
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Review the exact script and replace mockups with real logged-in screenshots.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5">
                
                {/* Voice-Over Text */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Voice-Over Script</span>
                  <p className="text-xs bg-muted p-3 rounded-lg border border-border leading-relaxed text-foreground font-medium italic">
                    &quot;{currentScene.voiceOver}&quot;
                  </p>
                </div>

                {/* On-Screen Text */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">On-Screen Caption</span>
                  <div className="text-xs bg-muted/60 p-2.5 rounded-lg border border-border font-semibold text-foreground">
                    {currentScene.onScreenText}
                  </div>
                </div>

                {/* Custom Screenshot Slot */}
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Scene {currentScene.id} Custom Screenshot</span>
                    {customScreenshots[currentScene.id] && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Attached</span>
                    )}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleScreenshotUpload(currentScene.id, e)}
                    className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                  {customScreenshots[currentScene.id] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomScreenshots(prev => {
                        const copy = { ...prev };
                        delete copy[currentScene.id];
                        return copy;
                      })}
                      className="text-[10px] h-6 text-destructive hover:bg-destructive/10 px-2 font-bold"
                    >
                      Clear custom image (Revert to UI card)
                    </Button>
                  )}
                </div>

              </CardContent>
            </Card>

          </div>
        )}

      </div>

    </div>
  );
}
