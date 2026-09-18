'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Ruler,
  Box,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  Download,
  Share2,
  Eye,
  Compass,
  Layers,
  Sparkles,
  Move,
  RotateCw,
  Play,
  Glasses,
  CheckCircle2,
  Award,
  Maximize,
  Grid,
} from 'lucide-react';

export interface TabbedMediaViewerProps {
  images?: string[];
  title?: string;
  price?: string | number;
  floorPlanUrl?: string;
  virtualTourUrl?: string;
  verified?: boolean;
}

// Categories supported for filtering in the OLED Lightbox
export const ROOM_CATEGORIES = [
  'All',
  'Exterior',
  'Living Room',
  'Kitchen',
  'Master Suite',
  'Views',
] as const;

export type RoomCategory = (typeof ROOM_CATEGORIES)[number];

interface MediaItem {
  url: string;
  category: Exclude<RoomCategory, 'All'>;
  label: string;
}

// Fallback high-res luxury architectural images
const DEFAULT_LUXURY_MEDIA: MediaItem[] = [
  {
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1800&auto=format&fit=crop&q=85',
    category: 'Exterior',
    label: 'Grand Facade & Private Motor Court',
  },
  {
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1800&auto=format&fit=crop&q=85',
    category: 'Living Room',
    label: "Grand Living Salon with 12' Coffered Ceilings",
  },
  {
    url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1800&auto=format&fit=crop&q=85',
    category: 'Kitchen',
    label: "Chef's Culinary Kitchen with Calacatta Gold Marble",
  },
  {
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1800&auto=format&fit=crop&q=85',
    category: 'Master Suite',
    label: 'Primary Sanctuary with Floor-to-Ceiling Glazing',
  },
  {
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1800&auto=format&fit=crop&q=85',
    category: 'Views',
    label: 'Panoramic Sunset Horizon & City Skyline Vistas',
  },
  {
    url: 'https://images.unsplash.com/photo-1613490908836-e05e54d6d654?w=1800&auto=format&fit=crop&q=85',
    category: 'Exterior',
    label: 'Private Infinity Pool & Resort Terrace',
  },
  {
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1800&auto=format&fit=crop&q=85',
    category: 'Living Room',
    label: 'Formal Dining Salon & Integrated Wine Display',
  },
  {
    url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1800&auto=format&fit=crop&q=85',
    category: 'Views',
    label: 'Wrap-Around Sky Deck with Floating Fire Lounge',
  },
];

const CATEGORY_CYCLE: Exclude<RoomCategory, 'All'>[] = [
  'Exterior',
  'Living Room',
  'Kitchen',
  'Master Suite',
  'Views',
  'Living Room',
  'Master Suite',
  'Exterior',
];

