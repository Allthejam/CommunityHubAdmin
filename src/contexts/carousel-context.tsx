
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

// --- Default Data ---
const initialNodes = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    title: `Node ${i + 1}`,
    desc: 'Interactive data point.',
    img: `https://picsum.photos/seed/${i + 50}/400/300`,
  }));
};

interface CarouselNode {
  title: string;
  desc: string;
  img: string;
}

interface CarouselConfig {
  title: string;
  subtitle: string;
  radius: number;
  speed: number;
  pivot: number;
  zoom: number;
  wobble: number;
  isDouble: boolean;
  gap: number;
  neonColor: string;
  bgColor: string;
  nodes: CarouselNode[];
  currentFX: string;
  bgImg: string;
  isRandomized: boolean;
}

interface CarouselContextType {
  config: CarouselConfig;
  updateConfig: (key: keyof CarouselConfig, value: any) => void;
  applyTheme: (neon: string, bg: string, fx?: string, bgImg?: string) => void;
  resizeNodes: (count: number) => void;
  shuffleNodes: () => void;
  updateNodeContent: (index: number, key: 'title' | 'desc' | 'img', value: string) => void;
  setNodes: (nodes: Omit<CarouselNode, 'img'>[]) => void;
  isBoardOpen: boolean;
  setBoardOpen: (isOpen: boolean) => void;
}

const CarouselContext = createContext<CarouselContextType | undefined>(undefined);

const defaultConfig: CarouselConfig = {
  title: 'Interactive Content Carousel',
  subtitle: 'Explore and customize the 3D carousel below.',
  radius: 350,
  speed: -0.1,
  pivot: -9,
  zoom: 0,
  wobble: 4,
  isDouble: false,
  gap: 380,
  neonColor: '#00f2ff',
  bgColor: '#020617',
  nodes: initialNodes(30),
  currentFX: 'none',
  bgImg: 'none',
  isRandomized: false,
};

export const CarouselProvider = ({ children }: { children: ReactNode }) => {
  const [isBoardOpen, setBoardOpen] = useState(false);
  const [config, setConfig] = useState<CarouselConfig>(defaultConfig);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('carouselConfig');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        // We don't want to persist the node count/content, just the settings
        setConfig(prev => ({
            ...prev,
            ...parsedConfig,
            nodes: initialNodes(parsedConfig.nodes?.length || 30),
        }));
      }
    } catch (error) {
      console.error("Failed to load config from localStorage", error);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
        try {
            const configToSave = { ...config };
            // Avoid storing large node array if it's the default
            if (configToSave.nodes.length === initialNodes(configToSave.nodes.length).length) {
               // Only save length, not the full array if it can be regenerated.
               // This is a simple way to reduce localStorage usage.
            }
            localStorage.setItem('carouselConfig', JSON.stringify(configToSave));
        } catch (error) {
            console.error("Failed to save config to localStorage", error);
        }
    }
  }, [config, isInitialized]);


  const updateConfig = useCallback((key: keyof CarouselConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyTheme = useCallback((neon: string, bg: string, fx = 'none', bgImg = 'none') => {
    setConfig(prev => ({
      ...prev,
      neonColor: neon,
      bgColor: bg,
      currentFX: fx,
      bgImg: bgImg,
    }));
  }, []);

  const resizeNodes = useCallback((count: number) => {
    setConfig(prev => ({
      ...prev,
      nodes: initialNodes(count),
    }));
  }, []);

  const setNodes = useCallback((nodes: Omit<CarouselNode, 'img'>[]) => {
    const newNodes = nodes.map((node, i) => ({
      ...node,
      img: `https://picsum.photos/seed/${node.title.replace(/\s/g, '')}${i}/400/300`,
    }));
    setConfig(prev => ({ ...prev, nodes: newNodes }));
  }, []);

  const shuffleNodes = useCallback(() => {
    setConfig(prev => {
        const shuffledNodes = [...prev.nodes].sort(() => Math.random() - 0.5);
        return { ...prev, nodes: shuffledNodes };
    });
  }, []);

  const updateNodeContent = useCallback((index: number, key: 'title' | 'desc' | 'img', value: string) => {
    setConfig(prev => {
      const newNodes = [...prev.nodes];
      if (newNodes[index]) {
        newNodes[index] = { ...newNodes[index], [key]: value };
      }
      return { ...prev, nodes: newNodes };
    });
  }, []);

  return (
    <CarouselContext.Provider value={{
      config,
      updateConfig,
      applyTheme,
      resizeNodes,
      shuffleNodes,
      updateNodeContent,
      setNodes,
      isBoardOpen,
      setBoardOpen,
    }}>
      {children}
    </CarouselContext.Provider>
  );
};

export const useCarouselConfig = () => {
  const context = useContext(CarouselContext);
  if (context === undefined) {
    throw new Error('useCarouselConfig must be used within a CarouselProvider');
  }
  return context;
};

    