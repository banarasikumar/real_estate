"use client";

import React from "react";
import Link from "next/link";
import {
  X,
  Bed,
  Bath,
  Square,
  ShieldCheck,
  Heart,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import SafeImage from "../SafeImage";
import { formatPricePill } from "../../utils/formatters";

export interface MapProperty {
  id: string;
  title: string;
  price: number | string;
  address?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqft?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  prop_type?: string;
  list_type?: string;
  status?: string;
  isVerified?: boolean;
  property_media?: Array<{ url: string }>;
  images?: string[];
  displayImages?: string[];
  lat?: number;
  lng?: number;
  pricePill?: string;
  [key: string]: any;
}

export interface MapPropertyPopupProps {
  property: MapProperty | null;
  activeImageIndex: number;
  onPrevImage: (e: React.MouseEvent) => void;
  onNextImage: (e: React.MouseEvent) => void;
  onClose: () => void;
  onToggleFavorite: (e: React.MouseEvent, propId: string) => void;
  isSaved: boolean;
  isViewed: boolean;
}

export const MapPropertyPopup: React.FC<MapPropertyPopupProps> = ({
  property,
  activeImageIndex,
  onPrevImage,
  onNextImage,
  onClose,
  onToggleFavorite,
  isSaved,
  isViewed,
}) => {
  if (!property) return null;

  const images = property.displayImages || property.images || [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
  ];

  return (
    <div
      className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[92%] sm:w-84 md:w-92 max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-3 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close button (✕) */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2.5 right-2.5 z-30 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white backdrop-blur-md transition-colors cursor-pointer"
        title="Close preview"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Favorite Heart Button */}
      <button
        type="button"
        onClick={(e) => onToggleFavorite(e, property.id)}
        className="absolute top-2.5 left-2.5 z-30 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white backdrop-blur-md transition-all cursor-pointer active:scale-90"
        title={isSaved ? "Remove from saved" : "Save property"}
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            isSaved ? "fill-rose-500 text-rose-500" : "text-white hover:text-rose-300"
          }`}
        />
      </button>

      <Link href={`/property/${property.id}`} className="block group">
        {/* Interactive Photo Carousel */}
        <div className="relative w-full h-44 bg-slate-900 overflow-hidden">
          <SafeImage
            src={images[activeImageIndex] || images[0]}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Carousel Left / Right Controls */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={onPrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-opacity opacity-80 hover:opacity-100 cursor-pointer"
                title="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-opacity opacity-80 hover:opacity-100 cursor-pointer"
                title="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Image index counter indicator badge */}
              <div className="absolute bottom-2 right-2 z-20 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                {activeImageIndex + 1} / {images.length}
              </div>
            </>
          )}

          {/* Verified Badge */}
          {property.isVerified && (
            <div className="absolute bottom-2 left-2 z-20 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified</span>
            </div>
          )}
        </div>

        {/* Micro-Card Details */}
        <div className="p-3.5">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <div className="text-lg font-black text-slate-900 tracking-tight">
              {property.pricePill || formatPricePill(property.price)}
            </div>
            {isViewed && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Viewed
              </span>
            )}
          </div>

          <h4 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-rose-600 transition-colors">
            {property.title}
          </h4>

          <p className="text-xs text-slate-500 line-clamp-1 flex items-center mt-1">
            <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-slate-400" />
            {property.address || "Prime Location"}
          </p>

          {/* Amenities pill bar */}
          <div className="flex items-center gap-3 text-xs text-slate-600 pt-2.5 mt-2.5 border-t border-slate-100">
            {property.bedrooms !== undefined && property.bedrooms !== null && (
              <div className="flex items-center gap-1 font-medium">
                <Bed className="w-3.5 h-3.5 text-slate-400" />
                <span>{property.bedrooms} bd</span>
              </div>
            )}
            {property.bathrooms !== undefined && property.bathrooms !== null && (
              <div className="flex items-center gap-1 font-medium">
                <Bath className="w-3.5 h-3.5 text-slate-400" />
                <span>{property.bathrooms} ba</span>
              </div>
            )}
            {property.area_sqft && (
              <div className="flex items-center gap-1 font-medium">
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>{property.area_sqft} sqft</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default MapPropertyPopup;
