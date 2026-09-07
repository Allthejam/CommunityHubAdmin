
'use client';

import { useEffect, useRef, useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCarouselConfig } from '@/contexts/carousel-context';
import { generateCarouselTheme } from '@/lib/actions/carouselActions';
import { Loader2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const themes = [
  { name: 'Cyber Blue', neon: '#00f2ff', bg: '#020617' },
  { name: 'Plasma Red', neon: '#ff0055', bg: '#1a0005' },
  { name: 'Emerald', neon: '#00ff88', bg: '#001a0d' },
  { name: 'Electric Gold', neon: '#ffcc00', bg: '#1a1500' },
  { name: 'Void Violet', neon: '#cc00ff', bg: '#0d001a' },
  { name: 'Snow White', neon: '#ffffff', bg: '#111111' },
];

const specialThemes = [
  {
    name: 'Christmas Snow',
    neon: '#ff0000',
    bg: '#051a05',
    fx: 'snow',
    bgImg: 'url(https://images.unsplash.com/photo-1483354483454-4cd359948902?auto=format&fit=crop&w=1920&q=80)',
  },
  {
    name: 'Summer Beach',
    neon: '#ffcc00',
    bg: '#004466',
    fx: 'summer',
    bgImg: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80)',
  },
  { name: 'Halloween Spook', neon: '#ff6600', bg: '#0a000a', fx: 'halloween' },
];

const aiInitialState = {
    nodes: undefined,
    colors: undefined,
    error: undefined,
    success: false,
};
  
function AIGenerateButton() {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate
      </Button>
    );
}

interface InteractiveCarouselProps {
    showControls?: boolean;
    containerHeight?: string;
}

