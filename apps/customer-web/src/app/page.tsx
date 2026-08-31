import React from "react";
import { Search, MapPin, Bed, Bath, Square, Sparkles, Building2, Home, Compass } from "lucide-react";
import Link from "next/link";
import { getPublishedProperties } from "@repo/api";
import SafeImage from "../components/SafeImage";
import { formatPricePill } from "../utils/formatters";

const MOCK_PROPERTIES = [
  {
    id: "prop-1",
    title: "Sea-Facing Luxury Penthouse in Bandra West",
    address: "Carter Road, Bandra West, Mumbai",
    price: 65000000,
    beds: 4,
    baths: 4,
    sqft: 3400,
    images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"],
    isVerified: true,
  },
  {
    id: "prop-2",
    title: "Modern 3 BHK High-Rise Apartment with Skyline View",
    address: "Lower Parel, Mumbai",
    price: 32000000,
    beds: 3,
    baths: 3,
    sqft: 1850,
    images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80"],
    isVerified: true,
  },
  {
    id: "prop-3",
    title: "Contemporary Garden Villa with Private Pool",
    address: "Palm Meadows, Whitefield, Bangalore",
    price: 48000000,
    beds: 5,
    baths: 5,
    sqft: 4500,
    images: ["https://images.unsplash.com/photo-1613490908836-e05e54d6d654?w=800&q=80"],
    isVerified: true,
  },
  {
    id: "prop-4",
    title: "Cozy Furnished Studio near Metro Station",
    address: "Indiranagar, Bangalore",
    price: 35000,
    beds: 1,
    baths: 1,
    sqft: 650,
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"],
    isVerified: false,
  },
];

export default async function CustomerHomePage() {
  let properties = MOCK_PROPERTIES;
  try {
    const fetched = await getPublishedProperties();
    if (fetched && fetched.length > 0) {
      properties = fetched as any;
    }
  } catch (error) {
    console.error("Failed to fetch properties:", error);
  }

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative flex min-h-[560px] w-full flex-col items-center justify-center bg-slate-950 px-4 py-20 text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80"
            alt="Hero Background"
            className="h-full w-full object-cover opacity-30 scale-105 animate-in fade-in duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        <div className="z-10 flex max-w-3xl flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-rose-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct from Verified Owners · Zero Brokerage Spam</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-sm">
            Find a home you'll <span className="text-rose-500">truly love</span>.
          </h1>
          <p className="text-base text-slate-300 sm:text-lg max-w-xl">
            Explore verified listings across Mumbai, Bangalore, Delhi & beyond with interactive maps and 3D previews.
          </p>

          {/* Search Form */}
          <form
            action="/search"
            method="GET"
            className="mt-4 flex w-full max-w-2xl items-center rounded-full bg-white p-2 shadow-2xl border border-slate-200/50"
          >
            <div className="flex flex-1 items-center px-4">
              <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                name="q"
                placeholder="Search city (e.g. Mumbai, Bangalore, Delhi) or locality..."
                className="w-full bg-transparent px-3 py-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-rose-600 px-7 py-3 text-sm font-bold text-white transition-all hover:bg-rose-700 shadow-md active:scale-95 cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Quick Search Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
            <span className="text-slate-400 font-medium mr-1">Popular:</span>
            <Link
              href="/search?q=Mumbai"
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/10 transition-colors"
            >
              Mumbai
            </Link>
            <Link
              href="/search?q=Bangalore"
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/10 transition-colors"
            >
              Bangalore
            </Link>
            <Link
              href="/search?q=Delhi"
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/10 transition-colors"
            >
              Delhi
            </Link>
            <Link
              href="/search?listType=SALE"
              className="px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition-colors"
            >
              Buy Homes
            </Link>
            <Link
              href="/search?listType=RENT"
              className="px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition-colors"
            >
              Rentals
            </Link>
            <Link
              href="/search?propType=VILLA"
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/10 transition-colors"
            >
              Luxury Villas
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Compass className="w-4 h-4" />
              <span>Hand-picked listings</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Featured Properties</h2>
            <p className="mt-1 text-sm text-slate-600">Discover top-rated homes with verified ownership.</p>
          </div>
          <Link
            href="/search"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors"
          >
            <span>Explore all on map</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property: any) => {
            const displayPrice = formatPricePill(property.price);
            const displayImg =
              property.property_media?.[0]?.url ||
              property.images?.[0] ||
              "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80";

            return (
              <Link
                href={`/property/${property.id}`}
                key={property.id}
                className="group flex flex-col bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-slate-300 transition-all duration-300 cursor-pointer"
              >
                <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
                  <SafeImage
                    src={displayImg}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {property.isVerified && (
                    <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Verified</span>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-md border border-white/50">
                    <span className="font-extrabold text-slate-900 text-base">{displayPrice}</span>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-base text-slate-900 mb-1 line-clamp-1 group-hover:text-rose-600 transition-colors">
                    {property.title}
                  </h3>
                  <div className="flex items-center text-slate-500 text-xs mb-4">
                    <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{property.address || "Prime Location"}</span>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Bed className="w-4 h-4 text-slate-400" />
                      <span>{property.bedrooms || property.beds || "-"} Beds</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Bath className="w-4 h-4 text-slate-400" />
                      <span>{property.bathrooms || property.baths || "-"} Baths</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Square className="w-4 h-4 text-slate-400" />
                      <span>{property.area_sqft || property.sqft || "-"} sqft</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center sm:hidden">
          <Link
            href="/search"
            className="w-full text-center rounded-2xl bg-rose-600 px-8 py-3.5 text-sm font-bold text-white hover:bg-rose-700 shadow-md transition-colors"
          >
            Explore all on Map
          </Link>
        </div>
      </section>
    </div>
  );
}
