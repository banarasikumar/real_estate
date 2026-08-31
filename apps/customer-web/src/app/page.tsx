import React from "react";
import { Search, MapPin, Bed, Bath, Square } from "lucide-react";
import Link from "next/link";
import { getPublishedProperties } from "@repo/api";
import SafeImage from "../components/SafeImage";

const MOCK_PROPERTIES = [
  {
    id: "1",
    title: "Modern Apartment in Downtown",
    address: "123 Main St, Mumbai",
    price: "₹1.5 Cr",
    beds: 3,
    baths: 2,
    sqft: 1200,
    images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80"],
    isVerified: true,
  },
  {
    id: "2",
    title: "Luxury Villa with Pool",
    address: "45 Palm Jumeirah, Bangalore",
    price: "₹4.2 Cr",
    beds: 5,
    baths: 6,
    sqft: 4500,
    images: ["https://images.unsplash.com/photo-1613490908836-e05e54d6d654?w=800&q=80"],
    isVerified: true,
  },
  {
    id: "3",
    title: "Cozy Studio near Metro",
    address: "78 Park Ave, Delhi",
    price: "₹65 Lacs",
    beds: 1,
    baths: 1,
    sqft: 550,
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"],
    isVerified: false,
  },
];

export default async function CustomerHomePage() {
  let properties = MOCK_PROPERTIES;
  try {
    const fetched = await getPublishedProperties();
    if (fetched && fetched.length > 0) {
      properties = fetched;
    }
  } catch (error) {
    console.error("Failed to fetch properties:", error);
  }

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative flex min-h-[500px] w-full flex-col items-center justify-center bg-slate-900 px-4 text-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80" 
            alt="Hero Background" 
            className="h-full w-full object-cover opacity-40"
          />
        </div>
        <div className="z-10 flex max-w-3xl flex-col items-center gap-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find a home you'll truly love.
          </h1>
          <p className="text-lg text-slate-200 sm:text-xl">
            Discover the most verified listings across India, directly from owners.
          </p>
          
          {/* Predictive Search Bar */}
          <div className="mt-4 flex w-full max-w-2xl items-center rounded-full bg-white p-2 shadow-xl">
            <div className="flex flex-1 items-center px-4">
              <Search className="h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by city, neighborhood, or ZIP..." 
                className="w-full bg-transparent px-3 py-2 text-slate-900 outline-none placeholder:text-slate-500"
              />
            </div>
            <button className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Featured Properties</h2>
            <p className="mt-2 text-slate-600">Hand-picked homes verified for you.</p>
          </div>
          <Link href="/search" className="hidden text-sm font-semibold text-blue-600 hover:underline sm:block">
            View all properties &rarr;
          </Link>
        </div>

        {/* Property Grid using standard Tailwind instead of external library */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property: any) => (
            <Link href={`/property/${property.id}`} key={property.id} className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer">
              <div className="relative h-64 overflow-hidden">
                <SafeImage 
                  src={property.property_media?.[0]?.url || property.images?.[0] || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"} 
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {property.isVerified && (
                  <div className="absolute top-4 left-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    Verified
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="font-bold text-slate-900 text-lg">{property.price}</span>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-1">{property.title}</h3>
                <div className="flex items-center text-slate-500 text-sm mb-4">
                  <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{property.address}</span>
                </div>
                
                <div className="mt-auto grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Bed className="w-4 h-4 text-slate-400" />
                    <span>{property.beds}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Bath className="w-4 h-4 text-slate-400" />
                    <span>{property.baths}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Square className="w-4 h-4 text-slate-400" />
                    <span>{property.sqft}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="mt-10 flex justify-center sm:hidden">
          <Link href="/search" className="rounded-full border border-slate-300 px-8 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            View all properties
          </Link>
        </div>
      </section>
    </div>
  );
}
