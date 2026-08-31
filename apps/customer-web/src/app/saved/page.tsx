"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, getSavedProperties } from "@repo/api";
import { MapPin, Bed, Bath, Square, Heart } from "lucide-react";
import SafeImage from "../../components/SafeImage";

export default function SavedPropertiesPage() {
  const { session } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      if (session?.user?.id) {
        try {
          const saved = await getSavedProperties(session.user.id);
          setProperties(saved);
        } catch (error) {
          console.error("Failed to fetch saved properties:", error);
        }
      }
      setLoading(false);
    };

    fetchSaved();
  }, [session]);

  if (loading) {
    return (
      <div className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
        <div className="text-lg text-slate-500">Loading your saved properties...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <Heart className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in to view saved properties</h2>
        <p className="text-slate-500 mb-6">Create an account or log in to save your favorite homes.</p>
        <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          Login to your account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 container mx-auto px-4 py-16 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Saved Properties</h1>
        <p className="mt-2 text-slate-600">Your curated list of favorite homes.</p>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No saved properties yet</h3>
          <p className="text-slate-500 mb-6">Start exploring and save homes you love.</p>
          <Link href="/search" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Browse Properties
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property: any) => (
            <Link href={`/property/${property.id}`} key={property.id} className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer">
              <div className="relative h-64 overflow-hidden">
                <SafeImage 
                  src={property.property_media?.[0]?.url || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"} 
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md text-red-500">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="font-bold text-slate-900 text-lg">₹{property.price.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-1">{property.title}</h3>
                <div className="flex items-center text-slate-500 text-sm mb-4">
                  <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{property.address || 'Address not specified'}</span>
                </div>
                
                <div className="mt-auto grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Bed className="w-4 h-4 text-slate-400" />
                    <span>{property.bedrooms || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Bath className="w-4 h-4 text-slate-400" />
                    <span>{property.bathrooms || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Square className="w-4 h-4 text-slate-400" />
                    <span>{property.area_sqft || '-'} sqft</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
