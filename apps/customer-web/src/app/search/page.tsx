"use client";

import React, { useState, useEffect, useCallback, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Bed,
  Bath,
  Square,
  ShieldCheck,
  Heart,
  SlidersHorizontal,
  Map as MapIcon,
  List as ListIcon,
  ArrowUpDown,
  Home,
  RotateCcw,
  Sparkles,
  Search,
} from "lucide-react";
import { searchProperties, Property } from "@repo/api";
import SearchFiltersBar, {
  SearchFiltersState,
} from "../../components/SearchFiltersBar";
import GoogleMapView, { MapProperty } from "../../components/GoogleMapView";
import { formatPricePill, formatPriceLabel } from "../../utils/formatters";
import SafeImage from "../../components/SafeImage";
import SavePropertyButton from "../../components/SavePropertyButton";

// Realistic fallback sample properties
const SEED_PROPERTIES: MapProperty[] = [
  {
    id: "prop-1",
    title: "Sea-Facing Luxury Penthouse in Bandra West",
    description: "Ultra-luxury duplex penthouse with uninterrupted Arabian Sea views, private terrace pool, and Italian marble finishes.",
    address: "Carter Road, Bandra West, Mumbai",
    price: 65000000,
    area_sqft: 3400,
    bedrooms: 4,
    bathrooms: 4,
    prop_type: "APARTMENT",
    list_type: "SALE",
    status: "PUBLISHED",
    latitude: 19.062,
    longitude: 72.824,
    isVerified: true,
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    ],
  },
  {
    id: "prop-2",
    title: "Modern 3 BHK High-Rise Apartment with Skyline View",
    description: "Spacious modern apartment with floor-to-ceiling windows, smart home automation, and clubhouse access.",
    address: "Lower Parel, Mumbai",
    price: 32000000,
    area_sqft: 1850,
    bedrooms: 3,
    bathrooms: 3,
    prop_type: "APARTMENT",
    list_type: "SALE",
    status: "PUBLISHED",
    latitude: 19.001,
    longitude: 72.829,
    isVerified: true,
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    ],
  },
  {
    id: "prop-3",
    title: "Contemporary Garden Villa with Private Pool",
    description: "Exclusive gated community villa featuring manicured private gardens, heated pool, and solar power.",
    address: "Palm Meadows, Whitefield, Bangalore",
    price: 48000000,
    area_sqft: 4500,
    bedrooms: 5,
    bathrooms: 5,
    prop_type: "VILLA",
    list_type: "SALE",
    status: "PUBLISHED",
    latitude: 12.9698,
    longitude: 77.75,
    isVerified: true,
    images: [
      "https://images.unsplash.com/photo-1613490908836-e05e54d6d654?w=800&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    ],
  },
  {
    id: "prop-4",
    title: "Cozy Furnished Studio near Metro Station",
    description: "Charming, well-lit studio apartment ideal for working professionals, walking distance to metro.",
    address: "Indiranagar, Bangalore",
    price: 35000,
    area_sqft: 650,
    bedrooms: 1,
    bathrooms: 1,
    prop_type: "APARTMENT",
    list_type: "RENT",
    status: "PUBLISHED",
    latitude: 12.9784,
    longitude: 77.6408,
    isVerified: false,
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    ],
  },
  {
    id: "prop-5",
    title: "Grand Independent Bungalow in Vasant Vihar",
    description: "Stately independent house with lush lawn, servant quarters, and 4-car covered parking.",
    address: "Vasant Vihar, South Delhi",
    price: 125000000,
    area_sqft: 6000,
    bedrooms: 5,
    bathrooms: 6,
    prop_type: "HOUSE",
    list_type: "SALE",
    status: "PUBLISHED",
    latitude: 28.5603,
    longitude: 77.1627,
    isVerified: true,
    images: [
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    ],
  },
  {
    id: "prop-6",
    title: "Premium Grade-A Commercial Office Floor",
    description: "Fully furnished corporate office floor with conference rooms, cabins, and 100% power backup.",
    address: "BKC, Bandra Kurla Complex, Mumbai",
    price: 250000,
    area_sqft: 3200,
    bedrooms: 0,
    bathrooms: 2,
    prop_type: "COMMERCIAL",
    list_type: "RENT",
    status: "PUBLISHED",
    latitude: 19.066,
    longitude: 72.868,
    isVerified: true,
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    ],
  },
  {
    id: "prop-7",
    title: "Chic 2 BHK Lakeview Apartment in Powai",
    description: "Serene lake facing corner residence with clubhouse, gym, and jogging tracks in Hiranandani.",
    address: "Hiranandani Gardens, Powai, Mumbai",
    price: 22000000,
    area_sqft: 1150,
    bedrooms: 2,
    bathrooms: 2,
    prop_type: "APARTMENT",
    list_type: "SALE",
    status: "PUBLISHED",
    latitude: 19.1176,
    longitude: 72.906,
    isVerified: true,
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    ],
  },
  {
    id: "prop-8",
    title: "Portuguese Style Heritage Villa with Private Pool",
    description: "Tranquil Portuguese villa surrounded by greenery with private pool and antique verandah.",
    address: "Candolim, North Goa",
    price: 38000000,
    area_sqft: 3600,
    bedrooms: 4,
    bathrooms: 4,
    prop_type: "VILLA",
    list_type: "SALE",
    status: "PUBLISHED",
    latitude: 15.5186,
    longitude: 73.7681,
    isVerified: true,
    images: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80",
    ],
  },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Parse Initial Filters from URL Query Params
  const [filters, setFilters] = useState<SearchFiltersState>(() => {
    const q = searchParams.get("q") || searchParams.get("query") || "";
    const listType = (searchParams.get("listType") || searchParams.get("type") || "ALL").toUpperCase() as
      | "ALL"
      | "SALE"
      | "RENT";
    const propType = (searchParams.get("propType") || "ALL").toUpperCase() as
      | "ALL"
      | "APARTMENT"
      | "HOUSE"
      | "VILLA"
      | "COMMERCIAL";
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const bedrooms = searchParams.get("bedrooms") || undefined;
    const bathrooms = searchParams.get("bathrooms") || undefined;

    return {
      query: q,
      listType: ["ALL", "SALE", "RENT"].includes(listType) ? listType : "ALL",
      propType: ["ALL", "APARTMENT", "HOUSE", "VILLA", "COMMERCIAL"].includes(propType) ? propType : "ALL",
      minPrice: isNaN(minPrice!) ? undefined : minPrice,
      maxPrice: isNaN(maxPrice!) ? undefined : maxPrice,
      bedrooms,
      bathrooms,
    };
  });

  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "area_desc">("newest");
  const [results, setResults] = useState<MapProperty[]>(SEED_PROPERTIES);
  const [isLoading, setIsLoading] = useState(true);

  // Sync state between List & Map
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Mobile View Mode Switcher: "list" | "map"
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  // Fetch properties from Supabase API / Fallback
  const fetchProperties = useCallback(async (currentFilters: SearchFiltersState, currentSort: string) => {
    setIsLoading(true);
    try {
      const dbParams = {
        query: currentFilters.query,
        list_type: currentFilters.listType,
        prop_type: currentFilters.propType,
        min_price: currentFilters.minPrice,
        max_price: currentFilters.maxPrice,
        bedrooms: currentFilters.bedrooms,
        bathrooms: currentFilters.bathrooms,
        sortBy: currentSort as any,
      };

      const fetched = await searchProperties(dbParams);

      if (fetched && fetched.length > 0) {
        setResults(fetched as MapProperty[]);
      } else {
        // Fallback filter over SEED_PROPERTIES
        let filtered = [...SEED_PROPERTIES];

        if (currentFilters.listType && currentFilters.listType !== "ALL") {
          filtered = filtered.filter((p) => p.list_type === currentFilters.listType);
        }

        if (currentFilters.propType && currentFilters.propType !== "ALL") {
          filtered = filtered.filter((p) => p.prop_type === currentFilters.propType);
        }

        if (currentFilters.minPrice) {
          filtered = filtered.filter((p) => Number(p.price) >= currentFilters.minPrice!);
        }

        if (currentFilters.maxPrice) {
          filtered = filtered.filter((p) => Number(p.price) <= currentFilters.maxPrice!);
        }

        if (currentFilters.bedrooms && currentFilters.bedrooms !== "any") {
          filtered = filtered.filter((p) => (p.bedrooms || 0) >= Number(currentFilters.bedrooms));
        }

        if (currentFilters.bathrooms && currentFilters.bathrooms !== "any") {
          filtered = filtered.filter((p) => (p.bathrooms || 0) >= Number(currentFilters.bathrooms));
        }

        if (currentFilters.query && currentFilters.query.trim()) {
          const q = currentFilters.query.toLowerCase().trim();
          filtered = filtered.filter(
            (p) =>
              p.title?.toLowerCase().includes(q) ||
              p.address?.toLowerCase().includes(q) ||
              p.description?.toLowerCase().includes(q)
          );
        }

        // Apply sort
        if (currentSort === "price_asc") {
          filtered.sort((a, b) => Number(a.price) - Number(b.price));
        } else if (currentSort === "price_desc") {
          filtered.sort((a, b) => Number(b.price) - Number(a.price));
        } else if (currentSort === "area_desc") {
          filtered.sort((a, b) => (b.area_sqft || 0) - (a.area_sqft || 0));
        }

        setResults(filtered);
      }
    } catch (err) {
      console.error("Error fetching properties for search page:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update URL and trigger search on filter changes
  const handleFilterChange = (newFilters: SearchFiltersState) => {
    setFilters(newFilters);

    // Sync URL params without full page reload
    const params = new URLSearchParams();
    if (newFilters.query) params.set("q", newFilters.query);
    if (newFilters.listType !== "ALL") params.set("listType", newFilters.listType);
    if (newFilters.propType !== "ALL") params.set("propType", newFilters.propType);
    if (newFilters.minPrice) params.set("minPrice", String(newFilters.minPrice));
    if (newFilters.maxPrice) params.set("maxPrice", String(newFilters.maxPrice));
    if (newFilters.bedrooms && newFilters.bedrooms !== "any") params.set("bedrooms", String(newFilters.bedrooms));
    if (newFilters.bathrooms && newFilters.bathrooms !== "any") params.set("bathrooms", String(newFilters.bathrooms));

    const newQuery = params.toString();
    const targetUrl = newQuery ? `/search?${newQuery}` : "/search";
    router.replace(targetUrl, { scroll: false });

    fetchProperties(newFilters, sortBy);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as any;
    setSortBy(val);
    fetchProperties(filters, val);
  };

  useEffect(() => {
    fetchProperties(filters, sortBy);
  }, []); // Initial load

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-white">
      {/* Top Filter Bar Header */}
      <div className="w-full border-b border-slate-200 bg-white z-20 px-4 pt-3 pb-2 shadow-xs">
        <SearchFiltersBar
          filters={filters}
          onChange={handleFilterChange}
          totalResults={results.length}
        />
      </div>

      {/* Split-Screen Dual View Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Side: Property Listings Column */}
        <div
          className={`w-full md:w-1/2 lg:w-3/5 h-full overflow-y-auto bg-slate-50 p-4 lg:p-6 no-scrollbar transition-all ${
            mobileView === "map" ? "hidden md:block" : "block"
          }`}
        >
          {/* Results Header: Count & Sorting */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {filters.query ? `Properties in "${filters.query}"` : "Explore All Properties"}
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {isLoading ? "Searching..." : `${results.length} homes available`}
                {filters.listType === "SALE" && " · For Sale"}
                {filters.listType === "RENT" && " · For Rent"}
              </p>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500 hidden sm:inline flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort:
              </label>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none cursor-pointer"
              >
                <option value="newest">Newest Listed</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="area_desc">Largest Area (sqft)</option>
              </select>
            </div>
          </div>

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-pulse"
                >
                  <div className="h-48 bg-slate-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-24 md:pb-8">
              {results.map((property) => {
                const isHovered = hoveredPropertyId === property.id;
                const isSelected = selectedPropertyId === property.id;
                const displayPrice = formatPricePill(property.price);
                const displayImg =
                  property.property_media?.[0]?.url ||
                  property.images?.[0] ||
                  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80";

                return (
                  <div
                    key={property.id}
                    onMouseEnter={() => setHoveredPropertyId(property.id)}
                    onMouseLeave={() => setHoveredPropertyId(null)}
                    onClick={() => setSelectedPropertyId(property.id)}
                    className={`group relative flex flex-col bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                      isHovered || isSelected
                        ? "border-rose-500 ring-2 ring-rose-500/20 shadow-xl -translate-y-0.5"
                        : "border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300"
                    }`}
                  >
                    {/* Media Container */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                      <SafeImage
                        src={displayImg}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Verified Badge */}
                      {property.isVerified && (
                        <div className="absolute top-3 left-3 bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </div>
                      )}

                      {/* Price Pill on image */}
                      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-slate-900 font-extrabold text-sm px-3 py-1.5 rounded-xl shadow-md border border-white/40">
                        {displayPrice}
                      </div>

                      {/* Save Heart Button */}
                      <div
                        className="absolute top-3 right-3 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SavePropertyButton propertyId={property.id} />
                      </div>
                    </div>

                    {/* Property Card Content */}
                    <Link
                      href={`/property/${property.id}`}
                      className="p-4 flex-1 flex flex-col justify-between"
                    >
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-rose-600 transition-colors">
                          {property.title}
                        </h3>
                        <p className="flex items-center text-xs text-slate-500 mt-1 line-clamp-1">
                          <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-slate-400" />
                          {property.address || "Prime Location"}
                        </p>
                      </div>

                      {/* Specs Footer */}
                      <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Bed className="w-3.5 h-3.5 text-slate-400" />
                          <span>{property.bedrooms || "-"} Beds</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Bath className="w-3.5 h-3.5 text-slate-400" />
                          <span>{property.bathrooms || "-"} Baths</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                          <span>{property.area_sqft ? `${property.area_sqft} sqft` : "-"}</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-slate-200 my-6">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                No matching properties found
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                Try widening your price range, searching a different location, or resetting the filters.
              </p>
              <button
                type="button"
                onClick={() =>
                  handleFilterChange({
                    query: "",
                    listType: "ALL",
                    propType: "ALL",
                    minPrice: undefined,
                    maxPrice: undefined,
                    bedrooms: undefined,
                    bathrooms: undefined,
                  })
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Full-Height Interactive Google Map */}
        <div
          className={`h-full sticky top-0 transition-all ${
            mobileView === "map"
              ? "block w-full"
              : "hidden md:block md:w-1/2 lg:w-2/5"
          }`}
        >
          <GoogleMapView
            properties={results}
            selectedPropertyId={selectedPropertyId}
            hoveredPropertyId={hoveredPropertyId}
            onSelectProperty={(prop) => setSelectedPropertyId(prop?.id || null)}
            onHoverProperty={(id) => setHoveredPropertyId(id)}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Floating Mobile Toggle Button (Show Map / Show List) */}
      <div className="md:hidden fixed bottom-18 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          onClick={() => setMobileView(mobileView === "list" ? "map" : "list")}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900 text-white font-bold text-xs shadow-2xl hover:bg-slate-800 active:scale-95 transition-all border border-white/20"
        >
          {mobileView === "list" ? (
            <>
              <MapIcon className="w-4 h-4 text-rose-400" />
              <span>Show Map ({results.length})</span>
            </>
          ) : (
            <>
              <ListIcon className="w-4 h-4 text-rose-400" />
              <span>Show List ({results.length})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] w-full bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Loading properties map...</span>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
