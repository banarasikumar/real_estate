"use client";

import React, { useEffect, useState } from 'react';
import { getPendingProperties, approveProperty, rejectProperty } from '@repo/api';
import { Check, X, MapPin, Bed, Bath, Square, Sparkles } from 'lucide-react';

type Property = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: string;
  prop_type?: string;
  list_type?: string;
  address?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqft?: number | null;
  property_media?: { id?: string; url: string; is_featured?: boolean }[];
};

export default function ApprovalDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<Record<string, number>>({});

  const fetchPendingProperties = async () => {
    setLoading(true);
    const data = await getPendingProperties();
    setProperties((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingProperties();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const result = await approveProperty(id);
    if (result.success) {
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert('Error approving property: ' + (result.error?.message || 'Unknown error'));
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    const result = await rejectProperty(id);
    if (result.success) {
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert('Error rejecting property: ' + (result.error?.message || 'Unknown error'));
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">No Pending Approvals</h3>
        <p className="text-sm text-gray-500">
          All property listings are currently reviewed and published. New owner submissions will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pending Review Queue</h2>
          <p className="text-sm text-gray-500">
            {properties.length} listing{properties.length === 1 ? '' : 's'} awaiting admin verification
          </p>
        </div>
        <button
          onClick={fetchPendingProperties}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition"
        >
          Refresh Queue
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {properties.map((property) => {
          const media = property.property_media || [];
          const currentImgIdx = activeImageIndex[property.id] || 0;
          const displayImg = media[currentImgIdx]?.url || media[0]?.url;
          const isBusy = actionLoading === property.id;

          return (
            <div
              key={property.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col md:flex-row transition hover:shadow-md"
            >
              {/* Photo Area (4:3 gallery) */}
              <div className="md:w-72 lg:w-80 bg-gray-100 flex flex-col flex-shrink-0">
                <div className="relative aspect-[4/3] w-full bg-gray-200 overflow-hidden">
                  {displayImg ? (
                    <img
                      src={displayImg}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No Photo Available
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 bg-yellow-400/90 backdrop-blur-xs text-yellow-950 text-xs font-bold px-2.5 py-0.5 rounded-md shadow-xs">
                    Pending Approval
                  </div>
                </div>

                {/* Thumbnails strip */}
                {media.length > 1 && (
                  <div className="p-2.5 flex items-center gap-2 overflow-x-auto bg-gray-50 border-t border-gray-100">
                    {media.map((m, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          setActiveImageIndex((prev) => ({ ...prev, [property.id]: idx }))
                        }
                        className={`w-12 h-9 rounded-md overflow-hidden border-2 flex-shrink-0 transition ${
                          idx === currentImgIdx ? 'border-emerald-600 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={m.url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        <span>{property.prop_type || 'Property'}</span>
                        <span>•</span>
                        <span>For {property.list_type || 'Sale'}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{property.title}</h3>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xl font-extrabold text-emerald-600">
                        ${property.price?.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {property.address && (
                    <div className="flex items-center text-xs text-gray-500 mb-3">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                      <span>{property.address}</span>
                    </div>
                  )}

                  {property.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">{property.description}</p>
                  )}

                  {/* Specs */}
                  <div className="flex items-center gap-4 text-xs text-gray-600 pt-3 border-t border-gray-100">
                    {property.bedrooms ? (
                      <div className="flex items-center gap-1.5 font-medium">
                        <Bed className="w-4 h-4 text-gray-400" />
                        <span>{property.bedrooms} Beds</span>
                      </div>
                    ) : null}
                    {property.bathrooms ? (
                      <div className="flex items-center gap-1.5 font-medium">
                        <Bath className="w-4 h-4 text-gray-400" />
                        <span>{property.bathrooms} Baths</span>
                      </div>
                    ) : null}
                    {property.area_sqft ? (
                      <div className="flex items-center gap-1.5 font-medium">
                        <Square className="w-4 h-4 text-gray-400" />
                        <span>{property.area_sqft} sqft</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100 mt-4">
                  <button
                    onClick={() => handleReject(property.id)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApprove(property.id)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isBusy ? (
                      <span>Approving...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Approve & Publish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