export default function TabbedMediaViewer({
  images,
  title = 'Luxury Modern Residence',
  price,
  floorPlanUrl,
  virtualTourUrl,
  verified = true,
}: TabbedMediaViewerProps) {
  const [activeTab, setActiveTab] = useState<'photos' | 'floorplan' | 'virtualtour'>('photos');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxCategory, setLightboxCategory] = useState<RoomCategory>('All');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(false);
  const [floorPlanZoom, setFloorPlanZoom] = useState(false);
  const [is3DWalkthroughOpen, setIs3DWalkthroughOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Format price if provided
  const formattedPrice = useMemo(() => {
    if (!price) return null;
    if (typeof price === 'number') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(price);
    }
    return price;
  }, [price]);

  // Construct processed media list with category metadata
  const mediaList: MediaItem[] = useMemo(() => {
    if (images && images.length > 0) {
      return images.map((url, idx) => ({
        url,
        category: CATEGORY_CYCLE[idx % CATEGORY_CYCLE.length],
        label: `${CATEGORY_CYCLE[idx % CATEGORY_CYCLE.length]} • Angle ${idx + 1}`,
      }));
    }
    return DEFAULT_LUXURY_MEDIA;
  }, [images]);

  // Filtered media for the Lightbox
  const lightboxMediaList = useMemo(() => {
    if (lightboxCategory === 'All') return mediaList;
    return mediaList.filter((item) => item.category === lightboxCategory);
  }, [mediaList, lightboxCategory]);

  // Handle previous & next for Photos Hero
  const handlePrevPhoto = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
    },
    [mediaList.length]
  );

  const handleNextPhoto = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev === mediaList.length - 1 ? 0 : prev + 1));
    },
    [mediaList.length]
  );

  // Open Lightbox at current photo
  const openLightbox = useCallback(
    (index = currentIndex, category: RoomCategory = 'All') => {
      setLightboxCategory(category);
      if (category === 'All') {
        setLightboxIndex(index);
      } else {
        const foundIdx = mediaList
          .filter((item) => item.category === category)
          .findIndex((item) => item.url === mediaList[index]?.url);
        setLightboxIndex(foundIdx >= 0 ? foundIdx : 0);
      }
      setLightboxZoom(false);
      setIsLightboxOpen(true);
    },
    [currentIndex, mediaList]
  );

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    setLightboxZoom(false);
  }, []);

  // Lightbox Navigation
  const handleLightboxPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setLightboxIndex((prev) => (prev === 0 ? lightboxMediaList.length - 1 : prev - 1));
      setLightboxZoom(false);
    },
    [lightboxMediaList.length]
  );

  const handleLightboxNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setLightboxIndex((prev) => (prev === lightboxMediaList.length - 1 ? 0 : prev + 1));
      setLightboxZoom(false);
    },
    [lightboxMediaList.length]
  );

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        handleLightboxPrev();
      } else if (e.key === 'ArrowRight') {
        handleLightboxNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, closeLightbox, handleLightboxPrev, handleLightboxNext]);

  // Lock body scroll when modals are active
  useEffect(() => {
    if (isLightboxOpen || is3DWalkthroughOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen, is3DWalkthroughOpen]);

  // Share link helper
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const currentPhoto = mediaList[currentIndex] || mediaList[0];
  const activeLightboxPhoto =
    lightboxMediaList[lightboxIndex] || lightboxMediaList[0] || mediaList[0];

  return (
    <div className="w-full flex flex-col gap-4 select-none font-sans">
      {/* 1. TOP BAR: iOS 18 SEGMENTED CONTROL & ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
        {/* Apple HIG Segmented Control Switcher */}
        <div className="inline-flex p-1 bg-slate-200/75 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-300/60 dark:border-slate-700/60 shadow-inner">
          {/* Tab 1: Photos */}
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 ease-out active:scale-95 ${
              activeTab === 'photos'
                ? 'bg-white text-slate-950 dark:bg-slate-900 dark:text-white shadow-sm shadow-black/10 border border-slate-200/90 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Photos ({mediaList.length})</span>
          </button>

          {/* Tab 2: Floor Plan */}
          <button
            type="button"
            onClick={() => setActiveTab('floorplan')}
            className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 ease-out active:scale-95 ${
              activeTab === 'floorplan'
                ? 'bg-white text-slate-950 dark:bg-slate-900 dark:text-white shadow-sm shadow-black/10 border border-slate-200/90 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'
            }`}
          >
            <Ruler className="w-4 h-4" />
            <span>Floor Plan</span>
          </button>

          {/* Tab 3: 3D Tour */}
          <button
            type="button"
            onClick={() => setActiveTab('virtualtour')}
            className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 ease-out active:scale-95 ${
              activeTab === 'virtualtour'
                ? 'bg-white text-slate-950 dark:bg-slate-900 dark:text-white shadow-sm shadow-black/10 border border-slate-200/90 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>3D Virtual Tour</span>
          </button>
        </div>

        {/* Right side metadata & share pill */}
        <div className="flex items-center gap-2">
          {formattedPrice && (
            <span className="hidden sm:inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
              {formattedPrice}
            </span>
          )}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share property link"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT: PHOTOS */}
      {activeTab === 'photos' && (
        <div className="flex flex-col gap-3">
          {/* Main Hero Viewport */}
          <div
            onClick={() => openLightbox(currentIndex)}
            className="group relative w-full aspect-[16/9] md:aspect-[21/9] min-h-[440px] max-h-[580px] rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-200/80 dark:border-slate-800 cursor-pointer select-none transition-all duration-300"
          >
            {/* Background Image with smooth scale on hover */}
            <img
              src={currentPhoto.url}
              alt={currentPhoto.label}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015]"
              loading="eager"
            />

            {/* Subtle frosted vignettes for controls contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/35 pointer-events-none" />

            {/* Glassmorphic Floating Controls: Top Bar */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-10">
              {/* Left Badges */}
              <div className="flex items-center gap-2 pointer-events-auto">
                {/* Photo Counter Badge Pill */}
                <div className="backdrop-blur-xl bg-black/45 text-white/95 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-white/80" />
                  <span>
                    {currentIndex + 1} / {mediaList.length}
                  </span>
                </div>

                {/* Verified Listing Badge */}
                {verified && (
                  <div className="backdrop-blur-xl bg-emerald-500/85 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-400/40 shadow-lg flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Verified Listing</span>
                  </div>
                )}
              </div>

              {/* Right Controls: Fullscreen Lightbox Button */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(currentIndex);
                  }}
                  className="backdrop-blur-xl bg-black/45 hover:bg-black/75 active:scale-95 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-2 transition-all group/btn"
                >
                  <Maximize2 className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" />
                  <span className="hidden sm:inline">OLED Lightbox</span>
                </button>
              </div>
            </div>

            {/* Navigation Buttons: Previous `<` and Next `>` */}
            <button
              type="button"
              onClick={handlePrevPhoto}
              aria-label="Previous photo"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full backdrop-blur-xl bg-black/40 hover:bg-black/80 active:scale-90 text-white flex items-center justify-center border border-white/25 shadow-2xl transition-all duration-200 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handleNextPhoto}
              aria-label="Next photo"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full backdrop-blur-xl bg-black/40 hover:bg-black/80 active:scale-90 text-white flex items-center justify-center border border-white/25 shadow-2xl transition-all duration-200 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Bottom Caption Pill & Category Hint */}
            <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-none z-10">
              <div className="backdrop-blur-xl bg-black/50 text-white px-4 py-2 rounded-xl border border-white/15 shadow-lg max-w-md">
                <p className="text-xs uppercase tracking-wider font-bold text-slate-300">
                  {currentPhoto.category}
                </p>
                <p className="text-sm font-semibold truncate text-white drop-shadow-sm">
                  {currentPhoto.label}
                </p>
              </div>

              <div className="hidden md:flex items-center gap-1.5 backdrop-blur-xl bg-black/45 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Click image for full OLED view</span>
              </div>
            </div>
          </div>

          {/* Horizontal Thumbnail Strip Beneath Hero */}
          <div className="relative">
            <div className="flex items-center gap-3 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth">
              {mediaList.map((item, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={`${item.url}-${idx}`}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`group relative flex-shrink-0 w-24 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ease-out select-none ${
                      isActive
                        ? 'ring-2 ring-blue-600 dark:ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-105 shadow-md z-10'
                        : 'opacity-65 hover:opacity-100 hover:scale-[1.02] border border-slate-200/90 dark:border-slate-800'
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-medium text-white/90 truncate max-w-[90%]">
                      {idx + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: FLOOR PLAN */}
      {activeTab === 'floorplan' && (
        <div className="flex flex-col gap-6">
          {/* Architectural Blueprint Viewport */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-blue-950/60 shadow-2xl p-6 md:p-8 min-h-[460px] flex flex-col justify-between text-slate-100">
            {/* Subtle Blueprint CAD Grid Pattern */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />

            {/* Blueprint Header */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-blue-500/20 pb-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-widest font-bold">
                  <Compass className="w-4 h-4 animate-spin-slow" />
                  <span>Architectural Working Drawing • CAD Survey v4.2</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-1">
                  Master Layout & Precision Spatial Specs
                </h3>
              </div>

              {/* Controls: Zoom Preview Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFloorPlanZoom(!floorPlanZoom)}
                  className="backdrop-blur-xl bg-cyan-950/70 hover:bg-cyan-900/80 active:scale-95 text-cyan-200 text-xs font-semibold px-4 py-2 rounded-xl border border-cyan-500/30 shadow-lg flex items-center gap-2 transition-all"
                >
                  {floorPlanZoom ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                  <span>{floorPlanZoom ? 'Fit View' : 'Zoom 2.0x'}</span>
                </button>

                <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 text-slate-300 text-xs border border-slate-800 font-mono">
                  <span>SCALE 1:50</span>
                </div>
              </div>
            </div>

            {/* Interactive Blueprint Canvas / Image */}
            <div className="relative z-10 my-8 flex items-center justify-center overflow-hidden min-h-[260px] md:min-h-[320px]">
              {floorPlanUrl ? (
                <div
                  className={`transition-transform duration-500 ease-out cursor-zoom-in ${
                    floorPlanZoom ? 'scale-150' : 'scale-100'
                  }`}
                  onClick={() => setFloorPlanZoom(!floorPlanZoom)}
                >
                  <img
                    src={floorPlanUrl}
                    alt="Floor plan architectural schematic"
                    className="max-h-[380px] w-auto object-contain rounded-lg border border-cyan-500/30"
                  />
                </div>
              ) : (
                /* High-fidelity Vector CAD Blueprint Schematic */
                <div
                  className={`w-full max-w-3xl transition-transform duration-500 ease-out p-4 ${
                    floorPlanZoom ? 'scale-125' : 'scale-100'
                  }`}
                >
                  <svg
                    viewBox="0 0 800 440"
                    className="w-full h-auto drop-shadow-[0_0_20px_rgba(56,189,248,0.15)] select-none"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Outer Boundary Walls */}
                    <rect
                      x="40"
                      y="40"
                      width="720"
                      height="360"
                      rx="8"
                      stroke="#38bdf8"
                      strokeWidth="3.5"
                      strokeDasharray="0"
                      fill="#030712"
                      fillOpacity="0.8"
                    />

                    {/* Room Sector 1: Grand Living Room */}
                    <rect
                      x="40"
                      y="40"
                      width="420"
                      height="230"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                    />
                    <text
                      x="250"
                      y="130"
                      textAnchor="middle"
                      fill="#bae6fd"
                      fontSize="15"
                      fontWeight="bold"
                      fontFamily="system-ui"
                    >
                      GRAND LIVING SALON
                    </text>
                    <text
                      x="250"
                      y="155"
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize="12"
                      fontFamily="system-ui"
                    >
                      24' 0&quot; × 18' 0&quot; • 432 SQ FT
                    </text>
                    <text
                      x="250"
                      y="175"
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="11"
                      fontFamily="system-ui"
                      opacity="0.8"
                    >
                      12&apos; Coffered Ceiling • Hardwood Parquet
                    </text>

                    {/* Room Sector 2: Primary Master Suite */}
                    <rect
                      x="460"
                      y="40"
                      width="300"
                      height="230"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                    />
                    <text
                      x="610"
                      y="130"
                      textAnchor="middle"
                      fill="#bae6fd"
                      fontSize="15"
                      fontWeight="bold"
                      fontFamily="system-ui"
                    >
                      PRIMARY SUITE
                    </text>
                    <text
                      x="610"
                      y="155"
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize="12"
                      fontFamily="system-ui"
                    >
                      20' 0&quot; × 16' 0&quot; • 320 SQ FT
                    </text>
                    <text
                      x="610"
                      y="175"
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="11"
                      fontFamily="system-ui"
                      opacity="0.8"
                    >
                      Spa En-Suite &amp; Walk-In Dressing Room
                    </text>

                    {/* Room Sector 3: Chef's Gourmet Kitchen */}
                    <rect
                      x="40"
                      y="270"
                      width="260"
                      height="130"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                    />
                    <text
                      x="170"
                      y="325"
                      textAnchor="middle"
                      fill="#bae6fd"
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="system-ui"
                    >
                      CHEF&apos;S KITCHEN
                    </text>
                    <text
                      x="170"
                      y="348"
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize="11"
                      fontFamily="system-ui"
                    >
                      18' 0&quot; × 14' 0&quot; • 252 SQ FT
                    </text>

                    {/* Room Sector 4: Dining Salon */}
                    <rect
                      x="300"
                      y="270"
                      width="220"
                      height="130"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                    />
                    <text
                      x="410"
                      y="325"
                      textAnchor="middle"
                      fill="#bae6fd"
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="system-ui"
                    >
                      DINING SALON
                    </text>
                    <text
                      x="410"
                      y="348"
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize="11"
                      fontFamily="system-ui"
                    >
                      16' 0&quot; × 14' 0&quot; • 224 SQ FT
                    </text>

                    {/* Room Sector 5: Wrap-around Terrace */}
                    <rect
                      x="520"
                      y="270"
                      width="240"
                      height="130"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                    <text
                      x="640"
                      y="325"
                      textAnchor="middle"
                      fill="#bae6fd"
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="system-ui"
                    >
                      SKY TERRACE
                    </text>
                    <text
                      x="640"
                      y="348"
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize="11"
                      fontFamily="system-ui"
                    >
                      22' 0&quot; × 10' 0&quot; • 220 SQ FT
                    </text>

                    {/* Architectural dimension line markings */}
                    <path
                      d="M 40 25 L 760 25 M 40 18 L 40 32 M 760 18 L 760 32"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                    <text
                      x="400"
                      y="20"
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      OVERALL LENGTH: 68&apos;-0&quot; (20.73 M)
                    </text>

                    {/* North Compass Rose Indicator */}
                    <g transform="translate(710, 75)">
                      <circle cx="0" cy="0" r="22" stroke="#38bdf8" strokeWidth="1.5" fill="#0284c7" fillOpacity="0.2" />
                      <polygon points="0,-18 5,0 0,-4 -5,0" fill="#38bdf8" />
                      <polygon points="0,18 5,0 0,4 -5,0" fill="#0369a1" />
                      <text x="0" y="-22" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="system-ui">
                        N
                      </text>
                    </g>
                  </svg>
                </div>
              )}
            </div>

            {/* Blueprint Footer Status Bar */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-blue-500/20 pt-4 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Live BIM/CAD Sync
                </span>
                <span>Gross Carpet Area: 3,450 sq ft</span>
                <span className="hidden sm:inline">Super Built-up: 4,120 sq ft</span>
              </div>
              <button
                type="button"
                onClick={() => alert('CAD Blueprint specification downloaded (PDF).')}
                className="flex items-center gap-1.5 text-cyan-300 hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Architectural PDF</span>
              </button>
            </div>
          </div>

          {/* Room Dimensions Grid Card */}
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h4 className="text-xl font-bold text-slate-950 dark:text-white tracking-tight">
                  Certified Room Dimensions &amp; Spatial Schedule
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Precision laser-measured room clear-heights and net usable area.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                <Grid className="w-3.5 h-3.5" /> 6 Primary Zones
              </span>
            </div>

            {/* Grid of rooms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  name: 'Grand Living Room',
                  dims: "24' × 18'",
                  area: '432 sq ft',
                  notes: "12' Coffered Ceiling • Hardwood Floor",
                },
                {
                  name: 'Primary Suite',
                  dims: "20' × 16'",
                  area: '320 sq ft',
                  notes: 'Spa En-Suite Bath & Walk-in Dressing',
                },
                {
                  name: "Chef's Kitchen",
                  dims: "18' × 14'",
                  area: '252 sq ft',
                  notes: 'Calacatta Marble Island & Pantry',
                },
                {
                  name: 'Dining Salon',
                  dims: "16' × 14'",
                  area: '224 sq ft',
                  notes: 'Crystal Chandelier Fitting Ready',
                },
                {
                  name: 'Terrace / Balcony',
                  dims: "22' × 10'",
                  area: '220 sq ft',
                  notes: 'Frameless Glass Sunset Balustrade',
                },
                {
                  name: 'Executive Office',
                  dims: "14' × 12'",
                  area: '168 sq ft',
                  notes: 'Acoustic Paneling & Library Shelves',
                },
              ].map((room, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-blue-500/50 transition-all duration-200"
                >
                  <p className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                    {room.dims}
                  </p>
                  <h5 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {room.name}
                  </h5>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {room.area}
                    </span>
                    <span className="truncate max-w-[140px]">{room.notes}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CAD Architect Certification Badge */}
            <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-50 to-emerald-500/10 dark:from-amber-950/25 dark:via-slate-900 dark:to-emerald-950/25 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-400">
                      Official Certification
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> ±0.5% Laser Verified
                    </span>
                  </div>
                  <h5 className="text-base font-bold text-slate-950 dark:text-white mt-0.5">
                    CAD Architect Certification &amp; Spatial Seal
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Survey Reg #AIA-2026-IND-9481 • Signed &amp; Digitally Verified by Council of
                    Architecture standards.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert('Certificate hash verified on ledger: #AIA-2026-IND-9481')}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-sm transition-all"
              >
                Verify Stamp Hash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT: 3D VIRTUAL TOUR */}
      {activeTab === 'virtualtour' && (
        <div className="flex flex-col gap-6">
          {/* Matterport-Style 3D Virtual Tour Card */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl min-h-[480px] flex flex-col justify-between text-white group select-none">
            {/* Ambient Panorama Simulation / Virtual Tour Background */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out group-hover:scale-105"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&auto=format&fit=crop&q=85")',
              }}
            >
              {/* Glassmorphic Dark Tint Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/70 backdrop-blur-[2px]" />
            </div>

            {/* Top Bar: 360 Badge & Metadata */}
            <div className="relative z-10 p-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {/* 360 IMMERSIVE TOUR Badge with Pulsing Radar Ring */}
                <div className="backdrop-blur-xl bg-emerald-500/90 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-emerald-400/50 shadow-xl flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  <span>360° IMMERSIVE TOUR</span>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 backdrop-blur-md bg-white/10 text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>8K Spatial Capture</span>
                </div>
              </div>

              {/* VR Ready Pill */}
              <div className="flex items-center gap-2 backdrop-blur-xl bg-black/50 text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/20">
                <Glasses className="w-4 h-4 text-cyan-400" />
                <span>Meta Quest / Vision Pro Ready</span>
              </div>
            </div>

            {/* Center Call To Action */}
            <div className="relative z-10 my-auto flex flex-col items-center text-center px-4 py-8 max-w-xl mx-auto">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-2xl border border-white/30 flex items-center justify-center mb-5 shadow-[0_0_50px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform duration-300">
                <Play className="w-9 h-9 text-white fill-white translate-x-0.5" />
              </div>

              <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                Step Inside the Living Architecture
              </h3>
              <p className="text-sm md:text-base text-slate-200/90 mt-2 max-w-md drop-shadow">
                Fully interactive spatial 3D walkthrough with dollhouse navigation, high-accuracy
                laser measurements, and room-by-room inspection.
              </p>

              {/* Primary Luxury Launch Button */}
              <button
                type="button"
                onClick={() => setIs3DWalkthroughOpen(true)}
                className="mt-6 px-8 py-3.5 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-slate-950 font-extrabold text-sm md:text-base shadow-[0_0_35px_rgba(255,255,255,0.35)] hover:shadow-[0_0_45px_rgba(255,255,255,0.55)] transition-all flex items-center gap-3 border border-white"
              >
                <Eye className="w-5 h-5" />
                <span>Launch 360° Walkthrough</span>
              </button>
            </div>

            {/* Bottom Bar: Feature Tags */}
            <div className="relative z-10 p-6 border-t border-white/10 backdrop-blur-md bg-black/40">
              <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/90">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Dollhouse 3D View
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
                    <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                    Measurement Tool
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
                    <Glasses className="w-3.5 h-3.5 text-purple-400" />
                    VR Compatible
                  </span>
                </div>

                <span className="text-xs text-slate-300 font-medium hidden md:inline">
                  Spatial Engine: Matterport Pro3 LiDAR
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. FULLSCREEN OLED BLACK LIGHTBOX MODAL */}
      {isLightboxOpen &&
        isMounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between select-none text-white animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="High Resolution OLED Lightbox"
          >
            {/* Top Lightbox Navigation Header */}
            <div className="w-full px-4 sm:px-8 py-4 flex items-center justify-between gap-4 border-b border-white/10 bg-black/50 backdrop-blur-xl z-20">
              {/* Left: Info badge */}
              <div className="flex items-center gap-3">
                <div className="backdrop-blur-md bg-white/10 px-3 py-1 rounded-full text-xs font-semibold border border-white/15">
                  {lightboxIndex + 1} / {lightboxMediaList.length}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {activeLightboxPhoto?.category}
                  </p>
                  <p className="text-sm font-semibold truncate max-w-[280px]">
                    {activeLightboxPhoto?.label}
                  </p>
                </div>
              </div>

              {/* Center: Room Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 max-w-[50vw] sm:max-w-none">
                {ROOM_CATEGORIES.map((cat) => {
                  const isActive = lightboxCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setLightboxCategory(cat);
                        setLightboxIndex(0);
                        setLightboxZoom(false);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex-shrink-0 active:scale-95 ${
                        isActive
                          ? 'bg-white text-black shadow-lg shadow-white/20'
                          : 'bg-white/10 hover:bg-white/20 text-white/80 border border-white/15 backdrop-blur-md'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Right: Zoom Toggle & Close Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLightboxZoom(!lightboxZoom)}
                  aria-label="Toggle zoom"
                  className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center border border-white/20 transition-all"
                  title="Toggle Zoom"
                >
                  {lightboxZoom ? (
                    <ZoomOut className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ZoomIn className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={closeLightbox}
                  aria-label="Close lightbox"
                  className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center border border-white/20 transition-all group"
                  title="Press Escape to close"
                >
                  <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                </button>
              </div>
            </div>

            {/* Central High-Res Viewport */}
            <div className="relative flex-1 w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden">
              {/* Previous Photo Button */}
              <button
                type="button"
                onClick={handleLightboxPrev}
                aria-label="Previous photo in lightbox"
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all z-20"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>

              {/* Main Photo Image with Zoom support */}
              <div
                className={`relative max-w-[92vw] max-h-[72vh] transition-transform duration-300 ease-out cursor-pointer ${
                  lightboxZoom ? 'scale-150 sm:scale-175' : 'scale-100'
                }`}
                onClick={() => setLightboxZoom(!lightboxZoom)}
              >
                <img
                  src={activeLightboxPhoto?.url}
                  alt={activeLightboxPhoto?.label || 'High-res property media'}
                  className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.9)] border border-white/10"
                />
              </div>

              {/* Next Photo Button */}
              <button
                type="button"
                onClick={handleLightboxNext}
                aria-label="Next photo in lightbox"
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all z-20"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </div>

            {/* Bottom Horizontal Lightbox Thumbnail Strip */}
            <div className="w-full px-4 sm:px-8 py-3 border-t border-white/10 bg-black/60 backdrop-blur-xl z-20">
              <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
                {lightboxMediaList.map((item, idx) => {
                  const isActive = idx === lightboxIndex;
                  return (
                    <button
                      key={`${item.url}-${idx}`}
                      type="button"
                      onClick={() => {
                        setLightboxIndex(idx);
                        setLightboxZoom(false);
                      }}
                      className={`relative flex-shrink-0 w-16 h-11 sm:w-20 sm:h-14 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black scale-105 opacity-100'
                          : 'opacity-50 hover:opacity-100 border border-white/20'
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={item.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 6. FULLSCREEN 3D VIRTUAL WALKTHROUGH MODAL */}
      {is3DWalkthroughOpen &&
        isMounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between text-white select-none animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="360 Virtual Tour Experience"
          >
            {/* 3D Walkthrough Top Bar */}
            <div className="w-full px-4 sm:px-8 py-4 flex items-center justify-between gap-4 border-b border-white/10 bg-black/60 backdrop-blur-xl z-20">
              <div className="flex items-center gap-3">
                <div className="backdrop-blur-md bg-emerald-500/90 text-white text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>360° LIVE ENGINE</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
                  <p className="text-xs text-slate-400 hidden sm:block">
                    Spatial Digital Twin • Matterport Pro3
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIs3DWalkthroughOpen(false)}
                  className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center border border-white/20 transition-all"
                  title="Exit 360 Walkthrough"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 3D Walkthrough Stage */}
            <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden bg-slate-950">
              {virtualTourUrl ? (
                <iframe
                  src={virtualTourUrl}
                  title="3D Virtual Walkthrough"
                  className="w-full h-full border-0"
                  allow="fullscreen; accelerometer; gyroscope; magnetometer; vr"
                />
              ) : (
                /* Interactive Simulated Matterport 360 Canvas */
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&auto=format&fit=crop&q=85"
                    alt="360 view panorama"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/80" />

                  {/* Interactive Hotspots in 3D Space */}
                  <div className="absolute top-[40%] left-[35%]">
                    <button
                      type="button"
                      onClick={() => alert('Navigating to Chef&apos;s Kitchen (Sector B)...')}
                      className="group flex items-center gap-2 backdrop-blur-md bg-white/90 text-slate-950 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xl transition-all hover:scale-110 active:scale-95 border border-white"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                      <span>Chef&apos;s Kitchen</span>
                    </button>
                  </div>

                  <div className="absolute top-[48%] right-[32%]">
                    <button
                      type="button"
                      onClick={() => alert('Navigating to Primary Master Suite...')}
                      className="group flex items-center gap-2 backdrop-blur-md bg-white/90 text-slate-950 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xl transition-all hover:scale-110 active:scale-95 border border-white"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                      <span>Master Sanctuary</span>
                    </button>
                  </div>

                  {/* Floor Level Floating Switcher */}
                  <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-2 z-20">
                    <div className="backdrop-blur-xl bg-black/60 p-1.5 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-1">
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-bold text-xs shadow"
                      >
                        Ground Floor
                      </button>
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl text-white/80 hover:text-white font-medium text-xs"
                      >
                        Upper Level
                      </button>
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl text-white/80 hover:text-white font-medium text-xs"
                      >
                        Sky Terrace
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
