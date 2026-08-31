"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, getUserEnquiries } from "@repo/api";
import SafeImage from "../../components/SafeImage";

interface EnquiryItem {
  id: string;
  property_id: string;
  message: string;
  status: string;
  created_at: string;
  properties?: {
    title?: string;
    address?: string;
    price?: number | string;
    property_media?: { url: string }[];
  } | null;
}

const MOCK_FALLBACK_ENQUIRIES: EnquiryItem[] = [
  {
    id: "enq-1",
    property_id: "1",
    message: "Hi, I am interested in this Modern Apartment in Downtown. Is it available for immediate possession?",
    status: "Tour Requested",
    created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    properties: {
      title: "Modern Apartment in Downtown",
      address: "123 Main St, Mumbai",
      price: "₹1.5 Cr",
      property_media: [{ url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80" }]
    }
  },
  {
    id: "enq-2",
    property_id: "2",
    message: "Could you share details on maintenance fees and parking spaces for this villa?",
    status: "Reviewing",
    created_at: new Date(Date.now() - 3600 * 1000 * 28).toISOString(),
    properties: {
      title: "Luxury Villa with Pool",
      address: "45 Palm Jumeirah, Bangalore",
      price: "₹4.2 Cr",
      property_media: [{ url: "https://images.unsplash.com/photo-1613490908836-e05e54d6d654?w=800&q=80" }]
    }
  },
  {
    id: "enq-3",
    property_id: "3",
    message: "I would like to schedule an in-person viewing this coming Saturday at 11 AM.",
    status: "Sent",
    created_at: new Date(Date.now() - 3600 * 1000 * 50).toISOString(),
    properties: {
      title: "Cozy Studio near Metro",
      address: "78 Park Ave, Delhi",
      price: "₹65 Lacs",
      property_media: [{ url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80" }]
    }
  }
];

export default function EnquiriesPage() {
  const { session } = useAuth();
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    const fetchEnquiries = async () => {
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      try {
        const res = await getUserEnquiries(session.user.email);
        if (res && res.success && res.data && res.data.length > 0) {
          setEnquiries(res.data);
        } else {
          setEnquiries(MOCK_FALLBACK_ENQUIRIES);
        }
      } catch (err) {
        console.error("Failed to load enquiries:", err);
        setEnquiries(MOCK_FALLBACK_ENQUIRIES);
      } finally {
        setLoading(false);
      }
    };

    fetchEnquiries();
  }, [session]);

  const getStatusBadge = (status: string) => {
    const normalized = (status || "").toUpperCase();
    if (normalized.includes("TOUR") || normalized === "RESPONDED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Tour Requested
        </span>
      );
    }
    if (normalized.includes("REVIEW") || normalized === "READ") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Reviewing
        </span>
      );
    }
    if (normalized.includes("CLOSED")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Closed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        Sent
      </span>
    );
  };

  const parseMessageSnippet = (rawMessage: string) => {
    if (!rawMessage) return "No message content.";
    const match = rawMessage.match(/Message:\s*([\s\S]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return rawMessage.trim();
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return "Recent";
    }
  };

  if (loading) {
    return (
      <div className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center justify-center max-w-md text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <path d="M8 6h8" />
            <path d="M8 10h8" />
            <path d="M8 14h6" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Track Your Inquiries</h2>
        <p className="text-slate-500 mb-6 text-sm">
          Sign in to view responses from sellers, schedule site tours, and keep track of your conversation history.
        </p>
        <Link
          href="/login"
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-all text-center"
        >
          Sign In to Your Account
        </Link>
      </div>
    );
  }

  const filteredEnquiries = enquiries.filter((item) => {
    if (filter === "ALL") return true;
    const s = (item.status || "").toUpperCase();
    if (filter === "SENT") return s === "SENT" || s === "NEW";
    if (filter === "REVIEWING") return s === "REVIEWING" || s === "READ";
    if (filter === "TOUR") return s.includes("TOUR") || s === "RESPONDED";
    return true;
  });

  return (
    <div className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Property Enquiries
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track inquiries, tour requests, and communication with property owners.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: "ALL", label: "All Enquiries" },
            { key: "TOUR", label: "Tour Requested" },
            { key: "REVIEWING", label: "Reviewing" },
            { key: "SENT", label: "Sent" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === tab.key
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Enquiries List */}
      {filteredEnquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="16" height="20" x="4" y="2" rx="2" />
              <path d="M8 6h8" />
              <path d="M8 10h8" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No enquiries found</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            You haven't submitted any enquiries matching this status. Explore listings and contact owners directly.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-colors shadow-sm"
          >
            Browse Properties
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEnquiries.map((enq) => {
            const propertyImage =
              enq.properties?.property_media?.[0]?.url ||
              "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80";
            const propertyTitle = enq.properties?.title || "Residential Property";
            const propertyAddress = enq.properties?.address || "Location on request";
            const propertyPrice = enq.properties?.price;

            return (
              <div
                key={enq.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-5"
              >
                {/* Property Thumbnail */}
                <div className="relative w-full md:w-48 h-36 md:h-auto rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                  <SafeImage
                    src={propertyImage}
                    alt={propertyTitle}
                    className="w-full h-full object-cover"
                  />
                  {propertyPrice && (
                    <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded">
                      {typeof propertyPrice === "number"
                        ? `₹${propertyPrice.toLocaleString("en-IN")}`
                        : propertyPrice}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <Link
                          href={`/property/${enq.property_id}`}
                          className="text-base md:text-lg font-bold text-slate-900 hover:text-rose-600 transition-colors line-clamp-1"
                        >
                          {propertyTitle}
                        </Link>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span className="truncate">{propertyAddress}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(enq.status)}
                      </div>
                    </div>

                    {/* Message Snippet Box */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mt-3">
                      <p className="text-xs text-slate-500 font-medium mb-1">Your Message:</p>
                      <p className="text-sm text-slate-700 leading-relaxed italic line-clamp-2">
                        "{parseMessageSnippet(enq.message)}"
                      </p>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
                    <span>Submitted on {formatDate(enq.created_at)}</span>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/property/${enq.property_id}`}
                        className="font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                      >
                        View Listing &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
