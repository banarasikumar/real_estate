'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Ruler, Box, Maximize2, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ShieldCheck, Download, Share2, Eye, Compass, Layers, Sparkles, Play, Glasses, CheckCircle2, Award, Grid, } from 'lucide-react';
// Categories supported for filtering in the OLED Lightbox
export const ROOM_CATEGORIES = [
    'All',
    'Exterior',
    'Living Room',
    'Kitchen',
    'Master Suite',
    'Views',
];
// Fallback high-res luxury architectural images
const DEFAULT_LUXURY_MEDIA = [
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
const CATEGORY_CYCLE = [
    'Exterior',
    'Living Room',
    'Kitchen',
    'Master Suite',
    'Views',
    'Living Room',
    'Master Suite',
    'Exterior',
];
export default function TabbedMediaViewer({ images, title = 'Luxury Modern Residence', price, floorPlanUrl, virtualTourUrl, verified = true, }) {
    const [activeTab, setActiveTab] = useState('photos');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxCategory, setLightboxCategory] = useState('All');
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
        if (!price)
            return null;
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
    const mediaList = useMemo(() => {
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
        if (lightboxCategory === 'All')
            return mediaList;
        return mediaList.filter((item) => item.category === lightboxCategory);
    }, [mediaList, lightboxCategory]);
    // Handle previous & next for Photos Hero
    const handlePrevPhoto = useCallback((e) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
    }, [mediaList.length]);
    const handleNextPhoto = useCallback((e) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev === mediaList.length - 1 ? 0 : prev + 1));
    }, [mediaList.length]);
    // Open Lightbox at current photo
    const openLightbox = useCallback((index = currentIndex, category = 'All') => {
        setLightboxCategory(category);
        if (category === 'All') {
            setLightboxIndex(index);
        }
        else {
            const foundIdx = mediaList
                .filter((item) => item.category === category)
                .findIndex((item) => item.url === mediaList[index]?.url);
            setLightboxIndex(foundIdx >= 0 ? foundIdx : 0);
        }
        setLightboxZoom(false);
        setIsLightboxOpen(true);
    }, [currentIndex, mediaList]);
    const closeLightbox = useCallback(() => {
        setIsLightboxOpen(false);
        setLightboxZoom(false);
    }, []);
    // Lightbox Navigation
    const handleLightboxPrev = useCallback((e) => {
        e?.stopPropagation();
        setLightboxIndex((prev) => (prev === 0 ? lightboxMediaList.length - 1 : prev - 1));
        setLightboxZoom(false);
    }, [lightboxMediaList.length]);
    const handleLightboxNext = useCallback((e) => {
        e?.stopPropagation();
        setLightboxIndex((prev) => (prev === lightboxMediaList.length - 1 ? 0 : prev + 1));
        setLightboxZoom(false);
    }, [lightboxMediaList.length]);
    // Keyboard navigation for Lightbox
    useEffect(() => {
        if (!isLightboxOpen)
            return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeLightbox();
            }
            else if (e.key === 'ArrowLeft') {
                handleLightboxPrev();
            }
            else if (e.key === 'ArrowRight') {
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
        }
        else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isLightboxOpen, is3DWalkthroughOpen]);
    // Share link helper
    const handleShare = (e) => {
        e.stopPropagation();
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        }
    };
    const currentPhoto = mediaList[currentIndex] || mediaList[0];
    const activeLightboxPhoto = lightboxMediaList[lightboxIndex] || lightboxMediaList[0] || mediaList[0];
    return (_jsxs("div", { className: "w-full flex flex-col gap-4 select-none font-sans", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 px-0.5", children: [_jsxs("div", { className: "inline-flex p-1 bg-slate-200/75 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-300/60 dark:border-slate-700/60 shadow-inner", children: [_jsxs("button", { type: "button", onClick: () => setActiveTab('photos'), className: `flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 ease-out active:scale-95 ${activeTab === 'photos'
                                    ? 'bg-white text-slate-950 dark:bg-slate-900 dark:text-white shadow-sm shadow-black/10 border border-slate-200/90 dark:border-slate-700'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'}`, children: [_jsx(Camera, { className: "w-4 h-4" }), _jsxs("span", { children: ["Photos (", mediaList.length, ")"] })] }), _jsxs("button", { type: "button", onClick: () => setActiveTab('floorplan'), className: `flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 ease-out active:scale-95 ${activeTab === 'floorplan'
                                    ? 'bg-white text-slate-950 dark:bg-slate-900 dark:text-white shadow-sm shadow-black/10 border border-slate-200/90 dark:border-slate-700'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'}`, children: [_jsx(Ruler, { className: "w-4 h-4" }), _jsx("span", { children: "Floor Plan" })] }), _jsxs("button", { type: "button", onClick: () => setActiveTab('virtualtour'), className: `flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 ease-out active:scale-95 ${activeTab === 'virtualtour'
                                    ? 'bg-white text-slate-950 dark:bg-slate-900 dark:text-white shadow-sm shadow-black/10 border border-slate-200/90 dark:border-slate-700'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'}`, children: [_jsx(Box, { className: "w-4 h-4" }), _jsx("span", { children: "3D Virtual Tour" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [formattedPrice && (_jsx("span", { className: "hidden sm:inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700", children: formattedPrice })), _jsxs("button", { type: "button", onClick: handleShare, "aria-label": "Share property link", className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm transition-all active:scale-95", children: [_jsx(Share2, { className: "w-3.5 h-3.5" }), _jsx("span", { children: copiedLink ? 'Copied!' : 'Share' })] })] })] }), activeTab === 'photos' && (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { onClick: () => openLightbox(currentIndex), className: "group relative w-full aspect-[16/9] md:aspect-[21/9] min-h-[440px] max-h-[580px] rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-200/80 dark:border-slate-800 cursor-pointer select-none transition-all duration-300", children: [_jsx("img", { src: currentPhoto.url, alt: currentPhoto.label, className: "w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015]", loading: "eager" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/35 pointer-events-none" }), _jsxs("div", { className: "absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-10", children: [_jsxs("div", { className: "flex items-center gap-2 pointer-events-auto", children: [_jsxs("div", { className: "backdrop-blur-xl bg-black/45 text-white/95 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-2", children: [_jsx(Camera, { className: "w-3.5 h-3.5 text-white/80" }), _jsxs("span", { children: [currentIndex + 1, " / ", mediaList.length] })] }), verified && (_jsxs("div", { className: "backdrop-blur-xl bg-emerald-500/85 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-400/40 shadow-lg flex items-center gap-1.5", children: [_jsx(ShieldCheck, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "hidden sm:inline", children: "Verified Listing" })] }))] }), _jsx("div", { className: "flex items-center gap-2 pointer-events-auto", children: _jsxs("button", { type: "button", onClick: (e) => {
                                                e.stopPropagation();
                                                openLightbox(currentIndex);
                                            }, className: "backdrop-blur-xl bg-black/45 hover:bg-black/75 active:scale-95 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-2 transition-all group/btn", children: [_jsx(Maximize2, { className: "w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" }), _jsx("span", { className: "hidden sm:inline", children: "OLED Lightbox" })] }) })] }), _jsx("button", { type: "button", onClick: handlePrevPhoto, "aria-label": "Previous photo", className: "absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full backdrop-blur-xl bg-black/40 hover:bg-black/80 active:scale-90 text-white flex items-center justify-center border border-white/25 shadow-2xl transition-all duration-200 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 z-10", children: _jsx(ChevronLeft, { className: "w-6 h-6" }) }), _jsx("button", { type: "button", onClick: handleNextPhoto, "aria-label": "Next photo", className: "absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full backdrop-blur-xl bg-black/40 hover:bg-black/80 active:scale-90 text-white flex items-center justify-center border border-white/25 shadow-2xl transition-all duration-200 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 z-10", children: _jsx(ChevronRight, { className: "w-6 h-6" }) }), _jsxs("div", { className: "absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-none z-10", children: [_jsxs("div", { className: "backdrop-blur-xl bg-black/50 text-white px-4 py-2 rounded-xl border border-white/15 shadow-lg max-w-md", children: [_jsx("p", { className: "text-xs uppercase tracking-wider font-bold text-slate-300", children: currentPhoto.category }), _jsx("p", { className: "text-sm font-semibold truncate text-white drop-shadow-sm", children: currentPhoto.label })] }), _jsxs("div", { className: "hidden md:flex items-center gap-1.5 backdrop-blur-xl bg-black/45 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full border border-white/15", children: [_jsx(Sparkles, { className: "w-3.5 h-3.5 text-amber-400" }), _jsx("span", { children: "Click image for full OLED view" })] })] })] }), _jsx("div", { className: "relative", children: _jsx("div", { className: "flex items-center gap-3 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth", children: mediaList.map((item, idx) => {
                                const isActive = idx === currentIndex;
                                return (_jsxs("button", { type: "button", onClick: () => setCurrentIndex(idx), className: `group relative flex-shrink-0 w-24 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ease-out select-none ${isActive
                                        ? 'ring-2 ring-blue-600 dark:ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-105 shadow-md z-10'
                                        : 'opacity-65 hover:opacity-100 hover:scale-[1.02] border border-slate-200/90 dark:border-slate-800'}`, children: [_jsx("img", { src: item.url, alt: item.label, className: "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105", loading: "lazy" }), _jsx("div", { className: "absolute bottom-1 left-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-medium text-white/90 truncate max-w-[90%]", children: idx + 1 })] }, `${item.url}-${idx}`));
                            }) }) })] })), activeTab === 'floorplan' && (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "relative rounded-2xl overflow-hidden bg-slate-950 border border-blue-950/60 shadow-2xl p-6 md:p-8 min-h-[460px] flex flex-col justify-between text-slate-100", children: [_jsx("div", { className: "absolute inset-0 opacity-20 pointer-events-none", style: {
                                    backgroundImage: 'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                                    backgroundSize: '32px 32px',
                                } }), _jsxs("div", { className: "relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-blue-500/20 pb-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-widest font-bold", children: [_jsx(Compass, { className: "w-4 h-4 animate-spin-slow" }), _jsx("span", { children: "Architectural Working Drawing \u2022 CAD Survey v4.2" })] }), _jsx("h3", { className: "text-xl md:text-2xl font-bold text-white tracking-tight mt-1", children: "Master Layout & Precision Spatial Specs" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: () => setFloorPlanZoom(!floorPlanZoom), className: "backdrop-blur-xl bg-cyan-950/70 hover:bg-cyan-900/80 active:scale-95 text-cyan-200 text-xs font-semibold px-4 py-2 rounded-xl border border-cyan-500/30 shadow-lg flex items-center gap-2 transition-all", children: [floorPlanZoom ? _jsx(ZoomOut, { className: "w-4 h-4" }) : _jsx(ZoomIn, { className: "w-4 h-4" }), _jsx("span", { children: floorPlanZoom ? 'Fit View' : 'Zoom 2.0x' })] }), _jsx("div", { className: "hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 text-slate-300 text-xs border border-slate-800 font-mono", children: _jsx("span", { children: "SCALE 1:50" }) })] })] }), _jsx("div", { className: "relative z-10 my-8 flex items-center justify-center overflow-hidden min-h-[260px] md:min-h-[320px]", children: floorPlanUrl ? (_jsx("div", { className: `transition-transform duration-500 ease-out cursor-zoom-in ${floorPlanZoom ? 'scale-150' : 'scale-100'}`, onClick: () => setFloorPlanZoom(!floorPlanZoom), children: _jsx("img", { src: floorPlanUrl, alt: "Floor plan architectural schematic", className: "max-h-[380px] w-auto object-contain rounded-lg border border-cyan-500/30" }) })) : (
                                /* High-fidelity Vector CAD Blueprint Schematic */
                                _jsx("div", { className: `w-full max-w-3xl transition-transform duration-500 ease-out p-4 ${floorPlanZoom ? 'scale-125' : 'scale-100'}`, children: _jsxs("svg", { viewBox: "0 0 800 440", className: "w-full h-auto drop-shadow-[0_0_20px_rgba(56,189,248,0.15)] select-none", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [_jsx("rect", { x: "40", y: "40", width: "720", height: "360", rx: "8", stroke: "#38bdf8", strokeWidth: "3.5", strokeDasharray: "0", fill: "#030712", fillOpacity: "0.8" }), _jsx("rect", { x: "40", y: "40", width: "420", height: "230", stroke: "#0ea5e9", strokeWidth: "2" }), _jsx("text", { x: "250", y: "130", textAnchor: "middle", fill: "#bae6fd", fontSize: "15", fontWeight: "bold", fontFamily: "system-ui", children: "GRAND LIVING SALON" }), _jsx("text", { x: "250", y: "155", textAnchor: "middle", fill: "#7dd3fc", fontSize: "12", fontFamily: "system-ui", children: "24' 0\" \u00D7 18' 0\" \u2022 432 SQ FT" }), _jsx("text", { x: "250", y: "175", textAnchor: "middle", fill: "#38bdf8", fontSize: "11", fontFamily: "system-ui", opacity: "0.8", children: "12' Coffered Ceiling \u2022 Hardwood Parquet" }), _jsx("rect", { x: "460", y: "40", width: "300", height: "230", stroke: "#0ea5e9", strokeWidth: "2" }), _jsx("text", { x: "610", y: "130", textAnchor: "middle", fill: "#bae6fd", fontSize: "15", fontWeight: "bold", fontFamily: "system-ui", children: "PRIMARY SUITE" }), _jsx("text", { x: "610", y: "155", textAnchor: "middle", fill: "#7dd3fc", fontSize: "12", fontFamily: "system-ui", children: "20' 0\" \u00D7 16' 0\" \u2022 320 SQ FT" }), _jsx("text", { x: "610", y: "175", textAnchor: "middle", fill: "#38bdf8", fontSize: "11", fontFamily: "system-ui", opacity: "0.8", children: "Spa En-Suite & Walk-In Dressing Room" }), _jsx("rect", { x: "40", y: "270", width: "260", height: "130", stroke: "#0ea5e9", strokeWidth: "2" }), _jsx("text", { x: "170", y: "325", textAnchor: "middle", fill: "#bae6fd", fontSize: "14", fontWeight: "bold", fontFamily: "system-ui", children: "CHEF'S KITCHEN" }), _jsx("text", { x: "170", y: "348", textAnchor: "middle", fill: "#7dd3fc", fontSize: "11", fontFamily: "system-ui", children: "18' 0\" \u00D7 14' 0\" \u2022 252 SQ FT" }), _jsx("rect", { x: "300", y: "270", width: "220", height: "130", stroke: "#0ea5e9", strokeWidth: "2" }), _jsx("text", { x: "410", y: "325", textAnchor: "middle", fill: "#bae6fd", fontSize: "14", fontWeight: "bold", fontFamily: "system-ui", children: "DINING SALON" }), _jsx("text", { x: "410", y: "348", textAnchor: "middle", fill: "#7dd3fc", fontSize: "11", fontFamily: "system-ui", children: "16' 0\" \u00D7 14' 0\" \u2022 224 SQ FT" }), _jsx("rect", { x: "520", y: "270", width: "240", height: "130", stroke: "#38bdf8", strokeWidth: "2", strokeDasharray: "6 4" }), _jsx("text", { x: "640", y: "325", textAnchor: "middle", fill: "#bae6fd", fontSize: "14", fontWeight: "bold", fontFamily: "system-ui", children: "SKY TERRACE" }), _jsx("text", { x: "640", y: "348", textAnchor: "middle", fill: "#7dd3fc", fontSize: "11", fontFamily: "system-ui", children: "22' 0\" \u00D7 10' 0\" \u2022 220 SQ FT" }), _jsx("path", { d: "M 40 25 L 760 25 M 40 18 L 40 32 M 760 18 L 760 32", stroke: "#38bdf8", strokeWidth: "1.5" }), _jsx("text", { x: "400", y: "20", textAnchor: "middle", fill: "#38bdf8", fontSize: "11", fontFamily: "monospace", fontWeight: "bold", children: "OVERALL LENGTH: 68'-0\" (20.73 M)" }), _jsxs("g", { transform: "translate(710, 75)", children: [_jsx("circle", { cx: "0", cy: "0", r: "22", stroke: "#38bdf8", strokeWidth: "1.5", fill: "#0284c7", fillOpacity: "0.2" }), _jsx("polygon", { points: "0,-18 5,0 0,-4 -5,0", fill: "#38bdf8" }), _jsx("polygon", { points: "0,18 5,0 0,4 -5,0", fill: "#0369a1" }), _jsx("text", { x: "0", y: "-22", textAnchor: "middle", fill: "#38bdf8", fontSize: "10", fontWeight: "bold", fontFamily: "system-ui", children: "N" })] })] }) })) }), _jsxs("div", { className: "relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-blue-500/20 pt-4 text-xs text-slate-400", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("span", { className: "flex items-center gap-1.5 text-cyan-300", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-cyan-400 animate-pulse" }), "Live BIM/CAD Sync"] }), _jsx("span", { children: "Gross Carpet Area: 3,450 sq ft" }), _jsx("span", { className: "hidden sm:inline", children: "Super Built-up: 4,120 sq ft" })] }), _jsxs("button", { type: "button", onClick: () => alert('CAD Blueprint specification downloaded (PDF).'), className: "flex items-center gap-1.5 text-cyan-300 hover:text-white transition-colors underline-offset-4 hover:underline", children: [_jsx(Download, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Download Architectural PDF" })] })] })] }), _jsxs("div", { className: "bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-xl font-bold text-slate-950 dark:text-white tracking-tight", children: "Certified Room Dimensions & Spatial Schedule" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Precision laser-measured room clear-heights and net usable area." })] }), _jsxs("span", { className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900", children: [_jsx(Grid, { className: "w-3.5 h-3.5" }), " 6 Primary Zones"] })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: [
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
                                ].map((room, i) => (_jsxs("div", { className: "p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-blue-500/50 transition-all duration-200", children: [_jsx("p", { className: "text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider", children: room.dims }), _jsx("h5", { className: "text-base font-bold text-slate-900 dark:text-white mt-0.5", children: room.name }), _jsxs("div", { className: "flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/60", children: [_jsx("span", { className: "font-semibold text-slate-700 dark:text-slate-200", children: room.area }), _jsx("span", { className: "truncate max-w-[140px]", children: room.notes })] })] }, i))) }), _jsxs("div", { className: "mt-8 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-50 to-emerald-500/10 dark:from-amber-950/25 dark:via-slate-900 dark:to-emerald-950/25 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center flex-shrink-0 shadow-inner", children: _jsx(Award, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-400", children: "Official Certification" }), _jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), " \u00B10.5% Laser Verified"] })] }), _jsx("h5", { className: "text-base font-bold text-slate-950 dark:text-white mt-0.5", children: "CAD Architect Certification & Spatial Seal" }), _jsx("p", { className: "text-xs text-slate-600 dark:text-slate-400", children: "Survey Reg #AIA-2026-IND-9481 \u2022 Signed & Digitally Verified by Council of Architecture standards." })] })] }), _jsx("button", { type: "button", onClick: () => alert('Certificate hash verified on ledger: #AIA-2026-IND-9481'), className: "w-full md:w-auto px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-sm transition-all", children: "Verify Stamp Hash" })] })] })] })), activeTab === 'virtualtour' && (_jsx("div", { className: "flex flex-col gap-6", children: _jsxs("div", { className: "relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl min-h-[480px] flex flex-col justify-between text-white group select-none", children: [_jsx("div", { className: "absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out group-hover:scale-105", style: {
                                backgroundImage: 'url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&auto=format&fit=crop&q=85")',
                            }, children: _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/70 backdrop-blur-[2px]" }) }), _jsxs("div", { className: "relative z-10 p-6 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsxs("div", { className: "backdrop-blur-xl bg-emerald-500/90 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-emerald-400/50 shadow-xl flex items-center gap-2", children: [_jsxs("span", { className: "relative flex h-2 w-2", children: [_jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" }), _jsx("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-white" })] }), _jsx("span", { children: "360\u00B0 IMMERSIVE TOUR" })] }), _jsxs("div", { className: "hidden sm:flex items-center gap-1.5 backdrop-blur-md bg-white/10 text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15", children: [_jsx(Sparkles, { className: "w-3.5 h-3.5 text-amber-300" }), _jsx("span", { children: "8K Spatial Capture" })] })] }), _jsxs("div", { className: "flex items-center gap-2 backdrop-blur-xl bg-black/50 text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/20", children: [_jsx(Glasses, { className: "w-4 h-4 text-cyan-400" }), _jsx("span", { children: "Meta Quest / Vision Pro Ready" })] })] }), _jsxs("div", { className: "relative z-10 my-auto flex flex-col items-center text-center px-4 py-8 max-w-xl mx-auto", children: [_jsx("div", { className: "w-20 h-20 rounded-full bg-white/10 backdrop-blur-2xl border border-white/30 flex items-center justify-center mb-5 shadow-[0_0_50px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform duration-300", children: _jsx(Play, { className: "w-9 h-9 text-white fill-white translate-x-0.5" }) }), _jsx("h3", { className: "text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-md", children: "Step Inside the Living Architecture" }), _jsx("p", { className: "text-sm md:text-base text-slate-200/90 mt-2 max-w-md drop-shadow", children: "Fully interactive spatial 3D walkthrough with dollhouse navigation, high-accuracy laser measurements, and room-by-room inspection." }), _jsxs("button", { type: "button", onClick: () => setIs3DWalkthroughOpen(true), className: "mt-6 px-8 py-3.5 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-slate-950 font-extrabold text-sm md:text-base shadow-[0_0_35px_rgba(255,255,255,0.35)] hover:shadow-[0_0_45px_rgba(255,255,255,0.55)] transition-all flex items-center gap-3 border border-white", children: [_jsx(Eye, { className: "w-5 h-5" }), _jsx("span", { children: "Launch 360\u00B0 Walkthrough" })] })] }), _jsx("div", { className: "relative z-10 p-6 border-t border-white/10 backdrop-blur-md bg-black/40", children: _jsxs("div", { className: "flex flex-wrap items-center justify-center sm:justify-between gap-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 text-xs font-semibold text-white/90", children: [_jsxs("span", { className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15", children: [_jsx(Layers, { className: "w-3.5 h-3.5 text-cyan-400" }), "Dollhouse 3D View"] }), _jsxs("span", { className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15", children: [_jsx(Ruler, { className: "w-3.5 h-3.5 text-emerald-400" }), "Measurement Tool"] }), _jsxs("span", { className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15", children: [_jsx(Glasses, { className: "w-3.5 h-3.5 text-purple-400" }), "VR Compatible"] })] }), _jsx("span", { className: "text-xs text-slate-300 font-medium hidden md:inline", children: "Spatial Engine: Matterport Pro3 LiDAR" })] }) })] }) })), isLightboxOpen &&
                isMounted &&
                createPortal(_jsxs("div", { className: "fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between select-none text-white animate-in fade-in duration-200", role: "dialog", "aria-modal": "true", "aria-label": "High Resolution OLED Lightbox", children: [_jsxs("div", { className: "w-full px-4 sm:px-8 py-4 flex items-center justify-between gap-4 border-b border-white/10 bg-black/50 backdrop-blur-xl z-20", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "backdrop-blur-md bg-white/10 px-3 py-1 rounded-full text-xs font-semibold border border-white/15", children: [lightboxIndex + 1, " / ", lightboxMediaList.length] }), _jsxs("div", { className: "hidden sm:block", children: [_jsx("p", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider", children: activeLightboxPhoto?.category }), _jsx("p", { className: "text-sm font-semibold truncate max-w-[280px]", children: activeLightboxPhoto?.label })] })] }), _jsx("div", { className: "flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 max-w-[50vw] sm:max-w-none", children: ROOM_CATEGORIES.map((cat) => {
                                        const isActive = lightboxCategory === cat;
                                        return (_jsx("button", { type: "button", onClick: () => {
                                                setLightboxCategory(cat);
                                                setLightboxIndex(0);
                                                setLightboxZoom(false);
                                            }, className: `px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex-shrink-0 active:scale-95 ${isActive
                                                ? 'bg-white text-black shadow-lg shadow-white/20'
                                                : 'bg-white/10 hover:bg-white/20 text-white/80 border border-white/15 backdrop-blur-md'}`, children: cat }, cat));
                                    }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setLightboxZoom(!lightboxZoom), "aria-label": "Toggle zoom", className: "w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center border border-white/20 transition-all", title: "Toggle Zoom", children: lightboxZoom ? (_jsx(ZoomOut, { className: "w-4 h-4 text-amber-400" })) : (_jsx(ZoomIn, { className: "w-4 h-4" })) }), _jsx("button", { type: "button", onClick: closeLightbox, "aria-label": "Close lightbox", className: "w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center border border-white/20 transition-all group", title: "Press Escape to close", children: _jsx(X, { className: "w-5 h-5 transition-transform group-hover:rotate-90" }) })] })] }), _jsxs("div", { className: "relative flex-1 w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden", children: [_jsx("button", { type: "button", onClick: handleLightboxPrev, "aria-label": "Previous photo in lightbox", className: "absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all z-20", children: _jsx(ChevronLeft, { className: "w-7 h-7" }) }), _jsx("div", { className: `relative max-w-[92vw] max-h-[72vh] transition-transform duration-300 ease-out cursor-pointer ${lightboxZoom ? 'scale-150 sm:scale-175' : 'scale-100'}`, onClick: () => setLightboxZoom(!lightboxZoom), children: _jsx("img", { src: activeLightboxPhoto?.url, alt: activeLightboxPhoto?.label || 'High-res property media', className: "max-w-full max-h-[72vh] object-contain rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.9)] border border-white/10" }) }), _jsx("button", { type: "button", onClick: handleLightboxNext, "aria-label": "Next photo in lightbox", className: "absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all z-20", children: _jsx(ChevronRight, { className: "w-7 h-7" }) })] }), _jsx("div", { className: "w-full px-4 sm:px-8 py-3 border-t border-white/10 bg-black/60 backdrop-blur-xl z-20", children: _jsx("div", { className: "flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1", children: lightboxMediaList.map((item, idx) => {
                                    const isActive = idx === lightboxIndex;
                                    return (_jsx("button", { type: "button", onClick: () => {
                                            setLightboxIndex(idx);
                                            setLightboxZoom(false);
                                        }, className: `relative flex-shrink-0 w-16 h-11 sm:w-20 sm:h-14 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${isActive
                                            ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black scale-105 opacity-100'
                                            : 'opacity-50 hover:opacity-100 border border-white/20'}`, children: _jsx("img", { src: item.url, alt: item.label, className: "w-full h-full object-cover", loading: "lazy" }) }, `${item.url}-${idx}`));
                                }) }) })] }), document.body), is3DWalkthroughOpen &&
                isMounted &&
                createPortal(_jsxs("div", { className: "fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between text-white select-none animate-in fade-in duration-200", role: "dialog", "aria-modal": "true", "aria-label": "360 Virtual Tour Experience", children: [_jsxs("div", { className: "w-full px-4 sm:px-8 py-4 flex items-center justify-between gap-4 border-b border-white/10 bg-black/60 backdrop-blur-xl z-20", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "backdrop-blur-md bg-emerald-500/90 text-white text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-white animate-ping" }), _jsx("span", { children: "360\u00B0 LIVE ENGINE" })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-bold text-white tracking-tight", children: title }), _jsx("p", { className: "text-xs text-slate-400 hidden sm:block", children: "Spatial Digital Twin \u2022 Matterport Pro3" })] })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsx("button", { type: "button", onClick: () => setIs3DWalkthroughOpen(false), className: "w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center border border-white/20 transition-all", title: "Exit 360 Walkthrough", children: _jsx(X, { className: "w-5 h-5" }) }) })] }), _jsx("div", { className: "relative flex-1 w-full flex items-center justify-center overflow-hidden bg-slate-950", children: virtualTourUrl ? (_jsx("iframe", { src: virtualTourUrl, title: "3D Virtual Walkthrough", className: "w-full h-full border-0", allow: "fullscreen; accelerometer; gyroscope; magnetometer; vr" })) : (
                            /* Interactive Simulated Matterport 360 Canvas */
                            _jsxs("div", { className: "relative w-full h-full flex items-center justify-center", children: [_jsx("img", { src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&auto=format&fit=crop&q=85", alt: "360 view panorama", className: "w-full h-full object-cover opacity-80" }), _jsx("div", { className: "absolute inset-0 bg-radial from-transparent via-black/40 to-black/80" }), _jsx("div", { className: "absolute top-[40%] left-[35%]", children: _jsxs("button", { type: "button", onClick: () => alert('Navigating to Chef&apos;s Kitchen (Sector B)...'), className: "group flex items-center gap-2 backdrop-blur-md bg-white/90 text-slate-950 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xl transition-all hover:scale-110 active:scale-95 border border-white", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" }), _jsx("span", { children: "Chef's Kitchen" })] }) }), _jsx("div", { className: "absolute top-[48%] right-[32%]", children: _jsxs("button", { type: "button", onClick: () => alert('Navigating to Primary Master Suite...'), className: "group flex items-center gap-2 backdrop-blur-md bg-white/90 text-slate-950 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xl transition-all hover:scale-110 active:scale-95 border border-white", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" }), _jsx("span", { children: "Master Sanctuary" })] }) }), _jsx("div", { className: "absolute bottom-6 inset-x-0 flex items-center justify-center gap-2 z-20", children: _jsxs("div", { className: "backdrop-blur-xl bg-black/60 p-1.5 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-1", children: [_jsx("button", { type: "button", className: "px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-bold text-xs shadow", children: "Ground Floor" }), _jsx("button", { type: "button", className: "px-3.5 py-1.5 rounded-xl text-white/80 hover:text-white font-medium text-xs", children: "Upper Level" }), _jsx("button", { type: "button", className: "px-3.5 py-1.5 rounded-xl text-white/80 hover:text-white font-medium text-xs", children: "Sky Terrace" })] }) })] })) })] }), document.body)] }));
}
