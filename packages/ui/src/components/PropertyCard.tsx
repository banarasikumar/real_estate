"use client";
/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { Heart, MapPin, Bed, Bath, Square, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { cn } from "../utils";

export interface PropertyCardProps {
  id: string;
  images: string[];
  price: string;
  title: string;
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  isVerified?: boolean;
  className?: string;
}

export function PropertyCard({
  id,
  images,
  price,
  title,
  address,
  beds,
  baths,
  sqft,
  isVerified = false,
  className
}: PropertyCardProps) {
  const [currentImg, setCurrentImg] = React.useState(0);

  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImg((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImg((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div className={cn("group flex flex-col overflow-hidden rounded-xl bg-white shadow-card transition-all hover:shadow-floating border border-slate-100", className)}>
      {/* Image Carousel */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={images[currentImg] || "/placeholder.jpg"}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Navigation Arrows (Visible on hover) */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-1.5 text-slate-800 opacity-0 backdrop-blur-sm transition-opacity hover:bg-white group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-1.5 text-slate-800 opacity-0 backdrop-blur-sm transition-opacity hover:bg-white group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Carousel Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, idx) => (
              <div 
                key={idx} 
                className={cn("h-1.5 w-1.5 rounded-full transition-all", idx === currentImg ? "bg-white w-3" : "bg-white/50")}
              />
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {isVerified && (
            <Badge variant="success" className="bg-green-600 shadow-sm">
              <ShieldCheck className="mr-1 h-3 w-3" /> Verified Owner
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button className="absolute right-3 top-3 rounded-full bg-white/50 p-2 text-slate-700 backdrop-blur-md transition-colors hover:bg-white hover:text-primary">
          <Heart className="h-5 w-5" />
        </button>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-xl font-bold text-slate-900">{price}</h3>
        </div>
        
        <div className="mb-3 flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Bed className="h-4 w-4 text-slate-400" /> {beds} Beds
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Bath className="h-4 w-4 text-slate-400" /> {baths} Baths
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Square className="h-4 w-4 text-slate-400" /> {sqft} sqft
          </div>
        </div>

        <p className="line-clamp-1 text-sm font-medium text-slate-800">{title}</p>
        <p className="line-clamp-1 flex items-center text-sm text-slate-500 mt-1">
          <MapPin className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
          {address}
        </p>
      </div>
    </div>
  );
}