export function InteractiveCarousel({ showControls = true, containerHeight = 'calc(100vh - 210px)' }: InteractiveCarouselProps) {
  const { 
    config,
    updateConfig,
    applyTheme,
    resizeNodes,
    shuffleNodes,
    updateNodeContent,
    setNodes,
    isBoardOpen,
    setBoardOpen
  } = useCarouselConfig();

  const [selectedPanel, setSelectedPanel] = useState<number | null>(null);
  const rotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const timeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const lastRotationForShuffle = useRef(0);

  const [aiState, formAction] = useActionState(generateCarouselTheme, aiInitialState);
  const aiFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (aiState.success && aiState.nodes && aiState.colors) {
      setNodes(aiState.nodes);
      applyTheme(aiState.colors.neon, aiState.colors.bg);
      aiFormRef.current?.reset();
    }
  }, [aiState, setNodes, applyTheme]);
  
  const handleUpdate = (key: keyof typeof config, val: any) => {
      const parsedVal = (typeof val === 'string' && !isNaN(parseFloat(val)) && val !== '' && !val.startsWith('#')) ? parseFloat(val) : val;
      updateConfig(key, parsedVal);
  };

  const handlePanelClick = (index: number) => {
    if (selectedPanel === index) {
      setSelectedPanel(null); // Deselect if clicking the same panel
    } else {
      setSelectedPanel(index);
      const angle = (index / config.nodes.length) * 360;
      targetRotationRef.current = -angle;
    }
  };
  
  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      timeRef.current += 0.02;
      
      if (selectedPanel === null) {
        if (!isDraggingRef.current) {
          targetRotationRef.current += config.speed;
        }

        // Shuffle logic - only runs when not focused on a panel
        if (config.isRandomized) {
          const rotationCycle = Math.floor(Math.abs(rotationRef.current / 360));
          if (rotationCycle !== lastRotationForShuffle.current) {
            shuffleNodes();
            lastRotationForShuffle.current = rotationCycle;
          }
        }
      }

      // Smooth rotation towards target
      const currentRotation = rotationRef.current;
      const targetRotation = targetRotationRef.current;
      const difference = targetRotation - currentRotation;
      
      // Normalize difference to be between -180 and 180
      const normalizedDiff = (difference + 180) % 360 - 180;

      if (Math.abs(normalizedDiff) > 0.01) {
          rotationRef.current += normalizedDiff * 0.1; // Easing
      } else {
          rotationRef.current = targetRotation;
      }


      if (anchorRef.current) {
        anchorRef.current.style.transform = `translateZ(${config.zoom}px)`;
      }

      if (carouselRef.current) {
        carouselRef.current.style.transform = `rotateX(${config.pivot}deg) rotateY(${rotationRef.current}deg)`;
        
        Array.from(carouselRef.current.children).forEach((p, i) => {
          const panel = p as HTMLElement;
          const angle = parseFloat(panel.dataset.angle || '0');
          const yOffset = parseFloat(panel.dataset.y || '0');
          const floatY = Math.sin(timeRef.current + i * 0.5) * (config.wobble * 5);
          panel.style.transform = `rotateY(${angle}deg) translateZ(${config.radius}px) translateY(${yOffset + floatY}px)`;
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [config, selectedPanel, shuffleNodes]);

  // Event handlers
  useEffect(() => {
    const sceneEl = sceneRef.current;
    if (!sceneEl) return;

    const handleInteractionStart = (x: number, event: MouseEvent | TouchEvent) => {
        const target = event.target as HTMLElement;

        // Do not do anything if clicking inside control board
        if (showControls && target.closest('.control-board')) {
          return;
        }
      
        // If a panel is selected, clicking anywhere outside another panel will deselect it
        if (selectedPanel !== null && !target.closest('.panel-clickable-area[data-is-selected="false"]')) {
            setSelectedPanel(null);
            isDraggingRef.current = false;
            return;
        }

        // If clicking a clickable panel area, let the panel's own click handler deal with it.
        if (target.closest('.panel-clickable-area')) {
            isDraggingRef.current = false;
            return;
        }
        
        // Otherwise, start dragging
        setSelectedPanel(null);
        isDraggingRef.current = true;
        lastXRef.current = x;
    };
    
    const handleInteractionMove = (x: number) => {
        if (!isDraggingRef.current) return;
        const dx = x - lastXRef.current;
        targetRotationRef.current += dx * 0.4;
        lastXRef.current = x;
    };

    const handleInteractionEnd = () => {
        isDraggingRef.current = false;
    };

    const handleMouseDown = (e: MouseEvent) => handleInteractionStart(e.pageX, e);
    const handleMouseMove = (e: MouseEvent) => handleInteractionMove(e.pageX);
    
    const handleTouchStart = (e: TouchEvent) => handleInteractionStart(e.touches[0].pageX, e);
    const handleTouchMove = (e: TouchEvent) => handleInteractionMove(e.touches[0].pageX);

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const newZoom = config.zoom - e.deltaY;
        const minZoom = -2000;
        const maxZoom = 1000;
        const clampedZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
        updateConfig('zoom', clampedZoom);
    };

    sceneEl.addEventListener('mousedown', handleMouseDown);
    sceneEl.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleInteractionEnd);
    
    sceneEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    sceneEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleInteractionEnd);

    sceneEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
        sceneEl.removeEventListener('mousedown', handleMouseDown);
        sceneEl.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleInteractionEnd);
        sceneEl.removeEventListener('touchstart', handleTouchStart);
        sceneEl.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleInteractionEnd);
        sceneEl.removeEventListener('wheel', handleWheel);
    };
  }, [showControls, updateConfig, selectedPanel, config.zoom]);

  const panels = [];
  config.nodes.forEach((node, i) => {
    const angle = (i / config.nodes.length) * 360;
    panels.push({
      key: `panel-${i}-top`,
      node,
      'data-angle': angle,
      'data-y': 0,
      'data-index': i,
    });
    if (config.isDouble) {
      panels.push({
        key: `panel-${i}-bottom`,
        node,
        'data-angle': angle,
        'data-y': -config.gap,
        'data-index': i,
      });
    }
  });

  const { neonColor, bgColor, bgImg } = config;
  const hex = neonColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  const perspective = '1200px';

  return (
    <>
      <style jsx global>{`
        :root {
            --neon-blue: ${neonColor};
            --deep-space: ${bgColor};
            --neon-rgb: ${r}, ${g}, ${b};
            --bg-image: ${bgImg};
            --panel-bg: rgba(var(--neon-rgb), 0.05);
            --panel-border: rgba(var(--neon-rgb), 0.3);
            --admin-bg: rgba(15, 23, 42, 0.98);
            --panel-blur: 12px;
            --panel-opacity: 0.1;
            --flicker: 1;
        }
      `}</style>
      <div 
        className="relative w-full overflow-hidden"
        style={{
            height: containerHeight,
            background: `var(--bg-image), radial-gradient(circle at center, rgba(var(--neon-rgb), calc(0.15 * var(--flicker))) 0%, var(--deep-space) 70%)`,
            backgroundColor: 'var(--deep-space)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'white',
            transition: 'background 0.8s ease-in-out',
        }}
      >
        {config.currentFX === 'snow' && (
            <div className="snow-container">
                {Array.from({ length: 150 }).map((_, i) => (
                    <div 
                        key={i} 
                        className="snowflake" 
                        style={{
                            left: `${Math.random() * 100}%`,
                            width: `${Math.random() * 3 + 1}px`,
                            height: `${Math.random() * 3 + 1}px`,
                            animationDuration: `${Math.random() * 5 + 5}s`,
                            animationDelay: `${Math.random() * 5}s`,
                        }}
                    />
                ))}
            </div>
        )}
        {showControls && (
            <>
                <Button className="btn-toggle-main" onClick={() => setBoardOpen(!isBoardOpen)} style={{'--neon-blue': neonColor, '--deep-space': bgColor, '--neon-rgb': `${r}, ${g}, ${b}`} as React.CSSProperties}>
                    {isBoardOpen ? 'Close' : 'Controls'}
                </Button>

                <div className={`control-board ${isBoardOpen ? 'open' : ''}`} style={{'--panel-border': 'rgba(var(--neon-rgb), 0.3)', '--admin-bg': 'rgba(15, 23, 42, 0.98)'} as React.CSSProperties}>
                    <div className="p-6 pb-2">
                        <h2 className="text-xl font-black uppercase tracking-tighter">Engine Master</h2>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest">Global Dashboard</p>
                    </div>
                    <Tabs defaultValue="settings" className="flex flex-1 flex-col min-h-0">
                        <TabsList className="bg-transparent justify-around rounded-none border-b border-white/10 shrink-0">
                            <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-b-cyan-400 data-[state=active]:text-cyan-400 rounded-none flex-1">Settings</TabsTrigger>
                            <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-b-cyan-400 data-[state=active]:text-cyan-400 rounded-none flex-1">Content</TabsTrigger>
                            <TabsTrigger value="themes" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-b-cyan-400 data-[state=active]:text-cyan-400 rounded-none flex-1">Themes</TabsTrigger>
                            <TabsTrigger value="ai" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-b-cyan-400 data-[state=active]:text-cyan-400 rounded-none flex-1">AI Gen</TabsTrigger>
                        </TabsList>
                        
                        <div className="flex-1 overflow-y-auto p-6">
                            <TabsContent value="settings">
                                <div className="section-header">Header Content</div>
                                <div className="admin-card space-y-3">
                                    <div>
                                        <Label className="field-label" htmlFor="header-title">Title</Label>
                                        <Input id="header-title" type="text" value={config.title} onChange={(e) => handleUpdate('title', e.target.value)} className="bg-slate-900/50 border-slate-700 text-white" />
                                    </div>
                                    <div>
                                        <Label className="field-label" htmlFor="header-subtitle">Subtitle</Label>
                                        <Input id="header-subtitle" type="text" value={config.subtitle} onChange={(e) => handleUpdate('subtitle', e.target.value)} className="bg-slate-900/50 border-slate-700 text-white" />
                                    </div>
                                </div>
                                <div className="section-header">Visual Engine</div>
                                <div className="admin-card grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="neonPicker" className="field-label">Accent</Label>
                                        <Input id="neonPicker" type="color" value={config.neonColor} onChange={(e) => handleUpdate('neonColor', e.target.value)} className="w-full h-8 bg-transparent cursor-pointer p-0" />
                                    </div>
                                    <div>
                                        <Label htmlFor="bgPicker" className="field-label">Background</Label>
                                        <Input id="bgPicker" type="color" value={config.bgColor} onChange={(e) => handleUpdate('bgColor', e.target.value)} className="w-full h-8 bg-transparent cursor-pointer p-0"/>
                                    </div>
                                </div>
                                <div className="section-header">Motion Physics</div>
                                <div className="admin-card space-y-4">
                                    <div>
                                        <div className="flex justify-between"><Label className="field-label">Spin Speed</Label><span className="badge">{config.speed}</span></div>
                                        <Input type="range" min="-2" max="2" step="0.05" value={config.speed} onInput={(e) => handleUpdate('speed', e.currentTarget.value)} />
                                    </div>
                                    <div>
                                        <div className="flex justify-between"><Label className="field-label">Vertical Wobble</Label><span className="badge">{config.wobble}</span></div>
                                        <Input type="range" min="0" max="20" value={config.wobble} onInput={(e) => handleUpdate('wobble', e.currentTarget.value)} />
                                    </div>
                                </div>

                                <div className="section-header">3D Geometry</div>
                                <div className="admin-card space-y-4">
                                    <div>
                                        <div className="flex justify-between"><Label className="field-label">Carousel Radius</Label><span className="badge">{config.radius}px</span></div>
                                        <Input type="range" min="150" max="1000" value={config.radius} onInput={(e) => handleUpdate('radius', e.currentTarget.value)} />
                                    </div>
                                    <div>
                                        <div className="flex justify-between"><Label className="field-label">View Distance (Zoom)</Label><span className="badge">{config.zoom}px</span></div>
                                        <Input type="range" min="-2000" max="1000" value={config.zoom} onInput={(e) => handleUpdate('zoom', e.currentTarget.value)} />
                                    </div>
                                    <div>
                                        <div className="flex justify-between"><Label className="field-label">Camera Tilt</Label><span className="badge">{config.pivot}°</span></div>
                                        <Input type="range" min="-45" max="45" value={config.pivot} onInput={(e) => handleUpdate('pivot', e.currentTarget.value)} />
                                    </div>
                                </div>

                                <div className="section-header">Display Density</div>
                                <div className="admin-card space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="field-label" htmlFor="doubleTier">Double Tier Mode</Label>
                                        <Switch id="doubleTier" checked={config.isDouble} onCheckedChange={(checked) => handleUpdate('isDouble', checked)} />
                                    </div>
                                    <div>
                                        <div className="flex justify-between"><Label className="field-label">Tier Gap</Label><span className="badge">{config.gap}px</span></div>
                                        <Input type="range" min="100" max="600" value={config.gap} disabled={!config.isDouble} onInput={(e) => handleUpdate('gap', e.currentTarget.value)} />
                                    </div>
                                    <div>
                                        <Label className="field-label" htmlFor="node-count">Node Count</Label>
                                        <Select onValueChange={(value) => resizeNodes(Number(value))} defaultValue={String(config.nodes.length)}>
                                            <SelectTrigger id="node-count">
                                                <SelectValue placeholder="Select count" />
                                            </SelectTrigger>
                                            <SelectContent className="z-[999] border-[1px] border-[var(--panel-border)] bg-[var(--admin-bg)] text-white" style={{'--panel-border': 'rgba(var(--neon-rgb), 0.3)', '--admin-bg': 'rgba(15, 23, 42, 0.98)'} as React.CSSProperties}>
                                                <SelectItem value="8">8 Nodes</SelectItem>
                                                <SelectItem value="10">10 Nodes</SelectItem>
                                                <SelectItem value="12">12 Nodes</SelectItem>
                                                <SelectItem value="14">14 Nodes</SelectItem>
                                                <SelectItem value="16">16 Nodes</SelectItem>
                                                <SelectItem value="18">18 Nodes</SelectItem>
                                                <SelectItem value="20">20 Nodes</SelectItem>
                                                <SelectItem value="30">30 Nodes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="field-label" htmlFor="randomize-nodes">Randomize Content</Label>
                                        <Switch id="randomize-nodes" checked={config.isRandomized} onCheckedChange={(checked) => handleUpdate('isRandomized', checked)} />
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="content">
                                <div className="section-header">Node Content Editor</div>
                                <div className="space-y-4">
                                    {config.nodes.map((node, i) => (
                                    <div key={i} className="admin-card space-y-3">
                                        <div className="text-xs font-bold text-cyan-400 uppercase">Node {i + 1}</div>
                                        <div>
                                        <Label className="field-label" htmlFor={`title-${i}`}>Title</Label>
                                        <Input id={`title-${i}`} type="text" value={node.title} onChange={(e) => updateNodeContent(i, 'title', e.target.value)} className="bg-slate-900/50 border-slate-700 text-white" />
                                        </div>
                                        <div>
                                        <Label className="field-label" htmlFor={`img-${i}`}>Image URL</Label>
                                        <Input id={`img-${i}`} type="text" value={node.img} onChange={(e) => updateNodeContent(i, 'img', e.target.value)} className="bg-slate-900/50 border-slate-700 text-white" />
                                        </div>
                                        <div>
                                        <Label className="field-label" htmlFor={`desc-${i}`}>Description</Label>
                                        <Textarea id={`desc-${i}`} value={node.desc} onChange={(e) => updateNodeContent(i, 'desc', e.target.value)} className="bg-slate-900/50 border-slate-700 text-white" />
                                        </div>
                                    </div>
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="themes">
                                <div className="section-header">System Presets</div>
                                <div className="theme-grid mb-6">
                                    {themes.map(t => (
                                    <div key={t.name} className="theme-swatch" style={{ background: t.bg, color: t.neon, borderColor: `${t.neon}44`}} onClick={() => applyTheme(t.neon, t.bg)}>
                                        {t.name}
                                    </div>
                                    ))}
                                </div>
                                <div className="section-header">Specialty FX Themes</div>
                                <div className="theme-grid">
                                    {specialThemes.map(t => {
                                    let icon = t.fx === 'halloween' ? '🎃' : t.fx === 'snow' ? '🏔️' : '🏝️';
                                    return (
                                        <div key={t.name} className="theme-swatch special" style={{ background: t.bg, color: t.neon, borderColor: t.neon}} onClick={() => applyTheme(t.neon, t.bg, t.fx, t.bgImg)}>
                                            {icon} {t.name}
                                        </div>
                                    )
                                    })}
                                </div>
                            </TabsContent>
                            <TabsContent value="ai">
                                <div className="section-header">AI Content Generator</div>
                                <p className="text-xs text-muted-foreground mb-4">Describe a topic, and the AI will generate new card content and a matching color scheme.</p>
                                <form ref={aiFormRef} action={formAction} className="space-y-4">
                                    <div className="admin-card space-y-3">
                                        <div>
                                            <Label className="field-label" htmlFor="ai-theme">Content</Label>
                                            <Input name="theme" id="ai-theme" type="text" placeholder="e.g., Ancient Rome, Space Exploration..." className="bg-slate-900/50 border-slate-700" />
                                            <input type="hidden" name="nodeCount" value={config.nodes.length} />
                                        </div>
                                        <AIGenerateButton />
                                    </div>
                                </form>
                                {aiState.error && (
                                    <Alert variant="destructive" className="mt-4">
                                        <AlertTitle>Generation Error</AlertTitle>
                                        <AlertDescription>{aiState.error}</AlertDescription>
                                    </Alert>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </>
        )}
        
        <div ref={sceneRef} className="scene" style={{ perspective }}>
          <div className="carousel-anchor" ref={anchorRef}>
            <div className="carousel" ref={carouselRef}>
              {panels.map(panel => (
                  <div 
                      key={panel.key} 
                      className="panel" 
                      data-angle={panel['data-angle']} 
                      data-y={panel['data-y']}
                      style={{'--panel-opacity': 0.1, '--panel-blur': '12px', '--neon-rgb': `${r}, ${g}, ${b}`, '--panel-border': `rgba(${r}, ${g}, ${b}, 0.3)`} as React.CSSProperties}
                  >
                      <div 
                        className="panel-clickable-area" 
                        onClick={() => handlePanelClick(panel['data-index'])}
                        data-is-selected={selectedPanel === panel['data-index']}
                      >
                        <img src={panel.node.img} className="panel-image" alt={panel.node.title} style={{'--panel-border': `rgba(${r}, ${g}, ${b}, 0.3)`} as React.CSSProperties}/>
                        <div className="panel-body">
                            <div className="panel-title" style={{color: neonColor, textShadow: `0 0 10px rgba(${r},${g},${b},0.5)`}}>{panel.node.title}</div>
                            <p className="panel-desc">{panel.node.desc}</p>
                        </div>
                      </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .scene {
            width: 100%;
            height: 100%;
            perspective: ${perspective}; 
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
            transition: transform 0.5s ease;
        }
        .scene:active {
          cursor: grabbing;
        }

        .carousel-anchor {
            transform-style: preserve-3d;
            transition: transform 0.1s linear;
        }

        .carousel {
            position: relative;
            transform-style: preserve-3d;
        }

        .panel {
            position: absolute;
            width: 260px;
            height: 360px;
            left: -130px;
            top: -180px;
            background: rgba(var(--neon-rgb), var(--panel-opacity));
            border: 1px solid var(--panel-border);
            backdrop-filter: blur(var(--panel-blur));
            border-radius: 16px; backface-visibility: visible;
            transition: opacity 0.5s ease, background 0.3s ease, border-color 0.3s ease;
            box-shadow: 0 0 30px rgba(var(--neon-rgb), 0.1);
        }

        .panel-clickable-area {
            cursor: pointer;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            border-radius: 16px; /* Match panel's border-radius */
            overflow: hidden; /* Ensure content stays within rounded corners */
            position: relative;
        }

        .panel-image { 
            width: 100%; 
            height: 160px; 
            object-fit: cover; 
            border-bottom: 1px solid var(--panel-border);
            position: relative;
            z-index: 2;
        }
        .panel-body { 
            padding: 20px; 
            text-align: center; 
            position: relative;
            z-index: 2;
            background: rgba(0,0,0, 0.4);
            width: 100%;
            flex-grow: 1;
        }
        .panel-title { font-size: 1rem; font-weight: bold; text-transform: uppercase; }
        .panel-desc { font-size: 0.75rem; opacity: 0.7; margin-top: 8px; }

        .control-board {
            position: fixed; top: 0; right: -420px; width: 400px; height: 100vh;
            background: var(--admin-bg); border-left: 1px solid var(--panel-border);
            transition: right 0.4s cubic-bezier(0.19, 1, 0.22, 1);
            z-index: 600; display: flex; flex-direction: column;
            backdrop-filter: blur(25px); box-shadow: -10px 0 30px rgba(0,0,0,0.5);
            color: white;
        }

        .control-board.open {
            right: 0;
        }

        .btn-toggle-main {
            position: fixed; right: 20px; top: 80px; z-index: 610;
            background: var(--neon-blue); color: var(--deep-space);
            padding: 12px 24px; border-radius: 8px; font-weight: 900;
            cursor: pointer; box-shadow: 0 0 20px rgba(var(--neon-rgb), 0.4);
            text-transform: uppercase; font-size: 0.8rem; border: none;
        }

        .section-header { font-size: 0.65rem; color: var(--neon-blue); font-weight: 900; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid rgba(var(--neon-rgb),0.2); padding-bottom: 5px; margin: 1.2rem 0 0.8rem 0; }
        .admin-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; }
        .badge { font-family: monospace; font-size: 0.7rem; color: var(--neon-blue); background: rgba(var(--neon-rgb),0.1); padding: 2px 6px; border-radius: 3px; }
        .field-label { font-size: 0.7rem; text-transform: uppercase; opacity: 0.7; margin-bottom: 4px; display: block; }
        
        .theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .theme-swatch { 
            cursor: pointer; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
            text-align: center; font-size: 0.65rem; font-weight: bold; text-transform: uppercase;
            transition: all 0.2s;
        }
        .theme-swatch:hover { transform: translateY(-2px); border-color: white; }
        .theme-swatch.special { border-style: dashed; border-width: 2px; }

        input[type="range"] { accent-color: var(--neon-blue); }

        .snow-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 500;
        }

        .snowflake {
            position: absolute;
            top: -10px;
            background: white;
            border-radius: 50%;
            opacity: 0.8;
            animation: fall linear infinite;
        }

        @keyframes fall {
            to {
                transform: translateY(100vh);
                opacity: 0;
            }
        }
        
        @media (max-width: 768px) {
          .panel {
            width: 180px;
            height: 250px;
            left: -90px;
            top: -125px;
          }
          .panel-image {
            height: 100px;
          }
          .panel-body {
            padding: 15px;
          }
          .panel-title {
            font-size: 0.8rem;
          }
          .panel-desc {
            font-size: 0.65rem;
          }
          .control-board {
            width: 100%;
            right: -100%;
            border-left: none;
          }
          .control-board.open {
            right: 0;
          }
          .btn-toggle-main {
            font-size: 0.7rem;
            padding: 8px 16px;
            right: 10px;
            top: 70px;
          }
        }

      `}</style>
    </>
  );
}
